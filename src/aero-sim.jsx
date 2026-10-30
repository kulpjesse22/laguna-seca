// WIND TUNNEL — simulated, illustrative aero. Side view: 2D potential flow (stream function
// relaxed around the shared F1 side profile, extra circulation on the wings) plus a wake and
// shed-vortex model behind the car. Front view: flow splitting around the frontal area and
// wing-tip vortices. Forces come from the per-class AERO table, scaled with airspeed squared.
(function () {
  const useS = React.useState, useE = React.useEffect, useR = React.useRef, useM = React.useMemo;
  const C = window.F1Car;

  const AERO = {
    open_wheel: { cd: 0.92, cl: 3.20, dragN: 780, dfTotal: 1850, topSpeed: 340, label: "F1 SPEC", dfFront: 45, dfRear: 55 },
    gt:         { cd: 0.35, cl: 1.20, dragN: 420, dfTotal: 680,  topSpeed: 295, label: "GT3", dfFront: 42, dfRear: 58 },
    stock:      { cd: 0.38, cl: 0.55, dragN: 460, dfTotal: 340,  topSpeed: 290, label: "STOCK", dfFront: 38, dfRear: 62 },
    prototype:  { cd: 0.73, cl: 2.80, dragN: 650, dfTotal: 1520, topSpeed: 330, label: "LMH", dfFront: 44, dfRear: 56 },
    e_spec:     { cd: 0.28, cl: 0.90, dragN: 310, dfTotal: 520,  topSpeed: 260, label: "E-SPEC", dfFront: 48, dfRear: 52 },
  };
  const DRS_DRAG = 0.84, DRS_REAR = 0.55;
  const REDUCE = window.RaceClock ? window.RaceClock.reduceMotion : false;
  const MID = C.LEN / 2;

  // ---------- distance transform (Felzenszwalb) ----------
  function edt1d(f, n, d, v, z) {
    let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  }
  function edt(solid, nx, ny, h) {
    const m = Math.max(nx, ny), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
    const g = new Float64Array(nx * ny);
    for (let k = 0; k < g.length; k++) g[k] = solid[k] ? 0 : 1e10;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) f[j] = g[j * nx + i];
      edt1d(f, ny, d, v, z);
      for (let j = 0; j < ny; j++) g[j * nx + i] = d[j];
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) f[i] = g[j * nx + i];
      edt1d(f, nx, d, v, z);
      for (let i = 0; i < nx; i++) g[j * nx + i] = Math.sqrt(d[i]) * h;
    }
    return g;
  }

  // Rasterise the solid parts of a view into a grid (row 0 = ground).
  function rasterise(view, drs, nx, ny, h, x0, y1) {
    const cv = document.createElement("canvas");
    cv.width = nx; cv.height = ny;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.setTransform(1 / h, 0, 0, 1 / h, -x0 / h, y1 / h);
    C.paint(ctx, view, { primary: "#fff" }, { drs, mask: true });
    const px = ctx.getImageData(0, 0, nx, ny).data, solid = new Uint8Array(nx * ny);
    for (let r = 0; r < ny; r++) for (let i = 0; i < nx; i++) solid[(ny - 1 - r) * nx + i] = px[(r * nx + i) * 4 + 3] > 110 ? 1 : 0;
    return solid;
  }

  // ---------- side view: stream function ----------
  const SH = 0.02, SX0 = -2.2, SX1 = 9.8, SY1 = 3.4;
  const SNX = Math.round((SX1 - SX0) / SH), SNY = Math.round(SY1 / SH), ITER = 350;

  function* solveSide(drs) {
    const nx = SNX, ny = SNY, N = nx * ny, h = SH;
    // Drawing X = x - MID, so grid column u = (X + MID - SX0) / h.
    const solid = rasterise("side", drs, nx, ny, h, SX0 - MID, SY1);
    const comp = new Int32Array(N).fill(-1), comps = [];
    const stack = new Int32Array(N);
    for (let k = 0; k < N; k++) {
      if (!solid[k] || comp[k] >= 0) continue;
      const id = comps.length, cells = [];
      let sp = 0, sx = 0, sy = 0; stack[sp++] = k; comp[k] = id;
      while (sp) {
        const c = stack[--sp]; cells.push(c);
        const i = c % nx, j = (c / nx) | 0; sx += i; sy += j;
        const nb = [i > 0 ? c - 1 : -1, i < nx - 1 ? c + 1 : -1, j > 0 ? c - nx : -1, j < ny - 1 ? c + nx : -1];
        for (const q of nb) if (q >= 0 && solid[q] && comp[q] < 0) { comp[q] = id; stack[sp++] = q; }
      }
      const cx = SX0 + (sx / cells.length + 0.5) * h, cy = (sy / cells.length + 0.5) * h;
      const edge = new Set();
      for (const c of cells) {
        const i = c % nx, j = (c / nx) | 0;
        if (i > 0 && !solid[c - 1]) edge.add(c - 1);
        if (i < nx - 1 && !solid[c + 1]) edge.add(c + 1);
        if (j > 0 && !solid[c - nx]) edge.add(c - nx);
        if (j < ny - 1 && !solid[c + nx]) edge.add(c + nx);
      }
      // Extra circulation on lifting surfaces: more flux passes underneath (downforce).
      let bias = 0;
      if (cx > 4.85 && cy > 0.62) bias = drs ? 0.012 : 0.035;
      else if (cx > 4.85 && cy > 0.35) bias = 0.015;
      else if (cx < 0.85 && cy < 0.4) bias = 0.02;
      comps.push({ cells: Int32Array.from(cells), edge: Int32Array.from(edge), bias, val: cy });
    }

    const psi = new Float64Array(N);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) psi[j * nx + i] = (j + 0.5) * h;
    const setComps = () => {
      for (const c of comps) {
        let s = 0;
        for (let e = 0; e < c.edge.length; e++) s += psi[c.edge[e]];
        c.val = s / Math.max(1, c.edge.length) + c.bias;
        for (let e = 0; e < c.cells.length; e++) psi[c.cells[e]] = c.val;
      }
    };
    setComps();
    // Rows 0 and ny-1 and column 0 stay at the free-stream value; the outflow column copies its neighbour.
    for (let i = 0; i < nx; i++) psi[i] = 0;
    const W = 1.92, TOP = 2 * SY1;
    for (let it = 0; it < ITER; it++) {
      for (let j = 1; j < ny - 1; j++) {
        const row = j * nx;
        for (let i = 1; i < nx - 1; i++) {
          const k = row + i;
          if (solid[k]) continue;
          psi[k] += W * ((psi[k - 1] + psi[k + 1] + psi[k - nx] + psi[k + nx]) * 0.25 - psi[k]);
        }
        psi[row + nx - 1] = psi[row + nx - 2];
      }
      if (it % 6 === 5) setComps();
      if (it % 25 === 24) yield;
    }

    const u = new Float32Array(N), v = new Float32Array(N), cp = new Float32Array(N);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (solid[k]) continue;
      const pn = j < ny - 1 ? psi[k + nx] : TOP - psi[k], ps = j > 0 ? psi[k - nx] : -psi[k];
      const pe = i < nx - 1 ? psi[k + 1] : psi[k], pw = i > 0 ? psi[k - 1] : psi[k];
      const a = (pn - ps) / (2 * h), b = -(pe - pw) / (2 * h);
      u[k] = a; v[k] = b;
      cp[k] = Math.max(-2, 1 - (a * a + b * b));
    }
    const dist = edt(solid, nx, ny, h);
    return { kind: "side", nx, ny, h, solid, u, v, cp, dist, glow: pressureImage(nx, ny, solid, cp, dist) };
  }

  const cpColour = (cp) => {
    const band = (v) => Math.max(0, Math.min(1, (Math.abs(v) - 0.08) / 0.75));
    if (cp >= 0) { const t = band(cp); return [150 + 105 * t, 200 - 125 * t, 230 - 180 * t]; }
    const t = band(cp); return [150 - 110 * t, 200 - 80 * t, 230 + 25 * t];
  };
  const BUCKETS = 13;
  const bucketOf = (cp) => Math.max(0, Math.min(BUCKETS - 1, Math.round((cp + 1.1) / 2.1 * (BUCKETS - 1))));
  const BUCKET_RGB = Array.from({ length: BUCKETS }, (_, b) => cpColour(-1.1 + 2.1 * b / (BUCKETS - 1)).map(Math.round));

  function pressureImage(nx, ny, solid, cp, dist) {
    const cv = document.createElement("canvas");
    cv.width = nx; cv.height = ny;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (solid[k]) continue;
      const c = cp[k], mag = Math.max(0, Math.min(1, (Math.abs(c) - 0.1) * 1.3));
      const a = 0.85 * Math.pow(mag, 0.8) * Math.exp(-dist[k] / 0.16);
      if (a < 0.01) continue;
      const rgb = c >= 0 ? [255, 70, 45] : [45, 115, 255];
      const o = ((ny - 1 - j) * nx + i) * 4;
      img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = Math.round(a * 255);
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  function sampleSide(F, x, y, out) {
    if (x <= SX0 || x >= SX1 - SH || y >= SY1 - SH) { out[0] = 1; out[1] = 0; out[2] = 0; return; }
    if (y < 0.001) y = 0.001;
    const fi = (x - SX0) / SH - 0.5, fj = y / SH - 0.5;
    const i = Math.max(0, Math.min(F.nx - 2, Math.floor(fi))), j = Math.max(0, Math.min(F.ny - 2, Math.floor(fj)));
    const a = Math.min(1, Math.max(0, fi - i)), b = Math.min(1, Math.max(0, fj - j));
    const k = j * F.nx + i, k2 = k + F.nx;
    const w00 = (1 - a) * (1 - b), w10 = a * (1 - b), w01 = (1 - a) * b, w11 = a * b;
    out[0] = F.u[k] * w00 + F.u[k + 1] * w10 + F.u[k2] * w01 + F.u[k2 + 1] * w11;
    out[1] = F.v[k] * w00 + F.v[k + 1] * w10 + F.v[k2] * w01 + F.v[k2 + 1] * w11;
    out[2] = F.cp[k] * w00 + F.cp[k + 1] * w10 + F.cp[k2] * w01 + F.cp[k2 + 1] * w11;
    out[3] = F.solid[Math.round(fj) * F.nx + Math.round(fi)] || 0;
  }

  // Wake behind the gearbox and rear wing: slower, turbulent, upwashed, with shed eddies.
  function wake(x, y, t, drs, eddies, out) {
    const xw = x - 5.1;
    if (xw < -0.25 || y > 1.7) return;
    const top = drs ? 1.02 : 1.1;
    const s = Math.min(1, (xw + 0.25) / 0.5) * Math.exp(-Math.max(0, xw) / 3.2) * (y < top ? 1 : Math.exp(-(y - top) / 0.14));
    if (s < 0.01) return;
    const k = drs ? 0.65 : 1;
    out[0] *= 1 - 0.42 * s * k;
    out[1] += s * ((drs ? 0.08 : 0.2) * Math.exp(-((y - 0.95) ** 2) / 0.06) + 0.12 * Math.exp(-((y - 0.35) ** 2) / 0.04));
    out[1] += s * k * 0.17 * Math.sin(2.7 * x - 6.3 * t + 3.1 * y) * Math.cos(1.9 * y + 3.3 * t);
    out[0] += s * k * 0.1 * Math.cos(3.3 * y - 5.1 * t + 1.7 * x);
    for (let e = 0; e < eddies.length; e++) {
      const E = eddies[e], dx = x - E.x, dy = y - E.y, r2 = dx * dx + dy * dy + 0.01;
      if (r2 > 0.5) continue;
      out[0] -= E.g * dy / r2; out[1] += E.g * dx / r2;
    }
    out[2] = out[2] * (1 - s) + (-0.25 * s);
  }

  // ---------- front view: distance field ----------
  const FH = 0.02, FZ0 = -2.8, FZ1 = 2.8, FY1 = 2.1;
  const FNX = Math.round((FZ1 - FZ0) / FH), FNY = Math.round(FY1 / FH);
  function* solveFront(drs) {
    const solid = rasterise("front", drs, FNX, FNY, FH, FZ0, FY1);
    const dist = edt(solid, FNX, FNY, FH);
    return { kind: "front", nx: FNX, ny: FNY, h: FH, solid, dist };
  }
  function frontVortices(drs) {
    return [
      { z: 1.0, y: 0.2, s: 1, r: 0.2 }, { z: -1.0, y: 0.2, s: -1, r: 0.2 },
      { z: 0.52, y: 0.99, s: -1, r: drs ? 0.12 : 0.2 }, { z: -0.52, y: 0.99, s: 1, r: drs ? 0.12 : 0.2 },
      { z: 0.98, y: 0.07, s: -1, r: 0.12 }, { z: -0.98, y: 0.07, s: 1, r: 0.12 },
    ];
  }
  function sampleFront(F, z, y, out) {
    const fi = (z - FZ0) / FH, fj = y / FH;
    const i = Math.max(1, Math.min(F.nx - 2, Math.round(fi))), j = Math.max(1, Math.min(F.ny - 2, Math.round(fj)));
    const k = j * F.nx + i, d = F.dist[k];
    const gx = F.dist[k + 1] - F.dist[k - 1], gy = F.dist[k + F.nx] - F.dist[k - F.nx], gl = Math.hypot(gx, gy) || 1;
    const push = 1.1 * Math.exp(-d / 0.28);
    const rz = z, ry = y - 0.45, rl = Math.hypot(rz, ry) || 1;
    out[0] = gx / gl * push + 0.16 * rz / rl; out[1] = gy / gl * push + 0.16 * ry / rl; out[2] = d; out[3] = F.solid[k];
  }

  // Fields are solved in slices so opening the tunnel never blocks the page for long.
  const FIELDS = {}, PENDING = {};
  const fieldKey = (view, drs) => view + (drs ? 1 : 0);
  function requestField(view, drs) {
    const key = fieldKey(view, drs);
    if (FIELDS[key]) return Promise.resolve(FIELDS[key]);
    if (!PENDING[key]) {
      const job = view === "side" ? solveSide(drs) : solveFront(drs);
      PENDING[key] = new Promise((resolve) => {
        const step = () => {
          const t0 = performance.now();
          let r = job.next();
          while (!r.done && performance.now() - t0 < 12) r = job.next();
          if (r.done) { FIELDS[key] = r.value; resolve(r.value); } else setTimeout(step, 0);
        };
        step();
      });
    }
    return PENDING[key];
  }

  // ---------- layout ----------
  function layout(w, h, view, k) {
    const bottom = Math.max(18, h * 0.1);
    if (view === "side") {
      const s = Math.min(w / (6.9 * Math.max(k, 0.55)), (h - bottom) / 2.35);
      return { view, w, h, s, k, ox: w * 0.47, gy: h - bottom };
    }
    const s = Math.min(w / (3.3 * Math.max(k, 0.6)), (h - bottom) / 1.95);
    return { view, w, h, s, k, ox: w / 2, gy: h - bottom };
  }
  // Side: car x → screen; front: lateral z → screen.
  const sxOf = (L, x) => L.view === "side" ? L.ox + (x - MID) * L.s * L.k : L.ox + x * L.s * L.k;
  const syOf = (L, y) => L.gy - y * L.s;
  const xOfS = (L, px) => L.view === "side" ? MID + (px - L.ox) / (L.s * L.k) : (px - L.ox) / (L.s * L.k);

  function sizeCanvas(cv, w, h) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function streamlines(F, L, drs, t) {
    const lines = [], out = [0, 0, 0, 0];
    const xL = xOfS(L, 0) - 0.2, xR = xOfS(L, L.w) + 0.2, yT = L.gy / L.s;
    const n = Math.max(18, Math.min(46, Math.round(L.h / 9)));
    for (let q = 0; q < n; q++) {
      let x = xL, y = 0.012 + (yT - 0.012) * Math.pow(q / (n - 1), 1.35);
      const pts = [x, y, 0];
      for (let step = 0; step < 900 && x < xR; step++) {
        sampleSide(F, x, y, out);
        if (out[3]) break;
        wake(x, y, t, drs, [], out);
        const sp = Math.hypot(out[0], out[1]) || 1, ds = 0.035;
        x += out[0] / sp * ds; y += out[1] / sp * ds;
        if (y < 0.004) y = 0.004;
        pts.push(x, y, out[2]);
      }
      lines.push(pts);
    }
    return lines;
  }

  function drawBg(cv, L, F, drs) {
    const ctx = sizeCanvas(cv, L.w, L.h);
    ctx.fillStyle = "#05070a"; ctx.fillRect(0, 0, L.w, L.h);
    ctx.strokeStyle = "rgba(91,183,226,0.035)"; ctx.lineWidth = 1;
    const step = Math.max(18, L.s * 0.5);
    for (let x = L.ox % step; x < L.w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, L.gy); ctx.stroke(); }
    for (let y = L.gy % step; y < L.gy; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L.w, y); ctx.stroke(); }
    // Rolling road.
    ctx.fillStyle = "#0b0e13"; ctx.fillRect(0, L.gy, L.w, L.h - L.gy);
    ctx.fillStyle = "rgba(232,228,220,0.18)"; ctx.fillRect(0, L.gy, L.w, 1);

    if (L.view === "side") {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(F.glow, sxOf(L, SX0), syOf(L, SY1), (SX1 - SX0) * L.s * L.k, SY1 * L.s);
      ctx.restore();
      const lines = streamlines(F, L, drs, 0.6);
      ctx.lineWidth = REDUCE ? 1.3 : 1;
      ctx.lineCap = "round";
      for (const pts of lines) {
        let prevB = -1;
        for (let i = 3; i < pts.length; i += 3) {
          const b = bucketOf(pts[i + 2]);
          if (b !== prevB) {
            if (prevB >= 0) ctx.stroke();
            const [r, g, bl] = BUCKET_RGB[b];
            ctx.strokeStyle = `rgba(${r},${g},${bl},${REDUCE ? 0.8 : 0.26})`;
            ctx.beginPath(); ctx.moveTo(sxOf(L, pts[i - 3]), syOf(L, pts[i - 2]));
            prevB = b;
          }
          ctx.lineTo(sxOf(L, pts[i]), syOf(L, pts[i + 1]));
        }
        if (prevB >= 0) ctx.stroke();
      }
    } else {
      const spot = (z, y, r, rgb, a) => {
        const X = sxOf(L, z), Y = syOf(L, y), R = r * L.s;
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, R);
        g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(X - R, Y - R, 2 * R, 2 * R);
      };
      [[0, 0.36, 0.45, 0.55], [0.62, 0.17, 0.5, 0.5], [-0.62, 0.17, 0.5, 0.5], [0.8, 0.4, 0.45, 0.35], [-0.8, 0.4, 0.45, 0.35],
        [0, 0.88, drs ? 0.4 : 0.6, drs ? 0.25 : 0.45]].forEach(([z, y, r, a]) => spot(z, y, r, "255,70,45", a));
      spot(0, 0.05, 0.7, "45,115,255", 0.5);
      frontVortices(drs).forEach(v => spot(v.z, v.y, v.r * 1.6, "45,115,255", 0.55));
      if (REDUCE) {
        ctx.lineWidth = 1.2;
        frontVortices(drs).forEach(v => {
          ctx.strokeStyle = "rgba(90,150,255,0.75)";
          ctx.beginPath();
          for (let a = 0; a < Math.PI * 5; a += 0.1) {
            const r = v.r * (0.15 + a / (Math.PI * 5)) * 0.9, X = sxOf(L, v.z + v.s * Math.cos(a) * r), Y = syOf(L, v.y + Math.sin(a) * r);
            a === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
          }
          ctx.stroke();
        });
        const out = [0, 0, 0, 0];
        ctx.strokeStyle = "rgba(170,205,230,0.55)";
        for (let q = 0; q < 70; q++) {
          const ang = q / 70 * Math.PI * 2;
          let z = Math.cos(ang) * 1.25, y = 0.45 + Math.sin(ang) * 0.62;
          if (y < 0.02) continue;
          ctx.beginPath(); ctx.moveTo(sxOf(L, z), syOf(L, y));
          for (let s = 0; s < 25; s++) { sampleFront(F, z, y, out); z += out[0] * 0.02; y = Math.max(0.01, y + out[1] * 0.02); ctx.lineTo(sxOf(L, z), syOf(L, y)); }
          ctx.stroke();
        }
      }
    }
  }

  function arrow(ctx, x0, y0, x1, y1, col, w) {
    const a = Math.atan2(y1 - y0, x1 - x0), hl = Math.max(7, w * 3.2);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hl * 0.8, y1 - Math.sin(a) * hl * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(a - 0.45) * hl, y1 - Math.sin(a - 0.45) * hl);
    ctx.lineTo(x1 - Math.cos(a + 0.45) * hl, y1 - Math.sin(a + 0.45) * hl);
    ctx.closePath(); ctx.fill();
  }
  function label(ctx, text, x, y, col, align, size) {
    ctx.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = align || "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(5,7,10,0.85)"; ctx.strokeText(text, x, y);
    ctx.fillStyle = col; ctx.fillText(text, x, y);
  }

  function drawCar(cv, L, car, drs, f, aero) {
    const ctx = sizeCanvas(cv, L.w, L.h);
    ctx.clearRect(0, 0, L.w, L.h);
    const view = L.view, sx = L.s * L.k, s = L.s;
    const half = view === "side" ? MID : 1.0;
    // Contact shadow and floor reflection.
    const sh = ctx.createRadialGradient(L.ox, L.gy, 2, L.ox, L.gy, half * sx * 1.05);
    sh.addColorStop(0, "rgba(0,0,0,0.65)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.translate(L.ox, L.gy); ctx.scale(1, 0.08); ctx.fillStyle = sh;
    ctx.beginPath(); ctx.arc(0, 0, half * sx * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(L.ox, L.gy + 1); ctx.scale(sx, -s * 0.25);
    C.paint(ctx, view, car.livery, { drs, alpha: 0.07 }); ctx.restore();
    ctx.save(); ctx.translate(L.ox, L.gy); ctx.scale(sx, s);
    C.paint(ctx, view, car.livery, { drs, number: car.no }); ctx.restore();

    const fs = Math.max(9, Math.min(12, L.h / 34)), aw = Math.max(2, Math.min(4, L.s / 40));
    const blue = "#5B9BFF", red = "#FF5A4A";
    const len = (n, ref) => (0.25 + 0.95 * n / ref) * s;
    if (view === "side") {
      const fx = sxOf(L, C.FA), rx = sxOf(L, 5.2);
      const fTop = syOf(L, 0.6), rTop = syOf(L, 1.06);
      const fl = len(f.front, aero.dfTotal * 0.6), rl = len(f.rear, aero.dfTotal * 0.6);
      arrow(ctx, fx, fTop - fl, fx, fTop, blue, aw);
      arrow(ctx, rx, rTop - rl, rx, rTop, blue, aw);
      label(ctx, `FRONT DF ${f.front} N`, fx, fTop - fl - fs, blue, "center", fs);
      label(ctx, `REAR DF ${f.rear} N`, Math.min(L.w - 60, rx), rTop - rl - fs, blue, "center", fs);
      const dy = syOf(L, 0.55), dx0 = sxOf(L, 5.75), dl = len(f.drag, aero.dragN) * L.k;
      arrow(ctx, dx0, dy, Math.min(L.w - 8, dx0 + dl), dy, red, aw);
      label(ctx, `DRAG ${f.drag} N`, Math.min(L.w - 8, dx0 + dl), dy + fs * 1.4, red, "right", fs);
      label(ctx, drs ? "DRS OPEN ▲" : "DRS CLOSED", L.w - 10, syOf(L, 0.88), drs ? "#3DD68C" : "rgba(232,228,220,0.5)", "right", fs - 1);
    } else {
      const cx = L.ox, top = syOf(L, 1.08), dl = Math.min(len(f.front + f.rear, aero.dfTotal), top - fs * 2.6);
      arrow(ctx, cx, top - dl, cx, top, blue, aw);
      label(ctx, `DOWNFORCE ${f.front + f.rear} N`, cx, top - dl - fs, blue, "center", fs);
      const r = Math.max(7, s * 0.09), X = Math.max(fs * 3.2, sxOf(L, -1.35)), Y = syOf(L, 0.75);
      ctx.strokeStyle = red; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X - r * 0.6, Y - r * 0.6); ctx.lineTo(X + r * 0.6, Y + r * 0.6); ctx.moveTo(X + r * 0.6, Y - r * 0.6); ctx.lineTo(X - r * 0.6, Y + r * 0.6); ctx.stroke();
      label(ctx, `DRAG ${f.drag} N`, X, Y + r + fs, red, "center", fs);
    }
    // Pressure legend and caption share the strip under the rolling road.
    const by = L.gy + (L.h - L.gy) / 2, lw = Math.max(60, Math.min(140, L.w * 0.22));
    ctx.font = `700 ${fs - 1}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const hiW = ctx.measureText("HIGH").width, lx = L.w - 10 - hiW - 6 - lw;
    const g = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    g.addColorStop(0, "rgb(45,115,255)"); g.addColorStop(0.5, "rgb(150,200,230)"); g.addColorStop(1, "rgb(255,70,45)");
    ctx.fillStyle = g; ctx.fillRect(lx, by - 2, lw, 4);
    label(ctx, "LOW p", lx - 6, by, "rgba(120,160,255,0.95)", "right", fs - 1);
    label(ctx, "HIGH", L.w - 10, by, "rgba(255,120,100,0.95)", "right", fs - 1);
    const lowW = ctx.measureText("LOW p").width;
    const cap = L.w < 560 ? "SIM · 2D FLOW" : view === "side" ? "SIDE · 2D POTENTIAL FLOW + WAKE MODEL · SIM" : "FRONT · FLOW SPLIT + TIP VORTICES · SIM";
    if (ctx.measureText(cap).width + 30 < lx - lowW - 6) label(ctx, cap, 10, by, "rgba(232,228,220,0.4)", "left", fs - 1);
  }

  function AeroSimulator({ car, carClass, speed, initialView, initialDrs }) {
    const cls = (carClass && carClass.id) || "open_wheel";
    const aero = AERO[cls] || AERO.open_wheel;
    const [yaw, setYaw] = useS(initialView === "front" ? 90 : 0);
    const [drs, setDrs] = useS(!!initialDrs);
    const [air, setAir] = useS(() => Math.max(80, Math.min(aero.topSpeed, Math.round((speed || 280) / 5) * 5)));
    const [size, setSize] = useS({ w: 0, h: 0 });
    const stageRef = useR(null), bgRef = useR(null), flowRef = useR(null), carRef = useR(null), dragRef = useR(null);

    useE(() => {
      const el = stageRef.current;
      if (!el) return;
      const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const view = yaw >= 45 ? "front" : "side";
    const rad = yaw * Math.PI / 180;
    const k = view === "side" ? Math.max(0.25, Math.cos(rad)) : Math.max(0.35, Math.sin(rad));
    const q = (air / aero.topSpeed) ** 2;
    const dfTot = aero.dfTotal * q;
    const forces = {
      front: Math.round(dfTot * aero.dfFront / 100),
      rear: Math.round(dfTot * aero.dfRear / 100 * (drs ? DRS_REAR : 1)),
      drag: Math.round(aero.dragN * q * (drs ? DRS_DRAG : 1)),
    };
    const ready = size.w > 20 && size.h > 20;
    const [, setSolved] = useS(0);
    const lastField = useR({});
    const want = FIELDS[fieldKey(view, drs)];
    if (want) lastField.current[view] = want;
    const field = want || lastField.current[view] || null;
    useE(() => {
      if (!ready) return;
      let live = true;
      requestField(view, drs).then(() => {
        if (live) setSolved(n => n + 1);
        requestField(view, !drs);
      });
      return () => { live = false; };
    }, [ready, view, drs]);
    const L = useM(() => ready ? layout(size.w, size.h, view, k) : null, [ready, size.w, size.h, view, k]);


    useE(() => { if (L && field) drawBg(bgRef.current, L, field, drs); }, [L, field, drs]);
    useE(() => { if (L) drawCar(carRef.current, L, car, drs, forces, aero); }, [L, drs, car.no, car.livery, forces.front, forces.rear, forces.drag]);

    const live = useR({});
    live.current = { L, field, drs, uvis: 0.9 + 2.6 * air / aero.topSpeed };

    useE(() => {
      const cv = flowRef.current;
      if (!L || !field || !cv) return;
      const ctx = sizeCanvas(cv, L.w, L.h);
      ctx.clearRect(0, 0, L.w, L.h);
      if (REDUCE) return;
      const N = Math.max(220, Math.min(1400, Math.round(L.w * L.h / 260)));
      const P = new Float32Array(N * 4); // x, y, age, life
      const eddies = [];
      let t = 0, shed = 0, flip = false, raf = 0, last = 0;
      const out = [0, 0, 0, 0];
      const spawn = (p, anywhere) => {
        const S = live.current.L;
        if (S.view === "side") {
          const xL = xOfS(S, 0) - 0.15, xR = xOfS(S, S.w);
          P[p] = anywhere ? xL + Math.random() * (xR - xL) : xL - Math.random() * 0.3;
          P[p + 1] = 0.01 + Math.random() * (S.gy / S.s);
          P[p + 2] = 0; P[p + 3] = 1e9;
        } else {
          const vs = frontVortices(live.current.drs);
          if (Math.random() < 0.35) {
            const v = vs[(Math.random() * vs.length) | 0], a = Math.random() * 6.283, r = v.r * (0.2 + Math.random());
            P[p] = v.z + Math.cos(a) * r; P[p + 1] = Math.max(0.01, v.y + Math.sin(a) * r);
          } else {
            const zl = xOfS(S, 0), zr = xOfS(S, S.w);
            P[p] = zl + Math.random() * (zr - zl); P[p + 1] = 0.01 + Math.random() * (S.gy / S.s);
          }
          P[p + 2] = anywhere ? Math.random() * 0.8 : 0; P[p + 3] = 0.6 + Math.random() * 0.8;
        }
      };
      for (let i = 0; i < N; i++) spawn(i * 4, true);
      const segs = Array.from({ length: BUCKETS + 1 }, () => []);
      const frame = (now) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
        last = now; t += dt;
        const { L: S, field: F, drs: D, uvis } = live.current;
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = `rgba(0,0,0,${S.view === "side" ? 0.16 : 0.2})`;
        ctx.fillRect(0, 0, S.w, S.h);
        ctx.globalCompositeOperation = "lighter";
        for (const s of segs) s.length = 0;
        if (S.view === "side") {
          shed += dt;
          if (shed > 0.32) {
            shed = 0; flip = !flip;
            eddies.push(flip ? { x: 5.62, y: D ? 0.97 : 1.02, g: -(D ? 0.006 : 0.012) } : { x: 5.18, y: 0.34, g: 0.009 });
          }
          for (let e = eddies.length - 1; e >= 0; e--) {
            const E = eddies[e]; E.x += uvis * 0.6 * dt; E.y += (E.g < 0 ? 0.08 : 0.04) * uvis * dt; E.g *= 1 - 0.35 * dt;
            if (E.x > 9.5) eddies.splice(e, 1);
          }
          const xR = xOfS(S, S.w) + 0.1, yT = S.gy / S.s;
          for (let i = 0; i < N; i++) {
            const p = i * 4, x = P[p], y = P[p + 1];
            sampleSide(F, x, y, out);
            if (out[3]) { spawn(p, false); continue; }
            wake(x, y, t, D, eddies, out);
            const nx = x + out[0] * uvis * dt, ny = Math.max(0.004, y + out[1] * uvis * dt);
            P[p] = nx; P[p + 1] = ny;
            segs[bucketOf(out[2])].push(sxOf(S, x), syOf(S, y), sxOf(S, nx), syOf(S, ny));
            if (nx > xR || ny > yT || nx < SX0) spawn(p, false);
          }
          ctx.lineWidth = 1.4;
        } else {
          const vs = frontVortices(D);
          for (let i = 0; i < N; i++) {
            const p = i * 4, z = P[p], y = P[p + 1];
            P[p + 2] += dt;
            if (P[p + 2] > P[p + 3]) { spawn(p, false); continue; }
            sampleFront(F, z, y, out);
            if (out[3]) { spawn(p, false); continue; }
            let vz = out[0], vy = out[1], core = 0;
            for (const v of vs) {
              const dz = z - v.z, dy = y - v.y, r2 = dz * dz + dy * dy;
              if (r2 > 0.36) continue;
              const w = 0.5 * v.s / (r2 + v.r * v.r * 0.4);
              vz += -dy * w * 0.25; vy += dz * w * 0.25;
              core = Math.max(core, Math.exp(-r2 / (v.r * v.r)));
            }
            const nz = z + vz * uvis * 0.35 * dt, ny = Math.max(0.004, y + vy * uvis * 0.35 * dt);
            P[p] = nz; P[p + 1] = ny;
            const env = Math.sin(Math.PI * P[p + 2] / P[p + 3]);
            const cp = core > 0.2 ? -1.1 * core : out[2] < 0.12 ? 0.8 : 0;
            if (env > 0.15) segs[bucketOf(cp)].push(sxOf(S, z), syOf(S, y), sxOf(S, nz), syOf(S, ny));
          }
          ctx.lineWidth = 1.6;
        }
        ctx.lineCap = "round";
        for (let b = 0; b < BUCKETS; b++) {
          const a = segs[b];
          if (!a.length) continue;
          const [r, g, bl] = BUCKET_RGB[b];
          ctx.strokeStyle = `rgba(${r},${g},${bl},0.7)`;
          ctx.beginPath();
          for (let i = 0; i < a.length; i += 4) { ctx.moveTo(a[i], a[i + 1]); ctx.lineTo(a[i + 2], a[i + 3]); }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      };
      const start = () => { if (!raf && document.visibilityState === "visible") { last = 0; raf = requestAnimationFrame(frame); } };
      const stop = () => { cancelAnimationFrame(raf); raf = 0; };
      const onVis = () => (document.visibilityState === "visible" ? start() : stop());
      document.addEventListener("visibilitychange", onVis);
      start();
      return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
    }, [L && L.view, L && L.w, L && L.h, L && L.k, field]);

    const onPD = (e) => { dragRef.current = { x: e.clientX, a: yaw }; e.currentTarget.setPointerCapture(e.pointerId); };
    const onPM = (e) => {
      if (!dragRef.current) return;
      setYaw(Math.max(0, Math.min(90, dragRef.current.a + (e.clientX - dragRef.current.x) * 0.45)));
    };
    const onPU = () => { dragRef.current = null; };
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setYaw(y => Math.min(90, y + 10)); }
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setYaw(y => Math.max(0, y - 10)); }
      if (e.key === "d" || e.key === "D") setDrs(v => !v);
    };

    const cd = aero.cd * (drs ? DRS_DRAG : 1);
    const clv = aero.cl * (aero.dfFront + aero.dfRear * (drs ? DRS_REAR : 1)) / 100;
    const total = forces.front + forces.rear;
    return (
      <div className="wt">
        <div className="wt-stage" ref={stageRef} tabIndex={0} role="img"
          aria-label={`Wind tunnel, ${view} view, DRS ${drs ? "open" : "closed"}, ${air} kph: front downforce ${forces.front} newtons, rear ${forces.rear}, drag ${forces.drag}. Drag or use arrow keys to rotate.`}
          onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerCancel={onPU} onKeyDown={onKey}
          style={{ cursor: dragRef.current ? "grabbing" : "grab" }}>
          <canvas ref={bgRef} className="wt-layer"/>
          <canvas ref={flowRef} className="wt-layer"/>
          <canvas ref={carRef} className="wt-layer"/>
          <div className="wt-hint" aria-hidden="true">DRAG TO ROTATE · SIDE ↔ FRONT{!want ? " · SOLVING FLOW…" : ""}</div>
        </div>
        <div className="wt-controls">
          <div className="wt-seg" role="group" aria-label="View">
            <button className={view === "side" ? "on" : ""} aria-pressed={view === "side"} onClick={() => setYaw(0)}>SIDE</button>
            <button className={view === "front" ? "on" : ""} aria-pressed={view === "front"} onClick={() => setYaw(90)}>FRONT</button>
          </div>
          <button className={`wt-drs ${drs ? "on" : ""}`} aria-pressed={drs} onClick={() => setDrs(v => !v)} title="Toggle DRS (D)">
            DRS {drs ? "OPEN" : "CLOSED"}
          </button>
          <label className="wt-speed">
            <span>AIRSPEED</span>
            <input type="range" min="80" max={aero.topSpeed} step="5" value={air} onChange={(e) => setAir(+e.target.value)} aria-label="Airspeed, kph"/>
            <b>{air}<small>KPH</small></b>
          </label>
        </div>
        <div className="wt-stats">
          <div><span>FRONT DF</span><b className="blue">{forces.front}<small>N</small></b></div>
          <div><span>REAR DF</span><b className="blue">{forces.rear}<small>N</small></b></div>
          <div><span>DRAG</span><b className="red">{forces.drag}<small>N</small></b></div>
          <div><span>Cd · Cl</span><b>{cd.toFixed(2)} · {clv.toFixed(2)}</b></div>
          <div><span>L/D</span><b>{(total / Math.max(1, forces.drag)).toFixed(2)}</b></div>
          <div><span>BALANCE</span><b>{total ? Math.round(forces.front / total * 100) : 0}% F</b></div>
        </div>
      </div>
    );
  }

  // Full-screen dialog. The opener restores focus when it closes.
  function WindTunnel({ car, carClass, speed, onClose }) {
    const ref = useR(null);
    const qs = new URLSearchParams(location.search);
    useE(() => {
      const el = ref.current;
      const close = el && el.querySelector(".wt-close");
      if (close) close.focus();
      const trap = (e) => {
        if (e.key !== "Tab" || !el) return;
        const f = el.querySelectorAll("button, input, [tabindex='0']");
        if (!f.length) return;
        const first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      };
      el.addEventListener("keydown", trap);
      return () => el.removeEventListener("keydown", trap);
    }, []);
    const cls = (carClass && carClass.id) || "open_wheel";
    return (
      <div className="wt-overlay" role="dialog" aria-modal="true" aria-label={`Wind tunnel, car ${car.no}`} ref={ref}>
        <div className="wt-head">
          <span className="wt-title"><span className="wt-dot" style={{ background: car.livery.accent }}/>WIND TUNNEL · SIM</span>
          <span className="wt-car">#{car.no} · {car.team} · {(AERO[cls] || AERO.open_wheel).label}</span>
          <button className="wt-close" onClick={onClose}>CLOSE <kbd>ESC</kbd></button>
        </div>
        <AeroSimulator car={car} carClass={carClass} speed={speed}
          initialView={qs.get("view") === "front" ? "front" : "side"} initialDrs={qs.get("drs") === "1"}/>
      </div>
    );
  }

  window.AeroSim = { AERO, DRS_DRAG, DRS_REAR, wake, LEN: C.LEN };
  window.AeroSimulator = AeroSimulator;
  window.WindTunnel = WindTunnel;
})();
