// Driver-view "POV" — pure SVG track-from-driver perspective.
// Samples upcoming track points, transforms into car-local space (forward = +Y, right = +X),
// then projects through a simple perspective camera into screen space.

const { useMemo: useMemoDV } = React;

// `frac` is the car's lap fraction from the race model; `cur` its telemetry sample.
function DriverView({ car, track, frac, cur, carClass }) {
  const geom = useMemoDV(() => window.trackGeom(track), [track.id]);
  const speedKph = Math.round(window.remapSpeed(cur.speed, carClass));
  const gear = window.gearFor(speedKph, carClass);

  const SAMPLES = 36;
  const LOOK = 240;
  const qFrac = Math.round(frac / 0.0015) * 0.0015;
  const projected = useMemoDV(() => {
    const p0 = geom.at(qFrac);
    const fx = Math.cos(p0.rad), fy = Math.sin(p0.rad);
    const rx = -fy, ry = fx;
    const out = [];
    for (let i = 0; i < SAMPLES; i++) {
      const s = (i / (SAMPLES - 1)) * LOOK;
      const p = geom.at(qFrac + s / geom.len);
      const dx = p.x - p0.x, dy = p.y - p0.y;
      out.push({ s, forward: dx * fx + dy * fy, lateral: dx * rx + dy * ry });
    }
    return out;
  }, [qFrac, geom]);

  const nextTurn = useMemoDV(() => {
    let best = null;
    for (const c of geom.corners) {
      const dist = (((c.frac - qFrac) % 1) + 1) % 1 * geom.len;
      if (dist > 4 && dist < LOOK && (!best || dist < best.dist)) best = { turn: c, dist };
    }
    return best;
  }, [qFrac, geom]);

  return (
    <div className="dv-card">
      <DriverViewScene car={car} track={track} carClass={carClass}
        projected={projected} nextTurn={nextTurn}
        cur={cur} speedKph={speedKph} gear={gear}/>
    </div>
  );
}

function DriverViewScene({ car, track, carClass, projected, nextTurn, cur, speedKph, gear }) {
  if (!car) return <div className="dv-loading">ACQUIRING SIGNAL…</div>;

  const VW = 320, VH = 240;
  const cx = VW / 2;
  const horizonY = 96;

  const accent = (carClass && carClass.accent) || car.livery.accent || "#5BB7E2";
  const tint = car.livery.accent === "#FFFFFF" ? "#E8E4DC" : car.livery.accent;

  // Camera: car at origin, looking down +Y. Project (lateral, forward) to screen.
  const ROAD_HALF = 11;
  const FOCAL = 130;
  const CAM_H = 4.0;
  const NEAR = 4;
  const project = (lat, fwd) => {
    const z = Math.max(fwd, NEAR);
    const sx = cx + (lat * FOCAL) / z;
    const sy = horizonY + (CAM_H * FOCAL) / z;
    return { sx, sy, z };
  };

  // Build ribbon
  let leftPts = [], rightPts = [], centerPts = [];
  if (projected && projected.length) {
    for (let i = 0; i < projected.length; i++) {
      const s = projected[i];
      if (s.forward < NEAR * 0.4) continue;
      // Tangent in (lateral, forward) plane
      const sNext = projected[Math.min(i + 1, projected.length - 1)];
      const sPrev = projected[Math.max(i - 1, 0)];
      const tx = sNext.lateral - sPrev.lateral;
      const ty = sNext.forward - sPrev.forward;
      const tlen = Math.hypot(tx, ty) || 1;
      // perpendicular (right of travel direction)
      const nx = ty / tlen;
      const ny = -tx / tlen;
      const L = project(s.lateral - nx * ROAD_HALF, s.forward - ny * ROAD_HALF);
      const R = project(s.lateral + nx * ROAD_HALF, s.forward + ny * ROAD_HALF);
      const C = project(s.lateral, s.forward);
      leftPts.push(L); rightPts.push(R); centerPts.push(C);
    }
  }

  // FALLBACK: if projection produced nothing, draw a straight perspective road
  if (leftPts.length < 2) {
    leftPts = []; rightPts = []; centerPts = [];
    for (let i = 0; i < 24; i++) {
      const fwd = NEAR + (i / 23) * 200;
      leftPts.push(project(-ROAD_HALF, fwd));
      rightPts.push(project(ROAD_HALF, fwd));
      centerPts.push(project(0, fwd));
    }
  }

  // Reverse so far points come first (drawn behind near points)
  leftPts.reverse(); rightPts.reverse(); centerPts.reverse();

  const ribbonD = `M ${leftPts[0].sx} ${leftPts[0].sy} ` +
    leftPts.slice(1).map(p => `L ${p.sx} ${p.sy}`).join(" ") + " " +
    rightPts.slice().reverse().map(p => `L ${p.sx} ${p.sy}`).join(" ") + " Z";
  const leftEdgeD = `M ${leftPts[0].sx} ${leftPts[0].sy} ` + leftPts.slice(1).map(p => `L ${p.sx} ${p.sy}`).join(" ");
  const rightEdgeD = `M ${rightPts[0].sx} ${rightPts[0].sy} ` + rightPts.slice(1).map(p => `L ${p.sx} ${p.sy}`).join(" ");

  // Curb tics
  const curbTics = [];
  for (let i = 0; i < leftPts.length - 1; i++) {
    curbTics.push({ a: leftPts[i], b: leftPts[i+1], c: i, side: "L" });
    curbTics.push({ a: rightPts[i], b: rightPts[i+1], c: i, side: "R" });
  }

  // Center dashes
  const centerSegs = [];
  for (let i = 0; i < centerPts.length - 1; i += 2) {
    centerSegs.push({ a: centerPts[i], b: centerPts[i+1] });
  }

  // Distance pylons
  const distMarkers = [];
  if (projected) {
    // projected was built in original order, so iterate forward
    let lastEmitted = -1;
    for (let i = 0; i < projected.length; i++) {
      const s = projected[i];
      if (s.forward < NEAR) continue;
      const seg = Math.floor(s.s / 30);
      if (seg !== lastEmitted && seg > 0) {
        lastEmitted = seg;
        // find matching pt in our (reversed) arrays
        const orig = projected.length - 1 - i;
        const L = leftPts[orig], R = rightPts[orig];
        if (L && R) distMarkers.push({ L, R, dist: seg * 30, idx: i });
      }
    }
  }

  // Hills
  const farHillsD = `M -10 ${horizonY} C 30 ${horizonY-22}, 70 ${horizonY-8}, 110 ${horizonY-18} S 180 ${horizonY-30}, 220 ${horizonY-12} S 290 ${horizonY-26}, ${VW+10} ${horizonY-6} L ${VW+10} ${horizonY} Z`;
  const nearHillsD = `M -10 ${horizonY} C 40 ${horizonY-10}, 90 ${horizonY-2}, 140 ${horizonY-6} S 220 ${horizonY-14}, 280 ${horizonY-2} L ${VW+10} ${horizonY} Z`;

  return (
    <svg className="dv-svg" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Simulated driver view for car ${car.no}`}>
      <defs>
        <clipPath id="dv-clip"><rect x="0" y="0" width={VW} height={VH}/></clipPath>
        <linearGradient id="dv-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1a1f2a"/>
          <stop offset="100%" stopColor="#3a3a40"/>
        </linearGradient>
        <linearGradient id="dv-ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1f2520"/>
          <stop offset="100%" stopColor="#2a3027"/>
        </linearGradient>
        <linearGradient id="dv-road2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2A2A2C"/>
          <stop offset="100%" stopColor="#15161A"/>
        </linearGradient>
        <linearGradient id="dv-vignette" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.45)"/>
          <stop offset="35%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="75%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.85)"/>
        </linearGradient>
      </defs>

      <g clipPath="url(#dv-clip)">
        {/* Sky */}
        <rect x="0" y="0" width={VW} height={horizonY + 1} fill="url(#dv-sky)"/>
        <path d={farHillsD} fill="#2a2f36" opacity="0.85"/>
        <path d={nearHillsD} fill="#23272d"/>
        {/* Ground */}
        <rect x="0" y={horizonY} width={VW} height={VH - horizonY} fill="url(#dv-ground)"/>
        {/* Horizon haze */}
        <rect x="0" y={horizonY - 2} width={VW} height="3" fill={accent} opacity="0.16"/>

        {/* Road ribbon */}
        <path d={ribbonD} fill="url(#dv-road2)"/>

        {/* Curb tics */}
        {curbTics.map((t, i) => {
          const col = (t.c % 2 === 0) ? "#C8102E" : "#E8E4DC";
          return (
            <line key={"c"+i} x1={t.a.sx} y1={t.a.sy} x2={t.b.sx} y2={t.b.sy}
              stroke={col} strokeWidth="2" opacity="0.85"/>
          );
        })}

        {/* Edge lines */}
        <path d={leftEdgeD} fill="none" stroke="#E8E4DC" strokeWidth="1.1" opacity="0.95"/>
        <path d={rightEdgeD} fill="none" stroke="#E8E4DC" strokeWidth="1.1" opacity="0.95"/>

        {/* Centerline dashes */}
        {centerSegs.map((seg, i) => (
          <line key={"cs"+i} x1={seg.a.sx} y1={seg.a.sy} x2={seg.b.sx} y2={seg.b.sy}
            stroke="rgba(232,228,220,0.45)" strokeWidth="0.9"/>
        ))}

        {/* Distance pylons */}
        {distMarkers.map((m, i) => {
          const meters = Math.round(m.dist * 0.9);
          const dx = m.R.sx - m.L.sx;
          const dy = m.R.sy - m.L.sy;
          const len = Math.hypot(dx, dy) || 1;
          const ox = (dx / len) * 6;
          const oy = (dy / len) * 6;
          const px = m.R.sx + ox;
          const py = m.R.sy + oy;
          const h = Math.max(3, 16 - m.idx * 0.6);
          return (
            <g key={"dm"+i} opacity={Math.max(0.35, 1 - m.idx * 0.04)}>
              <line x1={px} y1={py} x2={px} y2={py - h} stroke="#E8E4DC" strokeWidth="0.7"/>
              <rect x={px - 7} y={py - h - 5} width="14" height="5" fill="rgba(7,9,12,0.85)" stroke={tint} strokeWidth="0.4"/>
              <text x={px} y={py - h - 1.2} fontSize="3.6" fontFamily="JetBrains Mono, monospace"
                fill="#E8E4DC" textAnchor="middle" letterSpacing="0.5">{meters}M</text>
            </g>
          );
        })}

        {/* Vignette */}
        <rect x="0" y="0" width={VW} height={VH} fill="url(#dv-vignette)"/>

        {/* Cockpit silhouette */}
        <g>
          <path d={`M 0 ${VH-46} Q ${cx} ${VH-92} ${VW} ${VH-46} L ${VW} ${VH} L 0 ${VH} Z`} fill="#06080B"/>
          <path d={`M 0 ${VH-46} Q ${cx} ${VH-92} ${VW} ${VH-46}`} fill="none" stroke={tint} strokeWidth="1" opacity="0.6"/>
          <rect x={cx - 50} y={VH - 22} width="100" height="3" fill="#0a0a0a"/>
          <rect x={cx - 48} y={VH - 22} width="96" height="3" fill={tint} opacity="0.55"/>
          <circle cx={cx} cy={VH - 10} r="3" fill={tint}/>
          <rect x="14" y={VH - 56} width="14" height="6" fill="#0a0a0a" stroke={tint} strokeWidth="0.5" opacity="0.85"/>
          <rect x={VW - 28} y={VH - 56} width="14" height="6" fill="#0a0a0a" stroke={tint} strokeWidth="0.5" opacity="0.85"/>
        </g>
      </g>

      {/* HUD */}
      <g className="dv-hud">
        <g transform="translate(12,14)">
          <text x="0" y="0" fontSize="6.5" fontFamily="JetBrains Mono, monospace"
            letterSpacing="2" fill="rgba(232,228,220,0.6)">SPEED · KPH</text>
          <text x="0" y="22" fontSize="26" fontFamily="Geist, sans-serif"
            fontWeight="900" fill={tint} style={{letterSpacing:"-0.05em"}}>{speedKph}</text>
        </g>
        <g transform={`translate(${VW-12},14)`}>
          <text x="0" y="0" fontSize="6.5" fontFamily="JetBrains Mono, monospace"
            letterSpacing="2" fill="rgba(232,228,220,0.6)" textAnchor="end">GEAR</text>
          <text x="0" y="24" fontSize="28" fontFamily="Geist, sans-serif"
            fontWeight="900" fill="#fff" textAnchor="end" style={{letterSpacing:"-0.05em"}}>{gear}</text>
        </g>

        <g transform="translate(12,46)">
          <rect x="0" y="0" width="70" height="3" fill="rgba(0,0,0,0.6)" stroke="#222" strokeWidth="0.4"/>
          <rect x="0" y="0" width={(cur.throttle/100)*70} height="3" fill="#7DC383"/>
          <rect x="0" y="5" width="70" height="3" fill="rgba(0,0,0,0.6)" stroke="#222" strokeWidth="0.4"/>
          <rect x="0" y="5" width={(cur.brake/100)*70} height="3" fill="#C8102E"/>
          <text x="74" y="3" fontSize="6" fontFamily="JetBrains Mono, monospace"
            letterSpacing="1.5" fill="rgba(232,228,220,0.55)" dominantBaseline="middle">T/B</text>
        </g>

        {nextTurn && (
          <g transform={`translate(${cx},22)`}>
            <rect x="-58" y="-10" width="116" height="20" fill="rgba(7,9,12,0.85)"
              stroke={tint} strokeWidth="0.8"/>
            <text x="0" y="-2" fontSize="5.5" fontFamily="JetBrains Mono, monospace"
              letterSpacing="2" fill="rgba(232,228,220,0.7)" textAnchor="middle">NEXT · IN {Math.round(nextTurn.dist*0.9)}M</text>
            <text x="0" y="6" fontSize="9" fontFamily="Geist, sans-serif" fontWeight="800"
              fill="#fff" textAnchor="middle"
              style={{letterSpacing:"0.04em"}}>{nextTurn.turn.label}{nextTurn.turn.name ? " · " + nextTurn.turn.name : ""}</text>
          </g>
        )}

        <g transform={`translate(12,${VH-12})`}>
          <text x="0" y="0" fontSize="6.5" fontFamily="JetBrains Mono, monospace"
            letterSpacing="2" fill="rgba(232,228,220,0.7)">DRIVER VIEW · #{car.no} · {car.short || car.team.split(" ")[0]}</text>
        </g>
        <g transform={`translate(${VW-12},${VH-12})`}>
          <text x="0" y="0" fontSize="6.5" fontFamily="JetBrains Mono, monospace"
            letterSpacing="2" fill="#E5484D" textAnchor="end">SIM · POV</text>
        </g>
      </g>
    </svg>
  );
}

window.DriverView = DriverView;
