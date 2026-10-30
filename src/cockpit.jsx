// Cockpit view: the focused car's eye line, rendered to canvas each frame from the race model.
// World points are moved into the camera's frame (forward z, right x, up y) and projected with a
// pinhole camera. Map units are ~0.51 m (CAR_L 11 = 5.6 m). Elevation is a stylised Laguna Seca
// profile (the climb to the Corkscrew, then the drop) since the map itself is flat.
(function () {
  const { useRef, useEffect, useMemo } = React;
  const M_PER_U = 5.6 / 11;
  const EYE = 1.9, NEAR = 1.6, LOOK = 640, N = 90;

  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function elevFn(geom) {
    const cork = (geom.corners.find((c) => /CORK/i.test(c.name || "")) || { frac: 0.55 }).frac;
    return (f) => {
      f = ((f % 1) + 1) % 1;
      const climb = 26 * smooth(0.12, cork - 0.02, f);
      const drop = -30 * smooth(cork - 0.01, cork + 0.05, f);
      const tail = 4 * Math.sin(f * Math.PI * 6);
      return climb + drop + tail + 4 * smooth(cork + 0.2, 1, f);
    };
  }

  const SKY = {
    day: ["#6f93b8", "#c9d6de", "#e9dcc4"], dusk: ["#2b2f4a", "#a8605a", "#f0a868"], night: ["#020308", "#0a0f1c", "#1a2233"],
  };
  const HILL = { day: ["#b69a62", "#8f7a4c"], dusk: ["#4d3a33", "#2e2524"], night: ["#0b0d12", "#07080b"] };
  const GRASS = { day: ["#6f6a3e", "#66623a"], dusk: ["#3e3727", "#383223"], night: ["#15161a", "#121317"] };

  function draw(ctx, W, H, S) {
    const { model, geom, cars, t, no, cond, reduce, elev, stateRef, top, mpu } = S;
    const RM = window.RaceModel, FL = RM.FLAGS, EDGE = 14;
    const mc = model.cars.find((c) => c.no === no);
    if (!mc) return null;
    const me = RM.sampleAt(model, mc, t);
    const p0 = geom.at(me.frac);
    const yaw = (me.yaw || 0) * Math.PI / 180 * 0.6;
    const hr = p0.rad + yaw, fx = Math.cos(hr), fy = Math.sin(hr), rx = -fy, ry = fx;
    const n0x = -Math.sin(p0.rad), n0y = Math.cos(p0.rad);
    const cx0 = p0.x + n0x * me.lat, cy0 = p0.y + n0y * me.lat;
    const e0 = elev(me.frac);
    const tod = cond.tod, wet = cond.weather === "rain";
    const F = W * 0.62;
    const ahead = geom.at(me.frac + 60 / geom.len);
    const pitch = (elev(me.frac + 60 / geom.len) - e0) / 60;
    const turnRate = Math.atan2(Math.sin(ahead.rad - p0.rad), Math.cos(ahead.rad - p0.rad));
    const st = stateRef.current;
    st.roll += ((-turnRate * 0.16) - st.roll) * 0.08;
    st.steer += ((turnRate * 2.4) - st.steer) * 0.12;
    const kerb = me.flags & FL.KERB;
    const shake = reduce ? 0 : (kerb ? 2.2 : 0.5) * (Math.min(1, me.v / model.k));
    const jx = shake * (Math.random() - 0.5), jy = shake * (Math.random() - 0.5);
    const HZ = H * 0.44 - pitch * F * 0.5;

    const cam = (wx, wy, we) => {
      const dx = wx - cx0, dy = wy - cy0;
      return [dx * rx + dy * ry, dx * fx + dy * fy, we - e0 - EYE];
    };
    const proj = (x, z, y) => [W / 2 + (x / z) * F, HZ - (y / z) * F];

    ctx.save();
    ctx.translate(W / 2 + jx, H * 0.7 + jy);
    ctx.rotate(st.roll);
    ctx.translate(-W / 2, -H * 0.7);

    const sky = SKY[tod], g = ctx.createLinearGradient(0, HZ - H * 0.6, 0, HZ);
    g.addColorStop(0, sky[0]); g.addColorStop(0.7, sky[1]); g.addColorStop(1, sky[2]);
    ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, HZ + H + 2);
    if (tod === "night") {
      for (let i = 0; i < 5; i++) {
        const lx = ((i * 0.23 - hr * 0.35) % 1 + 1) % 1 * W * 1.4 - W * 0.2;
        const lg = ctx.createRadialGradient(lx, HZ - H * 0.12, 0, lx, HZ - H * 0.12, H * 0.22);
        lg.addColorStop(0, "rgba(200,215,255,0.35)"); lg.addColorStop(1, "rgba(200,215,255,0)");
        ctx.fillStyle = lg; ctx.fillRect(lx - H * 0.3, HZ - H * 0.4, H * 0.6, H * 0.5);
      }
    }
    const hills = HILL[tod];
    [0, 1].forEach((layer) => {
      ctx.beginPath(); ctx.moveTo(-W, HZ + 2);
      const k = layer ? 1.4 : 0.9, amp = layer ? 0.07 : 0.11;
      for (let x = -W; x <= W * 2; x += 12) {
        const a = x / W * 3.1 + hr * k * 2;
        ctx.lineTo(x, HZ - H * amp * (0.55 + 0.3 * Math.sin(a * 1.3 + layer) + 0.15 * Math.sin(a * 3.7 + layer * 2)));
      }
      ctx.lineTo(W * 2, HZ + 2); ctx.closePath(); ctx.fillStyle = hills[layer]; ctx.fill();
    });
    ctx.fillStyle = GRASS[tod][0]; ctx.fillRect(-W, HZ, W * 3, H * 2);

    const segs = [];
    const dAbs = me.d * geom.len;
    for (let i = 0; i <= N; i++) {
      const s = NEAR + LOOK * Math.pow(i / N, 1.7);
      const f = me.frac + s / geom.len, p = geom.at(f), nx = -Math.sin(p.rad), ny = Math.cos(p.rad), e = elev(f);
      const at = (lat) => { const c = cam(p.x + nx * lat, p.y + ny * lat, e); return c; };
      segs.push({ s, abs: dAbs + s, rad: p.rad, L: at(-EDGE), R: at(EDGE), Lk: at(-EDGE - 2.6), Rk: at(EDGE + 2.6), Lg: at(-EDGE - 24), Rg: at(EDGE + 24), Lw: at(-EDGE - 30), Rw: at(EDGE + 30), C: at(0), e });
    }
    const quad = (a, b, c, d, fill) => {
      if (a[1] < 0.5 || b[1] < 0.5 || c[1] < 0.5 || d[1] < 0.5) return;
      const A = proj(a[0], a[1], a[2]), B = proj(b[0], b[1], b[2]), C = proj(c[0], c[1], c[2]), D = proj(d[0], d[1], d[2]);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(D[0], D[1]); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
    };
    const lift = (p, h) => [p[0], p[1], p[2] + h];
    const fog = (z) => Math.min(1, z / (LOOK * (wet ? 0.55 : tod === "night" ? 0.7 : 1.05)));
    const mix = (c1, c2, a) => {
      const h = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
      const x = h(c1), y = h(c2);
      return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * a)).join(",")})`;
    };
    const fogC = tod === "night" ? "#0b0f18" : wet ? "#8d969c" : sky[2];
    const road = tod === "night" ? ["#2a2c30", "#28292d"] : wet ? ["#34383c", "#32363a"] : ["#4a4947", "#484745"];

    for (let i = N - 1; i >= 0; i--) {
      const a = segs[i], b = segs[i + 1], z = (a.C[1] + b.C[1]) / 2, fo = fog(z);
      const band = Math.floor(a.abs / 14) % 2, kb = Math.floor(a.abs / 5) % 2;
      const curv = Math.abs(Math.atan2(Math.sin(b.rad - a.rad), Math.cos(b.rad - a.rad))) / Math.max(0.1, b.s - a.s);
      quad(a.Lg, b.Lg, b.Rg, a.Rg, mix(GRASS[tod][band], fogC, fo));
      if (curv > 0.0035) { quad(a.Lk, b.Lk, b.L, a.L, mix(kb ? "#b8322b" : "#e8e4dc", fogC, fo)); quad(a.R, b.R, b.Rk, a.Rk, mix(kb ? "#b8322b" : "#e8e4dc", fogC, fo)); }
      quad(a.L, b.L, b.R, a.R, mix(road[band], fogC, fo));
      const lw = 0.45;
      quad([a.L[0] + lw, a.L[1], a.L[2]], [b.L[0] + lw, b.L[1], b.L[2]], [b.L[0] + lw * 2.2, b.L[1], b.L[2]], [a.L[0] + lw * 2.2, a.L[1], a.L[2]], mix("#d9d6cf", fogC, fo));
      quad([a.R[0] - lw * 2.2, a.R[1], a.R[2]], [b.R[0] - lw * 2.2, b.R[1], b.R[2]], [b.R[0] - lw, b.R[1], b.R[2]], [a.R[0] - lw, a.R[1], a.R[2]], mix("#d9d6cf", fogC, fo));
      const line = [a.C[0] + me.lat * 0, a.C[1], a.C[2]];
      quad([line[0] - 2.5, a.C[1], a.C[2]], [b.C[0] - 2.5, b.C[1], b.C[2]], [b.C[0] + 2.5, b.C[1], b.C[2]], [line[0] + 2.5, a.C[1], a.C[2]], mix(wet ? "#2f3337" : "#403f3d", fogC, fo));
      const wall = Math.floor(a.abs / 40) % 3 === 0 ? "#2a3a52" : "#1b1d21";
      quad(a.Lw, b.Lw, lift(b.Lw, 2.2), lift(a.Lw, 2.2), mix(wall, fogC, fo));
      quad(lift(a.Rw, 2.2), lift(b.Rw, 2.2), b.Rw, a.Rw, mix(wall, fogC, fo));
      if (Math.floor(a.abs / 22) !== Math.floor(b.abs / 22)) {
        [a.Lw, a.Rw].forEach((w) => {
          if (w[1] < 1) return;
          const B0 = proj(w[0], w[1], w[2] + 2.2), T0 = proj(w[0], w[1], w[2] + 11);
          ctx.strokeStyle = `rgba(150,150,150,${0.5 * (1 - fo)})`; ctx.lineWidth = Math.max(0.5, 30 / w[1]);
          ctx.beginPath(); ctx.moveTo(B0[0], B0[1]); ctx.lineTo(T0[0], T0[1]); ctx.stroke();
        });
      }
    }

    // Braking boards before the next corner, on the outside.
    const next = geom.corners.map((c) => ({ c, ds: ((c.frac - me.frac) % 1 + 1) % 1 * geom.len })).sort((x, y) => x.ds - y.ds)[0];
    if (next) {
      [3, 2, 1].forEach((k) => {
        const s = next.ds - 20 / mpu - k * 100 / mpu;
        if (s < NEAR + 2 || s > LOOK) return;
        const f = me.frac + s / geom.len, p = geom.at(f), nx = -Math.sin(p.rad), ny = Math.cos(p.rad);
        const side = next.c.x < 500 ? 1 : -1;
        const w = cam(p.x + nx * side * (EDGE + 8), p.y + ny * side * (EDGE + 8), elev(f));
        if (w[1] < 1) return;
        const A = proj(w[0] - 2.2, w[1], w[2] + 6.5), B = proj(w[0] + 2.2, w[1], w[2] + 2);
        const P0 = proj(w[0], w[1], w[2]);
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(P0[0] - Math.max(0.5, 8 / w[1]), B[1], Math.max(1, 16 / w[1]), P0[1] - B[1]);
        ctx.fillStyle = "#f2efe8"; ctx.fillRect(A[0], A[1], B[0] - A[0], B[1] - A[1]);
        ctx.fillStyle = "#111"; ctx.font = `800 ${Math.max(6, (B[1] - A[1]) * 0.7)}px ui-sans-serif, system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(k), (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + 1);
      });
    }

    // Cars ahead, far to near.
    const scale = 11 / 5.6;
    const others = [];
    model.cars.forEach((oc) => {
      if (oc.no === no) return;
      const so = RM.sampleAt(model, oc, t);
      const ds = ((so.d - me.d) % 1 + 1) % 1 * geom.len;
      if (ds < 2 || ds > LOOK * 0.9) return;
      const p = geom.at(so.frac), nx = -Math.sin(p.rad), ny = Math.cos(p.rad);
      const w = cam(p.x + nx * so.lat, p.y + ny * so.lat, elev(so.frac));
      if (w[1] < 3) return;
      const car = cars.find((c) => c.no === oc.no);
      if (car) others.push({ w, car, v: so.v, flags: so.flags });
    });
    others.sort((a, b) => b.w[1] - a.w[1]).forEach(({ w, car, v }) => {
      const [sx, sy] = proj(w[0], w[1], w[2]);
      const pxm = (F / w[1]) * scale;
      if (pxm < 0.8) return;
      const fo = fog(w[1]);
      if (wet && v > model.k * 0.4) {
        const sp = ctx.createRadialGradient(sx, sy - pxm * 0.6, 0, sx, sy - pxm * 0.6, pxm * 2.6);
        sp.addColorStop(0, `rgba(210,215,220,${0.55 * (1 - fo * 0.5)})`); sp.addColorStop(1, "rgba(210,215,220,0)");
        ctx.fillStyle = sp; ctx.fillRect(sx - pxm * 3, sy - pxm * 3, pxm * 6, pxm * 3.4);
      }
      ctx.save();
      ctx.globalAlpha = 1 - fo * 0.85;
      ctx.translate(sx, sy); ctx.scale(pxm, pxm);
      window.F1Car.paint(ctx, "front", car.livery, { number: car.no });
      ctx.restore();
      if (wet || tod !== "day") {
        const on = !wet || reduce || Math.floor(t * 4 + car.no) % 2 === 0;
        if (on) {
          const lg = ctx.createRadialGradient(sx, sy - pxm * 0.62, 0, sx, sy - pxm * 0.62, pxm * 0.5);
          lg.addColorStop(0, "rgba(255,60,50,0.95)"); lg.addColorStop(1, "rgba(255,60,50,0)");
          ctx.fillStyle = lg; ctx.fillRect(sx - pxm * 0.5, sy - pxm * 1.1, pxm, pxm);
        }
      }
    });

    if (wet) {
      ctx.fillStyle = "rgba(160,170,180,0.12)"; ctx.fillRect(-W, -H, W * 3, H * 3);
    }
    ctx.restore();

    // Mirror content: cars behind within ~120 m.
    const behind = [];
    model.cars.forEach((oc) => {
      if (oc.no === no) return;
      const so = RM.sampleAt(model, oc, t);
      const ds = ((me.d - so.d) % 1 + 1) % 1 * geom.len;
      if (ds > 1 && ds < 240) behind.push({ no: oc.no, ds, lat: so.lat - me.lat });
    });
    behind.sort((a, b) => a.ds - b.ds);
    return { me, steer: st.steer, next, behind: behind.slice(0, 2), kph: Math.round((me.v / model.k) * top), kerb: !!kerb, drs: !!(me.flags & FL.DRS) };
  }

  // Cockpit furniture drawn over the world in screen space: halo, nose, front tyres, mirrors, wheel.
  function Furniture({ W, H, info, car, cars, carClass }) {
    if (!info || !W) return null;
    const pri = car.livery.primary, sec = car.livery.secondary || "#15171b";
    const steer = Math.max(-0.9, Math.min(0.9, info.steer)) * 57;
    const kph = info.kph, gear = window.gearFor ? window.gearFor(kph, carClass) : Math.max(1, Math.min(8, Math.ceil(kph / 40)));
    const g = typeof gear === "number" ? gear : +gear || 1;
    const [lo, hi] = (carClass && carClass.speedRange) || [80, 310];
    const band = (Math.max(0, (kph - lo) / (hi - lo)) * 7.2) % 1;
    const leds = Math.max(0, Math.min(15, Math.round(band * 15)));
    const wx = W / 2, wy = H * 0.94, ww = Math.min(W * 0.36, 420), wh = ww * 0.42;
    const mirror = (side) => {
      const mw = Math.min(W * 0.13, 150), mh = mw * 0.42, mx = side < 0 ? W * 0.07 : W * 0.93 - mw, my = H * 0.52;
      const b = info.behind[0];
      const onSide = b && (side < 0 ? b.lat <= 2 : b.lat >= -2);
      const sz = b ? Math.max(4, mh * 1.4 * (18 / (b.ds + 18))) : 0;
      const bc = b && cars.find((c) => c.no === b.no);
      return (
        <g key={side}>
          <line x1={side < 0 ? mx + mw : mx} y1={my + mh * 0.6} x2={side < 0 ? mx + mw + W * 0.05 : mx - W * 0.05} y2={my + mh * 1.4} stroke="#0b0c0e" strokeWidth="6"/>
          <rect x={mx - 3} y={my - 3} width={mw + 6} height={mh + 6} rx={mh * 0.4} fill="#0b0c0e"/>
          <clipPath id={`mir${side}`}><rect x={mx} y={my} width={mw} height={mh} rx={mh * 0.36}/></clipPath>
          <g clipPath={`url(#mir${side})`}>
            <rect x={mx} y={my} width={mw} height={mh} fill="url(#mirSky)"/>
            <rect x={mx} y={my + mh * 0.55} width={mw} height={mh * 0.45} fill="#3a3a3a"/>
            {onSide && bc && <g transform={`translate(${mx + mw / 2 + (side < 0 ? -1 : 1) * mw * 0.12} ${my + mh * 0.7})`}>
              <rect x={-sz * 0.7} y={-sz * 0.45} width={sz * 1.4} height={sz * 0.45} rx={sz * 0.1} fill={bc.livery.primary}/>
              <rect x={-sz * 0.9} y={-sz * 0.3} width={sz * 0.3} height={sz * 0.35} fill="#0d0e10"/>
              <rect x={sz * 0.6} y={-sz * 0.3} width={sz * 0.3} height={sz * 0.35} fill="#0d0e10"/>
              <rect x={-sz * 0.85} y={-sz * 0.62} width={sz * 1.7} height={sz * 0.12} fill="#16181c"/>
            </g>}
          </g>
        </g>
      );
    };
    const ledC = (i) => (i < 5 ? "#3fd26b" : i < 10 ? "#ff3b30" : "#5a7dff");
    return (
      <svg className="ck-furn" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id="mirSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8aa0b4"/><stop offset="1" stopColor="#c9c4b6"/></linearGradient>
          <linearGradient id="haloG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#050506"/><stop offset="0.45" stopColor="#1d2024"/><stop offset="1" stopColor="#050506"/></linearGradient>
          <filter id="ckBlur"><feGaussianBlur stdDeviation="2.2"/></filter>
        </defs>
        <path d={`M0 ${H} L0 ${H * 0.66} Q ${W * 0.08} ${H * 0.62} ${W * 0.2} ${H * 0.8} L ${W * 0.3} ${H} Z`} fill="#0a0b0d"/>
        <path d={`M${W} ${H} L${W} ${H * 0.66} Q ${W * 0.92} ${H * 0.62} ${W * 0.8} ${H * 0.8} L ${W * 0.7} ${H} Z`} fill="#0a0b0d"/>
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(${W / 2 + s * W * 0.3} ${H * 0.86}) rotate(${steer * 0.35})`}>
            <rect x={-W * 0.055} y={-H * 0.07} width={W * 0.11} height={H * 0.2} rx={W * 0.02} fill="#0d0e10"/>
            <rect x={-W * 0.05} y={-H * 0.065} width={W * 0.1} height={H * 0.03} rx="3" fill="#1c1e22"/>
          </g>
        ))}
        <path d={`M${W / 2 - W * 0.16} ${H} L ${W / 2 - W * 0.035} ${H * 0.7} Q ${W / 2} ${H * 0.67} ${W / 2 + W * 0.035} ${H * 0.7} L ${W / 2 + W * 0.16} ${H} Z`} fill={pri}/>
        <path d={`M${W / 2 - W * 0.02} ${H * 0.71} L ${W / 2 + W * 0.02} ${H * 0.71} L ${W / 2 + W * 0.06} ${H} L ${W / 2 - W * 0.06} ${H} Z`} fill={sec} opacity="0.8"/>
        {mirror(-1)}{mirror(1)}
        <g filter="url(#ckBlur)">
          <path d={`M ${-W * 0.04} ${H * 0.58} C ${W * 0.04} ${-H * 0.42}, ${W * 0.96} ${-H * 0.42}, ${W * 1.04} ${H * 0.58}`} fill="none" stroke="url(#haloG)" strokeWidth={H * 0.09} strokeLinecap="round"/>
          <path d={`M ${W / 2 - H * 0.026} ${-4} L ${W / 2 - H * 0.009} ${H * 0.69} L ${W / 2 + H * 0.009} ${H * 0.69} L ${W / 2 + H * 0.026} ${-4} Z`} fill="#0e0f12"/>
        </g>
        <g transform={`translate(${wx} ${wy}) rotate(${steer})`}>
          <path d={`M ${-ww / 2} ${-wh * 0.2} Q ${-ww / 2} ${-wh * 0.75} ${-ww * 0.3} ${-wh * 0.8} L ${ww * 0.3} ${-wh * 0.8} Q ${ww / 2} ${-wh * 0.75} ${ww / 2} ${-wh * 0.2} L ${ww * 0.42} ${wh * 0.5} L ${-ww * 0.42} ${wh * 0.5} Z`} fill="#141619"/>
          <rect x={-ww * 0.5} y={-wh * 0.62} width={ww * 0.1} height={wh * 1.1} rx={ww * 0.04} fill="#0b0c0e"/>
          <rect x={ww * 0.4} y={-wh * 0.62} width={ww * 0.1} height={wh * 1.1} rx={ww * 0.04} fill="#0b0c0e"/>
          {Array.from({ length: 15 }, (_, i) => (
            <circle key={i} cx={-ww * 0.28 + (i / 14) * ww * 0.56} cy={-wh * 0.66} r={ww * 0.011} fill={i < leds ? ledC(i) : "#23262b"} opacity={i < leds ? 1 : 0.8}/>
          ))}
          <rect x={-ww * 0.2} y={-wh * 0.55} width={ww * 0.4} height={wh * 0.5} rx="4" fill="#05070a" stroke="#22262c"/>
          <text x="0" y={-wh * 0.26} textAnchor="middle" dominantBaseline="central" fill="#F4EEE4" fontFamily="JetBrains Mono, ui-monospace, monospace" fontWeight="800" fontSize={wh * 0.28}>{g}</text>
          <text x={-ww * 0.16} y={-wh * 0.26} textAnchor="start" dominantBaseline="central" fill="rgba(244,238,228,0.75)" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize={wh * 0.1}>{kph}</text>
          <text x={ww * 0.16} y={-wh * 0.26} textAnchor="end" dominantBaseline="central" fill={info.drs ? "#3fd26b" : "rgba(244,238,228,0.35)"} fontFamily="JetBrains Mono, ui-monospace, monospace" fontWeight="700" fontSize={wh * 0.09}>DRS</text>
          {[-1, 1].map((s) => [0, 1].map((r) => (
            <circle key={`${s}${r}`} cx={s * ww * 0.3} cy={-wh * 0.2 + r * wh * 0.26} r={ww * 0.022} fill={r ? "#2f3a55" : "#553030"}/>
          )))}
        </g>
      </svg>
    );
  }

  function Cockpit({ model, track, cars, no, carClass, cond, onInfo }) {
    const wrap = useRef(null), cvs = useRef(null), stateRef = useRef({ roll: 0, steer: 0 });
    const [size, setSize] = React.useState({ W: 0, H: 0 });
    const [info, setInfo] = React.useState(null);
    const geom = useMemo(() => window.trackGeom(track), [track.id]);
    const elev = useMemo(() => elevFn(geom), [geom]);
    const top = ((carClass && carClass.speedRange) || [80, 310])[1];
    const mpu = ((track.length_km || 3.6) * 1000) / geom.len;
    const reduce = window.RaceClock.reduceMotion;
    const carsRef = useRef(cars); carsRef.current = cars;
    const infoCb = useRef(onInfo); infoCb.current = onInfo;
    useEffect(() => {
      const el = wrap.current;
      const ro = new ResizeObserver(() => setSize({ W: el.clientWidth, H: el.clientHeight }));
      ro.observe(el);
      return () => ro.disconnect();
    }, []);
    useEffect(() => {
      const c = cvs.current;
      if (!c || !size.W) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = size.W * dpr; c.height = size.H * dpr;
      const ctx = c.getContext("2d");
      let lastInfo = 0;
      const unsub = window.RaceClock.subscribe((t) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const r = draw(ctx, size.W, size.H, { model, geom, cars: carsRef.current, t, no, cond, reduce, elev, stateRef, top, mpu });
        const now = performance.now();
        if (r && now - lastInfo > (reduce ? 500 : 66)) { lastInfo = now; setInfo(r); if (infoCb.current) infoCb.current(r); }
      });
      return unsub;
    }, [size.W, size.H, model, geom, no, cond, reduce, elev, top, mpu]);
    const car = cars.find((c) => c.no === no) || cars[0];
    return (
      <div className="ck" ref={wrap}>
        <canvas ref={cvs} className="ck-world" style={{ width: size.W, height: size.H }} aria-label={`Cockpit view from ${car ? car.name : "the car"}`} role="img"/>
        {cond.weather === "rain" && <div className="ck-visor-rain" aria-hidden="true"/>}
        <div className="ck-vignette" aria-hidden="true"/>
        <Furniture W={size.W} H={size.H} info={info} car={car} cars={cars} carClass={carClass}/>
      </div>
    );
  }

  window.Cockpit = Cockpit;
  window.CockpitDraw = { M_PER_U };
})();
