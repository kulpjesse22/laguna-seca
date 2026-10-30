// Seeded race simulation + shared race clock.
// A fixed-step (20 Hz) simulation of the whole field is the single source of truth: the map,
// tower, gaps, lap and sector times, tyres and broadcast captions are all read from its recorded
// history, so every panel agrees. Each car follows a speed profile built from the circuit's own
// curvature (braking and acceleration zones), its own racing line, and the traffic around it.
// A race director inside the simulation plans attacks and incidents from a per-visit seed
// (?seed= pins it) so something happens every 8–20 s; pace, tyres and traffic decide the rest.

(function () {
  const START_LAP = 47;
  const DT = 0.05;
  // Car footprint and track limits in map units (the asphalt is 36 wide).
  const CAR_L = 11, CAR_W = 4.2, EDGE = 14;
  const COMPOUND_PACE = { S: -0.28, M: 0, H: 0.22, W: 0.6, A: 0 };
  const DEG = { S: 0.034, M: 0.02, H: 0.011, W: 0.02, A: 0.014 };
  const CLIFF = { S: 18, M: 32, H: 50, W: 30, A: 44 };
  const NEXT_TYRE = { S: "M", M: "H", H: "M", W: "W", A: "A" };
  const SECTOR_SPLIT = [0.302, 0.688];
  // Seconds behind the leader at load: a lead fight, then small groups down the order.
  const GAPS = [0, 0.62, 1.4, 4.3, 5.0, 5.9, 12.4, 13.2, 20.6, 21.5, 22.8, 33.5];
  const F = { SMOKE: 1, DUST: 2, KERB: 4, PIT: 8, DRS: 16, SPIN: 32 };

  const QS = new URLSearchParams(location.search);
  const SEED = QS.get("seed") != null && QS.get("seed") !== ""
    ? (Math.abs(parseInt(QS.get("seed"), 10)) || 0) >>> 0
    : (Math.random() * 4294967296) >>> 0;

  function mulberry(a) {
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(a, b) {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  // Session conditions come from the same seed, so the trailer and the race agree (?tod= / ?weather= pin them).
  const COND = (() => {
    const r = mulberry((SEED ^ 0xC0FFEE) >>> 0), a = r(), b = r(), c = r();
    const tq = QS.get("tod"), wq = QS.get("weather");
    const tod = ["day", "dusk", "night"].includes(tq) ? tq : a < 0.45 ? "day" : a < 0.7 ? "dusk" : "night";
    const weather = ["dry", "rain"].includes(wq) ? wq : b < 0.3 ? "rain" : "dry";
    const wet = weather === "rain";
    const air = Math.round((tod === "day" ? 21 : tod === "dusk" ? 17 : 13) + (wet ? -3 : 0) + c * 4);
    return { tod, weather, air, trackT: Math.round(air + (tod === "day" ? 14 : tod === "dusk" ? 7 : 3) * (wet ? 0.4 : 1)),
      wind: Math.round(6 + c * 14), grip: wet ? 0.72 : tod === "night" ? 0.95 : 1 };
  })();
  const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function fmtLap(sec) {
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    return `${m}:${s.toFixed(3).padStart(6, "0")}`;
  }

  // ---------------------------------------------------------------------------
  // Circuit analysis: curvature → cornering speed, then braking/acceleration passes, a racing
  // line (outside–apex–outside), braking zones, the longest straight (DRS) and the pit lane.
  const profCache = {};
  function profile(track) {
    if (profCache[track.id]) return profCache[track.id];
    const g = trackGeom(track), N = 1200, len = g.len, ds = len / N;
    const px = new Float32Array(N), py = new Float32Array(N), rad = new Float32Array(N), k = new Float32Array(N);
    for (let i = 0; i < N; i++) { const p = g.at(i / N); px[i] = p.x; py[i] = p.y; rad[i] = p.rad; }
    const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    for (let i = 0; i < N; i++) k[i] = wrapA(rad[(i + 1) % N] - rad[(i - 1 + N) % N]) / (2 * ds);
    const smooth = (src, w) => {
      const out = new Float32Array(N);
      let acc = 0;
      for (let j = -w; j <= w; j++) acc += src[(j + N) % N];
      for (let i = 0; i < N; i++) {
        out[i] = acc / (2 * w + 1);
        acc += src[(i + w + 1) % N] - src[(i - w + N) % N];
      }
      return out;
    };
    const kn = smooth(k, 6), kw = smooth(k, 46);
    const R0 = 150, BRK = 0.0055, ACC = 0.0024;
    const vc = new Float32Array(N);
    for (let i = 0; i < N; i++) vc[i] = Math.min(1, 1 / Math.sqrt(Math.max(1e-6, R0 * Math.abs(kn[i]))));
    const passes = (brk) => {
      const v = Float32Array.from(vc);
      for (let r = 0; r < 3; r++) {
        for (let i = N - 1; i >= 0; i--) { const j = (i + 1) % N; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * brk * ds)); }
        for (let i = 0; i < N; i++) { const j = (i - 1 + N) % N; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * ACC * ds)); }
      }
      return v;
    };
    const v = passes(BRK), vl = passes(BRK * 1.7);
    let T0 = 0;
    for (let i = 0; i < N; i++) T0 += ds / v[i];
    const line = new Float32Array(N);
    for (let i = 0; i < N; i++) line[i] = clamp(11 * (1.3 * Math.tanh(kn[i] * 60) - 0.95 * Math.tanh(kw[i] * 90)), -EDGE, EDGE);

    // Corners: local speed minima, labelled from the circuit's turn list.
    let corners = [];
    for (let i = 0; i < N; i++) {
      const a = v[(i - 1 + N) % N], b = v[(i + 1) % N];
      if (v[i] < 0.8 && v[i] <= a && v[i] < b) {
        let s = i, e = i;
        for (let n = 0; n < N / 3; n++) { const p = (s - 1 + N) % N; if (v[p] <= v[s] + 1e-6) break; s = p; }
        for (let n = 0; n < N / 3; n++) { const q = (e + 1) % N; if (v[q] <= v[e] + 1e-6) break; e = q; }
        corners.push({ i, frac: i / N, vMin: v[i], brake: s / N, exit: e / N, side: Math.sign(kn[i]) || 1 });
      }
    }
    corners.sort((a, b) => a.vMin - b.vMin);
    const kept = [];
    const cd = (a, b) => { const x = Math.abs(a - b) % 1; return Math.min(x, 1 - x); };
    corners.forEach((c) => { if (!kept.some((q) => cd(q.frac, c.frac) < 0.025)) kept.push(c); });
    corners = kept.sort((a, b) => a.frac - b.frac);
    corners.forEach((c) => {
      let best = null, bd = 0.06;
      g.corners.forEach((t) => { const d = cd(t.frac, c.frac); if (d < bd) { bd = d; best = t; } });
      c.label = best ? best.label : "";
      c.name = best && best.name;
      c.important = !!(best && best.important);
      c.sector = sectorOf(c.frac);
    });

    // DRS: the longest flat-out run.
    let drs = null;
    {
      const flat = (i) => v[i] >= 0.985;
      let start = 0;
      while (start < N && flat(start)) start++;
      let best = { len: 0 }, run = 0, runStart = 0;
      for (let n = 0; n <= N; n++) {
        const i = (start + n) % N;
        if (flat(i) && n < N) { if (!run) runStart = i; run++; }
        else { if (run > best.len) best = { len: run, s: runStart }; run = 0; }
      }
      if (best.len > 20) drs = { start: best.s / N, end: ((best.s + best.len) % N) / N };
    }

    // Pit lane: where the pit path leaves and rejoins, and how far off the racing surface it runs.
    let pit = null;
    const nearest = (x, y) => {
      let bi = 0, bd2 = Infinity;
      for (let i = 0; i < N; i++) { const dx = px[i] - x, dy = py[i] - y, d = dx * dx + dy * dy; if (d < bd2) { bd2 = d; bi = i; } }
      return bi;
    };
    if (track.pit) {
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
      svg.style.position = "absolute"; svg.style.visibility = "hidden";
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", track.pit);
      svg.appendChild(path);
      document.body.appendChild(svg);
      const pl = path.getTotalLength(), pts = [];
      for (let j = 0; j <= 30; j++) pts.push(path.getPointAtLength((j / 30) * pl));
      document.body.removeChild(svg);
      const lats = pts.map((p) => { const i = nearest(p.x, p.y); return { i, lat: (p.x - px[i]) * -Math.sin(rad[i]) + (p.y - py[i]) * Math.cos(rad[i]) }; });
      let a = lats[0].i / N, b = lats[lats.length - 1].i / N;
      if (((b - a) % 1 + 1) % 1 > 0.5) { const tmp = a; a = b; b = tmp; }
      const mid = lats.slice(8, 23).map((q) => q.lat).sort((x, y) => x - y);
      let lat = mid[Math.floor(mid.length / 2)] || 22;
      if (Math.abs(lat) < 16) lat = Math.sign(lat || 1) * 22;
      pit = { entry: a, exit: b, lat };
    } else {
      pit = { entry: 0.955, exit: 0.06, lat: 24 };
    }
    const span = ((pit.exit - pit.entry) % 1 + 1) % 1;
    pit.box = (pit.entry + span * 0.5) % 1;
    pit.span = span;

    const P = { N, len, v, vl, line, T0, corners, drs, pit, BRK, ACC };
    profCache[track.id] = P;
    return P;
  }
  function sectorOf(frac) { return frac < SECTOR_SPLIT[0] ? 1 : frac < SECTOR_SPLIT[1] ? 2 : 3; }

  // Next absolute race distance at which a car at `d` reaches lap fraction `frac`.
  const nextD = (d, frac, ahead = 0) => { let x = Math.floor(d) + frac; while (x < d + ahead) x += 1; return x; };
  const sur = (c) => c.static.name.split(" ").slice(-1)[0].toUpperCase();

  // ---------------------------------------------------------------------------
  function build(baseCars, carClass, lapsTotal, track) {
    track = track || window.TRACKS.laguna_seca;
    const P = profile(track);
    const L = carClass.base_lap_s;
    const k = P.T0 / L;
    const len = P.len;
    const rng = mulberry((SEED ^ strHash(track.id + ":" + carClass.id)) >>> 0);
    const gapScale = L / 69.2;
    const sorted = [...baseCars].sort((a, b) => a.pos - b.pos);
    const degIdx = 2 + Math.floor(rng() * 7);
    const leaderD = START_LAP + 1 - 4.0 / L;
    const cars = sorted.map((c, idx) => {
      const comp0 = COND.weather === "rain" ? "W" : c.tire;
      const car = {
        static: c, no: c.no, idx,
        skill: (idx * 0.04 + (rng() - 0.5) * 0.3) * gapScale,
        comp: comp0, age: c.tire_age,
        degMul: 0.8 + rng() * 0.5, cliff: CLIFF[comp0] * (0.85 + rng() * 0.3),
        lineGain: 0.6 + rng() * 0.55, lineBias: (rng() - 0.5) * 4.5, aggr: rng(),
        stints: [{ t: -1e9, comp: comp0, age0: c.tire_age, lap: START_LAP }],
        fuel0: c.fuel,
        cross: {}, secX: {},
        att: null, def: null, inc: null, box: null,
        boost: 1, boostUntil: 0, slow: 1, slowUntil: 0, attCool: 0, blockedT: 0, yaw: 0,
      };
      if (idx === degIdx) { car.degMul = 2.6; car.cliff = car.age + 1 + rng() * 2; }
      const gap = (GAPS[idx] != null ? GAPS[idx] : GAPS[GAPS.length - 1] + (idx - GAPS.length + 1) * 6) * (idx < 3 ? 1 : gapScale) * (idx ? 0.9 + rng() * 0.2 : 1);
      car.d = leaderD - gap / L;
      return car;
    });
    const M = {
      cars, L, k, len, P, track, carClass, lapsTotal, startLap: START_LAP, seed: SEED, rng,
      brk: P.BRK * k * k, acc: P.ACC * k * k, pitV: 0.4 * k,
      n: 0, cap: 0, events: [], vscs: [], yellows: [], vsc: null, yellow: null,
      dir: { next: 1.5, lastPit: -99, lastVsc: -999, first: true, lastNote: 0 },
      pairs: {}, bestLap: Infinity,
    };
    for (let i = 1; i < cars.length; i++) {
      const a = cars[i - 1], b = cars[i];
      if ((a.d - b.d) * len < CAR_L * 1.3) b.d = a.d - (CAR_L * 1.3) / len;
    }
    cars.forEach((c) => {
      c.m = L / lapTarget(M, c, Math.floor(c.d));
      const frac = c.d - Math.floor(c.d), i = Math.min(P.N - 1, Math.floor(frac * P.N));
      c.v = P.v[i] * k * c.m;
      c.lat = clamp(P.line[i] * c.lineGain + c.lineBias, -EDGE, EDGE);
      const lap0 = Math.floor(c.d);
      let lt = lapTargetAt(M, c, c.comp, c.age, lap0);
      c.cross[lap0] = -(c.d - lap0) * lt;
      for (let q = 1; q <= 3; q++) {
        const l = lap0 - q, ltq = lapTargetAt(M, c, c.comp, Math.max(0, c.age - q), l);
        c.cross[l] = c.cross[l + 1] - ltq;
        const n1 = (hash(c.no * 3 + 1, l) - 0.5) * 0.12, n2 = (hash(c.no * 3 + 2, l) - 0.5) * 0.12;
        c.secX[l] = [c.cross[l] + ltq * SECTOR_SPLIT[0] + n1, c.cross[l] + ltq * SECTOR_SPLIT[1] + n2];
        M.bestLap = Math.min(M.bestLap, ltq);
      }
      c.secX[lap0] = [c.cross[lap0] + lt * SECTOR_SPLIT[0], c.cross[lap0] + lt * SECTOR_SPLIT[1]];
      if (c.static._bestSec) M.bestLap = Math.min(M.bestLap, c.static._bestSec);
    });
    M.finishT = (lapsTotal + 1 - cars[0].d) * L;
    grow(M, 2048);
    record(M);
    return M;
  }

  function lapTargetAt(M, c, comp, age, lap) {
    const deg = DEG[comp] * c.degMul * age + (age > c.cliff ? 0.1 * Math.pow(age - c.cliff, 1.35) : 0);
    const noise = (hash((SEED ^ (c.no * 7919)) | 0, lap) - 0.5) * 0.36;
    return M.L + 0.2 + c.skill + (COMPOUND_PACE[comp] || 0) + (M.carClass.id === "e_spec" ? deg * 0.55 : deg) + noise;
  }
  const lapTarget = (M, c, lap) => lapTargetAt(M, c, c.comp, c.age, lap);

  function grow(M, cap) {
    M.cars.forEach((c) => {
      const cp = (A, T) => { const x = new T(cap); if (A) x.set(A.subarray(0, M.n)); return x; };
      c.hd = cp(c.hd, Float64Array); c.hl = cp(c.hl, Float32Array); c.hy = cp(c.hy, Float32Array);
      c.hv = cp(c.hv, Float32Array); c.hf = cp(c.hf, Uint8Array);
    });
    M.cap = cap;
  }
  function record(M) {
    if (M.n >= M.cap) grow(M, M.cap * 2);
    const n = M.n;
    M.cars.forEach((c) => { c.hd[n] = c.d; c.hl[n] = c.lat; c.hy[n] = c.yaw; c.hv[n] = c.v; c.hf[n] = c.flags || 0; });
    M.n++;
  }

  function emit(M, ev) {
    M.events.push(ev);
    if (ev.major) M.dir.next = ev.t + 5 + M.rng() * 5;
    if (ev.text && ev.kind !== "radio") M.dir.lastNote = Math.max(M.dir.lastNote, ev.t);
  }

  // ---------------------------------------------------------------------------
  // Race director: every 8–20 s of quiet it sets something up that will play out in the next
  // few seconds. Outcomes are decided up front from the seed; the physics carries them out.
  function zonesAhead(M, c, minAhead) {
    const P = M.P, out = [];
    if (P.drs) {
      const dS = nextD(c.d, P.drs.start, minAhead / M.len);
      let dE = Math.floor(dS) + P.drs.end; if (dE <= dS) dE += 1;
      out.push({ kind: "drs", dS, dE, dApex: dE, label: "" });
    }
    P.corners.forEach((cn) => {
      if (cn.vMin > 0.62) return;
      const dS = nextD(c.d, cn.brake, minAhead / M.len);
      let dA = Math.floor(dS) + cn.frac; if (dA < dS) dA += 1;
      let dE = Math.floor(dA) + cn.exit; if (dE < dA) dE += 1;
      out.push({ kind: "brake", dS, dApex: dA, dE, corner: cn, label: cn.label });
    });
    return out.sort((a, b) => a.dS - b.dS);
  }
  const timeTo = (M, c, d) => (d - c.d) * M.L / c.m;
  const free = (c, t) => !c.inc && !c.box && !c.att && !c.def && t >= c.attCool;

  function startAttack(M, c, b, t, zone, outcome, phase) {
    c.att = { tgt: b, zone, outcome, phase, t0: t, until: t + (phase === "close" ? 28 : 20), side: 1, chained: false };
    b.def = { by: c };
  }

  function director(M, t) {
    const D = M.dir, r = M.rng;
    const starved = t - D.lastNote > 11 && t - (D.forced || -99) > 5;
    if (t < D.next && !starved) return;
    if ((M.vsc && t < M.vsc.t1 + 2)) { D.next = t + 1; return; }
    const racing = M.cars.filter((c) => free(c, t));
    const order = [...M.cars].sort((a, b) => b.d - a.d);
    const groups = [];
    // Attacks on a car within about a second, at the next overtaking zone.
    const att = [], close = [];
    for (let i = 1; i < order.length; i++) {
      const b = order[i - 1], c = order[i];
      if (!free(b, t) || !free(c, t) || Math.abs(b.d - c.d) > 0.5) continue;
      const gU = (b.d - c.d) * M.len, gS = gU / Math.max(1, c.v);
      if (gU < CAR_L * 3.2) {
        const z = zonesAhead(M, c, 140).find((q) => { const tt = timeTo(M, c, q.dS); return tt > 1 && tt < 8; });
        if (z) att.push({ w: 1 + (i <= 2 ? 1.5 : 0) + (D.first && i === 1 ? 20 : 0), c, b, z });
      } else if (gS < 1.8) close.push({ w: 1 + (i <= 3 ? 1 : 0), c, b });
    }
    if (att.length) groups.push({ w: 46, list: att, run: ({ c, b, z }) => {
      let p = r();
      if (c.age + 8 < b.age) p *= 0.7;
      const outcome = p < 0.5 ? "pass" : p < 0.78 ? "fail" : "cutback";
      startAttack(M, c, b, t, z, outcome, "setup");
    } });
    if (close.length) groups.push({ w: 10, list: close, run: ({ c, b }) => {
      startAttack(M, c, b, t, null, r() < 0.6 ? "pass" : "fail", "close");
      if (b.age - c.age > 8) emit(M, { t, kind: "radio", no: c.no, who: sur(c), text: "Push now, he's on old tyres." });
      else if (r() < 0.35) emit(M, { t, kind: "radio", no: c.no, who: sur(c), text: "Gap's coming down. Keep pushing." });
    } });
    // Incidents at the next corner.
    const inc = (kind, maxV, key) => {
      const list = [];
      racing.forEach((c) => {
        M.P.corners.forEach((cn) => {
          if (cn.vMin > maxV) return;
          const dT = nextD(c.d, key === "apex" ? cn.frac : cn.brake, 30 / M.len);
          const tt = timeTo(M, c, dT);
          if (tt > 1.2 && tt < 6) list.push({ w: 1 + (cn.important ? 1.2 : 0), c, cn, dT });
        });
      });
      return list;
    };
    const lock = inc("lockup", 0.56, "brake"), wide = inc("wide", 0.78, "apex"), off = inc("off", 0.6, "brake"), spin = inc("spin", 0.72, "apex");
    const mk = (kind) => ({ c, cn, dT }) => { c.inc = { kind, cn, dT, phase: null, side: cn.side, spinDir: r() < 0.5 ? -1 : 1 }; };
    const wet = COND.weather === "rain" ? 1.5 : 1;
    if (lock.length) groups.push({ w: 14 * wet, list: lock, run: mk("lockup") });
    if (wide.length) groups.push({ w: 10, list: wide, run: mk("wide") });
    if (off.length && t > 25) groups.push({ w: 6 * wet, list: off, run: mk("off") });
    if (spin.length && t > 40) groups.push({ w: 3 * wet, list: spin, run: mk("spin") });
    // Pit stops for worn tyres.
    if (t - D.lastPit > 45) {
      const pits = racing.filter((c) => c.stints.length < 2 && (c.age >= 14 || c.age > c.cliff - 2)).map((c) => {
        const dE = nextD(c.d, M.P.pit.entry, 20 / M.len), tt = timeTo(M, c, dE);
        return tt > 4 && tt < 16 ? { w: c.age, c, dE } : null;
      }).filter(Boolean);
      if (pits.length) groups.push({ w: 9, list: pits, run: ({ c, dE }) => {
        c.box = { dEntry: dE, dBox: dE + M.P.pit.span * 0.5, dExit: dE + M.P.pit.span, phase: "in" };
        D.lastPit = t;
        emit(M, { t: t + 0.4, kind: "radio", no: c.no, who: sur(c), text: r() < 0.5 ? "Box, box." : "Box this lap. Box, box." });
      } });
    }
    if (t > 80 && t - D.lastVsc > 420) groups.push({ w: 1.6, list: [{ w: 1 }], run: () => startVsc(M, t + 1.5) });
    const pick = (arr) => { let s = arr.reduce((a, x) => a + x.w, 0) * r(); for (const x of arr) { s -= x.w; if (s <= 0) return x; } return arr[arr.length - 1]; };
    if (starved) {
      // Too long without anything on screen: something quick at the next corner.
      const quick = [...lock, ...wide].filter((q) => timeTo(M, q.c, q.dT) < 4.5);
      if (!quick.length) { D.next = t + 0.5; return; }
      const q = pick(quick);
      mk(lock.includes(q) ? "lockup" : "wide")(q);
      D.forced = t;
      D.next = t + 7;
      return;
    }
    if (!groups.length) { D.next = t + 1; return; }
    const gsel = pick(groups);
    gsel.run(pick(gsel.list));
    D.first = false;
    D.next = t + 7;
  }

  function startVsc(M, t) {
    M.vsc = { t0: t, t1: t + 24 };
    M.vscs.push(M.vsc);
    M.dir.lastVsc = t;
    M.cars.forEach((c) => { if (c.att) endAttack(c, t); });
    emit(M, { t, kind: "vsc", text: "VIRTUAL SAFETY CAR", prio: 2, major: true });
    M.vsc.ending = false; M.vsc.green = false;
  }
  function endAttack(c, t, why) {
    if (c.att && c.att.tgt.def && c.att.tgt.def.by === c) c.att.tgt.def = null;
    c.att = null;
    c.attCool = t + 6;
  }

  // ---------------------------------------------------------------------------
  function step(M) {
    const t0 = (M.n - 1) * DT;
    const { cars, P, len, k } = M, N = P.N;
    director(M, t0);
    const vsc = M.vsc && t0 >= M.vsc.t0 && t0 < M.vsc.t1 ? M.vsc : null;
    if (M.vsc && !M.vsc.ending && t0 >= M.vsc.t1 - 7) { M.vsc.ending = true; emit(M, { t: t0, kind: "vsc", text: "VSC ENDING", prio: 1 }); }
    if (M.vsc && !M.vsc.green && t0 >= M.vsc.t1) { M.vsc.green = true; emit(M, { t: t0, kind: "green", text: "GREEN FLAG · RACING RESUMES", prio: 2, major: true }); M.dir.next = t0 + 1; }
    const yel = M.yellow && t0 < M.yellow.t1 ? M.yellow : null;
    const order = [...cars].sort((a, b) => b.d - a.d);
    order.forEach((c, i) => { c.rank = i + 1; c.ahead = order[i - 1] || null; });
    for (const c of cars) {
      c.frac = c.d - Math.floor(c.d); c.s = c.frac * len; c.pi = Math.min(N - 1, Math.floor(c.frac * N)); c.flags = 0; c.yield = false;
    }

    // 1. What each car wants to do this step.
    for (const c of cars) {
      const i = c.pi, line = clamp(P.line[i] * c.lineGain + c.lineBias, -EDGE, EDGE);
      let vt = P.v[i] * k * c.m, latT = line, latRate = 7;
      c.accMul = 1;
      if (t0 < c.boostUntil) vt *= c.boost;
      if (t0 < c.slowUntil) vt *= c.slow;
      c.pitLane = false;

      const a = c.att;
      if (a) {
        const b = a.tgt, gap = (b.d - c.d) * len;
        if (t0 > a.until || b.box || (b.inc && b.inc.phase && b.inc.kind !== "lockup") || c.inc || c.box || vsc) endAttack(c, t0, "abort");
        else if (gap < -CAR_L * 1.15) endAttack(c, t0, "passed");
        else if (a.phase === "close") {
          vt *= 1.045;
          if (gap < CAR_L * 2.2) {
            const z = zonesAhead(M, c, 140)[0];
            if (z) { a.zone = z; a.phase = "setup"; a.until = t0 + 16; }
          }
        } else {
          const z = a.zone;
          if (a.phase === "setup" && c.d >= z.dS - 330 / len) {
            a.phase = "go";
            a.side = z.kind === "brake" ? z.corner.side : (b.lat > 0 ? -1 : 1);
            if (a.outcome === "fail" && z.kind === "brake") b.def.cover = a.side;
          }
          if (a.phase === "go") {
            latT = b.lat + a.side * CAR_W * 1.45;
            if (Math.abs(latT) > EDGE + 1) { a.side = -a.side; latT = b.lat + a.side * CAR_W * 1.45; }
            latT = clamp(latT, -EDGE - 1, EDGE + 1);
            latRate = 9;
            const alongside = gap < CAR_L * 0.9;
            if (alongside && !a.duel) {
              a.duel = true;
              emit(M, { t: t0, kind: "duel", nos: [c.no, b.no], frac: c.frac, prio: 2, major: true });
            }
            if (c.d < z.dS || z.kind === "drs") {
              // Tow (and DRS on the straight) to get a wheel alongside.
              const drs = z.kind === "drs" && c.d >= z.dS && c.d <= z.dE;
              if (drs) c.flags |= F.DRS;
              if (gap > -CAR_L * 0.3) {
                const f = (drs ? 1.09 : 1.065) * (a.outcome === "fail" ? 0.98 : 1);
                vt *= f; c.accMul = 1 + (f - 1) * 2.4;
              }
            } else if (c.d < z.dApex) {
              vt = Math.max(vt, P.vl[i] * k * c.m * (a.outcome === "cutback" ? 1.05 : 1));
            } else if (c.d < z.dE + 40 / len) {
              if (a.outcome === "fail") vt *= 0.93;
              if (a.outcome === "cutback") { latT = -z.corner.side * (EDGE + 4); vt *= 0.9; if (b.def) b.def.cut = true; }
              else if (a.outcome === "pass" && alongside) { vt *= 1.04; c.accMul = 1.15; }
            }
            if (c.d > z.dE + 140 / len) {
              const nz = !a.chained && zonesAhead(M, c, 30)[0];
              if (nz && nz.kind === "brake" && timeTo(M, c, nz.dS) < 6 && gap > -CAR_L) { a.zone = nz; a.phase = "setup"; a.chained = true; a.until = t0 + 12; }
              else {
                if (gap > 0 && a.outcome !== "pass" && !vsc) emit(M, { t: t0, kind: "defend", text: `DEFENDED · ${sur(b)} HOLDS P${b.rank}`, nos: [b.no, c.no], frac: b.frac, prio: 1, major: true });
                endAttack(c, t0, "zone-over");
              }
            }
          }
        }
      }
      if (c.def) {
        const by = c.def.by, z = by.att && by.att.zone;
        if (!by.att || by.att.tgt !== c) c.def = null;
        else if (z && by.att.phase === "go" && z.kind === "brake") {
          if (c.def.cover && c.d >= z.dS - 90 / len && c.d < z.dApex) { latT = c.def.cover * EDGE * 0.85; latRate = 8; }
          if (c.d >= z.dS && c.d < z.dApex) {
            if (by.att.outcome === "pass") vt = Math.min(vt, P.v[i] * k * c.m * 0.95);
            else vt = Math.max(vt, P.vl[i] * k * c.m * (by.att.outcome === "fail" ? 1 : 0.97));
          }
          if (c.def.cut && c.d >= z.dApex && c.d < z.dE + 200 / len) { latT = z.corner.side * EDGE * 0.7; vt *= 1.06; c.accMul = 1.2; }
          if (by.att.outcome === "pass" && c.d >= z.dApex && c.d < z.dE + 60 / len) c.accMul = Math.min(c.accMul, 0.9);
        }
      }

      const inc = c.inc;
      if (inc) {
        if (!inc.phase && c.d >= inc.dT) {
          inc.phase = "on"; inc.t0 = t0;
          const cn = inc.cn, where = cn.label || `S${cn.sector}`;
          const text = { lockup: `LOCK-UP · ${sur(c)} ${where}`, wide: `WIDE · ${sur(c)} ${where}`, off: `OFF · ${sur(c)} ${where}`, spin: `SPIN · ${sur(c)} ${where}` }[inc.kind];
          emit(M, { t: t0, kind: inc.kind, text, nos: [c.no], frac: c.frac, prio: inc.kind === "wide" ? 1 : inc.kind === "lockup" ? 2 : 3, replay: inc.kind !== "wide", major: true });
          if (inc.kind === "off" || inc.kind === "spin") {
            M.yellow = { sector: cn.sector, t0: t0 + 0.8, t1: t0 + 12 };
            M.yellows.push(M.yellow);
            emit(M, { t: t0 + 0.8, kind: "yellow", text: `YELLOW · SECTOR ${cn.sector}`, prio: 1 });
            if (inc.kind === "spin" && t0 - M.dir.lastVsc > 300 && M.rng() < 0.45) startVsc(M, t0 + 3);
          }
        }
        if (inc.phase) {
          const el = t0 - inc.t0, cn = inc.cn;
          const dA = nextD(inc.dT - 0.001, cn.frac), dE = nextD(dA, cn.exit);
          if (inc.kind === "lockup") {
            if (el < 0.9) c.flags |= F.SMOKE;
            if (c.d < dA) vt = Math.max(vt, P.vl[i] * k * c.m * 1.03);
            else vt *= 0.9;
            if (c.d < dE) { latT = -inc.side * (EDGE + 3); latRate = 8; }
            if (c.d > dE + 50 / len) c.inc = null;
          } else if (inc.kind === "wide") {
            latT = -inc.side * (EDGE + 5.5); latRate = 8; vt *= 0.96;
            if (c.d > dE + 40 / len || el > 4) c.inc = null;
          } else if (inc.kind === "off" || inc.kind === "spin") {
            const spin = inc.kind === "spin";
            if (!inc.rejoin) {
              latRate = spin ? 6 : 17;
              latT = -inc.side * (spin ? EDGE + 8 : 31);
              if (spin) {
                const u = Math.min(1, el / 1.7);
                c.yaw = inc.spinDir * 720 * (1 - Math.pow(1 - u, 2.2));
                if (el < 1.3) c.flags |= F.SMOKE;
                c.flags |= F.SPIN;
                vt = 0;
                if (el > 3.2) { inc.rejoin = true; c.yaw = 0; }
              } else {
                vt = Math.min(vt, (Math.abs(c.lat) > 19 ? 0.28 : 0.75) * P.v[i] * k);
                if (el < 0.6) c.flags |= F.SMOKE;
                if (el > 2.8) inc.rejoin = true;
              }
            } else {
              latT = line; latRate = 3.5;
              vt = Math.min(vt, 0.5 * k);
              if (Math.abs(c.lat) < 14) c.inc = null;
            }
          }
        }
      }

      const bx = c.box;
      if (bx) {
        if (c.d >= bx.dEntry - 0.012 && c.d < bx.dExit + 0.02) {
          c.flags |= F.PIT;
          const inLane = c.d >= bx.dEntry - 0.004 && c.d < bx.dExit;
          if (inLane || bx.phase !== "out") { latT = P.pit.lat; latRate = 9; }
          if (inLane) { c.pitLane = true; vt = Math.min(vt, M.pitV); }
          if (!bx.emitted && c.d >= bx.dEntry) {
            bx.emitted = true;
            emit(M, { t: t0, kind: "pit", text: `PIT · ${sur(c)}`, nos: [c.no], frac: c.frac, prio: 2, major: true });
          }
          if (bx.phase === "in") {
            vt = Math.min(vt, Math.sqrt(2 * M.brk * 0.6 * Math.max(0, (bx.dBox - c.d) * len)) + 0.4);
            if (c.d >= bx.dBox - 0.6 / len || (c.v < 0.8 && c.d > bx.dBox - 4 / len)) { bx.phase = "stop"; bx.stopT = t0; }
          }
          if (bx.phase === "stop") {
            vt = 0; c.v = 0;
            if (t0 - bx.stopT > 2.4) {
              bx.phase = "out";
              c.comp = NEXT_TYRE[c.comp] || "M"; c.age = 0; c.cliff = CLIFF[c.comp] * (0.9 + M.rng() * 0.2); c.degMul = 0.8 + M.rng() * 0.4;
              c.stints.push({ t: t0, comp: c.comp, age0: 0, lap: Math.floor(c.d) });
              c.m = M.L / lapTarget(M, c, Math.floor(c.d));
            }
          }
        } else if (c.d >= bx.dExit + 0.02) {
          c.box = null;
        }
        if (bx.phase === "out" && c.d >= bx.dExit) { latRate = 4; }
      }

      if (vsc) {
        const ah = c.ahead, gap = ah ? (ah.d - c.d) * len : Infinity;
        vt = Math.min(vt, P.v[i] * k * (gap > CAR_L * 2.6 ? 0.76 : 0.6));
      } else if (yel && sectorOf(c.frac) === yel.sector && !c.inc) vt *= 0.965;
      c.vt = vt; c.latT = latT; c.latRate = latRate;
    }

    // 2. Traffic: follow a car on the same line, keep clear of a car alongside, move over for
    // a car lapping you.
    for (let x = 0; x < cars.length; x++) {
      const a = cars[x];
      for (let y = 0; y < cars.length; y++) {
        if (x === y) continue;
        const b = cars[y];
        let g = b.s - a.s;
        if (g > len / 2) g -= len; else if (g < -len / 2) g += len;
        if (Math.abs(g) > CAR_L * 4) continue;
        if (a.pitLane !== b.pitLane) continue;
        const dl = Math.abs(a.lat - b.lat);
        if (g > 0 && g < CAR_L * 1.4 && dl < CAR_W * 1.15) {
          const lim = b.v + (g - CAR_L * 1.18) * 2.2;
          if (lim < a.vt) { a.vt = Math.max(0, lim); a.blocked = b; }
        }
        if (Math.abs(g) < CAR_L * 1.1 && dl >= CAR_W * 0.55) {
          if (a.lat >= b.lat) a.latT = Math.max(a.latT, b.lat + CAR_W * 1.35);
          else a.latT = Math.min(a.latT, b.lat - CAR_W * 1.35);
        }
        if (g > 0 && g < CAR_L * 4 && a.d - b.d > 0.5 && !b.inc && !b.box) {
          b.latT = a.lat > 0 ? -EDGE * 0.85 : EDGE * 0.85; b.vt *= 0.975; b.yield = true;
        }
      }
    }

    // 3. Integrate.
    for (const c of cars) {
      const gravel = Math.abs(c.lat) > 19.5 && !c.pitLane && !(c.box && c.flags & F.PIT);
      const dec = M.brk * (gravel ? 1.1 : 1.8), acc = M.acc * 1.3 * c.accMul;
      c.v += clamp(c.vt - c.v, -dec * DT, acc * DT);
      if (c.v < 0) c.v = 0;
      c.d += (c.v * DT) / len;
      const lt = clamp(c.latT, -34, 34);
      c.lat += clamp((lt - c.lat) * 2.8, -c.latRate, c.latRate) * DT;
      if (!(c.flags & F.PIT)) {
        const al = Math.abs(c.lat);
        if (al > 16.2 && al <= 20) c.flags |= F.KERB;
        if (al > 20) c.flags |= F.DUST;
      }
      // Emergent attacks: a faster car stuck behind for a few seconds has a go.
      if (c.blocked && !c.att && !c.def && !c.inc && !c.box && !vsc && t0 >= c.attCool && c.m > c.blocked.m * 1.004) {
        c.blockedT += DT;
        const b = c.blocked;
        if (c.blockedT > 3 && !b.att && !b.def && !b.box && !b.inc) {
          const z = zonesAhead(M, c, 140).find((q) => timeTo(M, c, q.dS) < 7);
          if (z) { startAttack(M, c, b, t0, z, M.rng() < 0.55 ? "pass" : M.rng() < 0.6 ? "fail" : "cutback", "setup"); c.blockedT = 0; }
        }
      } else if (!c.blocked) c.blockedT = Math.max(0, c.blockedT - DT);
      c.blocked = null;
    }
    // Hard limit: never drive through the car ahead on the same line.
    for (const a of cars) for (const b of cars) {
      if (a === b || a.pitLane !== b.pitLane) continue;
      let g = (b.d - Math.floor(b.d) - (a.d - Math.floor(a.d))) * len;
      if (g > len / 2) g -= len; else if (g < -len / 2) g += len;
      if (g > 0 && g < CAR_L && Math.abs(a.lat - b.lat) < CAR_W * 0.95) { a.d -= (CAR_L - g) / len; a.v = Math.min(a.v, b.v); }
    }

    const t1 = t0 + DT;
    // 4. Lap and sector crossings, tyres, fastest laps.
    for (const c of cars) {
      const d0 = c.hd[M.n - 1], d1 = c.d;
      const at = (x) => t0 + DT * clamp((x - d0) / Math.max(1e-9, d1 - d0), 0, 1);
      const l0 = Math.floor(d0);
      [SECTOR_SPLIT[0], SECTOR_SPLIT[1]].forEach((sp, j) => {
        const x = l0 + sp;
        if (d0 < x && d1 >= x) { (c.secX[l0] = c.secX[l0] || [])[j] = at(x); }
      });
      if (Math.floor(d1) > l0) {
        const lap = l0 + 1;
        c.cross[lap] = at(lap);
        c.age += 1;
        c.m = M.L / lapTarget(M, c, lap);
        const lt = c.cross[lap] - c.cross[l0];
        if (c.cross[l0] >= 0 && lt < M.bestLap - 0.0005 && c.stints.length && !(c.flags & F.PIT)) {
          emit(M, { t: c.cross[lap], kind: "fastest", text: `FASTEST LAP · ${sur(c)} ${fmtLap(lt)}`, nos: [c.no], prio: 1, major: true });
        }
        M.bestLap = Math.min(M.bestLap, lt);
      }
    }
    // 5. Overtakes, with a little hysteresis so a side-by-side moment isn't announced twice.
    const sortedNow = [...cars].sort((a, b) => b.d - a.d);
    sortedNow.forEach((c, i) => { c.rankNow = i + 1; });
    for (let x = 0; x < cars.length; x++) for (let y = x + 1; y < cars.length; y++) {
      const a = cars[x], b = cars[y], key = a.no + "-" + b.no;
      const diff = (a.d - b.d) * len, prev = M.pairs[key];
      const lead = diff > CAR_L * 0.3 ? a : diff < -CAR_L * 0.3 ? b : prev;
      if (!lead) continue;
      M.pairs[key] = lead;
      if (!prev || prev === lead) continue;
      const other = lead === a ? b : a;
      if (Math.abs(diff) > CAR_L * 4 || lead.flags & F.PIT || other.flags & F.PIT || other.pitLane || lead.pitLane) continue;
      if (other.inc && other.inc.phase && (other.inc.kind === "off" || other.inc.kind === "spin")) continue;
      if (vsc) continue;
      const cut = lead.def && lead.def.cut;
      emit(M, { t: t1, kind: cut ? "cutback" : "overtake", text: `${cut ? "CUTBACK" : "OVERTAKE"} · ${sur(lead)} P${lead.rankNow}`, nos: [lead.no, other.no], frac: lead.d - Math.floor(lead.d), prio: 3, replay: true, major: true });
      if (lead.att && lead.att.tgt === other) endAttack(lead, t1);
    }
    record(M);
  }

  function ensure(M, t) {
    const target = Math.min(t, 4 * 3600);
    let guard = 0;
    while ((M.n - 1) * DT < target && guard++ < 200000) step(M);
  }

  // ---------------------------------------------------------------------------
  // Queries.
  function dAt(M, c, t) {
    if (t <= 0) return c.hd[0] + (t * c.hv[0]) / M.len;
    ensure(M, t + DT);
    const f = t / DT, i0 = Math.floor(f), a = f - i0;
    return c.hd[i0] + (c.hd[i0 + 1] - c.hd[i0]) * a;
  }
  function timeAtDistance(M, c, d) {
    if (d <= c.hd[0]) return -((c.hd[0] - d) * M.len) / Math.max(1, c.hv[0]);
    let lo = 0, hi = M.n - 1;
    if (c.hd[hi] < d) return hi * DT;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c.hd[mid] < d) lo = mid; else hi = mid; }
    const a = (d - c.hd[lo]) / Math.max(1e-12, c.hd[hi] - c.hd[lo]);
    return (lo + clamp(a, 0, 1)) * DT;
  }
  function sampleAt(M, c, t) {
    if (t <= 0) { const d = dAt(M, c, t); return { d, frac: d - Math.floor(d), lat: c.hl[0], yaw: 0, flags: 0, v: c.hv[0] }; }
    ensure(M, t + DT);
    const f = t / DT, i0 = Math.floor(f), i1 = i0 + 1, a = f - i0;
    const d = c.hd[i0] + (c.hd[i1] - c.hd[i0]) * a;
    const lat = c.hl[i0] + (c.hl[i1] - c.hl[i0]) * a;
    const ds = (c.hd[i1] - c.hd[i0]) * M.len;
    const latYaw = ds > 0.05 ? (Math.atan2(c.hl[i1] - c.hl[i0], ds) * 180) / Math.PI : 0;
    return { d, frac: d - Math.floor(d), lat, yaw: c.hy[i0] + (c.hy[i1] - c.hy[i0]) * a + latYaw, flags: c.hf[a < 0.5 ? i0 : i1], v: c.hv[i0] };
  }
  // Past samples every `every` steps over `span` seconds, newest first (smoke, dust, trails).
  function trace(M, c, t, span, every) {
    const out = [];
    if (t <= 0) return out;
    ensure(M, t + DT);
    const i1 = Math.floor(t / DT), i0 = Math.max(0, i1 - Math.round(span / DT));
    for (let i = i1; i >= i0; i -= every) { const d = c.hd[i]; out.push({ t: i * DT, frac: d - Math.floor(d), lat: c.hl[i], flags: c.hf[i] }); }
    return out;
  }
  function stintAt(c, t) { let s = c.stints[0]; for (const q of c.stints) if (q.t <= t) s = q; return s; }
  function sectorsFor(M, c, lap) {
    const a = c.cross[lap], b = c.cross[lap + 1], s = c.secX[lap];
    if (a != null && b != null && s && s[0] != null && s[1] != null) return [s[0] - a, s[1] - s[0], b - s[1]];
    const lt = a != null && b != null ? b - a : M.L;
    return [lt * SECTOR_SPLIT[0], lt * (SECTOR_SPLIT[1] - SECTOR_SPLIT[0]), lt * (1 - SECTOR_SPLIT[1])];
  }
  const inAny = (list, t) => list.find((q) => t >= q.t0 && t < q.t1);

  function state(M, t) {
    ensure(M, t + 6);
    const rows = M.cars.map((car) => ({ car, d: dAt(M, car, t) })).sort((a, b) => b.d - a.d);
    const lead = rows[0];
    const leaderFinished = lead.d >= M.lapsTotal + 1;
    const lastSectors = rows.map((r) => sectorsFor(M, r.car, Math.floor(r.d) - 1));
    const bestSector = [0, 1, 2].map((j) => Math.min(...lastSectors.map((s) => s[j])));
    let fastest = null;
    const idx = Math.max(0, Math.min(M.n - 1, Math.round(t / DT)));
    const cars = rows.map((r, i) => {
      const { car, d } = r;
      const lap = Math.floor(d);
      const gapS = i === 0 ? 0 : t - timeAtDistance(M, lead.car, d);
      const ahead = i === 0 ? null : rows[i - 1];
      const intS = ahead ? t - timeAtDistance(M, ahead.car, d) : 0;
      const last = car.cross[lap] - car.cross[lap - 1];
      let bestSec = Infinity;
      for (let q = START_LAP - 3; q < lap; q++) if (car.cross[q] != null && car.cross[q + 1] != null && car.cross[q + 1] <= t) bestSec = Math.min(bestSec, car.cross[q + 1] - car.cross[q]);
      if (!isFinite(bestSec)) bestSec = last;
      if (!fastest || bestSec < fastest.sec) fastest = { sec: bestSec, car };
      const secs = lastSectors[i];
      const prevSecs = sectorsFor(M, car, lap - 2);
      const st = stintAt(car, t);
      const tyreAge = Math.max(0, st.age0 + (lap - st.lap));
      const lapsRun = lap - START_LAP;
      const burn = M.carClass.fuel_kg_per_lap;
      const fuel = M.carClass.id === "e_spec" ? Math.max(0, car.fuel0 - lapsRun * 0.9) : Math.max(0, car.fuel0 - lapsRun * burn);
      const lapped = gapS > M.L;
      const flags = car.hf[idx];
      return {
        ...car.static,
        pos: i + 1,
        gap: i === 0 ? "LEADER" : lapped ? `+${Math.floor(gapS / M.L)} LAP` : `+${gapS.toFixed(3)}`,
        interval: i === 0 ? "—" : `+${intS.toFixed(3)}`,
        _gapS: gapS,
        _intS: intS,
        _dist: d,
        _lapFrac: d - lap,
        _lap: lap,
        _flags: flags,
        _pit: !!(flags & F.PIT),
        _drs: !!(flags & F.DRS),
        last_lap: fmtLap(last),
        best_lap: fmtLap(bestSec),
        tire: st.comp,
        tire_age: tyreAge,
        fuel,
        sectors: secs.map((s, j) => ({
          s: "S" + (j + 1),
          t: s.toFixed(3),
          state: s <= bestSector[j] + 1e-6 ? "purple" : s < prevSecs[j] ? "green" : "yellow",
        })),
      };
    });
    const lap = Math.min(M.lapsTotal, Math.floor(lead.d));
    const vsc = inAny(M.vscs, t), yel = inAny(M.yellows, t);
    return {
      t,
      lap,
      lapsTotal: M.lapsTotal,
      flag: leaderFinished ? "checkered" : vsc ? "vsc" : yel ? "yellow" : "green",
      yellowSector: yel ? yel.sector : null,
      cars,
      order: cars.map((c) => c.no),
      fastest: fastest && {
        time: fmtLap(fastest.sec),
        car: fastest.car.no,
        driver: fastest.car.static.name.split(" ").slice(-1)[0],
      },
    };
  }

  // Events that have happened in (t - span, t].
  function recent(M, t, span) {
    const out = [];
    for (let i = M.events.length - 1; i >= 0; i--) {
      const e = M.events[i];
      if (e.t > t) continue;
      if (e.t <= t - span) { if (e.t < t - span - 30) break; continue; }
      out.unshift(e);
    }
    return out;
  }
  // Events scheduled in (t0, t1] — the simulation runs a few seconds ahead of the clock, which
  // lets the camera director be in position before something happens.
  function upcoming(M, t0, t1) {
    ensure(M, t1);
    return M.events.filter((e) => e.t > t0 && e.t <= t1);
  }

  function lapFrac(M, car, t) {
    const d = dAt(M, car, t);
    return d - Math.floor(d);
  }

  // ---------------------------------------------------------------------------
  // Shared clock. Lives outside React; components subscribe at the rate they need.
  const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = {
    t: 0,
    running: true,
    reduceMotion,
    subs: new Set(),
    loopAt: Infinity,
    subscribe(fn) { clock.subs.add(fn); return () => clock.subs.delete(fn); },
    reset() { clock.t = 0; },
  };
  let last = null, raf = 0;
  function frame(now) {
    if (last != null) {
      const dt = Math.min(0.25, (now - last) / 1000);
      clock.t += dt;
      if (clock.t > clock.loopAt) clock.t = 0;
    }
    last = now;
    clock.subs.forEach((fn) => fn(clock.t));
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) { last = null; raf = requestAnimationFrame(frame); } clock.running = true; }
  function stop() { cancelAnimationFrame(raf); raf = 0; clock.running = false; }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  if (!document.hidden) start();

  // React hook: re-render the calling component at most `hz` times a second.
  function useRaceTime(hz) {
    const [t, setT] = React.useState(clock.t);
    React.useEffect(() => {
      const step = 1 / hz;
      let lastEmit = -Infinity;
      return clock.subscribe((now) => {
        if (now < lastEmit || now - lastEmit >= step) { lastEmit = now; setT(now); }
      });
    }, [hz]);
    return t;
  }

  // ---------------------------------------------------------------------------
  // Track geometry: an arc-length lookup table per circuit so nothing calls
  // getPointAtLength per frame. Also the S/F offset, driving direction and turn
  // positions (as lap fractions) used for car placement and telemetry corners.
  const geomCache = {};
  const LUT_N = 1500;
  function trackGeom(track) {
    if (geomCache[track.id]) return geomCache[track.id];
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.position = "absolute"; svg.style.visibility = "hidden";
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", track.path);
    svg.appendChild(path);
    document.body.appendChild(svg);
    const len = path.getTotalLength();
    const pts = new Float32Array(LUT_N * 2);
    for (let i = 0; i < LUT_N; i++) {
      const p = path.getPointAtLength((i / LUT_N) * len);
      pts[i * 2] = p.x; pts[i * 2 + 1] = p.y;
    }
    document.body.removeChild(svg);
    const nearest = (x, y) => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < LUT_N; i++) {
        const dx = pts[i * 2] - x, dy = pts[i * 2 + 1] - y;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      return best / LUT_N;
    };
    const sf = track.sf_line;
    const sfS = sf ? nearest((sf.x1 + sf.x2) / 2, (sf.y1 + sf.y2) / 2) : 0;
    const turnS = (track.turns || []).map((t) => nearest(t.x, t.y));
    // Driving direction: turns are numbered in driving order.
    let fwd = 0;
    for (let i = 1; i < turnS.length; i++) {
      const delta = ((turnS[i] - turnS[i - 1]) % 1 + 1) % 1;
      fwd += delta < 0.5 ? 1 : -1;
    }
    const dir = fwd >= 0 ? 1 : -1;
    const toLapFrac = (s) => (((s - sfS) * dir) % 1 + 1) % 1;
    const corners = (track.turns || []).map((t, i) => ({ ...t, frac: toLapFrac(turnS[i]) }))
      .sort((a, b) => a.frac - b.frac);
    // Point at a lap fraction (0 = S/F line), with heading in degrees.
    function at(frac) {
      const s = ((sfS + dir * frac) % 1 + 1) % 1;
      const f = s * LUT_N;
      const i0 = Math.floor(f) % LUT_N, i1 = (i0 + 1) % LUT_N, a = f - Math.floor(f);
      const x = pts[i0 * 2] + (pts[i1 * 2] - pts[i0 * 2]) * a;
      const y = pts[i0 * 2 + 1] + (pts[i1 * 2 + 1] - pts[i0 * 2 + 1]) * a;
      const j = ((i0 + dir * 3) % LUT_N + LUT_N) % LUT_N;
      const hx = pts[j * 2] - pts[i0 * 2], hy = pts[j * 2 + 1] - pts[i0 * 2 + 1];
      return { x, y, rad: Math.atan2(hy, hx), angle: Math.atan2(hy, hx) * 180 / Math.PI };
    }
    const g = { len, at, corners, dir, sfS };
    geomCache[track.id] = g;
    return g;
  }

  // Telemetry trace for a car, with brake zones at the circuit's own corners.
  const teleCache = {};
  function telemetry(no, track) {
    const key = no + ":" + (track ? track.id : "-");
    if (teleCache[key]) return teleCache[key];
    const corners = track ? trackGeom(track).corners.map((c) => Math.round(c.frac * 100)) : null;
    return (teleCache[key] = window.APEX_DATA.generateTelemetry(no, corners));
  }

  window.RaceModel = { build, state, lapFrac, fmtLap, START_LAP, sampleAt, trace, recent, upcoming, ensure, profile, CAR_L, CAR_W, FLAGS: F, SEED, COND,
    TYRES: { CLIFF, NEXT_TYRE, DEG } };
  window.RaceClock = clock;
  window.useRaceTime = useRaceTime;
  window.trackGeom = trackGeom;
  window.carTelemetry = telemetry;
})();
