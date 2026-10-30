// Camera director for the cinema view. It reads the race simulation a few seconds ahead, so it
// can be in position before something happens, and cuts between chase, trackside, helicopter
// and corner shots with a quick whip or fade. After an overtake or incident it may run a short
// slow-motion replay. The frame pans and zooms only; it never rotates.
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeIO = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  const RM = () => window.RaceModel;
  const SHOT_KINDS = new Set(["overtake", "cutback", "lockup", "wide", "off", "spin", "pit", "duel"]);
  const now = { subject: [], shot: null, replay: false };

  function mulberry(a) {
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function worldOf(geom, s) {
    const p = geom.at(s.frac), nx = -Math.sin(p.rad), ny = Math.cos(p.rad);
    return { x: p.x + nx * s.lat, y: p.y + ny * s.lat, rad: p.rad, angle: p.angle + s.yaw, frac: s.frac, d: s.d, v: s.v, flags: s.flags };
  }

  function positions(model, geom, t) {
    const out = {};
    model.cars.forEach((mc) => { out[mc.no] = worldOf(geom, RM().sampleAt(model, mc, t)); });
    return out;
  }

  // Next corner the car reaches in `lo`..`hi` seconds.
  function cornerAhead(model, geom, p, lo, hi) {
    const P = RM().profile(model.track);
    let best = null;
    P.corners.forEach((cn) => {
      const ahead = ((cn.frac - p.frac) % 1 + 1) % 1;
      const tt = (ahead * P.len) / Math.max(8, p.v);
      if (tt >= lo && tt <= hi && (!best || tt < best.tt)) best = { cn, tt };
    });
    if (!best) return null;
    const q = geom.at(best.cn.frac);
    return { ...best, x: q.x, y: q.y, rad: q.rad, side: best.cn.side };
  }

  function target(m, shot, pos, R, reduce) {
    const CL = RM().CAR_L;
    const sub = shot.subject.map((no) => pos[no]).filter(Boolean);
    if (!sub.length) return m.cam;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    sub.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, lead = sub[0];
    const hx = Math.cos(lead.rad), hy = Math.sin(lead.rad);
    const fit = Math.min(R.w * 0.62 / (x1 - x0 + CL * 3), R.h * 0.62 / (y1 - y0 + CL * 3));
    const base = m.ppuChase;
    switch (shot.type) {
      case "heli": return { cx: cx + hx * CL * 3, cy: cy + hy * CL * 3, ppu: Math.min(base * 0.46, fit) };
      case "trackside": return { cx: shot.ax * 0.72 + cx * 0.28, cy: shot.ay * 0.72 + cy * 0.28, ppu: Math.min(base * 0.56, fit * 1.2) };
      case "corner": return { cx: shot.ax * 0.85 + cx * 0.15, cy: shot.ay * 0.85 + cy * 0.15, ppu: Math.min(base * 0.7, fit * 1.3) };
      case "replay": return { cx: cx + hx * CL * 0.6, cy: cy + hy * CL * 0.6, ppu: Math.min(base * 1.12, fit) };
      default: return { cx: cx + hx * CL * 0.9, cy: cy + hy * CL * 0.9, ppu: Math.min(base, fit) };
    }
  }

  function update(memRef, { model, geom, t, W, H, reduce, cars, follow = null, airflow = false }) {
    let m = memRef.current;
    if (!m || m.model !== model || t < m.t - 0.5 || t - m.t > 4) {
      m = memRef.current = {
        model, t, shot: null, cam: null, tr: null, replay: null, lastReplay: -99, scanned: t,
        pending: null, handled: new Set(), rng: mulberry((model.seed ^ 0x5bd1e995) >>> 0), lastType: null,
      };
    }
    const dt = Math.max(0, t - m.t);
    m.t = t;
    const CL = RM().CAR_L;
    const R = { x: 0, y: 0, w: W, h: H };
    m.ppuChase = clamp(Math.min(W, H * 1.7) * 0.085, 40, 98) / CL;
    RM().ensure(model, t + 6);

    // A car the viewer picked: no cuts or replays, the camera eases in and stays on it.
    if (follow != null) {
      const pos = positions(model, geom, t), p = pos[follow];
      if (p) {
        m.replay = null; m.pending = null; m.tr = null; m.follow = follow;
        const hx = Math.cos(p.rad), hy = Math.sin(p.rad), back = airflow ? -1.6 : 0.5;
        const tg = { cx: p.x + hx * CL * back, cy: p.y + hy * CL * back, ppu: m.ppuChase * (airflow ? 1.25 : 1.6) };
        if (!m.cam) m.cam = { ...tg };
        else if (reduce) {
          const c = m.cam;
          if (Math.abs(tg.cx - c.cx) * c.ppu > W * 0.22 || Math.abs(tg.cy - c.cy) * c.ppu > H * 0.22 || Math.abs(Math.log(tg.ppu / c.ppu)) > 0.2) m.cam = { ...tg };
        } else {
          const a = 1 - Math.exp(-dt * 2.6), c = m.cam;
          c.cx += (tg.cx - c.cx) * a; c.cy += (tg.cy - c.cy) * a;
          c.ppu *= Math.exp(Math.log(tg.ppu / c.ppu) * a);
        }
        now.subject = [follow]; now.shot = "follow"; now.replay = false;
        return { rt: t, pos, cx: m.cam.cx, cy: m.cam.cy, ppu: m.cam.ppu, overlay: 0, blur: 0, replay: false, subject: now.subject, shot: "follow", follow };
      }
    }
    if (m.follow != null) {
      m.follow = null;
      m.shot = pickBattle(m, model, geom, positions(model, geom, t), cars, t);
    }

    // Replays: queue the best recent moment, run it once the live action allows.
    const fresh = RM().upcoming(model, m.scanned, t);
    m.scanned = t;
    if (!reduce) fresh.forEach((e) => {
      if (e.replay && t - m.lastReplay > 24 && (!m.pending || e.prio >= m.pending.prio)) m.pending = e;
    });
    if (m.pending && t > m.pending.t + 9) m.pending = null;
    const soon = RM().upcoming(model, t, t + 3.4).filter((e) => SHOT_KINDS.has(e.kind) && e.prio >= 2);
    if (m.replay && t >= m.replay.start + m.replay.dur) {
      m.replay = null;
      m.shot = null;
    }
    const excursion = m.pending && (m.pending.kind === "off" || m.pending.kind === "spin");
    if (!m.replay && m.pending && t >= m.pending.t + (excursion ? 3.6 : 1.8) && !soon.length) {
      const e = m.pending, over = e.kind === "overtake" || e.kind === "cutback";
      const t0 = over ? e.t - 1.4 : excursion ? e.t + 0.4 : e.t - 0.4, t1 = over ? e.t + 0.3 : excursion ? e.t + 2.2 : e.t + 1.4, rate = 0.55;
      m.replay = { ev: e, t0, start: t, dur: (t1 - t0) / rate, rate };
      m.lastReplay = t;
      m.pending = null;
      cut(m, { type: "replay", subject: e.nos, until: Infinity }, t, reduce, "fade");
    }
    const rt = m.replay ? m.replay.t0 + (t - m.replay.start) * m.replay.rate : t;
    const pos = positions(model, geom, rt);

    if (!m.replay) {
      // Something is about to happen off-camera: get there first.
      const inShot = new Set(m.shot ? m.shot.subject : []);
      const ev = soon.find((e) => !m.handled.has(e) && e.t - t > 0.4 && !(e.nos || []).every((n) => inShot.has(n)));
      let next = null;
      if (ev) {
        m.handled.add(ev);
        const mc = model.cars.find((c) => c.no === ev.nos[0]);
        const at = worldOf(geom, RM().sampleAt(model, mc, ev.t));
        const lead = ev.t - t;
        next = lead > 1.3 && ev.kind !== "duel" && m.rng() < 0.6
          ? { type: "corner", subject: ev.nos, ax: at.x, ay: at.y, until: ev.t + 2.6, hold: ev.t + 0.8 }
          : { type: "chase", subject: ev.nos, until: ev.t + 3.4, hold: ev.t + 0.8 };
      } else if (!m.shot || t >= m.shot.until || (t > (m.shot.hold || 0) && lost(m, pos, R))) {
        next = pickBattle(m, model, geom, pos, cars, t);
      }
      if (next) cut(m, next, t, reduce, null);
    }

    // Camera: ease toward this shot's framing, through a whip or fade on a cut.
    const tg = target(m, m.shot, pos, R, reduce) || m.cam;
    let overlay = 0, blur = 0;
    if (!m.cam) m.cam = { ...tg };
    const tr = m.tr;
    if (tr) {
      const u = clamp((t - tr.start) / tr.dur, 0, 1);
      if (tr.kind === "whip") {
        const e = easeIO(u);
        m.cam = {
          cx: tr.from.cx + (tg.cx - tr.from.cx) * e,
          cy: tr.from.cy + (tg.cy - tr.from.cy) * e,
          ppu: Math.exp(Math.log(tr.from.ppu) + (Math.log(tg.ppu) - Math.log(tr.from.ppu)) * e) * (1 - 0.22 * Math.sin(Math.PI * u)),
        };
        blur = Math.sin(Math.PI * u) * 7;
      } else {
        if (u < 0.5) m.cam = { ...tr.from };
        else m.cam = { ...tg };
        overlay = (1 - Math.abs(u * 2 - 1)) * (reduce ? 0.75 : 1);
      }
      if (u >= 1) { m.tr = null; m.cam = { ...tg }; }
    } else if (reduce) {
      const c = m.cam;
      if (Math.abs(tg.cx - c.cx) * c.ppu > W * 0.28 || Math.abs(tg.cy - c.cy) * c.ppu > H * 0.28 || Math.abs(Math.log(tg.ppu / c.ppu)) > 0.3) m.cam = { ...tg };
    } else {
      const rate = { heli: 1.3, trackside: 1.8, corner: 1.8, replay: 3.6 }[m.shot && m.shot.type] || 2.8;
      const a = 1 - Math.exp(-dt * (m.replay ? rate * m.replay.rate : rate));
      const c = m.cam;
      c.cx += (tg.cx - c.cx) * a;
      c.cy += (tg.cy - c.cy) * a;
      c.ppu *= Math.exp(Math.log(tg.ppu / c.ppu) * a);
    }
    now.subject = m.shot ? m.shot.subject : [];
    now.shot = m.shot && m.shot.type;
    now.replay = !!m.replay;
    return { rt, pos, cx: m.cam.cx, cy: m.cam.cy, ppu: m.cam.ppu, overlay, blur, replay: !!m.replay, subject: now.subject, shot: now.shot };
  }

  function lost(m, pos, R) {
    const s = m.shot, c = m.cam;
    if (!s || !c) return true;
    const p = pos[s.subject[0]];
    if (!p) return true;
    const dx = Math.abs(p.x - c.cx) * c.ppu, dy = Math.abs(p.y - c.cy) * c.ppu;
    return dx > R.w * 0.52 || dy > R.h * 0.52;
  }

  function cut(m, shot, t, reduce, kind) {
    const first = !m.shot && !m.cam;
    m.shot = shot;
    if (shot.type !== "replay") m.lastType = shot.type;
    if (first) return;
    const from = m.cam ? { ...m.cam } : null;
    if (!from) return;
    kind = reduce ? "fade" : kind || (m.rng() < 0.55 ? "whip" : "fade");
    m.tr = { kind, start: t, dur: kind === "whip" ? 0.34 : reduce ? 0.6 : 0.46, from };
  }

  // The best fight on track, filmed a different way from last time.
  function pickBattle(m, model, geom, pos, cars, t) {
    const r = m.rng, sorted = [...cars].sort((a, b) => a.pos - b.pos);
    const cur = m.shot && m.shot.subject.join("-");
    let best = null;
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      if (a._pit || b._pit || b._intS > 1.3) continue;
      const key = a.no + "-" + b.no;
      const s = (1.3 - b._intS) + (i <= 2 ? 0.6 : i <= 5 ? 0.3 : 0) + r() * 0.5 + (key === cur ? 0.35 : 0);
      if (!best || s > best.s) best = { s, subject: [a.no, b.no] };
    }
    if (!best) {
      const pit = sorted.find((c) => c._pit);
      best = { subject: pit && r() < 0.5 ? [pit.no] : [sorted[0].no] };
    }
    const lead = pos[best.subject[0]];
    const vsc = model.vscs.some((v) => t >= v.t0 && t < v.t1);
    const want = [["chase", vsc ? 0.2 : 0.42], ["heli", vsc ? 0.6 : 0.2], ["trackside", 0.22], ["corner", 0.16]]
      .filter(([k]) => k === "chase" || k === "heli" && vsc || k !== m.lastType);
    let sum = want.reduce((s, x) => s + x[1], 0) * r(), type = "chase";
    for (const [k, w] of want) { sum -= w; if (sum <= 0) { type = k; break; } }
    const shot = { type, subject: best.subject, until: t + (type === "heli" ? 5 + r() * 2 : 5.5 + r() * 3.5) };
    if (type === "trackside" || type === "corner") {
      const c = lead && cornerAhead(model, geom, lead, 1.2, 4.2);
      if (!c) shot.type = "chase";
      else {
        const out = type === "trackside" ? 46 : 8, nx = -Math.sin(c.rad), ny = Math.cos(c.rad);
        shot.ax = c.x - nx * c.side * out;
        shot.ay = c.y - ny * c.side * out;
        shot.until = t + Math.min(7, c.tt + 2.2);
        shot.hold = t + c.tt;
      }
    }
    return shot;
  }

  window.CineDirector = { update, now };
})();
