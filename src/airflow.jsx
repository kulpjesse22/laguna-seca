// Live airflow around the followed car, drawn in the car's own frame (nose on +X, units = map
// units, L = car length). Free stream runs nose to tail, bends around the body, and collapses
// into a widening turbulent wake. A car sitting in that wake is flagged as running in dirty air.
// DRS open: a narrower, calmer wake (less drag, less to follow in).
(function () {
  const LANES = [-1.5, -1.15, -0.85, -0.6, -0.4, -0.22, -0.08, 0.08, 0.22, 0.4, 0.6, 0.85, 1.15, 1.5];

  function lanePath(y0, L, t, drs, reduce) {
    const pts = [];
    const calm = drs ? 0.6 : 1;
    for (let i = 0; i <= 48; i++) {
      const x = L * (2.2 - i * 0.14);
      const near = Math.exp(-((x / (0.55 * L)) ** 2));
      const side = Math.sign(y0) || 1;
      let y = y0 * L * 0.5 + side * near * Math.max(0, 0.34 - Math.abs(y0) * 0.16) * L;
      if (x < -0.45 * L) {
        const d = (-x - 0.45 * L) / L;
        const half = (0.3 + 0.2 * d) * calm;
        const inWake = Math.abs(y0) * 0.5 < half + 0.05;
        const pull = inWake ? Math.min(1, d * 0.5) * 0.35 : 0;
        y -= y0 * L * 0.5 * pull;
        if (inWake && !reduce) y += L * calm * Math.min(0.22, 0.05 + d * 0.06) * Math.sin(x / L * 5.2 + t * 7 + y0 * 9) * Math.cos(t * 2.3 + y0 * 4);
      }
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return "M" + pts.join("L");
  }

  function toLocal(car, n) {
    const a = (car.angle * Math.PI) / 180, dx = n.x - car.x, dy = n.y - car.y;
    return { x: dx * Math.cos(a) + dy * Math.sin(a), y: -dx * Math.sin(a) + dy * Math.cos(a) };
  }

  // Returns { el, follower } — follower is the car in the wake cone, if any.
  function build({ car, nodes, t, drs, reduce }) {
    const L = car.lenU, calm = drs ? 0.6 : 1;
    const cone = [];
    for (let i = 0; i <= 12; i++) { const d = i * 0.33; cone.push([-0.45 * L - d * L, (0.3 + 0.2 * d) * calm * L]); }
    const conePath = "M" + cone.map(([x, h]) => `${x.toFixed(2)},${(-h).toFixed(2)}`).join("L") + "L" + cone.reverse().map(([x, h]) => `${x.toFixed(2)},${h.toFixed(2)}`).join("L") + "Z";
    let follower = null;
    nodes.forEach((n) => {
      if (n.no === car.no) return;
      const p = toLocal(car, n), d = (-p.x - 0.45 * L) / L;
      if (d < 0 || d > 4) return;
      if (Math.abs(p.y) < (0.3 + 0.2 * d) * calm * L + 0.2 * L && (!follower || d < follower.d)) follower = { n, d, p };
    });
    const loss = follower ? Math.round((drs ? 18 : 30) * Math.exp(-follower.d / 2.6)) : 0;
    const dash = `${(L * 0.34).toFixed(2)} ${(L * 0.22).toFixed(2)}`;
    const off = reduce ? 0 : -(t * L * 3.2) % (L * 0.56);
    const el = (
      <g className="airflow" pointerEvents="none">
        <g transform={`translate(${car.x},${car.y}) rotate(${car.angle})`}>
          <path d={conePath} fill="url(#airWakeG)" opacity={drs ? 0.5 : 0.8}/>
          {LANES.map((y0) => {
            const core = Math.abs(y0) < 0.5;
            return <path key={y0} d={lanePath(y0, L, t, drs, reduce)} fill="none" vectorEffect="non-scaling-stroke"
              stroke={core ? "rgba(255,170,120,0.85)" : "rgba(160,205,255,0.7)"} strokeWidth={core ? 1.3 : 1}
              strokeDasharray={dash} strokeDashoffset={off} strokeLinecap="round" opacity={core ? 0.9 : 0.6}/>;
          })}
        </g>
        {follower && <g>
          <circle cx={follower.n.x} cy={follower.n.y} r={L * 0.7} fill="none" stroke="rgba(255,170,120,0.8)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"/>
        </g>}
      </g>
    );
    return { el, follower: follower && { no: follower.n.no, name: follower.n.name, loss, x: follower.n.x, y: follower.n.y } };
  }

  const Defs = () => (
    <linearGradient id="airWakeG" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stopColor="rgba(255,150,100,0.28)"/>
      <stop offset="1" stopColor="rgba(255,150,100,0)"/>
    </linearGradient>
  );

  window.Airflow = { build, Defs };
})();
