// Track component — renders the selected circuit, cars on path, sector overlay, turn markers,
// the battle camera (follow cam or inset) and collision-free car tags.
const { useState, useEffect, useRef, useMemo } = React;

const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => { const k = clampN((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const surname = (c) => (c.name || "").split(" ").slice(-1)[0];
const hudRects = ".track-hud-tl, .track-hud-tr, .track-history-pill, .cam-toggle, .track-hint, .battle-inset, .mini-map, .bcast-lt, .bcast-top, .bcast-bug, .bcast-event-banner";

// Top-down surface textures for the cinema map, generated once. Tile sizes are in map units
// (a car is 11 units, about 5.5 m), so grain reads at the right scale under the chase camera.
let cineTexCache = null;
function cineTextures() {
  if (cineTexCache) return cineTexCache;
  let seed = 1234567;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const make = (n, paint) => {
    const c = document.createElement("canvas");
    c.width = c.height = n;
    const x = c.getContext("2d");
    paint(x, n);
    return c.toDataURL("image/png");
  };
  const noise = (x, n, base, amp, warm = 0) => {
    const img = x.createImageData(n, n), p = img.data;
    for (let i = 0; i < p.length; i += 4) {
      const v = (r() + r() + r() - 1.5) * amp;
      p[i] = base[0] + v + warm; p[i + 1] = base[1] + v; p[i + 2] = base[2] + v - warm; p[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  };
  // Draw with wrap-around so every tile is seamless.
  const wrap = (n, x0, y0, rad, fn) => {
    for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) {
      const X = x0 + dx, Y = y0 + dy;
      if (X + rad < 0 || Y + rad < 0 || X - rad > n || Y - rad > n) continue;
      fn(X, Y);
    }
  };
  const blotches = (x, n, count, rMin, rMax, cols) => {
    for (let i = 0; i < count; i++) {
      const x0 = r() * n, y0 = r() * n, rad = rMin + r() * (rMax - rMin), col = cols[Math.floor(r() * cols.length)];
      wrap(n, x0, y0, rad, (X, Y) => {
        const g = x.createRadialGradient(X, Y, 0, X, Y, rad);
        g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = g; x.fillRect(X - rad, Y - rad, rad * 2, rad * 2);
      });
    }
  };
  const asphalt = make(256, (x, n) => {
    noise(x, n, [40, 39, 38], 22, 1);
    blotches(x, n, 26, 10, 40, ["rgba(0,0,0,0.10)", "rgba(255,245,230,0.035)"]);
    for (let i = 0; i < 900; i++) {
      const l = 60 + r() * 60;
      x.fillStyle = `rgba(${l + 6},${l + 3},${l},${0.35 + r() * 0.4})`;
      x.fillRect(Math.floor(r() * n), Math.floor(r() * n), 1, 1);
    }
  });
  const patches = make(256, (x, n) => {
    blotches(x, n, 44, 12, 60, ["rgba(0,0,0,0.22)", "rgba(230,220,200,0.06)", "rgba(0,0,0,0.14)"]);
  });
  const grass = make(256, (x, n) => {
    noise(x, n, [60, 53, 33], 14, 3);
    blotches(x, n, 60, 8, 30, ["rgba(38,48,24,0.2)", "rgba(120,98,56,0.14)", "rgba(20,18,12,0.14)"]);
    x.lineCap = "round";
    for (let i = 0; i < 5200; i++) {
      const x0 = r() * n, y0 = r() * n, a = r() * Math.PI * 2, len = 1.5 + r() * 3.5, light = r() < 0.5;
      x.strokeStyle = light ? `rgba(${118 + r() * 40},${98 + r() * 30},${58 + r() * 20},${0.18 + r() * 0.25})` : `rgba(20,18,10,${0.2 + r() * 0.3})`;
      x.lineWidth = 0.6 + r() * 0.6;
      wrap(n, x0, y0, len, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a) * len, Y + Math.sin(a) * len); x.stroke(); });
    }
  });
  const gravel = make(256, (x, n) => {
    noise(x, n, [74, 68, 58], 18, 4);
    for (let i = 0; i < 4200; i++) {
      const x0 = r() * n, y0 = r() * n, rad = 0.6 + r() * 1.3, l = 70 + r() * 90;
      wrap(n, x0, y0, rad + 1, (X, Y) => {
        x.fillStyle = "rgba(0,0,0,0.35)"; x.beginPath(); x.arc(X + 0.5, Y + 0.6, rad, 0, Math.PI * 2); x.fill();
        x.fillStyle = `rgb(${l + 8},${l + 2},${l - 8})`; x.beginPath(); x.arc(X, Y, rad, 0, Math.PI * 2); x.fill();
      });
    }
  });
  const dirt = make(256, (x, n) => {
    noise(x, n, [56, 46, 34], 16, 4);
    blotches(x, n, 30, 8, 36, ["rgba(20,16,10,0.35)", "rgba(110,90,60,0.2)", "rgba(40,44,26,0.3)"]);
  });
  cineTexCache = { asphalt, patches, grass, gravel, dirt };
  return cineTexCache;
}

// Points along the path from length s0 for len units, offset laterally by off (map units).
function pathSpan(path, pathLen, s0, len, off = 0, step = 1.5) {
  const out = [];
  let lx, ly;
  for (let d = 0; d <= len; d += step) {
    const s = ((s0 + d) % pathLen + pathLen) % pathLen;
    const p = path.getPointAtLength(s), q = path.getPointAtLength((s + 0.8) % pathLen);
    const a = Math.atan2(q.y - p.y, q.x - p.x), nx = -Math.sin(a), ny = Math.cos(a);
    const x = p.x + nx * off, y = p.y + ny * off;
    // On the inside of a corner tighter than the offset the curve folds back; skip the reversed points.
    if (lx !== undefined && (x - lx) * Math.cos(a) + (y - ly) * Math.sin(a) <= 0) continue;
    lx = x; ly = y;
    out.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return out.join(" ");
}

function Track({ track, cars, focusedNo, onFocus, onZoom, lap, lapsTotal, flag, timeOfDay, weather, showSectors, showTurns, carClass, model, broadcast, cine, cond,
  follow = null, onFollow, airflow = false, onAirflow, onTunnel, loupe = true }) {
  const night = cine && cond && cond.tod === "night", wet = cine && cond && cond.weather === "rain";
  const pathRef = useRef(null);
  const wrapRef = useRef(null);
  const blockersRef = useRef([]);
  const [pathLen, setPathLen] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [camPick, setCamPick] = useState(null);

  // Re-measure when the track path changes
  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, [track.id]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (Math.round(r.width) === s.w && Math.round(r.height) === s.h ? s : { w: Math.round(r.width), h: Math.round(r.height) }));
      blockersRef.current = [...document.querySelectorAll(hudRects)].map((n) => n.getBoundingClientRect())
        .filter((b) => b.width > 0 && b.height > 0 && b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom)
        .map((b) => ({ x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const iv = setInterval(measure, 1000);
    return () => { ro.disconnect(); clearInterval(iv); };
  }, []);

  // Color tokens for time of day — calm dark surface, no grass.
  const sky = cine ? (night ? "#010203" : "#030202") : timeOfDay === "night" ? "#03060B" : timeOfDay === "dusk" ? "#0E0710" : "#000000";
  const asphalt = cine ? (wet ? "#191A1B" : night ? "#1A1A1B" : "#1F1D1B") : timeOfDay === "night" ? "#1A1F25" : timeOfDay === "dusk" ? "#22191F" : "#262629";
  const asphaltDark = cine ? "#0F0E0D" : timeOfDay === "night" ? "#0E1218" : timeOfDay === "dusk" ? "#160F14" : "#15151A";
  const paint = cine ? "#E6D9C2" : "#D8D2C5";
  const trackStroke = cine ? "#8A7F70" : timeOfDay === "night" ? "#3A6E8A" : timeOfDay === "dusk" ? "#7E5A6E" : "#5BB7E2";

  const geom = useMemo(() => window.trackGeom(track), [track.id]);

  // Focused car: brake zones from its telemetry, which brakes on approach to the circuit's own turns.
  const brakeHotspots = useMemo(() => {
    if (!focusedNo || cine) return [];
    const tele = window.carTelemetry(focusedNo, track);
    const out = [];
    for (let i = 0; i < tele.length; i++) {
      if (tele[i].brake > 60) {
        const p = geom.at(i / tele.length);
        out.push({ x: p.x, y: p.y, intensity: tele[i].brake / 100 });
      }
    }
    return out;
  }, [focusedNo, geom, cine]);

  // Corner chevrons — just BEFORE the apex (entry side), pointing in the racing direction.
  const cornerChevrons = useMemo(() => {
    if (!pathLen || !pathRef.current) return [];
    const out = [];
    const path = pathRef.current;
    track.turns.forEach((t) => {
      let best = 0, bestD = Infinity;
      const SAMPLES = 240;
      for (let i = 0; i < SAMPLES; i++) {
        const s = (i / SAMPLES) * pathLen;
        const p = path.getPointAtLength(s);
        const dx = p.x - t.x, dy = p.y - t.y;
        const d = dx*dx + dy*dy;
        if (d < bestD) { bestD = d; best = s; }
      }
      const N = t.important ? 3 : 2;
      const STEP = 14;
      for (let k = 1; k <= N; k++) {
        const s = (best - k * STEP + pathLen) % pathLen;
        const p = path.getPointAtLength(s);
        const ahead = path.getPointAtLength((s + 2) % pathLen);
        const angle = Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180 / Math.PI;
        const rad = Math.atan2(ahead.y - p.y, ahead.x - p.x);
        const nx = -Math.sin(rad), ny = Math.cos(rad);
        const sideHint = ((t.x - p.x) * nx + (t.y - p.y) * ny) > 0 ? 1 : -1;
        const off = 8;
        out.push({ x: p.x + nx * off * sideHint, y: p.y + ny * off * sideHint, angle, fade: 1 - (k - 1) / N, important: t.important });
      }
    });
    return out;
  }, [pathLen, track.id]);

  // Kerb segments at important turns — short stretches of red/white striping.
  const kerbSegments = useMemo(() => {
    if (!pathLen || !pathRef.current) return [];
    const path = pathRef.current;
    return track.turns
      .filter((t) => t.important)
      .map((t) => {
        let best = 0, bestD = Infinity;
        const SAMPLES = 240;
        for (let i = 0; i < SAMPLES; i++) {
          const s = (i / SAMPLES) * pathLen;
          const p = path.getPointAtLength(s);
          const dx = p.x - t.x, dy = p.y - t.y;
          const d = dx*dx + dy*dy;
          if (d < bestD) { bestD = d; best = s; }
        }
        const SPAN = 60;
        return { start: (best - SPAN / 2 + pathLen) % pathLen, length: SPAN };
      });
  }, [pathLen, track.id]);

  // Gravel beds around the heavy braking zones (cinema only), so an off has somewhere to go.
  const gravelSegs = useMemo(() => {
    if (!cine || !pathLen) return [];
    const P = window.RaceModel.profile(track);
    const sAt = (f) => (((geom.sfS + geom.dir * f) % 1 + 1) % 1) * pathLen;
    return P.corners.filter((c) => c.vMin < 0.62).map((c) => {
      const a = c.frac - 0.018, b = c.exit + 0.02, span = ((b - a) % 1 + 1) % 1;
      return { start: geom.dir > 0 ? sAt(a) : sAt(b), length: span * pathLen };
    });
  }, [cine, pathLen, track.id]);

  // Floodlight pools for night sessions, alternating sides of the circuit.
  const floods = useMemo(() => {
    if (!night) return [];
    const out = [];
    for (let i = 0; i < 44; i++) {
      const p = geom.at(i / 44), side = i % 2 ? 1 : -1;
      out.push({ x: p.x - Math.sin(p.rad) * side * 30, y: p.y + Math.cos(p.rad) * side * 30 });
    }
    return out;
  }, [night, geom]);

  // Cinema surfaces: kerb stripes as real polylines, tyre walls and armco outside the heavy-braking corners.
  const cineGeo = useMemo(() => {
    if (!cine || !pathLen || !pathRef.current) return null;
    const path = pathRef.current;
    const P = window.RaceModel.profile(track);
    const sAt = (f) => (((geom.sfS + geom.dir * f) % 1 + 1) % 1) * pathLen;
    const spans = P.corners.map((c) => {
      const a = c.frac - 0.008, b = c.exit + 0.004, span = ((b - a) % 1 + 1) % 1;
      return { start: geom.dir > 0 ? sAt(a) : sAt(b), length: Math.min(span * pathLen, 140) };
    });
    const kerbs = spans.flatMap((k) => [pathSpan(path, pathLen, k.start, k.length, 19.3, 1), pathSpan(path, pathLen, k.start, k.length, -19.3, 1)]);
    const walls = gravelSegs.map((g) => {
      const a = path.getPointAtLength(g.start), a2 = path.getPointAtLength((g.start + 1) % pathLen);
      const b = path.getPointAtLength((g.start + g.length) % pathLen), b2 = path.getPointAtLength((g.start + g.length + 1) % pathLen);
      let d = Math.atan2(b2.y - b.y, b2.x - b.x) - Math.atan2(a2.y - a.y, a2.x - a.x);
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const out = d > 0 ? -1 : 1, s0 = g.start - 10, len = g.length + 30;
      return { tyres: pathSpan(path, pathLen, s0, len, out * 42, 1.2), armco: pathSpan(path, pathLen, s0 - 20, len + 50, out * 45.5, 2) };
    });
    return { kerbs, walls };
  }, [cine, pathLen, track.id, gravelSegs]);
  const tex = cine ? cineTextures() : null;

  const sectorBands = [
    { from: 0.00, to: 0.33, color: "#5BB7E2" },
    { from: 0.33, to: 0.66, color: "#C9A24A" },
    { from: 0.66, to: 1.00, color: "#9B6BC8" },
  ];

  const sf = track.sf_line;
  const hill = track.hill;

  let sfGrid = null;
  if (sf) {
    const _dx = sf.x2 - sf.x1, _dy = sf.y2 - sf.y1;
    const _len = Math.sqrt(_dx*_dx + _dy*_dy);
    const _ang = Math.atan2(_dy, _dx) * 180 / Math.PI;
    const _cx = (sf.x1 + sf.x2) / 2, _cy = (sf.y1 + sf.y2) / 2;
    const _W = Math.max(_len, 22);
    const _H = 24;
    const _cells = 8;
    const _cw = _W / _cells;
    const _rects = [];
    for (let k = 0; k < _cells * 2; k++) {
      const col = k % _cells, row = Math.floor(k / _cells);
      const isWhite = (col + row) % 2 === 0;
      _rects.push({ key: k, x: -_W/2 + col * _cw, y: -_H/2 + row * (_H/2), w: _cw, h: _H/2, fill: isWhite ? "#F4EFE5" : "#0a0a0a" });
    }
    sfGrid = { cx: _cx, cy: _cy, ang: _ang, W: _W, H: _H, rects: _rects };
  }

  const baseId = `trk-base-${track.id}`;
  // Static circuit drawing. Memoised so the 30 Hz car layer never re-diffs it, and
  // re-used by the battle-cam inset through <use>.
  const base = useMemo(() => (
    <g id={baseId}>
      <defs>
        <linearGradient id="asphaltSheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)"/>
          <stop offset="50%" stopColor="rgba(255,255,255,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.18)"/>
        </linearGradient>
        <pattern id="kerbStripe" width="14" height="6" patternUnits="userSpaceOnUse">
          <rect width="7" height="6" fill={cine ? "#6A3A32" : "#C8102E"}/>
          <rect x="7" width="7" height="6" fill="#F4EFE5"/>
        </pattern>
        <pattern id="gravelDots" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.4" r="0.55" fill="rgba(210,180,130,0.16)"/>
          <circle cx="3.6" cy="3.7" r="0.45" fill="rgba(0,0,0,0.25)"/>
        </pattern>
        <radialGradient id="smokeG">
          <stop offset="0%" stopColor="#EDE7DC" stopOpacity="0.9"/>
          <stop offset="60%" stopColor="#CFC8BC" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#CFC8BC" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="dustG">
          <stop offset="0%" stopColor="#C39A62" stopOpacity="0.85"/>
          <stop offset="55%" stopColor="#9A7648" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#9A7648" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="floodG">
          <stop offset="0%" stopColor="#FFF1D8" stopOpacity="0.2"/>
          <stop offset="45%" stopColor="#FFE6C0" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#FFE6C0" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="sprayG">
          <stop offset="0%" stopColor="#DCE3EA" stopOpacity="0.7"/>
          <stop offset="55%" stopColor="#C4CDD6" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#C4CDD6" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="rainLightG">
          <stop offset="0%" stopColor="#FF5A4A" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#FF3B30" stopOpacity="0"/>
        </radialGradient>
        {tex && <>
          <pattern id="texAsphalt" width="24" height="24" patternUnits="userSpaceOnUse"><image href={tex.asphalt} width="24" height="24" preserveAspectRatio="none"/></pattern>
          <pattern id="texPatches" width="360" height="360" patternUnits="userSpaceOnUse"><image href={tex.patches} width="360" height="360" preserveAspectRatio="none"/></pattern>
          <pattern id="texGravel" width="18" height="18" patternUnits="userSpaceOnUse"><image href={tex.gravel} width="18" height="18" preserveAspectRatio="none"/></pattern>
          <pattern id="texDirt" width="30" height="30" patternUnits="userSpaceOnUse"><image href={tex.dirt} width="30" height="30" preserveAspectRatio="none"/></pattern>
          <radialGradient id="aoG">
            <stop offset="0%" stopColor="#000" stopOpacity="0.62"/>
            <stop offset="70%" stopColor="#000" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>
        </>}
        <radialGradient id="carGlow">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28"/>
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {hill && !cine && (
        <g opacity="0.10" stroke={trackStroke} fill="none" strokeWidth="0.5">
          <ellipse cx={hill.cx} cy={hill.cy} rx={hill.rx} ry={hill.ry}/>
          <ellipse cx={hill.cx} cy={hill.cy} rx={hill.rx*0.65} ry={hill.ry*0.65}/>
          <ellipse cx={hill.cx} cy={hill.cy} rx={hill.rx*0.35} ry={hill.ry*0.35}/>
        </g>
      )}

      {track.pit && (
        <g>
          <path d={track.pit} fill="none" stroke={asphaltDark} strokeWidth="10" strokeLinecap="round"/>
          <path d={track.pit} fill="none" stroke={asphalt} strokeWidth="8" strokeLinecap="round"/>
          <path d={track.pit} fill="none" stroke={paint} strokeWidth="0.6" strokeDasharray="3 4" opacity="0.5"/>
          <path d={track.pit} fill="none" stroke={paint} strokeWidth="8.5" strokeLinecap="round" opacity="0.3" strokeDasharray="0 0"/>
        </g>
      )}

      {gravelSegs.map((g, i) => (
        <g key={`gravel-${i}`}>
          <path d={track.path} fill="none" stroke="#211B15" strokeWidth="78" strokeDasharray={`${g.length} ${pathLen}`} strokeDashoffset={-g.start} strokeLinecap="round"/>
          <path d={track.path} fill="none" stroke={tex ? "url(#texGravel)" : "url(#gravelDots)"} strokeWidth={tex ? 76 : 78} opacity={tex ? (night ? 0.5 : 0.78) : 0.7} strokeDasharray={`${g.length} ${pathLen}`} strokeDashoffset={-g.start} strokeLinecap="round"/>
        </g>
      ))}

      {tex ? <>
        <path d={track.path} fill="none" stroke="url(#texDirt)" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
        <path d={track.path} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={track.path} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="41" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={track.path} fill="none" stroke="#1A1918" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={track.path} fill="none" stroke="#BDB6A8" strokeWidth="37.2" strokeLinecap="round" strokeLinejoin="round" opacity={night ? 0.55 : 0.8}/>
        <path d={track.path} fill="none" stroke="url(#texAsphalt)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={track.path} fill="none" stroke="url(#texPatches)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
        {[22, 16, 11, 6].map((w) => <path key={w} d={track.path} fill="none" stroke="rgba(8,7,6,0.055)" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"/>)}
        {cineGeo && cineGeo.kerbs.map((pts, i) => (
          <g key={`ck-${i}`}>
            <polyline points={pts} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="3.6" strokeLinejoin="round"/>
            <polyline points={pts} fill="none" stroke="#C9C2B4" strokeWidth="3" strokeLinejoin="round"/>
            <polyline points={pts} fill="none" stroke="#9A2A22" strokeWidth="3" strokeDasharray="2.6 2.6" strokeLinejoin="round"/>
            <polyline points={pts} fill="none" stroke="url(#texPatches)" strokeWidth="3" strokeLinejoin="round"/>
          </g>
        ))}
        {cineGeo && cineGeo.walls.map((w, i) => (
          <g key={`cw-${i}`}>
            <polyline points={w.armco} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2.6" strokeLinecap="round" transform="translate(0.9,1.4)"/>
            <polyline points={w.armco} fill="none" stroke="#8C9096" strokeWidth="0.9" strokeLinecap="round" opacity={night ? 0.8 : 0.65}/>
            <polyline points={w.armco} fill="none" stroke="#2A2C2F" strokeWidth="1.3" strokeDasharray="0.5 4" opacity="0.9"/>
            <polyline points={w.tyres} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="4" strokeLinecap="round" strokeDasharray="0 1.25" transform="translate(0.8,1.3)"/>
            <polyline points={w.tyres} fill="none" stroke="#141414" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0 1.25"/>
            <polyline points={w.tyres} fill="none" stroke="rgba(200,200,200,0.12)" strokeWidth="1" strokeLinecap="round" strokeDasharray="0 1.25"/>
          </g>
        ))}
      </> : <>
      {/* Track stack: run-off → shadow → outer paint → asphalt → inner paint → centreline. */}
      <path d={track.path} fill="none" stroke="rgba(180,170,140,0.12)" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={track.path} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" transform="translate(0,3)" opacity="0.55"/>
      <path d={track.path} fill="none" stroke={asphaltDark} strokeWidth="42" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={track.path} fill="none" stroke={paint} strokeWidth="39" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
      <path d={track.path} fill="none" stroke={asphalt} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={track.path} fill="none" stroke="url(#asphaltSheen)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d={track.path} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={track.path} fill="none" stroke={paint} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>

      {kerbSegments.map((k, i) => {
        const dash = `${k.length} ${pathLen}`;
        const offset = -k.start;
        return (
          <g key={`kerb-${i}`}>
            <path d={track.path} fill="none" stroke="url(#kerbStripe)" strokeWidth="41" strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="butt" opacity="0.92"/>
            <path d={track.path} fill="none" stroke={asphalt} strokeWidth="34" strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="butt"/>
            <path d={track.path} fill="none" stroke={paint} strokeWidth="0.9" strokeDasharray={dash} strokeDashoffset={offset} opacity="0.85"/>
          </g>
        );
      })}

      <path d={track.path} fill="none" stroke={paint} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" strokeDasharray="6 10"/>

      </>}

      {wet && <g pointerEvents="none">
        <path d={track.path} fill="none" stroke="rgba(4,6,9,0.35)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={track.path} fill="none" stroke="url(#texPatches)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
        <path d={track.path} fill="none" stroke="rgba(170,190,215,0.05)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
      </g>}
      {floods.map((f, i) => <circle key={`fl-${i}`} cx={f.x} cy={f.y} r="58" fill="url(#floodG)" pointerEvents="none"/>)}

      {showSectors && !cine && pathLen > 0 && sectorBands.map((s, i) => (
        <path key={i} d={track.path} fill="none" stroke={s.color} strokeWidth="2.2" vectorEffect="non-scaling-stroke"
          strokeDasharray={`${(s.to - s.from) * pathLen} ${pathLen}`} strokeDashoffset={-s.from * pathLen} opacity="0.7"/>
      ))}

      <path ref={pathRef} d={track.path} fill="none" stroke="none" strokeWidth="0"/>

      {!cine && cornerChevrons.filter(c => c.important).map((c, i) => (
        <g key={`chev-${i}`} transform={`translate(${c.x},${c.y}) rotate(${c.angle})`} opacity={c.fade * 0.55}>
          <path d="M -3 -3 L 0 0 L -3 3" fill="none" stroke={paint} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      ))}

      {sfGrid && (
        <g transform={`translate(${sfGrid.cx},${sfGrid.cy}) rotate(${sfGrid.ang})`}>
          <rect x={-sfGrid.W/2} y={-sfGrid.H/2} width={sfGrid.W} height={sfGrid.H} fill="#0a0a0a"/>
          {sfGrid.rects.map((r) => <rect key={r.key} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill}/>)}
        </g>
      )}

      {brakeHotspots.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={1.6 + h.intensity * 1.5} fill="#C8102E" opacity={0.18 + h.intensity * 0.35}/>
      ))}

      {(weather === "rain" || weather === "wet") && (
        <path d={track.path} fill="none" stroke="rgba(91,183,226,0.10)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" style={{ mixBlendMode: "screen" }}/>
      )}
    </g>
  ), [track.id, pathLen, sky, asphalt, asphaltDark, trackStroke, showSectors, showTurns, brakeHotspots, weather, cornerChevrons, kerbSegments, gravelSegs, cine, wet, floods, cineGeo, night]);

  const wide = size.w >= 620 && size.h >= 440 && !broadcast;
  const cam = cine ? "follow" : camPick || (wide ? "full" : "follow");
  const inset = cam === "full" && wide;
  const leader = cars.length ? cars.reduce((a, b) => (b.pos < a.pos ? b : a)) : null;

  if (cine) return (
    <div className={`track-wrap track-cine ${night ? "tc-night" : ""} ${cine && cond && cond.tod === "dusk" ? "tc-dusk" : ""} ${wet ? "tc-wet" : ""}`} ref={wrapRef} style={{ background: sky }}>
      <CineMap track={track} geom={geom} model={model} cars={cars} onFocus={onFocus} onZoom={onZoom} focusedNo={focusedNo}
        cls={(carClass && carClass.id) || "open_wheel"} base={base} baseId={baseId} W={size.w} H={size.h} wet={wet} night={night}
        follow={follow} onFollow={onFollow} airflow={airflow} onAirflow={onAirflow} onTunnel={onTunnel} loupe={loupe}
        label={`${track.short} circuit. ${leader ? `#${leader.no} leads` : ""}.`}/>
    </div>
  );

  return (
    <div className={`track-wrap ${inset ? "cam-inset" : ""}`} ref={wrapRef} style={{ background: sky }}>
      <LiveMap track={track} geom={geom} model={model} cars={cars} focusedNo={focusedNo} onFocus={onFocus} onZoom={onZoom}
        carClass={carClass} base={base} baseId={baseId} W={size.w} H={size.h} cam={cam} inset={inset}
        broadcast={broadcast} blockersRef={blockersRef} weather={weather} showTurns={showTurns} sfGrid={sfGrid} sky={sky}
        label={`${track.short} circuit map. ${cars.length} simulated cars on track; ${leader ? `#${leader.no} leads` : ""}.`}/>

      <div className="track-hud-tl">
        <div className="hud-eyebrow">CIRCUIT</div>
        <div className="hud-title">{track.short}</div>
      </div>
      <div className="track-hint" aria-hidden="true">TAP A CAR TO FOLLOW · B FOR BROADCAST</div>

      <div className="cam-toggle" role="group" aria-label="Map camera">
        <button type="button" className={cam === "follow" ? "on" : ""} aria-pressed={cam === "follow"} onClick={() => setCamPick("follow")}>FOLLOW BATTLE</button>
        <button type="button" className={cam === "full" ? "on" : ""} aria-pressed={cam === "full"} onClick={() => setCamPick("full")}>FULL CIRCUIT</button>
      </div>

      <div className="track-hud-tr">
        <div className={`flag-pill ${flag === "checkered" ? "checkered" : "green"}`}>
          <span className="dot"/> {flag === "checkered" ? "CHEQUERED FLAG" : "GREEN FLAG"} · SIM
        </div>
        <div className="hud-eyebrow" style={{marginTop: 10, textAlign: "right"}}>LAP</div>
        <div className="hud-title hud-title-lg" style={{textAlign: "right"}}>{String(lap).padStart(2,"0")}<span className="hud-of">/{lapsTotal}</span></div>
      </div>
    </div>
  );
}

// Bounding box of the circuit drawing, turn labels included.
function circuitBox(track, geom) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (a, b, c, d) => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
  for (let i = 0; i < 240; i++) { const p = geom.at(i / 240); add(p.x - 30, p.y - 30, p.x + 30, p.y + 30); }
  (track.turns || []).forEach((t) => {
    const w = t.important ? t.label.length * 7.4 + (t.name ? 8 + t.name.length * 5.2 : 0) : t.label.length * 6;
    if (t.x < 500) add(t.x - 22 - w, t.y - 8, t.x, t.y + 6); else add(t.x, t.y - 8, t.x + 22 + w, t.y + 6);
  });
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Display positions: cars closer than a marker length are spread along the track (keeping
// order), and when nose-to-tail distance goes to zero they move side by side instead, so a
// pass reads as a pass. Race order and gaps are untouched.
function layoutCars(raw, geom, lenU) {
  const L = geom.len, S = lenU * 1.12, dc = S * 0.32;
  const u = raw.map((r) => r.s * L), push = raw.map(() => 0), lat = raw.map(() => 0);
  for (let i = 0; i < raw.length; i++) for (let j = i + 1; j < raw.length; j++) {
    let d = u[i] - u[j];
    d -= Math.round(d / L) * L;
    const a = d >= 0 ? i : j, b = d >= 0 ? j : i;
    d = Math.abs(d);
    if (d >= S) continue;
    const sep = d >= dc ? S - d : (S - dc) * d / dc;
    push[a] += sep / 2; push[b] -= sep / 2;
    const k = 1 - smoothstep(0, dc * 1.5, d);
    const sgn = raw[a].no < raw[b].no ? -1 : 1, off = lenU * 0.21 * k;
    lat[a] += sgn * off; lat[b] -= sgn * off;
  }
  return raw.map((r, i) => {
    const uu = u[i] + push[i], p = geom.at(uu / L), lt = clampN(lat[i], -12, 12);
    const nx = -Math.sin(p.rad), ny = Math.cos(p.rad);
    const trail = [];
    for (let k = 1; k <= 5; k++) {
      const q = geom.at((uu - lenU * (0.28 + k * 0.2)) / L);
      trail.push({ x: q.x + nx * lt * 0.7, y: q.y + ny * lt * 0.7 });
    }
    return { ...r, x: p.x + nx * lt, y: p.y + ny * lt, angle: p.angle, rad: p.rad, trail };
  });
}

// Viewport that puts world point (cx, cy) at the centre of screen rect R at `ppu` px per unit.
const viewAt = (cx, cy, ppu, R, W, H) => ({ x: cx - (R.x + R.w / 2) / ppu, y: cy - (R.y + R.h / 2) / ppu, w: W / ppu, h: H / ppu, ppu });
function fitView(box, R, W, H) {
  const ppu = Math.min(R.w / box.w, R.h / box.h);
  return viewAt(box.x + box.w / 2, box.y + box.h / 2, ppu, R, W, H);
}

// Smoothed follow camera: pans and zooms only, always north-up. Reduced motion: no easing,
// the frame only jumps when the battle is about to leave it.
function stepCamera(mem, key, target, R, t, reduce) {
  const c = mem[key];
  if (!c || t < c.t || t - c.t > 3) return (mem[key] = { ...target, t });
  if (reduce) {
    const dx = Math.abs(target.cx - c.cx) * c.ppu, dy = Math.abs(target.cy - c.cy) * c.ppu;
    if (dx > R.w * 0.3 || dy > R.h * 0.3 || Math.abs(Math.log(target.ppu / c.ppu)) > 0.35) Object.assign(c, target);
    c.t = t;
    return c;
  }
  const a = 1 - Math.exp(-(t - c.t) * 2.4);
  c.cx += (target.cx - c.cx) * a;
  c.cy += (target.cy - c.cy) * a;
  c.ppu *= Math.exp(Math.log(target.ppu / c.ppu) * a);
  c.t = t;
  return c;
}

const TAG_DIRS = [-90, 90, -35, -145, 35, 145, 0, 180].map((d) => [Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180)]);
const hitRect = (a, b, pad) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

// Greedy label placement in screen pixels: highest priority first, preferred slot first
// (last frame's slot, for stability), then rings further out with a leader line.
// A tag that can't be placed without overlapping is dropped rather than drawn on top.
function placeTags(groups, blockers, W, H, mem) {
  const placed = [], out = [];
  const inside = (r) => r.x >= 2 && r.y >= 2 && r.x + r.w <= W - 2 && r.y + r.h <= H - 2;
  for (const g of groups) {
    const slots = [];
    for (let ring = 0; ring < 3; ring++) TAG_DIRS.forEach((d, i) => slots.push({ ring, d, i: ring * 8 + i }));
    const prev = mem[g.key];
    if (prev != null && slots[prev]) slots.unshift(slots[prev]);
    let got = null;
    for (const s of slots) {
      const [dx, dy] = s.d, rad = g.ext + 5 + s.ring * 18;
      const off = rad + Math.abs(dx) * g.w / 2 + Math.abs(dy) * g.h / 2;
      const r = { x: g.x + dx * off - g.w / 2, y: g.y + dy * off - g.h / 2, w: g.w, h: g.h };
      if (!inside(r) || placed.some((q) => hitRect(q, r, 3)) || blockers.some((b) => hitRect(b, r, 1))) continue;
      got = { ...r, slot: s.i, lead: s.ring > 0, ax: g.x + dx * g.ext, ay: g.y + dy * g.ext, ex: g.x + dx * (off - Math.abs(dx) * g.w / 2 - Math.abs(dy) * g.h / 2), ey: g.y + dy * (off - Math.abs(dx) * g.w / 2 - Math.abs(dy) * g.h / 2) };
      break;
    }
    if (!got) { delete mem[g.key]; continue; }
    mem[g.key] = got.slot;
    placed.push(got);
    out.push({ ...g, ...got });
  }
  return out;
}

// Group cars whose markers overlap (or who are in a close fight) into one tag.
function tagGroups(nodes, pj, focusedNo, leaderNo, fs, style) {
  const compact = style === "compact";
  const px = nodes.map((n) => { const q = pj.px(n.x, n.y); return { n, x: q[0], y: q[1], r: n.lenU * pj.ppu * 0.5 }; });
  const vis = px.filter((p) => p.x > -p.r && p.y > -p.r && p.x < pj.W + p.r && p.y < pj.H + p.r);
  const parent = vis.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  if (style !== "inset") for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const a = vis[i], b = vis[j], d = Math.hypot(a.x - b.x, a.y - b.y), rr = Math.max(a.r, b.r) * 2;
    const adj = Math.abs(a.n.pos - b.n.pos) === 1;
    const fight = adj && Math.min(a.n.pos, b.n.pos) > 0 && (a.n.pos > b.n.pos ? a.n._intS : b.n._intS) < 0.6;
    if (d < Math.max(16, rr * 0.75) || (fight && d < rr * 1.9)) parent[find(i)] = find(j);
  }
  const by = {};
  vis.forEach((p, i) => { (by[find(i)] = by[find(i)] || []).push(p); });
  return Object.values(by).map((m) => {
    m.sort((a, b) => a.n.pos - b.n.pos);
    const nos = m.map((p) => p.n.no);
    const hasFocus = nos.includes(focusedNo), hasLead = nos.includes(leaderNo);
    const cx = m.reduce((s, p) => s + p.x, 0) / m.length, cy = m.reduce((s, p) => s + p.y, 0) / m.length;
    const ext = Math.max(...m.map((p) => Math.hypot(p.x - cx, p.y - cy) + p.r * 0.72));
    let text, chip = null;
    if (m.length > 1) {
      const gap = Math.max(0, m[m.length - 1].n._gapS - m[0].n._gapS);
      text = `${compact ? "" : `P${m[0].n.pos} `}${nos.map((n) => "#" + n).join(" vs ")} · +${gap.toFixed(1)}s`;
    } else {
      const c = m[0].n;
      chip = c.livery.primary;
      text = style === "inset" ? `P${c.pos} #${c.no}`
        : c.no === focusedNo && !compact ? `P${c.pos} #${c.no} ${surname(c)}` : c.pos === 1 ? `P1 #${c.no}` : String(c.no);
    }
    const hero = hasFocus || hasLead;
    const f = hero ? fs + 1 : fs;
    return {
      key: nos.join("-"), nos, x: cx, y: cy, ext, text, chip, hero, f,
      w: Math.ceil(text.length * f * 0.62 + (chip ? 13 : 10)), h: f + 8,
      border: hasFocus ? "#C8102E" : hasLead ? "#F1D27A" : "rgba(232,228,220,0.35)",
      prio: (hasFocus ? 0 : hasLead ? 1 : 2) * 100 + m[0].n.pos,
    };
  }).sort((a, b) => a.prio - b.prio);
}

// Tags in screen pixels, drawn as the top layer of the map svg for view v.
function TagLayer({ tags, v }) {
  return (
    <g className="track-tags" transform={`translate(${v.x} ${v.y}) scale(${1 / v.ppu})`} aria-hidden="true">
      {tags.map((g) => (
        <g key={g.key}>
          {g.lead && <line x1={g.ax} y1={g.ay} x2={g.ex} y2={g.ey} stroke={g.border} strokeWidth="1" opacity="0.8"/>}
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="1.5" fill="rgba(5,6,8,0.9)" stroke={g.border} strokeWidth={g.hero ? 1.3 : 0.8}/>
          {g.chip && <rect x={g.x + 3} y={g.y + 3} width="4" height={g.h - 6} fill={g.chip}/>}
          <text x={g.x + (g.chip ? 10 : 5)} y={g.y + g.h / 2 + 0.5} dominantBaseline="central" fontSize={g.f}
            fontFamily="JetBrains Mono, ui-monospace, monospace" fontWeight="800" fill={g.hero ? "#fff" : "#E8E4DC"} letterSpacing="0.02em">{g.text}</text>
        </g>
      ))}
    </g>
  );
}

// Cars in world units. lenU is the hero marker length in map units for this view.
function WorldCars({ nodes, ppu, focusedNo, leaderNo, onFocus, onZoom, cls, reduce, battlePairs, t, cine, onPick, onHover }) {
  const pulse = ((t || 0) / 1.6) % 1;
  return (
    <g className="car-layer">
      {!cine && battlePairs.map(([a, b], i) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#C9A24A" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.6" strokeDasharray="3 3"/>
      ))}
      {!cine && nodes.map((car) => {
        const trailFill = cine ? "#E9D2B0" : car.livery.accent === "#FFFFFF" ? car.livery.primary : car.livery.accent;
        return (
          <g key={`trail-${car.no}`} opacity={cine ? (car.hero ? 0.35 : 0.22) : car.hero ? 0.8 : 0.5}>
            {car.trail.map((tp, k) => (
              <circle key={k} cx={tp.x} cy={tp.y} r={car.lenU * 0.075 * (1 - k / 5.5)} fill={trailFill} opacity={(1 - k / 5.5) * 0.7}/>
            ))}
          </g>
        );
      })}
      {nodes.map((car) => {
        const isFocus = car.no === focusedNo;
        const px = car.lenU * ppu;
        const s = car.lenU / 5.6;
        const lod = px < 17 ? "mini" : (car.hero && px >= 30) || px >= 46 ? "full" : "mid";
        const rim = window.F1Car.lum(car.livery.primary) < 110 ? "#C9CED6" : "#101215";
        const ring = car.lenU * 0.64;
        const sh = Math.max(0.6 / ppu, car.lenU * 0.035);
        return (
          <g key={car.no} className="car-node" opacity={car.hero ? 1 : 0.9} data-driver={onPick ? car.no : undefined}
            onClick={onPick ? (e) => { e.stopPropagation(); onPick(car.no); } : () => { if (isFocus && onZoom) onZoom(); else onFocus(car.no); }}
            onDoubleClick={onPick ? undefined : () => { onFocus(car.no); if (onZoom) onZoom(); }}
            onPointerEnter={onHover ? (e) => { if (e.pointerType === "mouse") onHover(car.no); } : undefined}
            onPointerLeave={onHover ? () => onHover(null) : undefined}
            style={{ cursor: "pointer" }}>
            {car.hero && !cine && <circle cx={car.x} cy={car.y} r={ring * 1.25} fill="url(#carGlow)"/>}
            {cine && <ellipse cx={0} cy={0} rx={car.lenU * 0.62} ry={car.lenU * 0.27} fill="url(#aoG)" transform={`translate(${car.x + sh * 0.6},${car.y + sh}) rotate(${car.angle})`}/>}
            {car.hero && !cine && <circle cx={car.x} cy={car.y} r={ring} fill="none" stroke={isFocus ? "#C8102E" : "#F1D27A"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.85"/>}
            {isFocus && !reduce && !cine && (
              <circle cx={car.x} cy={car.y} r={ring * (1 + 0.7 * pulse)} fill="none" stroke="#C8102E" strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity={0.7 * (1 - pulse)}/>
            )}
            <circle cx={car.x} cy={car.y} r={Math.max(car.lenU * 0.55, 12 / ppu)} fill="transparent"/>
            {cls === "open_wheel" ? <>
              {lod !== "mini" && (
                <g transform={`translate(${car.x + sh},${car.y + sh * 1.6}) rotate(${car.angle})`}>
                  <window.F1Car.SVG view="top" lod="shadow" livery={car.livery} scale={s}/>
                </g>
              )}
              <g transform={`translate(${car.x},${car.y}) rotate(${car.angle})`}>
                <window.F1Car.SVG view="top" lod={lod} livery={car.livery} scale={s} outline={lod === "mid" ? rim : undefined}/>
              </g>
            </> : (
              <g transform={`translate(${car.x},${car.y}) rotate(${car.angle})`}>
                <ClassGlyph cls={cls} r={car.lenU / 2.6} livery={car.livery}/>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

// Turn and start/finish labels. Font size is capped in screen pixels so zoomed cameras
// don't blow them up.
function MapLabels({ track, sfGrid, showTurns, ppu }) {
  const k = Math.min(1, 1.25 / ppu);
  return (
    <g className="map-labels" pointerEvents="none">
      {sfGrid && (
        <text transform={`translate(${sfGrid.cx},${sfGrid.cy}) rotate(${sfGrid.ang})`} y={-sfGrid.H / 2 - 6 * k} fill="#fff" fontSize={9 * k}
          fontFamily="JetBrains Mono, monospace" letterSpacing={k} textAnchor="middle"
          stroke="rgba(0,0,0,0.85)" strokeWidth={2 * k} paintOrder="stroke">START / FINISH</text>
      )}
      {showTurns && track.turns.map((t) => {
        const left = t.x < 500, tx = t.x + (left ? -22 : 22);
        return (
          <g key={t.n} className={t.important ? "turn-marker turn-marker-important" : "turn-marker"}>
            <line x1={t.x} y1={t.y} x2={t.x + (left ? -18 : 18)} y2={t.y} stroke="rgba(239,234,224,0.55)" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
            <text x={tx} y={t.y + 3 * k} textAnchor={left ? "end" : "start"}
              fill={t.important ? "#FFFFFF" : "rgba(239,234,224,0.85)"} fontSize={(t.important ? 11 : 9) * k}
              fontWeight={t.important ? 800 : 500} fontFamily="JetBrains Mono, monospace" letterSpacing={k}
              stroke="rgba(0,0,0,0.85)" strokeWidth={(t.important ? 2.6 : 2.0) * k} paintOrder="stroke">
              {t.label}
              {t.important && t.name && <tspan fontSize={8 * k} opacity="0.85" dx={8 * k} fontWeight={500}>{t.name}</tspan>}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// Cinema map: the camera director decides where to look; cars, smoke and dust are drawn from
// the simulation at the director's render time (which runs slower during a replay).
function CineMap({ track, geom, model, cars, onFocus, onZoom, focusedNo, cls, base, baseId, W, H, label, wet, night,
  follow, onFollow, airflow, onAirflow, onTunnel, loupe }) {
  const reduce = window.RaceClock.reduceMotion;
  const t = window.useRaceTime(reduce ? 6 : 60);
  const mem = useRef(null);
  const [hov, setHov] = useState(null);
  const lp = useRef({ on: false, tx: 0, ty: 0, x: 0, y: 0, at: 0, mag: 2.5, last: 0, seen: 0 });
  const fine = useMemo(() => !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches), []);
  if (!W || !H || !model) return <svg className="track-svg" viewBox="0 0 1000 560" role="img" aria-label={label}>{base}</svg>;
  const RM = window.RaceModel, FL = RM.FLAGS, CL = RM.CAR_L;
  const D = window.CineDirector.update(mem, { model, geom, t, W, H, reduce, cars, follow, airflow });
  const view = viewAt(D.cx, D.cy, D.ppu, { x: 0, y: 0, w: W, h: H }, W, H);
  const pad = CL * 4;
  const visible = (x, y, m = pad) => x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;
  const subj = new Set(D.subject);
  const world = (s) => {
    const p = geom.at(s.frac), nx = -Math.sin(p.rad), ny = Math.cos(p.rad);
    return [p.x + nx * s.lat, p.y + ny * s.lat];
  };
  const nodes = [], under = [], over = [];
  cars.forEach((c) => {
    const mc = model.cars.find((q) => q.no === c.no), p = D.pos[c.no];
    if (!mc || !p) return;
    const near = visible(p.x, p.y, pad * 3);
    if (near) {
      RM.trace(model, mc, D.rt, 2.4, 3).forEach((s) => {
        const age = D.rt - s.t;
        if (!(s.flags & (FL.SMOKE | FL.DUST | FL.KERB))) return;
        const [x, y] = world(s);
        if (!visible(x, y)) return;
        if (s.flags & FL.SMOKE) over.push({ x, y, r: CL * 0.26 * (1 + age * 2.4), o: 0.55 * Math.pow(1 - age / 2.4, 1.6), g: "smokeG" });
        if (s.flags & FL.DUST) under.push({ x, y, r: CL * 0.34 * (1 + age * 2.8), o: 0.6 * (1 - age / 2.4), g: "dustG" });
        else if (s.flags & FL.KERB && age < 0.9) under.push({ x, y, r: CL * 0.16 * (1 + age * 3), o: 0.45 * (1 - age / 0.9), g: "dustG" });
      });
    }
    if (!visible(p.x, p.y)) return;
    if (wet) {
      // Spray: a plume that hangs behind the rear wheels and widens as it thins, stronger at speed.
      const v = mc.hv[Math.min(mc.hv.length - 1, Math.floor(D.rt / 0.05))] || 0, sp = Math.min(1, v / (model.k * 0.9));
      if (sp > 0.25) RM.trace(model, mc, D.rt, 0.9, 2).slice(1).forEach((s) => {
        const age = D.rt - s.t, [x, y] = world(s);
        under.push({ x, y, r: CL * (0.3 + age * 1.5), o: 0.5 * sp * Math.pow(1 - age / 0.9, 1.3), g: "sprayG" });
      });
    }
    const trail = RM.trace(model, mc, D.rt, 0.3, 1).slice(1, 6).map((s) => { const [x, y] = world(s); return { x, y }; });
    nodes.push({ ...c, x: p.x, y: p.y, angle: p.angle, rad: p.rad, trail, hero: subj.has(c.no), lenU: CL });
  });
  const puff = (f, i) => <circle key={i} cx={f.x} cy={f.y} r={f.r} fill={`url(#${f.g})`} opacity={f.o}/>;
  const followNode = follow != null ? nodes.find((n) => n.no === follow) : null;
  const hovNode = hov != null ? nodes.find((n) => n.no === hov) : null;
  const drsOpen = !!(followNode && D.pos[follow] && (D.pos[follow].flags & FL.DRS));
  const air = airflow && followNode ? window.Airflow.build({ car: followNode, nodes, t: D.rt, drs: drsOpen, reduce }) : null;
  const scr = (x, y) => [(x - view.x) * view.ppu, (y - view.y) * view.ppu];

  // Loupe: eases toward the pointer; hidden on leave, after 2 s idle, and while following a car.
  const L0 = lp.current, nowMs = performance.now();
  const loupeOn = loupe && fine && follow == null && L0.on && nowMs - L0.at < 2000;
  if (loupeOn) {
    const k = reduce ? 1 : Math.min(1, (nowMs - (L0.last || nowMs)) / 90);
    L0.x += (L0.tx - L0.x) * k; L0.y += (L0.ty - L0.y) * k;
  }
  L0.last = nowMs;
  const LR = 92, LM = 2.5;
  const lw = loupeOn ? { x: view.x + L0.x / view.ppu, y: view.y + L0.y / view.ppu } : null;
  const lcorner = lw ? (track.turns || []).reduce((b, q) => { const d = Math.hypot(q.x - lw.x, q.y - lw.y); return d < (b ? b.d : 140) ? { q, d } : b; }, null) : null;
  const onMove = (e) => {
    if (e.pointerType !== "mouse" || !loupe || !fine) return;
    const r = e.currentTarget.getBoundingClientRect();
    const L = lp.current, x = e.clientX - r.left, y = e.clientY - r.top;
    if (!L.on) { L.x = x; L.y = y; }
    Object.assign(L, { on: true, tx: x, ty: y, at: performance.now() });
  };
  const onLeave = () => { lp.current.on = false; setHov(null); };
  const tex = cineTextures(), px = (u) => `${(u * view.ppu).toFixed(1)}px`, bx = px(-view.x), by = px(-view.y);
  const tint = night ? "rgba(2,4,8,0.55)" : wet ? "rgba(6,10,14,0.35)" : "rgba(0,0,0,0.18)";
  return (
    <>
      <div className="cine-ground" aria-hidden="true" style={{
        backgroundImage: `linear-gradient(${tint}, ${tint}), url(${tex.patches}), url(${tex.grass})`,
        backgroundSize: `auto, ${px(360)} ${px(360)}, ${px(64)} ${px(64)}`,
        backgroundPosition: `0 0, ${bx} ${by}, ${bx} ${by}`,
        filter: D.blur > 0.4 ? `blur(${D.blur.toFixed(1)}px)` : undefined,
      }}/>
      <svg className="track-svg" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}
        style={D.blur > 0.4 ? { filter: `blur(${D.blur.toFixed(1)}px)` } : undefined}
        onPointerMove={onMove} onPointerLeave={onLeave} onClick={() => { if (follow != null && onFollow) onFollow(null); }}>
        <defs><window.Airflow.Defs/></defs>
        {base}
        <g className="fx-under">{under.map(puff)}</g>
        <WorldCars nodes={nodes} ppu={view.ppu} focusedNo={focusedNo} leaderNo={-1} onFocus={onFocus} onZoom={onZoom} cls={cls} reduce={reduce} battlePairs={[]} t={t} cine
          onPick={onFollow ? (no) => onFollow(follow === no ? null : no) : undefined} onHover={fine ? setHov : undefined}/>
        <g className="fx-over">{over.map(puff)}</g>
        {air && air.el}
        {hovNode && hovNode.no !== follow && <circle className="car-hover-ring" cx={hovNode.x} cy={hovNode.y} r={CL * 0.72} fill="none"
          stroke="rgba(239,230,214,0.7)" strokeWidth="1" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
        {followNode && <circle cx={followNode.x} cy={followNode.y} r={CL * 0.78} fill="none" stroke="rgba(239,230,214,0.55)" strokeWidth="1"
          strokeDasharray="2 4" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
        {(wet || night) && <g className="fx-lights" pointerEvents="none">
          {nodes.map((n) => {
            const on = !wet || reduce || Math.floor(t * 4 + n.no) % 2 === 0;
            const rx = n.x - Math.cos(n.rad) * CL * 0.52, ry = n.y - Math.sin(n.rad) * CL * 0.52;
            return on ? <circle key={n.no} cx={rx} cy={ry} r={CL * 0.2} fill="url(#rainLightG)"/> : null;
          })}
        </g>}
      </svg>
      <div className="cine-dof" aria-hidden="true"/>
      {wet && <div className="cine-rain" aria-hidden="true"/>}
      {D.replay && <div className="cine-replay-tag" aria-hidden="true">Replay</div>}
      {loupeOn && <div className="cine-loupe" aria-hidden="true" style={(() => {
        const p2 = view.ppu * LM, ox = `${(-(lw.x - LR / p2) * p2).toFixed(1)}px`, oy = `${(-(lw.y - LR / p2) * p2).toFixed(1)}px`;
        return { left: L0.x - LR, top: L0.y - LR, width: LR * 2, height: LR * 2,
          backgroundImage: `linear-gradient(${tint}, ${tint}), url(${tex.patches}), url(${tex.grass})`,
          backgroundSize: `auto, ${(360 * p2).toFixed(1)}px ${(360 * p2).toFixed(1)}px, ${(64 * p2).toFixed(1)}px ${(64 * p2).toFixed(1)}px`,
          backgroundPosition: `0 0, ${ox} ${oy}, ${ox} ${oy}` };
      })()}>
        <svg viewBox={`${lw.x - LR / (view.ppu * LM)} ${lw.y - LR / (view.ppu * LM)} ${(2 * LR) / (view.ppu * LM)} ${(2 * LR) / (view.ppu * LM)}`} width={LR * 2} height={LR * 2}>
          {base}
          <g>{under.map(puff)}</g>
          <WorldCars nodes={nodes} ppu={view.ppu * LM} focusedNo={focusedNo} leaderNo={-1} onFocus={() => {}} cls={cls} reduce={reduce} battlePairs={[]} t={t} cine/>
          <g>{over.map(puff)}</g>
        </svg>
        {lcorner && <span className="cine-loupe-t">{lcorner.q.label}{lcorner.q.name ? ` · ${lcorner.q.name}` : ""}</span>}
      </div>}
      {followNode && onFollow && <div className="cine-follow" onClick={(e) => e.stopPropagation()}>
        <span className="cf-dot" style={{ background: followNode.livery.primary }}/>
        <span className="cf-who"><span className="cf-lbl">Following </span><b>{followNode.name}</b></span>
        <button type="button" className={airflow ? "on" : ""} aria-pressed={!!airflow} onClick={() => onAirflow && onAirflow(!airflow)} data-tip="Show airflow · A">
          <window.StageIX.Scr text="Airflow"/>
        </button>
        {onTunnel && <button type="button" onClick={onTunnel} data-tip="Full wind tunnel · W"><window.StageIX.Scr text="Wind tunnel"/></button>}
        <button type="button" className="cf-x" onClick={() => onFollow(null)} data-tip="Release · Esc" aria-label="Stop following">×</button>
      </div>}
      {air && <div className="cine-air-note" aria-live="polite">
        {drsOpen ? "DRS open · wake narrows" : "Wake"}{air.follower ? ` · ${air.follower.name.split(" ").slice(-1)[0]} in dirty air, −${air.follower.loss}% front grip` : ""}
      </div>}
      {air && air.follower && (() => { const [x, y] = scr(air.follower.x, air.follower.y); return x > 0 && y > 0 && x < W && y < H
        ? <span className="cine-air-tag" style={{ left: x, top: y }} aria-hidden="true">−{air.follower.loss}%</span> : null; })()}
      {D.overlay > 0.01 && <div className="cine-cut" style={{ opacity: D.overlay }} aria-hidden="true"/>}
    </>
  );
}

function LiveMap({ track, geom, model, cars, focusedNo, onFocus, onZoom, carClass, base, baseId, W, H, cam, inset, broadcast, cine, blockersRef, weather, label, showTurns, sfGrid, sky }) {
  const reduce = window.RaceClock.reduceMotion;
  const t = window.useRaceTime(reduce ? 1 : 30);
  const camMem = useRef({});
  const tagMem = useRef({});
  const insetTagMem = useRef({});
  const box = useMemo(() => circuitBox(track, geom), [track.id, geom]);
  const cls = (carClass && carClass.id) || "open_wheel";

  if (!W || !H || !model) {
    return <svg className="track-svg" viewBox="0 0 1000 560" role="img" aria-label={label}>{base}</svg>;
  }

  const byNo = {};
  model.cars.forEach((mc) => { byNo[mc.no] = mc; });
  const sorted = [...cars].sort((a, b) => a.pos - b.pos);
  const leaderNo = sorted[0] && sorted[0].no;
  const raw = cars.map((c) => ({ ...c, s: byNo[c.no] ? window.RaceModel.lapFrac(model, byNo[c.no], t) : 0 }));
  const battle = sorted.slice(0, sorted[2] && sorted[2]._intS < 0.5 ? 3 : 2).map((c) => c.no);
  const compact = W < 360;
  const fs = compact ? 9 : 10;

  const sizeNodes = (laid, lenU) => laid.map((n) => {
    const hero = n.no === focusedNo || n.no === leaderNo;
    return { ...n, hero, lenU: hero ? lenU : lenU * 0.84 };
  });
  const pairsOf = (nodes) => {
    const m = {};
    nodes.forEach((n) => { m[n.pos] = n; });
    return nodes.filter((n) => n.pos > 1 && n._intS < 1 && m[n.pos - 1]).map((n) => [m[n.pos - 1], n]);
  };
  const followTarget = (nodes, R, ppuT, lenU) => {
    const b = nodes.filter((n) => battle.includes(n.no));
    const lead = b.find((n) => n.no === leaderNo) || b[0];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    b.forEach((n) => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); });
    const ppu = Math.min(ppuT, (R.w * 0.8) / (x1 - x0 + lenU * 2), (R.h * 0.8) / (y1 - y0 + lenU * 2));
    return { cx: (x0 + x1) / 2 + Math.cos(lead.rad) * lenU * 0.5, cy: (y0 + y1) / 2 + Math.sin(lead.rad) * lenU * 0.5, ppu };
  };
  const project = (v, W2, H2) => ({ ppu: v.ppu, W: W2, H: H2, px: (x, y) => [(x - v.x) * v.ppu, (y - v.y) * v.ppu] });
  const carBlocks = (ns, pj) => ns.map((n) => { const r = n.lenU * pj.ppu * 0.42, q = pj.px(n.x, n.y); return { x: q[0] - r, y: q[1] - r, w: 2 * r, h: 2 * r }; });

  // Main view.
  let view, lenU;
  const insetW = inset ? Math.round(clampN(W * 0.54, 260, 420)) : 0;
  const insetH = inset ? Math.round(insetW * 0.46) : 0;
  if (cam === "full") {
    const top = inset ? 80 : W < 700 ? 124 : 88;
    const bottom = inset ? insetH + 70 : 56;
    const R = { x: 12, y: top, w: W - 24, h: Math.max(80, H - top - bottom) };
    view = fitView(box, R, W, H);
    const heroPx = clampN(view.ppu * 62, 12, 44);
    lenU = heroPx / view.ppu;
  } else {
    const embedWide = broadcast && W >= 500;
    const R = cine ? { x: W * 0.1, y: H * 0.14, w: W * 0.8, h: H * 0.72 }
      : embedWide ? { x: W * 0.28, y: H * 0.1, w: W * 0.46, h: H * 0.8 }
      : broadcast ? { x: W * 0.06, y: 40, w: W * 0.88, h: H - 48 }
      : W < 700 ? { x: W * 0.06, y: 120, w: W * 0.88, h: Math.max(80, H - 120 - 56) }
      : { x: W * 0.08, y: 100, w: W * 0.84, h: H - 100 - 56 };
    const carPx = cine ? clampN(Math.min(R.w, R.h * 1.6) * 0.24, 56, 120) : clampN(Math.min(R.w, R.h * 1.6) * 0.22, 46, 96);
    lenU = 20;
    const target = followTarget(layoutCars(raw, geom, lenU), R, carPx / lenU, lenU);
    const c = stepCamera(camMem.current, "follow", target, R, t, reduce);
    view = viewAt(c.cx, c.cy, c.ppu, R, W, H);
  }
  const nodes = sizeNodes(layoutCars(raw, geom, lenU), lenU);
  const pj = { ppu: view.ppu, W, H, px: (x, y) => [(x - view.x) * view.ppu, (y - view.y) * view.ppu] };
  const blockers = (blockersRef.current || []).concat(carBlocks(nodes, pj));
  const tags = cine ? [] : placeTags(tagGroups(nodes, pj, focusedNo, leaderNo, fs, compact ? "compact" : "normal"), blockers, W, H, tagMem.current);

  // Battle-cam inset.
  let insetEl = null;
  if (inset) {
    const IH = insetH - 24;
    const R = { x: 0, y: 0, w: insetW, h: IH };
    const iLen = 20;
    const iNodes = sizeNodes(layoutCars(raw, geom, iLen), iLen);
    const target = followTarget(iNodes, R, clampN(IH * 0.42, 40, 76) / iLen, iLen);
    const c = stepCamera(camMem.current, "inset", target, R, t, reduce);
    const iv = viewAt(c.cx, c.cy, c.ppu, R, insetW, IH);
    const ipj = project(iv, insetW, IH);
    const iTags = placeTags(tagGroups(iNodes, ipj, focusedNo, -1, 10, "inset"), carBlocks(iNodes, ipj), insetW, IH, insetTagMem.current);
    const b = battle.map((no) => cars.find((c) => c.no === no));
    const gap = b[1] ? b[1]._intS : 0;
    insetEl = b[1] && (
      <div className="battle-inset" style={{ width: insetW, height: insetH, background: sky }}>
        <div className="bi-head">
          <span className="bi-dot"/>BATTLE CAM · P1
          <span className="bi-names">#{b[0].no} {surname(b[0])} <i>vs</i> #{b[1].no} {surname(b[1])}</span>
          <b>+{gap.toFixed(2)}s</b>
        </div>
        <div className="bi-stage">
          <svg className="bi-svg" viewBox={`${iv.x} ${iv.y} ${iv.w} ${iv.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <use href={`#${baseId}`}/>
            <WorldCars nodes={iNodes} ppu={iv.ppu} focusedNo={focusedNo} leaderNo={leaderNo} onFocus={onFocus} onZoom={onZoom} cls={cls} reduce={reduce} battlePairs={[]} t={t}/>
            <TagLayer tags={iTags} v={iv}/>
          </svg>
        </div>
      </div>
    );
  }

  // Full-field overview while the follow cam is on (wide broadcast / embed frames).
  let mini = null;
  if (cam === "follow" && broadcast && W >= 500) {
    const mw = W >= 900 ? 220 : 150, mh = Math.round(mw * box.h / box.w);
    mini = (
      <svg className="mini-map" width={mw} height={mh} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} aria-hidden="true">
        <path d={track.path} fill="none" stroke="rgba(232,228,220,0.28)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="rgba(91,183,226,0.12)" stroke="#5BB7E2" strokeWidth="5"/>
        {raw.map((c) => {
          const p = geom.at(c.s), hot = battle.includes(c.no);
          return <circle key={c.no} cx={p.x} cy={p.y} r={hot ? 17 : 13} fill={c.livery.primary} stroke={hot ? "#fff" : "#000"} strokeWidth={hot ? 5 : 4}/>;
        })}
      </svg>
    );
  }

  return (
    <>
      <svg className="track-svg" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
        {base}
        {!cine && <MapLabels track={track} sfGrid={sfGrid} showTurns={showTurns} ppu={view.ppu}/>}
        <WorldCars nodes={nodes} ppu={view.ppu} focusedNo={focusedNo} leaderNo={leaderNo} onFocus={onFocus} onZoom={onZoom} cls={cls} reduce={reduce} battlePairs={pairsOf(nodes)} t={t} cine={cine}/>
        {window.WeatherOverlay && <window.WeatherOverlay weather={weather}/>}
        {!cine && <TagLayer tags={tags} v={view}/>}
      </svg>
      {mini}
      {insetEl}
    </>
  );
}

// Top-down glyphs for the non-F1 classes (nose on +X), sized by half-length r.
function ClassGlyph({ cls, r, livery }) {
  const accent = livery.accent === "#FFFFFF" ? "#E8E4DC" : livery.accent;
  const outline = window.F1Car.lum(livery.primary) < 100 ? "#FFFFFF" : "#000000";
  const sec = livery.secondary || "#222";
  const sw = r * 0.08;
  if (cls === "gt") return <>
    <path d={`M ${r*1.30},0 L ${r*0.95},${-r*0.55} L ${r*0.20},${-r*0.85} L ${-r*0.95},${-r*0.85} L ${-r*1.10},${-r*0.55} L ${-r*1.10},${r*0.55} L ${-r*0.95},${r*0.85} L ${r*0.20},${r*0.85} L ${r*0.95},${r*0.55} Z`}
      fill={livery.primary} stroke={outline} strokeWidth={sw}/>
    <ellipse cx={r*0.55} cy={-r*0.75} rx={r*0.30} ry={r*0.18} fill="rgba(0,0,0,0.25)"/>
    <ellipse cx={r*0.55} cy={r*0.75} rx={r*0.30} ry={r*0.18} fill="rgba(0,0,0,0.25)"/>
    <path d={`M ${r*0.55},${-r*0.42} L ${r*0.30},${-r*0.55} L ${-r*0.55},${-r*0.55} L ${-r*0.75},${-r*0.42} L ${-r*0.75},${r*0.42} L ${-r*0.55},${r*0.55} L ${r*0.30},${r*0.55} L ${r*0.55},${r*0.42} Z`}
      fill={accent} stroke={outline} strokeWidth={sw / 2} opacity="0.95"/>
    <rect x={-r*0.65} y={-r*0.12} width={r*1.10} height={r*0.24} fill={sec} opacity="0.6"/>
    <rect x={r*0.75} y={-r*0.30} width={r*0.20} height={r*0.18} fill="#000" opacity="0.55"/>
    <rect x={r*0.75} y={r*0.12} width={r*0.20} height={r*0.18} fill="#000" opacity="0.55"/>
    <rect x={-r*1.18} y={-r*0.65} width={r*0.18} height={r*1.30} fill={livery.secondary || outline}/>
    <rect x={r*1.10} y={-r*0.45} width={r*0.12} height={r*0.18} fill="#FFF8C8"/>
    <rect x={r*1.10} y={r*0.27} width={r*0.12} height={r*0.18} fill="#FFF8C8"/>
  </>;
  if (cls === "stock") return <>
    <path d={`M ${r*1.20},${-r*0.30} L ${r*1.05},${-r*0.85} L ${-r*1.05},${-r*0.90} L ${-r*1.15},${-r*0.55} L ${-r*1.15},${r*0.55} L ${-r*1.05},${r*0.90} L ${r*1.05},${r*0.85} L ${r*1.20},${r*0.30} Z`}
      fill={livery.primary} stroke={outline} strokeWidth={sw}/>
    <rect x={r*1.05} y={-r*0.42} width={r*0.22} height={r*0.84} fill="#111" stroke={outline} strokeWidth={sw / 2}/>
    <path d={`M ${r*0.55},${-r*0.55} L ${r*0.30},${-r*0.65} L ${-r*0.55},${-r*0.65} L ${-r*0.75},${-r*0.55} L ${-r*0.75},${r*0.55} L ${-r*0.55},${r*0.65} L ${r*0.30},${r*0.65} L ${r*0.55},${r*0.55} Z`}
      fill={accent} stroke={outline} strokeWidth={sw / 2} opacity="0.95"/>
    <rect x={-r*0.85} y={-r*0.10} width={r*1.95} height={r*0.20} fill={sec}/>
    <circle cx={-r*0.10} cy={-r*0.74} r={r*0.20} fill="#fff" stroke={outline} strokeWidth={sw / 2}/>
    <circle cx={-r*0.10} cy={r*0.74} r={r*0.20} fill="#fff" stroke={outline} strokeWidth={sw / 2}/>
    <rect x={-r*1.20} y={-r*0.65} width={r*0.18} height={r*1.30} fill={livery.secondary || outline}/>
  </>;
  if (cls === "prototype") return <>
    <path d={`M ${r*1.45},0 L ${r*1.00},${-r*0.40} L ${r*0.10},${-r*0.78} L ${-r*0.95},${-r*0.85} L ${-r*1.20},${-r*0.55} L ${-r*1.20},${r*0.55} L ${-r*0.95},${r*0.85} L ${r*0.10},${r*0.78} L ${r*1.00},${r*0.40} Z`}
      fill={livery.primary} stroke={outline} strokeWidth={sw}/>
    <polygon points={`${r*0.95},${-r*0.45} ${r*1.20},${-r*0.65} ${r*1.20},${-r*0.45}`} fill={livery.secondary || outline}/>
    <polygon points={`${r*0.95},${r*0.45} ${r*1.20},${r*0.65} ${r*1.20},${r*0.45}`} fill={livery.secondary || outline}/>
    <ellipse cx={r*0.30} cy={0} rx={r*0.55} ry={r*0.40} fill="#0a0a0a" stroke={outline} strokeWidth={sw / 2}/>
    <ellipse cx={r*0.30} cy={-r*0.10} rx={r*0.45} ry={r*0.28} fill={accent} opacity="0.85"/>
    <polygon points={`${-r*0.95},${-r*0.10} ${-r*0.20},${-r*0.10} ${-r*0.20},${r*0.10} ${-r*0.95},${r*0.10}`} fill={livery.secondary || outline}/>
    <rect x={-r*1.28} y={-r*0.78} width={r*0.18} height={r*1.56} fill={livery.secondary || outline}/>
    <rect x={-r*1.28} y={-r*0.78} width={r*0.10} height={r*0.20} fill={outline}/>
    <rect x={-r*1.28} y={r*0.58} width={r*0.10} height={r*0.20} fill={outline}/>
    <rect x={r*0.75} y={-r*0.18} width={r*0.30} height={r*0.36} fill="#fff"/>
    <rect x={r*1.05} y={-r*0.32} width={r*0.10} height={r*0.12} fill="#FFF8C8"/>
    <rect x={r*1.05} y={r*0.20} width={r*0.10} height={r*0.12} fill="#FFF8C8"/>
  </>;
  return <>
    <rect x={-r*1.05} y={-r*0.70} width={r*2.10} height={r*1.40} rx={r*0.25} fill={livery.primary} stroke={outline} strokeWidth={sw}/>
    <rect x={-r*0.65} y={-r*0.50} width={r*1.40} height={r*1.00} rx={r*0.18} fill={accent} opacity="0.92" stroke={outline} strokeWidth={sw / 2}/>
    <line x1={r*0.10} y1={-r*0.50} x2={r*0.10} y2={r*0.50} stroke={outline} strokeWidth={sw / 2}/>
    <rect x={r*0.55} y={-r*0.65} width={r*0.40} height={r*1.30} fill={livery.primary} stroke={outline} strokeWidth={sw / 2}/>
    <rect x={-r*1.00} y={-r*0.10} width={r*2.00} height={r*0.18} fill={sec} opacity="0.6"/>
    <rect x={r*0.95} y={-r*0.55} width={r*0.10} height={r*0.18} fill="#E8F4FF"/>
    <rect x={r*0.95} y={r*0.37} width={r*0.10} height={r*0.18} fill="#E8F4FF"/>
    <line x1={-r*1.00} y1={-r*0.55} x2={-r*1.00} y2={r*0.55} stroke={outline} strokeWidth={sw / 2}/>
    <circle cx={-r*0.85} cy={0} r={r*0.13} fill="#3DD68C"/>
  </>;
}

window.Track = Track;
