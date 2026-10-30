// Side panels — Leaderboard, Focused car detail, Telemetry, Strategy, Pit log
const { useState: useStateP, useEffect: useEffectP, useMemo: useMemoP } = React;

// The pair (or trio) fighting for the lead, as the map's battle cam frames it.
function battleNos(cars) {
  const s = [...cars].sort((a, b) => a.pos - b.pos);
  return s.slice(0, s[2] && s[2]._intS < 0.5 ? 3 : 2).map(c => c.no);
}
window.battleNos = battleNos;

function Leaderboard({ cars, focusedNo, onFocus, lap, lapsTotal, mode, event, calm }) {
  const sorted = [...cars].sort((a,b) => a.pos - b.pos);
  const f1 = mode === "f1";
  const listRef = React.useRef(null);
  const onKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = sorted.findIndex(c => c.no === focusedNo);
    const next = sorted[Math.max(0, Math.min(sorted.length - 1, (i < 0 ? 0 : i) + (e.key === "ArrowDown" ? 1 : -1)))];
    if (!next) return;
    onFocus(next.no);
    const btn = listRef.current && listRef.current.querySelector(`[data-no="${next.no}"]`);
    if (btn) btn.focus();
  };
  if (calm) {
    const fight = f1 ? [] : battleNos(cars);
    return (
      <div className="panel lb-calm">
        <div className="calm-label">Running order</div>
        <div className="lb-ticker" aria-live="polite">{event ? event.text : "\u00a0"}</div>
        <div className="lb" ref={listRef} onKeyDown={onKeyDown} aria-label="Running order. Arrow keys move between cars.">
          {sorted.map(c => {
            const focused = c.no === focusedNo;
            return (
              <button type="button" key={c.no} data-no={c.no}
                className={`lb-row ${focused ? "lb-focus" : ""} ${fight.includes(c.no) ? "lb-battle" : ""}`}
                style={focused ? { "--row-accent": inkOn(c.livery) } : undefined}
                aria-pressed={focused}
                tabIndex={focused || (!sorted.some(x => x.no === focusedNo) && c.pos === 1) ? 0 : -1}
                title={`#${c.no} ${c.name} · ${c.team}`}
                onClick={() => onFocus(c.no)}>
                <span className="lb-pos">{c.pos}</span>
                <span className="lb-driver">{f1 && c.short ? c.short : c.name.split(" ").slice(-1)[0]}</span>
                <span className="lb-gap">{c.gap}</span>
                {c.tire === "—" ? <span/> : <span className="tyre-chip" title={`Tyre ${c.tire}${c.tire_age != null ? ` · ${c.tire_age} laps` : ""}`}>{c.tire}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-eyebrow">{f1 ? "REAL F1 · FINAL CLASSIFICATION" : "SIMULATED RACE · TIMING"}</div>
        <div className="panel-title">{f1 ? "RESULT" : "RUNNING ORDER"}</div>
        {!f1 && <div className="panel-meta">L{lap}{lapsTotal ? "/" + lapsTotal : ""} · S/F</div>}
      </div>
      {!f1 && <div className="lb-ticker" aria-live="polite">{event ? event.text : "\u00a0"}</div>}
      <div className="lb" ref={listRef} onKeyDown={onKeyDown} aria-label={f1 ? "Final classification" : "Running order. Arrow keys move between cars."}>
        <div className="lb-row lb-head" aria-hidden="true">
          <span>POS</span><span>NO</span><span>DRIVER</span><span>GAP</span><span>{f1 ? "LAPS" : "LAST"}</span><span>TYRE</span>
        </div>
        {sorted.map(c => {
          const podiumCls = c.pos === 1 ? "lb-p1" : c.pos === 2 ? "lb-p2" : c.pos === 3 ? "lb-p3" : "";
          const posCls = c.pos === 1 ? "lb-pos-gold" : c.pos === 2 ? "lb-pos-silver" : c.pos === 3 ? "lb-pos-bronze" : "";
          const surname = c.name.split(" ").slice(-1)[0];
          const focused = c.no === focusedNo;
          return (
          <button type="button" key={c.no} data-no={c.no}
            className={`lb-row ${focused ? "lb-focus" : ""} ${podiumCls}`}
            aria-pressed={focused}
            tabIndex={focused || (!sorted.some(x => x.no === focusedNo) && c.pos === 1) ? 0 : -1}
            title={`${c.name} · ${c.team}`}
            onClick={() => onFocus(c.no)}>
            <span className={`lb-pos ${posCls}`}>{String(c.pos).padStart(2,"0")}</span>
            <span className="lb-no" style={{ color: window.inkOn(c.livery) }}>{c.no}</span>
            <span className="lb-name">
              <span className="lb-livery" style={{ background: c.livery.primary, borderColor: c.livery.secondary }}/>
              <span className="lb-driver">{f1 && c.short ? c.short : surname}</span>
            </span>
            <span className={`lb-gap ${c.gap === "LEADER" || c.gap === "WINNER" ? "lb-gap-leader" : ""}`}>{c.gap}</span>
            <span className="lb-last">{f1 ? (c.laps != null ? c.laps : "—") : c.last_lap}</span>
            {c.tire === "—" ? <span className="lb-last">—</span> :
              <span className={`tyre tyre-${c.tire}`}>{c.tire}{c.tire_age != null && <sub>{c.tire_age}</sub>}</span>}
          </button>
          );
        })}
      </div>
    </div>
  );
}

// Readable ink for a livery on black: the accent unless it's too dark, then the primary, then ink.
function inkOn(livery) {
  const lum = (hex) => {
    const h = (hex || "").replace("#", "");
    if (h.length < 6) return 0;
    const c = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ok = (hex) => (lum(hex) + 0.05) / 0.05 >= 3;
  if (livery.accent === "#FFFFFF") return "#fff";
  if (ok(livery.accent)) return livery.accent;
  if (ok(livery.primary)) return livery.primary;
  return "#E8E4DC";
}
window.inkOn = inkOn;

// CSS-painted livery card — original geometric livery art
function LiveryCard({ car }) {
  const { livery: L, no } = car;
  return (
    <div className="livery-card" aria-label={`${car.team} livery`}>
      <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" className="livery-svg">
        {/* base */}
        <rect width="320" height="140" fill={L.primary}/>
        {/* pattern */}
        {L.pattern === "stripe-diag" && (
          <g>
            <polygon points="0,0 90,0 50,140 0,140" fill={L.secondary}/>
            <polygon points="90,0 100,0 60,140 50,140" fill={L.accent}/>
          </g>
        )}
        {L.pattern === "stripe-vert" && (
          <g>
            <rect x="120" y="0" width="36" height="140" fill={L.secondary}/>
            <rect x="160" y="0" width="6" height="140" fill={L.accent}/>
          </g>
        )}
        {L.pattern === "stripe-horiz" && (
          <g>
            <rect x="0" y="50" width="320" height="14" fill={L.secondary}/>
            <rect x="0" y="68" width="320" height="3" fill={L.accent}/>
          </g>
        )}
        {L.pattern === "kintsugi" && (
          <g stroke={L.secondary} strokeWidth="2" fill="none" opacity="0.95">
            <path d="M 0 60 L 80 70 L 130 50 L 200 80 L 260 60 L 320 78"/>
            <path d="M 0 100 L 60 90 L 140 110 L 220 95 L 320 100"/>
            <circle cx="80" cy="70" r="3" fill={L.accent}/>
            <circle cx="200" cy="80" r="3" fill={L.accent}/>
            <circle cx="260" cy="60" r="3" fill={L.accent}/>
          </g>
        )}
        <rect width="320" height="140" fill="url(#lc-fade)"/>
        <defs>
          <linearGradient id="lc-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#05070a" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#05070a" stopOpacity="0.92"/>
          </linearGradient>
        </defs>
        <rect x="0" y="118" width="320" height="22" fill="#0b0e13"/>
        <g transform="translate(160 120)"><window.F1Car.SVG view="side" livery={L} number={no} scale={50}/></g>
      </svg>
      <div className="livery-overlay">
        <span>LIVERY · {car.team}</span>
        <span>{L.primary} / {L.secondary} / {L.accent}</span>
      </div>
    </div>
  );
}

// Per-class side-profile car silhouette renderer for the hero photo card.
// Returns an <svg> element designed to fill its container.
function ClassHeroScene({ car, carClass }) {
  const cls = (carClass && carClass.id) || "open_wheel";
  const L = car.livery;
  const accent = L.accent === "#FFFFFF" ? "#E8E4DC" : L.accent;
  const skyTop = "#0A1322";
  const skyMid = "#142235";
  const horizon = "#1A2B3F";

  // Side-profile car geometries, drawn at 1000×620 viewBox; cars sit on y≈420 ground line
  const Car = () => {
    const cx = 500, cy = 420; // body baseline
    if (cls === "gt") return (
      <g transform={`translate(${cx-280} ${cy-110})`}>
        {/* GT silhouette — low coupe */}
        <path d="M 20 130 L 60 80 L 200 50 L 380 50 L 460 70 L 540 110 L 540 150 L 20 150 Z"
              fill={L.primary} stroke="#000" strokeWidth="2"/>
        <path d="M 90 80 L 200 60 L 360 60 L 440 80 L 440 110 L 90 110 Z" fill="#0B0F18" opacity="0.92"/>
        <rect x="90" y="115" width="360" height="6" fill={L.secondary}/>
        <rect x="180" y="125" width="160" height="3" fill={accent}/>
        <text x="280" y="142" fontSize="22" fontWeight="900" fontFamily="Geist, sans-serif" fill={accent} textAnchor="middle">{car.no}</text>
        {/* wheels */}
        <circle cx="120" cy="150" r="34" fill="#050810"/>
        <circle cx="120" cy="150" r="22" fill="#1a1a1a"/>
        <circle cx="120" cy="150" r="6" fill={accent}/>
        <circle cx="440" cy="150" r="34" fill="#050810"/>
        <circle cx="440" cy="150" r="22" fill="#1a1a1a"/>
        <circle cx="440" cy="150" r="6" fill={accent}/>
        {/* spoiler */}
        <rect x="500" y="60" width="50" height="6" fill={L.secondary}/>
        <rect x="540" y="58" width="6" height="14" fill={L.secondary}/>
      </g>
    );
    if (cls === "stock") return (
      <g transform={`translate(${cx-300} ${cy-130})`}>
        {/* Stock car — tall greenhouse, fenders */}
        <path d="M 10 160 L 30 110 L 100 90 L 150 50 L 460 50 L 510 90 L 580 110 L 600 160 L 10 160 Z"
              fill={L.primary} stroke="#000" strokeWidth="2"/>
        <path d="M 160 60 L 300 60 L 300 100 L 160 100 Z" fill="#0B0F18" opacity="0.92"/>
        <path d="M 310 60 L 450 60 L 480 100 L 310 100 Z" fill="#0B0F18" opacity="0.92"/>
        <rect x="155" y="60" width="2" height="40" fill="#000"/>
        <rect x="305" y="60" width="2" height="40" fill="#000"/>
        {/* number circle */}
        <circle cx="305" cy="125" r="28" fill="#fff" stroke={L.secondary} strokeWidth="3"/>
        <text x="305" y="135" fontSize="28" fontWeight="900" fontFamily="Geist, sans-serif" fill="#000" textAnchor="middle">{car.no}</text>
        {/* livery stripe */}
        <rect x="100" y="105" width="430" height="10" fill={L.secondary}/>
        <rect x="100" y="118" width="430" height="3" fill={accent}/>
        {/* wheels */}
        <circle cx="130" cy="160" r="36" fill="#050810"/>
        <circle cx="130" cy="160" r="24" fill="#1a1a1a"/>
        <circle cx="130" cy="160" r="6" fill={accent}/>
        <circle cx="490" cy="160" r="36" fill="#050810"/>
        <circle cx="490" cy="160" r="24" fill="#1a1a1a"/>
        <circle cx="490" cy="160" r="6" fill={accent}/>
      </g>
    );
    if (cls === "prototype") return (
      <g transform={`translate(${cx-310} ${cy-95})`}>
        {/* LMH — very low, fender humps, fin */}
        <path d="M 0 130 L 30 100 L 110 78 L 200 50 L 230 50 L 250 70 L 380 70 L 420 50 L 470 50 L 540 78 L 600 100 L 620 130 L 0 130 Z"
              fill={L.primary} stroke="#000" strokeWidth="2"/>
        {/* canopy */}
        <path d="M 240 70 L 260 50 L 380 50 L 400 70 Z" fill="#0B0F18" opacity="0.92"/>
        {/* shark fin */}
        <path d="M 380 50 L 380 12 L 470 50 Z" fill={L.primary} stroke="#000" strokeWidth="1.5"/>
        <rect x="385" y="22" width="60" height="3" fill={accent}/>
        {/* livery diag */}
        <path d="M 60 90 L 150 70 L 180 90 L 90 110 Z" fill={L.secondary}/>
        <path d="M 90 110 L 180 90 L 195 100 L 105 120 Z" fill={accent}/>
        <text x="320" y="105" fontSize="20" fontWeight="900" fontFamily="Geist, sans-serif" fill={accent} textAnchor="middle">{car.no}</text>
        {/* wheels */}
        <circle cx="130" cy="130" r="28" fill="#050810"/>
        <circle cx="130" cy="130" r="18" fill="#1a1a1a"/>
        <circle cx="130" cy="130" r="5" fill={accent}/>
        <circle cx="500" cy="130" r="28" fill="#050810"/>
        <circle cx="500" cy="130" r="18" fill="#1a1a1a"/>
        <circle cx="500" cy="130" r="5" fill={accent}/>
      </g>
    );
    if (cls === "e_spec") return (
      <g transform={`translate(${cx-290} ${cy-95})`}>
        {/* E-Spec — covered front wheels, exposed rear */}
        <path d="M 10 130 L 40 105 L 130 95 L 170 50 L 380 50 L 420 75 L 460 80 L 460 110 L 540 110 L 560 130 L 10 130 Z"
              fill={L.primary} stroke="#000" strokeWidth="2"/>
        {/* halo cockpit */}
        <path d="M 200 60 L 210 35 L 360 35 L 370 60 Z" fill="#0B0F18" opacity="0.95"/>
        <path d="M 215 35 Q 285 18 355 35" fill="none" stroke="#0B0F18" strokeWidth="6"/>
        {/* livery */}
        <rect x="40" y="90" width="380" height="5" fill={L.secondary}/>
        <rect x="40" y="98" width="380" height="2" fill={accent}/>
        <text x="290" y="115" fontSize="20" fontWeight="900" fontFamily="Geist, sans-serif" fill={accent} textAnchor="middle">{car.no}</text>
        {/* lightning */}
        <polygon points="100,72 112,90 104,90 116,108 110,90 118,90" fill="#3DD68C"/>
        {/* covered front wheel */}
        <path d="M 90 130 A 40 40 0 0 1 170 130 Z" fill={L.primary} stroke="#000" strokeWidth="2"/>
        <circle cx="130" cy="130" r="22" fill="#050810"/>
        <circle cx="130" cy="130" r="14" fill="#1a1a1a"/>
        <circle cx="130" cy="130" r="4" fill="#3DD68C"/>
        {/* exposed rear wheel */}
        <circle cx="490" cy="130" r="32" fill="#050810"/>
        <circle cx="490" cy="130" r="22" fill="#1a1a1a"/>
        <circle cx="490" cy="130" r="5" fill="#3DD68C"/>
      </g>
    );
    return (
      <g transform={`translate(${cx} 506)`}>
        <ellipse cx="0" cy="2" rx="440" ry="12" fill="#000" opacity="0.55"/>
        <window.F1Car.SVG view="side" livery={L} number={car.no} scale={148}/>
      </g>
    );
  };

  return (
    <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice"
         style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id={`sky-${cls}-${car.no}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop}/>
          <stop offset="55%" stopColor={skyMid}/>
          <stop offset="100%" stopColor={horizon}/>
        </linearGradient>
        <radialGradient id={`glow-${cls}-${car.no}`} cx="50%" cy="78%" r="60%">
          <stop offset="0%" stopColor={`${accent}30`}/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      <rect width="1000" height="620" fill={`url(#sky-${cls}-${car.no})`}/>
      {/* distant hills */}
      <path d="M 0 360 L 120 320 L 220 350 L 340 300 L 460 340 L 600 310 L 740 360 L 880 330 L 1000 350 L 1000 460 L 0 460 Z" fill="#0E1A2A" opacity="0.85"/>
      <path d="M 0 400 L 160 380 L 300 410 L 440 370 L 600 400 L 760 380 L 900 410 L 1000 395 L 1000 470 L 0 470 Z" fill="#0A1422" opacity="0.9"/>
      {/* track tarmac */}
      <path d="M 0 470 L 1000 470 L 1000 540 L 0 540 Z" fill="#13161B"/>
      <path d="M 0 470 L 1000 470" stroke="#3a3f46" strokeWidth="1"/>
      {/* dashed centerline */}
      <line x1="0" y1="510" x2="1000" y2="510" stroke="#3a3f46" strokeWidth="1.5" strokeDasharray="22 18" opacity="0.7"/>
      {/* curb */}
      <g>
        {Array.from({length: 24}).map((_, i) => (
          <rect key={i} x={i*42} y="465" width="42" height="6" fill={i%2 ? "#C8102E" : "#E8E4DC"}/>
        ))}
      </g>
      {/* armco shadow */}
      <rect x="0" y="455" width="1000" height="3" fill="#5BB7E2" opacity="0.25"/>
      {/* ground glow */}
      <rect x="0" y="380" width="1000" height="240" fill={`url(#glow-${cls}-${car.no})`}/>
      {/* the car */}
      <g style={{ filter: "drop-shadow(0 14px 16px rgba(0,0,0,0.55))" }}>
        <Car/>
      </g>
      {/* speed streaks */}
      <g opacity="0.45" stroke={accent} strokeWidth="1.2">
        <line x1="40" y1="430" x2="160" y2="430"/>
        <line x1="60" y1="448" x2="200" y2="448"/>
        <line x1="20" y1="465" x2="120" y2="465"/>
        <line x1="820" y1="425" x2="960" y2="425"/>
        <line x1="780" y1="445" x2="940" y2="445"/>
      </g>
    </svg>
  );
}

window.ClassHeroScene = ClassHeroScene;

// Livery render card. Original SVG art only — no photography.
function PhotoCard({ car, label, onZoom, carClass }) {
  const tint = car.livery.accent === "#FFFFFF" ? car.livery.primary : car.livery.accent;
  const interactive = !!onZoom;
  const onKeyDown = (e) => {
    if (interactive && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onZoom(); }
  };
  return (
    <div className="photo-card photo-card-real" onClick={onZoom} onKeyDown={onKeyDown}
      role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Open dossier for #${car.no} ${car.name}` : undefined}>
      <window.ClassHeroScene car={car} carClass={carClass}/>
      <div className="photo-tint" style={{ background: `linear-gradient(135deg, ${tint}33 0%, transparent 40%, transparent 70%, ${car.livery.primary}55 100%)` }}/>
      <div className="photo-scanlines"/>
      <div className="photo-corner photo-corner-tl"/>
      <div className="photo-corner photo-corner-tr"/>
      <div className="photo-corner photo-corner-bl"/>
      <div className="photo-corner photo-corner-br"/>
      <div className="photo-stamp">
        <span className="photo-stamp-no" style={{ color: tint }}>#{String(car.no).padStart(2,"0")}</span>
        <span className="photo-stamp-team">{car.team}</span>
      </div>
      {interactive && <div className="photo-zoom-hint">⤢ DOSSIER</div>}
      <div className="photo-overlay">
        <span className="photo-label">{label}</span>
        <span className="photo-meta">LIVERY RENDER · {(carClass && carClass.short) || "APEX"}</span>
      </div>
    </div>
  );
}

// Speed/gear helpers shared by telemetry, driver view and the dossier.
function remapSpeed(baseSpeed, carClass) {
  const [minSpd, maxSpd] = (carClass && carClass.speedRange) || [80, 310];
  return minSpd + ((baseSpeed - 80) / (310 - 80)) * (maxSpd - minSpd);
}
function gearFor(speed, carClass) {
  const [minSpd, maxSpd] = (carClass && carClass.speedRange) || [80, 310];
  const t = (speed - minSpd) / (maxSpd - minSpd);
  const cuts = [0.10, 0.20, 0.32, 0.46, 0.60, 0.74, 0.88];
  const i = cuts.findIndex(c => t < c);
  return i < 0 ? 8 : i + 1;
}
// Current telemetry sample for a car, indexed by where it is on the lap.
function useCarSample(model, car, track, hz) {
  const t = window.useRaceTime(hz);
  const modelCar = model && car ? model.cars.find(c => c.no === car.no) : null;
  const frac = modelCar ? window.RaceModel.lapFrac(model, modelCar, t) : 0;
  const tele = car ? window.carTelemetry(car.no, track) : null;
  const idx = Math.min(99, Math.floor(frac * 100));
  return { t, frac, idx, tele, cur: tele ? tele[idx] : { speed: 0, throttle: 0, brake: 0 } };
}
Object.assign(window, { remapSpeed, gearFor, useCarSample });

function Telemetry({ car, carClass, model, track }) {
  const reduce = window.RaceClock.reduceMotion;
  const { idx, tele: points, cur } = useCarSample(model, car, track, reduce ? 1 : 10);
  const ghostPoints = useMemoP(() => window.carTelemetry(7, track), [track && track.id]);
  const [reveal, setReveal] = useStateP(reduce ? 1 : 0);
  useEffectP(() => {
    if (reduce) return;
    setReveal(0);
    let raf, start;
    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / 600);
      setReveal(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [car && car.no]);
  if (!car || !points) return null;
  const [minSpd, maxSpd] = (carClass && carClass.speedRange) || [80, 310];

  const W = 320, H = 80;
  const throttleD = points.map((p, i) => `${i===0?"M":"L"} ${(i/99)*W} ${H - (p.throttle/100)*H}`).join(" ");
  const brakeD    = points.map((p, i) => `${i===0?"M":"L"} ${(i/99)*W} ${H - (p.brake/100)*H}`).join(" ");
  const speedNorm = (s) => H - ((s - minSpd) / (maxSpd - minSpd)) * H;
  const speedD    = points.map((p, i) => `${i===0?"M":"L"} ${(i/99)*W} ${speedNorm(remapSpeed(p.speed, carClass))}`).join(" ");
  const ghostD    = ghostPoints.map((p, i) => `${i===0?"M":"L"} ${(i/99)*W} ${speedNorm(remapSpeed(p.speed, carClass))}`).join(" ");

  const curSpeed = remapSpeed(cur.speed, carClass);
  const gear = gearFor(curSpeed, carClass);

  return (
    <div className="panel telemetry-panel">
      <div className="panel-head">
        <div className="panel-eyebrow">TELEMETRY · SIM</div>
        <div className="panel-title">CAR #{car.no} · {car.name.split(" ").slice(-1)[0]}</div>
      </div>

      <div className="telem-hero">
        <div className="telem-meters">
          <div className="telem-meter">
            <div className="telem-meter-l">T</div>
            <div className="telem-meter-bar">
              <div className="telem-meter-fill telem-fill-throttle" style={{ height: `${cur.throttle}%` }}/>
            </div>
            <div className="telem-meter-v">{Math.round(cur.throttle)}</div>
          </div>
          <div className="telem-meter">
            <div className="telem-meter-l">B</div>
            <div className="telem-meter-bar">
              <div className="telem-meter-fill telem-fill-brake" style={{ height: `${cur.brake}%` }}/>
            </div>
            <div className="telem-meter-v">{Math.round(cur.brake)}</div>
          </div>
        </div>
        <div className="telem-speedo">
          <div className="telem-stat-l">SPEED · KPH</div>
          <div className="telem-speedo-v">{Math.round(curSpeed)}</div>
          <div className="telem-speed-delta">LAP {Math.round(idx)}%</div>
        </div>
        <div className="telem-gear">
          <div className="telem-stat-l">GEAR</div>
          <div className="telem-gear-v">{gear}</div>
          <div className="telem-gear-strip">
            {[1,2,3,4,5,6,7,8].map(n => (
              <span key={n} className={`telem-gear-pip ${n === gear ? "on" : n < gear ? "past" : ""}`}/>
            ))}
          </div>
        </div>
      </div>

      <div className="trace-wrap">
        <div className="trace-label">
          <span style={{color:"#7DC383"}}>THROTTLE</span>
          <span style={{color:"#E5484D"}}>BRAKE</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="trace-svg" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1={H} x2={W} y2={H} stroke="#222" strokeWidth="1"/>
          <line x1="0" y1="0" x2={W} y2="0" stroke="#222" strokeWidth="1"/>
          <path d={throttleD} fill="none" stroke="#7DC383" strokeWidth="1.4"
            pathLength="1" strokeDasharray="1" strokeDashoffset={1 - reveal}/>
          <path d={brakeD}    fill="none" stroke="#C8102E" strokeWidth="1.4"
            pathLength="1" strokeDasharray="1" strokeDashoffset={1 - reveal}/>
          <line x1={(idx/99)*W} y1="0" x2={(idx/99)*W} y2={H} stroke="#fff" strokeWidth="0.8" opacity="0.6"/>
        </svg>
      </div>

      <div className="trace-wrap">
        <div className="trace-label">
          <span style={{color:"#5BB7E2"}}>SPEED · KPH</span>
          {car.no !== 7 && <span style={{color:"rgba(232,228,220,0.55)"}}>GHOST · #07 VOSS</span>}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="trace-svg" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1={H} x2={W} y2={H} stroke="#222" strokeWidth="1"/>
          <line x1="0" y1="0" x2={W} y2="0" stroke="#222" strokeWidth="1"/>
          {car.no !== 7 && (
            <path d={ghostD} fill="none" stroke="rgba(232,228,220,0.32)" strokeWidth="1"
              strokeDasharray="2 2"
              pathLength="1"/>
          )}
          <path d={speedD} fill="none" stroke="#5BB7E2" strokeWidth="1.4"
            pathLength="1" strokeDasharray="1" strokeDashoffset={1 - reveal}/>
          <line x1={(idx/99)*W} y1="0" x2={(idx/99)*W} y2={H} stroke="#fff" strokeWidth="0.8" opacity="0.6"/>
        </svg>
      </div>

      <div className="sectors-row">
        {car.sectors.map((s,i) => (
          <div key={i} className={`sector sector-${s.state}`}>
            <span className="sector-l">{s.s}{s.state === "purple" ? " · SB" : s.state === "green" ? " · PB" : ""}</span>
            <span className="sector-t">{s.t}</span>
          </div>
        ))}
      </div>
      <div className="sector-legend">SB = session best · PB = better than previous lap</div>

      <div className="delta-row">
        <span className="kv-label">Δ TO LEADER</span>
        <span className="delta-val">{car.gap === "LEADER" ? "—" : car.gap}</span>
        <span className="kv-label">INTERVAL</span>
        <span className="delta-val">{car.interval || "—"}</span>
      </div>
    </div>
  );
}

// Driver panel: who, how fast, one throttle/brake trace, sectors and the wind tunnel.
// Numbers tick at 1 Hz; only the trace cursor moves smoothly.
function CalmCarCard({ car, carClass, model, track, onTunnel, accent }) {
  const reduce = window.RaceClock.reduceMotion;
  const live = useCarSample(model, car, track, reduce ? 1 : 12);
  const slow = useCarSample(model, car, track, 1);
  if (!car || !live.tele) return null;
  const speed = Math.round(remapSpeed(slow.cur.speed, carClass));
  const gear = gearFor(speed, carClass);
  const no = String(car.no).padStart(2, "0");
  const W = 320, H = 88, mid = 52;
  const pts = live.tele;
  const thrD = pts.map((p, i) => `${i ? "L" : "M"} ${(i / 99) * W} ${mid - (p.throttle / 100) * (mid - 4)}`).join(" ");
  const brkD = `M 0 ${mid} ` + pts.map((p, i) => `L ${(i / 99) * W} ${mid + (p.brake / 100) * (H - mid - 2)}`).join(" ") + ` L ${W} ${mid} Z`;
  const cx = (live.idx / 99) * W;
  const cy = mid - (live.cur.throttle / 100) * (mid - 4);
  return (
    <section className="calm-card" style={{ "--accent": accent }} aria-label={`Focused car #${car.no} ${car.name}`}>
      <div className="cc-head">
        <div className="cc-no">{no}</div>
        <div className="cc-who">
          <div className="cc-name">{car.name}</div>
          <div className="cc-team">{car.team}</div>
        </div>
      </div>
      <div className="cc-stats" aria-live="off">
        <div className="cc-stat"><span className="calm-label">Speed</span><b>{speed}</b><i>kph</i></div>
        <div className="cc-stat"><span className="calm-label">Gear</span><b>{gear}</b></div>
      </div>
      <div className="cc-trace">
        <div className="cc-trace-l"><span className="calm-label">Throttle</span><span className="calm-label">This lap</span></div>
        <div className="cc-plot">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1={mid} x2={W} y2={mid} stroke="rgba(232,228,220,0.18)" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
            <path d={brkD} fill="var(--accent)" opacity="0.45"/>
            <path d={thrD} fill="none" stroke="rgba(232,228,220,0.8)" strokeWidth="1.3" vectorEffect="non-scaling-stroke"/>
            <line x1={cx} y1="0" x2={cx} y2={H} stroke="#fff" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke"/>
          </svg>
          <span className="cc-dot" style={{ left: `${(cx / W) * 100}%`, top: `${(cy / H) * 100}%` }}/>
        </div>
        <div className="cc-trace-l"><span className="calm-label">Brake</span><span className="calm-label">S/F → S/F</span></div>
      </div>
      <div className="sectors-row">
        {car.sectors.map((sec, i) => (
          <div key={i} className={`sector sector-${sec.state}`}>
            <span className="sector-l">{sec.s}{sec.state === "purple" ? " · SB" : sec.state === "green" ? " · PB" : ""}</span>
            <span className="sector-t">{sec.t}</span>
          </div>
        ))}
      </div>
      <button type="button" className="cc-tunnel" onClick={onTunnel}>
        <span className="cc-tunnel-icon" aria-hidden="true">≋</span> Wind tunnel <span className="cc-tunnel-sub"><kbd>W</kbd></span>
      </button>
    </section>
  );
}
window.CalmCarCard = CalmCarCard;

function StrategyPanel({ car, carClass, cars, lap, lapsTotal }) {
  if (!car) return null;
  const tankKg = (carClass && carClass.tank_kg) || 60;
  const cliffLap = (carClass && carClass.tyre_cliff_lap) || 65;
  const burn = (carClass && carClass.fuel_kg_per_lap) || 0.45;
  const isElectric = carClass && carClass.id === "e_spec";
  const fuelPct = isElectric ? car.fuel : (car.fuel / tankKg) * 100;
  const tireWear = Math.min(100, (car.tire_age / cliffLap) * 100);
  const lapsLeft = isElectric ? Math.round(car.fuel / 0.9) : Math.round(car.fuel / burn);
  const tyreLapsLeft = Math.max(0, Math.round(cliffLap * 0.85 - car.tire_age));
  const windowOpen = (lap || car._lap || 0) + Math.max(1, Math.min(tyreLapsLeft, lapsLeft - 3));
  const behind = cars ? cars.find(c => c.pos === car.pos + 1) : null;
  const noStop = lapsTotal && windowOpen >= lapsTotal - 2;
  return (
    <div className="panel strategy-panel">
      <div className="panel-head">
        <div className="panel-eyebrow">STRATEGY · #{car.no}{carClass ? ` · ${carClass.short}` : ""} · SIM</div>
      </div>
      <div className="strat-grid">
        <div className="strat-cell">
          <div className="kv-label">{isElectric ? "ENERGY" : "FUEL"}</div>
          <div className="strat-bar">
            <div className="strat-bar-fill" style={{ width: `${fuelPct}%`, background: isElectric ? "#3DD68C" : "#5BB7E2" }}/>
          </div>
          <div className="strat-num">{isElectric ? `${Math.round(car.fuel)}%` : `${car.fuel.toFixed(1)} kg`} <small>~{lapsLeft} laps</small></div>
        </div>
        <div className="strat-cell">
          <div className="kv-label">TYRE WEAR · {car.tire}</div>
          <div className="strat-bar">
            <div className="strat-bar-fill" style={{ width: `${tireWear}%`, background: tireWear > 70 ? "#C8102E" : tireWear > 45 ? "#C9A24A" : "#7DC383" }}/>
          </div>
          <div className="strat-num">{car.tire_age} <small>laps · cliff @ ~{cliffLap}</small></div>
        </div>
        <div className="strat-cell strat-window">
          <div className="kv-label">{isElectric ? "ATTACK MODE" : "PIT WINDOW"}</div>
          <div className="strat-num">{isElectric ? "ARMED" : noStop ? "NO STOP" : `L${windowOpen}`} {!isElectric && !noStop && <span className="hud-of">→ L{Math.min(windowOpen + 6, lapsTotal || windowOpen + 6)}</span>}</div>
          <div className="strat-sub">{isElectric ? `4× 35kW BOOST AVAIL.` : behind ? `UNDERCUT THREAT: #${behind.no} ${behind.interval}` : "NO CAR BEHIND"}</div>
        </div>
      </div>
    </div>
  );
}

// Car class and circuit, as two radio groups (the cinema view's settings panel).
function RaceSettings({ trackId, onTrackChange, classId, onClassChange }) {
  const group = (label, ids, cur, pick, name, meta) => (
    <div className="set-group" role="radiogroup" aria-label={label}>
      <div className="calm-label">{label}</div>
      {ids.map(id => (
        <button key={id} type="button" role="radio" aria-checked={id === cur} className={`set-opt ${id === cur ? "on" : ""}`} onClick={() => pick(id)}>
          <span className="set-opt-name">{name(id)}</span><span className="set-opt-meta">{meta(id)}</span>
        </button>
      ))}
    </div>
  );
  return (
    <div className="race-settings">
      {group("Car class", window.CAR_CLASS_LIST, classId, onClassChange, id => window.CAR_CLASSES[id].name, id => window.CAR_CLASSES[id].eyebrow)}
      {group("Circuit", window.TRACK_LIST, trackId, onTrackChange, id => window.TRACKS[id].short, id => `${window.TRACKS[id].country} · ${window.TRACK_EVENTS[id].round}`)}
    </div>
  );
}
window.RaceSettings = RaceSettings;

function TopBar({ track, trackEvent, trackId, onTrackChange, race, classId, onClassChange, f1Mode, f1, actions, trail, compact }) {
  const [open, setOpen] = React.useState(false);
  const [classOpen, setClassOpen] = React.useState(false);
  const carClass = window.CAR_CLASSES[classId];
  const w = track.weather;
  const session = f1Mode && f1 && f1.data ? f1.data.session : null;
  const meeting = f1Mode && f1 && f1.data ? f1.data.meeting : null;
  return (
    <div className={`topbar ${compact ? "topbar-compact" : ""}`}>
      <div className="topbar-left">
        <div className="brand">
          <span className="brand-mark">▲</span>
          <span className="brand-name">APEX</span>
          <span className="brand-tag">{f1Mode ? "REAL F1 · REPLAY" : "SIMULATED RACE"}</span>
        </div>
        <div className="topbar-divider"/>
        {f1Mode ? (
          <div className="topbar-event">
            <div className="event-eyebrow">{session ? `${session.session_name} · ${window.fmtF1Date(session.date_start)}` : "OPENF1"}</div>
            <div className="event-title">{meeting ? meeting.meeting_name : session ? session.location : "LOADING…"}{session ? ` · ${session.circuit_short_name}` : ""}</div>
          </div>
        ) : (
          <div className="topbar-event">
            <div className="event-eyebrow">{trackEvent.round} · {trackEvent.date}</div>
            <div className="event-title">{trackEvent.event}</div>
            <div className="event-note">Simulated race · APEX Series is fictional</div>
          </div>
        )}
        {!f1Mode && <>
        <div className="topbar-divider"/>
        <div className="track-selector-wrap">
          <button className="track-selector class-selector" onClick={() => setClassOpen(o => !o)} aria-haspopup="listbox" aria-expanded={classOpen}>
            <div className="ts-eyebrow">CAR CLASS</div>
            <div className="ts-row">
              <span className="cls-icon" style={{ color: carClass.accent }}>
                <svg viewBox="0 0 48 32" width="36" height="22"><g>{carClass.icon}</g></svg>
              </span>
              <span className="ts-name">{carClass.name}</span>
              <svg className={classOpen?"ts-caret ts-caret-up":"ts-caret"} viewBox="0 0 12 12" width="10" height="10">
                <path d="M 2 4 L 6 8 L 10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </button>
          {classOpen && (
            <div className="track-menu track-menu-classes" role="listbox">
              <div className="track-menu-head">SELECT CLASS · {window.CAR_CLASS_LIST.length}</div>
              {window.CAR_CLASS_LIST.map(id => {
                const c = window.CAR_CLASSES[id];
                const active = id === classId;
                return (
                  <button
                    key={id}
                    className={active ? "track-menu-item class-menu-item active" : "track-menu-item class-menu-item"}
                    onClick={() => { onClassChange(id); setClassOpen(false); }}
                    role="option"
                    aria-selected={active}>
                    <div className="tmi-mini cls-mini" style={{ color: active ? c.accent : "rgba(232,228,220,0.6)" }}>
                      <svg viewBox="0 0 48 32" preserveAspectRatio="xMidYMid meet"><g>{c.icon}</g></svg>
                    </div>
                    <div className="tmi-info">
                      <div className="tmi-name">{c.name}</div>
                      <div className="tmi-meta">{c.eyebrow}</div>
                      <div className="tmi-event" style={{ color: active ? c.accent : "rgba(232,228,220,0.55)" }}>{c.tagline}</div>
                    </div>
                    {active && <span className="tmi-tick" style={{ color: c.accent }}>●</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="topbar-divider"/>
        <div className="track-selector-wrap">
          <button className="track-selector" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
            <div className="ts-eyebrow">CIRCUIT</div>
            <div className="ts-row">
              <span className="ts-name">{track.short}</span>
              <span className="ts-country">{track.country}</span>
              <svg className={open?"ts-caret ts-caret-up":"ts-caret"} viewBox="0 0 12 12" width="10" height="10">
                <path d="M 2 4 L 6 8 L 10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </button>
          {open && (
            <div className="track-menu track-menu-tracks" role="listbox">
              <div className="track-menu-head">SELECT CIRCUIT · {window.TRACK_LIST.length}</div>
              {window.TRACK_LIST.map(id => {
                const t = window.TRACKS[id];
                const ev = window.TRACK_EVENTS[id];
                const active = id === trackId;
                return (
                  <button
                    key={id}
                    className={active ? "track-menu-item active" : "track-menu-item"}
                    onClick={() => { onTrackChange(id); setOpen(false); }}
                    role="option"
                    aria-selected={active}>
                    <div className="tmi-mini">
                      <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet">
                        <path d={t.path} fill="none" stroke={active ? "#5BB7E2" : "rgba(232,228,220,0.5)"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="tmi-info">
                      <div className="tmi-name">{t.short}</div>
                      <div className="tmi-meta">{t.country} · {t.length_mi.toFixed(2)} MI · {t.turns_count} TURNS</div>
                      <div className="tmi-event">{ev.round} · {ev.event}</div>
                    </div>
                    {active && <span className="tmi-tick">●</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        </>}
      </div>
      <div className="topbar-right">
        {!f1Mode && !compact && <div className="weather">
          <span className="kv-label">AIR</span><span className="kv-val">{w.air_c}°</span>
          <span className="kv-label">TRACK</span><span className="kv-val">{w.track_c}°</span>
          <span className="kv-label">WIND</span><span className="kv-val">{w.wind_kph} kph</span>
          <span className="kv-label">COND</span><span className="kv-val">{w.condition}</span>
        </div>}
        {!f1Mode && race && race.fastest && !compact && <div className="fastest">
          <span className="kv-label">FASTEST LAP</span>
          <span className="kv-val">{race.fastest.time}</span>
          <span className="kv-sub">#{race.fastest.car} {race.fastest.driver}</span>
        </div>}
        {compact && !f1Mode && race && <div className="topbar-lap"><span className="kv-label">LAP</span><span className="kv-val">{race.lap}/{race.lapsTotal}</span></div>}
        {f1Mode && f1 && <div className={`f1-status f1-status-${f1.status}`} role="status">{window.f1StatusText(f1)}</div>}
        <div className="topbar-actions">{actions}{trail}</div>
      </div>
    </div>
  );
}

// Stylized helmet portrait — driver "photo" rendered as a livery-painted helmet
function HelmetPortrait({ car, size = 200 }) {
  const h = car.helmet || { primary: car.livery.primary, secondary: car.livery.secondary, visor: "#0B0B0B" };
  const id = `helm-${car.no}`;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="helmet-svg" aria-label={`${car.name} helmet`}>
      <defs>
        <radialGradient id={`${id}-light`} cx="35%" cy="25%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)"/>
          <stop offset="60%" stopColor="rgba(255,255,255,0.05)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.45)"/>
        </radialGradient>
        <linearGradient id={`${id}-visor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)"/>
          <stop offset="40%" stopColor={h.visor}/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.95)"/>
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M 40 95 C 40 50, 75 30, 100 30 C 125 30, 160 50, 160 95 L 160 130 C 160 152, 145 160, 125 160 L 75 160 C 55 160, 40 152, 40 130 Z"/>
        </clipPath>
      </defs>
      {/* Backing frame */}
      <rect width="200" height="200" fill="#04060A"/>
      {/* Cross-hairs */}
      <g stroke="rgba(91,183,226,0.18)" strokeWidth="0.5">
        <line x1="0" y1="100" x2="200" y2="100"/>
        <line x1="100" y1="0" x2="100" y2="200"/>
      </g>
      {/* Helmet shell */}
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="200" height="200" fill={h.primary}/>
        {/* livery stripe */}
        <rect x="0" y="58" width="200" height="14" fill={h.secondary}/>
        <rect x="0" y="76" width="200" height="3" fill={car.livery.accent}/>
        {/* number on side */}
        <text x="160" y="135" fontSize="34" fontWeight="900" fontFamily="Geist, sans-serif"
          fill={h.secondary} textAnchor="end" letterSpacing="-1">{car.no}</text>
      </g>
      {/* Visor cutout */}
      <path d="M 58 80 C 58 70, 70 64, 100 64 C 130 64, 142 70, 142 80 L 142 100 C 142 108, 130 112, 100 112 C 70 112, 58 108, 58 100 Z"
        fill={`url(#${id}-visor)`} stroke="rgba(0,0,0,0.5)" strokeWidth="1"/>
      {/* Helmet outline */}
      <path d="M 40 95 C 40 50, 75 30, 100 30 C 125 30, 160 50, 160 95 L 160 130 C 160 152, 145 160, 125 160 L 75 160 C 55 160, 40 152, 40 130 Z"
        fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="1"/>
      {/* Light overlay */}
      <path d="M 40 95 C 40 50, 75 30, 100 30 C 125 30, 160 50, 160 95 L 160 130 C 160 152, 145 160, 125 160 L 75 160 C 55 160, 40 152, 40 130 Z"
        fill={`url(#${id}-light)`}/>
    </svg>
  );
}

// Stylized crew portrait — silhouette with team color
function CrewPortrait({ name, accent, kind, size = 88 }) {
  const id = `crew-${name.replace(/\s+/g, "-")}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="crew-svg">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0C0F14"/>
          <stop offset="100%" stopColor="#04060A"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}-bg)`}/>
      <g stroke="rgba(91,183,226,0.12)" strokeWidth="0.4">
        <line x1="0" y1="50" x2="100" y2="50"/>
        <line x1="50" y1="0" x2="50" y2="100"/>
      </g>
      {/* shoulder */}
      <path d="M 8 100 C 12 78, 30 70, 50 70 C 70 70, 88 78, 92 100 Z" fill={accent} opacity="0.85"/>
      {/* head silhouette */}
      <circle cx="50" cy="45" r="18" fill="#E8E4DC" opacity="0.92"/>
      {/* cap shadow */}
      {kind === "chief" && (
        <path d="M 32 38 C 36 28, 64 28, 68 38 L 70 42 L 30 42 Z" fill="#0B0B0B"/>
      )}
      {kind === "engineer" && (
        <g>
          {/* headset band */}
          <path d="M 34 32 C 40 22, 60 22, 66 32" fill="none" stroke="#0B0B0B" strokeWidth="2.5"/>
          <circle cx="33" cy="44" r="3" fill="#0B0B0B"/>
        </g>
      )}
      {/* Subtle frame */}
      <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="rgba(91,183,226,0.25)" strokeWidth="1"/>
    </svg>
  );
}

// Driver tab — the cockpit experience. POV up top, then live driver-load metrics
// (heart rate, g-force, brake pressure) derived from telemetry, then radio handle
// + signature line, with full bio/crew tucked into a collapsible ABOUT section.
function DriverProfile({ car, onZoomPhoto, carClass, cars, track, model }) {
  const [aboutOpen, setAboutOpen] = useStateP(false);
  const { cur, frac } = useCarSample(model, car, track, window.RaceClock.reduceMotion ? 1 : 8);
  if (!car) return null;
  const accent = car.livery.accent === "#FFFFFF" ? car.livery.primary : car.livery.accent;

  // Estimated lateral g — peaks during corners (low throttle + some brake or coast).
  // Scale: 0..5g typical for open-wheel. We approximate cornering load from how
  // far speed has dropped below max (i.e. driver is committed to a corner).
  const speedRatio = Math.min(1, Math.max(0, (cur.speed - 80) / (310 - 80)));
  const cornerLoad = Math.max(0, 1 - speedRatio) * (cur.throttle < 60 ? 1 : 0.4);
  const gLateral = (1.2 + cornerLoad * 3.6).toFixed(1); // 1.2g cruising → ~4.8g peak
  const gLong = (cur.brake / 100 * 4.5 + cur.throttle / 100 * 1.6).toFixed(1);

  // Estimated heart rate: ~145 baseline, climbs with brake intensity & corner load.
  // Real APEX/F1 drivers run 160-190bpm during a stint.
  const hr = Math.round(148 + cur.brake * 0.28 + cornerLoad * 22);

  // Steering input — rough proxy: high during corners, low on straights.
  const steerDeg = Math.round(cornerLoad * 110 + (cur.brake > 40 ? 18 : 0));

  // Famous corner notes lifted from track data — the visceral driver intelligence.
  const corkscrewNote = "5.5-storey blind drop. Brake on the dirt patch.";
  const handleMatch = car.bio && car.bio.match(/known on the radio as ['"]([^'"]+)['"]/i);
  const radioHandle = handleMatch ? handleMatch[1] : null;

  // Pull a single visceral sentence out of the bio for the headline quote.
  const bioSentences = car.bio ? car.bio.split(/(?<=[.!?])\s+/) : [];
  const signatureLine = bioSentences.find(s => /aggressive|smooth|cool|surgical|methodical|brilliant|fastest|famous|wins|cult|quiet/i.test(s)) || bioSentences[1] || bioSentences[0] || "";

  return (
    <div className="panel driver-panel">
      <div className="panel-head">
        <div className="panel-eyebrow" style={{color: accent}}>IN THE COCKPIT · #{car.no}</div>
        <div className="panel-title">{car.name}</div>
        <div className="dr-team-line" style={{color: "var(--muted)"}}>{car.team} · {car.country} · AGE {car.age}</div>
      </div>

      {/* Big POV view — fan's window into the driver's perspective */}
      {window.DriverView && (
        <div className="dr-pov-wrap">
          <window.DriverView car={car} track={track} frac={frac} cur={cur} carClass={carClass}/>
        </div>
      )}

      {/* Driver load — the physical demand right now */}
      <div className="dr-section">
        <div className="kv-label">DRIVER LOAD · ESTIMATED FROM SIM</div>
        <div className="dr-load-grid">
          <DrLoadStat label="HEART RATE" value={hr} unit="BPM" max={200} fillColor="#C8102E" pulse={!window.RaceClock.reduceMotion}/>
          <DrLoadStat label="LATERAL G" value={gLateral} unit="g" max={5} fillColor={accent}/>
          <DrLoadStat label="LONG. G" value={gLong} unit="g" max={5} fillColor="#5BB7E2"/>
          <DrLoadStat label="STEERING" value={steerDeg} unit="°" max={140} fillColor="#7DC383"/>
        </div>
      </div>

      {/* Radio handle + signature line — what announcers say about them */}
      <div className="dr-section dr-quote-block" style={{borderColor: `${accent}40`}}>
        {radioHandle && (
          <div className="dr-handle">
            <span className="kv-label">RADIO HANDLE</span>
            <span className="dr-handle-v" style={{color: accent}}>“{radioHandle}”</span>
          </div>
        )}
        <p className="dr-signature">{signatureLine}</p>
      </div>

      {/* Corkscrew driver notes — Laguna-specific */}
      {track.id === "laguna_seca" && (
        <div className="dr-section dr-corner-card">
          <div className="kv-label" style={{color: accent}}>SIGNATURE CORNER · TURN 8</div>
          <div className="dr-corner-name">THE CORKSCREW</div>
          <p className="dr-corner-note">{corkscrewNote}</p>
          <div className="dr-corner-meta">
            <div><span className="kv-label">APPROACH</span><b>~210 KPH</b></div>
            <div><span className="kv-label">EXIT</span><b>~95 KPH</b></div>
            <div><span className="kv-label">DROP</span><b>17.5 M</b></div>
          </div>
        </div>
      )}

      {/* About — collapsed by default to keep the experience focused */}
      <button
        className="dr-about-toggle"
        onClick={() => setAboutOpen(v => !v)}
        aria-expanded={aboutOpen}>
        <span className="kv-label" style={{color: aboutOpen ? accent : "var(--muted)"}}>
          {aboutOpen ? "▾ HIDE BIOGRAPHY" : "▸ ABOUT THE DRIVER & CREW"}
        </span>
      </button>

      {aboutOpen && (
        <div className="dr-about">
          <div className="driver-hero" style={{marginTop: 10}}>
            <div className="driver-portrait">
              <window.HelmetPortrait car={car} size={140}/>
              <div className="driver-portrait-frame"/>
            </div>
            <div className="driver-meta">
              <div className="kv-label">BIO</div>
              <p className="dr-bio">{car.bio}</p>
            </div>
          </div>

          <div className="crew-block">
            <div className="kv-label" style={{marginBottom: 8}}>CREW</div>
            <div className="crew-row">
              <window.CrewPortrait name={car.crew_chief} accent={accent} kind="chief"/>
              <div className="crew-info">
                <div className="crew-role">CREW CHIEF</div>
                <div className="crew-name">{car.crew_chief}</div>
                <div className="crew-bio">{car.crew_chief_bio}</div>
              </div>
            </div>
            <div className="crew-row">
              <window.CrewPortrait name={car.race_engineer} accent={accent} kind="engineer"/>
              <div className="crew-info">
                <div className="crew-role">RACE ENGINEER</div>
                <div className="crew-name">{car.race_engineer}</div>
                <div className="crew-bio">{car.race_engineer_bio}</div>
              </div>
            </div>
          </div>

          <div className="focus-grid">
            <div><div className="kv-label">CHASSIS</div><div className="kv-val">{car.chassis}</div></div>
            <div><div className="kv-label">ENGINE</div><div className="kv-val">{car.engine}</div></div>
          </div>
          <window.LiveryCard car={car}/>
        </div>
      )}
    </div>
  );
}

// Compact bar-stat for driver load metrics
function DrLoadStat({ label, value, unit, max, fillColor, pulse }) {
  const pct = Math.min(100, (parseFloat(value) / max) * 100);
  return (
    <div className="dr-load-stat">
      <div className="kv-label">{label}</div>
      <div className="dr-load-row">
        <div className={`dr-load-v ${pulse ? "dr-load-pulse" : ""}`}>
          {value}<span className="dr-load-unit">{unit}</span>
        </div>
      </div>
      <div className="dr-load-bar">
        <div className="dr-load-fill" style={{width: `${pct}%`, background: fillColor}}/>
      </div>
    </div>
  );
}

Object.assign(window, { Leaderboard, Telemetry, StrategyPanel, TopBar, LiveryCard, PhotoCard, DriverProfile, HelmetPortrait, CrewPortrait });
