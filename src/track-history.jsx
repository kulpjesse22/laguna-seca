// Track history panel — shows when a circuit is selected
// Displays opening year, lap record, signature corner, key facts.
// Plus a per-track signature mini-graphic so each track is visually recognizable.

const { useState: useStateTH } = React;

// Country flag bands — minimal SVG, drawn as colored stripes/blocks. Recognizable, original.
function FlagBadge({ country, accent }) {
  const flags = {
    USA: <g>
      <rect width="24" height="16" fill="#0B2545"/>
      <rect x="9" width="15" height="2" fill="#C8102E"/>
      <rect x="9" y="4" width="15" height="2" fill="#C8102E"/>
      <rect x="9" y="8" width="15" height="2" fill="#C8102E"/>
      <rect x="9" y="12" width="15" height="2" fill="#C8102E"/>
      <rect x="0" y="2" width="9" height="2" fill="#E8E4DC"/>
      <rect x="0" y="6" width="9" height="2" fill="#E8E4DC"/>
      <rect x="0" y="10" width="9" height="2" fill="#E8E4DC"/>
    </g>,
    ITA: <g>
      <rect width="8" height="16" fill="#0E5E3A"/>
      <rect x="8" width="8" height="16" fill="#E8E4DC"/>
      <rect x="16" width="8" height="16" fill="#C8102E"/>
    </g>,
    BEL: <g>
      <rect width="8" height="16" fill="#0B0B0B"/>
      <rect x="8" width="8" height="16" fill="#FBC02D"/>
      <rect x="16" width="8" height="16" fill="#C8102E"/>
    </g>,
    MON: <g>
      <rect width="24" height="8" fill="#C8102E"/>
      <rect y="8" width="24" height="8" fill="#E8E4DC"/>
    </g>,
    GBR: <g>
      <rect width="24" height="16" fill="#0B2545"/>
      <path d="M 0 0 L 24 16 M 24 0 L 0 16" stroke="#E8E4DC" strokeWidth="2"/>
      <path d="M 12 0 L 12 16 M 0 8 L 24 8" stroke="#E8E4DC" strokeWidth="3"/>
      <path d="M 12 0 L 12 16 M 0 8 L 24 8" stroke="#C8102E" strokeWidth="1.4"/>
    </g>,
    JPN: <g>
      <rect width="24" height="16" fill="#E8E4DC"/>
      <circle cx="12" cy="8" r="4.5" fill="#C8102E"/>
    </g>,
  };
  const flag = flags[country] || <rect width="24" height="16" fill={accent || "#5BB7E2"}/>;
  return (
    <svg viewBox="0 0 24 16" width="32" height="22" className="flag-badge">
      {flag}
      <rect width="24" height="16" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1"/>
    </svg>
  );
}

// Per-track signature glyph — a tiny iconographic representation of the track's most famous feature.
// All hand-drawn with simple shapes, monospace labels.
function TrackGlyph({ trackId, accent }) {
  const stroke = accent || "#5BB7E2";
  const W = 110, H = 70;
  const ico = {
    laguna_seca: ( // Corkscrew elevation drop (S-shape over a ramp)
      <g>
        <path d="M 10 18 L 38 18 L 50 28 L 60 22 L 70 38 L 82 50 L 100 50" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
        <path d="M 10 56 L 38 56 L 50 56 L 60 56 L 100 56" fill="none" stroke="rgba(232,228,220,0.18)" strokeWidth="1" strokeDasharray="2 3"/>
        <text x="55" y="13" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={stroke} textAnchor="middle" letterSpacing="1">−59 FT</text>
      </g>
    ),
    monza: ( // Banked oval ghost + flag straight
      <g>
        <ellipse cx="55" cy="42" rx="42" ry="14" fill="none" stroke="rgba(232,228,220,0.2)" strokeWidth="1" strokeDasharray="2 3"/>
        <path d="M 12 42 L 98 42" fill="none" stroke={stroke} strokeWidth="2.5"/>
        <path d="M 90 36 L 100 36 L 100 48 L 90 48 Z" fill="none" stroke={stroke} strokeWidth="1"/>
        <text x="55" y="14" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={stroke} textAnchor="middle" letterSpacing="1">360 KM/H</text>
      </g>
    ),
    spa: ( // Eau Rouge ramp profile
      <g>
        <path d="M 8 56 L 32 56 L 50 28 L 62 28 L 78 14 L 102 14" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
        <path d="M 32 56 L 32 60 M 78 14 L 78 60 M 8 60 L 102 60" stroke="rgba(232,228,220,0.18)" strokeWidth="0.5"/>
        <text x="55" y="50" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={stroke} letterSpacing="1">+41M</text>
      </g>
    ),
    monaco: ( // Hairpin tightening down
      <g>
        <path d="M 18 56 C 18 14, 92 14, 92 56" fill="none" stroke={stroke} strokeWidth="2"/>
        <path d="M 30 56 C 30 24, 80 24, 80 56" fill="none" stroke="rgba(232,228,220,0.4)" strokeWidth="1.4"/>
        <path d="M 42 56 C 42 38, 68 38, 68 56" fill="none" stroke="rgba(232,228,220,0.2)" strokeWidth="0.8"/>
        <text x="55" y="13" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={stroke} textAnchor="middle" letterSpacing="1">50 KM/H</text>
      </g>
    ),
    silverstone: ( // Maggotts-Becketts S-curves at speed
      <g>
        <path d="M 10 36 C 25 18, 40 54, 55 36 C 70 18, 85 54, 100 36" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
        <text x="55" y="58" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={stroke} textAnchor="middle" letterSpacing="1">FLAT-OUT ESSES</text>
      </g>
    ),
    suzuka: ( // Figure-8 crossover
      <g>
        <path d="M 30 22 C 8 22, 8 50, 30 50 L 80 50 C 102 50, 102 22, 80 22 Z" fill="none" stroke={stroke} strokeWidth="2"/>
        <path d="M 30 22 L 80 50 M 30 50 L 80 22" fill="none" stroke="rgba(232,228,220,0.28)" strokeWidth="1" strokeDasharray="2 2"/>
        <text x="55" y="13" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={stroke} textAnchor="middle" letterSpacing="1">FIGURE-8</text>
      </g>
    ),
    cota: ( // Steep T1 ramp
      <g>
        <path d="M 10 56 L 50 56 L 78 18" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M 78 18 L 90 26 L 100 38" fill="none" stroke={stroke} strokeWidth="2"/>
        <path d="M 50 56 L 50 60 M 78 18 L 78 60 M 10 60 L 100 60" stroke="rgba(232,228,220,0.18)" strokeWidth="0.5"/>
        <text x="58" y="40" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={stroke} letterSpacing="1">+41M</text>
      </g>
    ),
    long_beach: ( // Coastline + city blocks
      <g>
        <path d="M 6 50 Q 28 44, 50 50 T 102 50" fill="none" stroke={stroke} strokeWidth="1.5"/>
        <rect x="14" y="22" width="10" height="20" fill="none" stroke={stroke} strokeWidth="1"/>
        <rect x="30" y="14" width="10" height="28" fill="none" stroke={stroke} strokeWidth="1"/>
        <rect x="46" y="20" width="10" height="22" fill="none" stroke={stroke} strokeWidth="1"/>
        <rect x="62" y="10" width="10" height="32" fill="none" stroke={stroke} strokeWidth="1"/>
        <rect x="78" y="22" width="10" height="20" fill="none" stroke={stroke} strokeWidth="1"/>
        <text x="55" y="62" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={stroke} textAnchor="middle" letterSpacing="1">SHORELINE DR</text>
      </g>
    ),
    road_america: ( // Pine trees + long sweeper
      <g>
        <path d="M 6 50 C 30 50, 40 30, 60 30 S 92 50, 102 50" fill="none" stroke={stroke} strokeWidth="2"/>
        <g fill={stroke} opacity="0.55">
          <polygon points="14,20 18,12 22,20"/>
          <polygon points="14,28 18,18 22,28"/>
          <polygon points="92,18 96,10 100,18"/>
          <polygon points="92,26 96,16 100,26"/>
        </g>
        <text x="55" y="62" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={stroke} textAnchor="middle" letterSpacing="1">THE KINK · 280 KM/H</text>
      </g>
    ),
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="64" preserveAspectRatio="xMidYMid meet" style={{display:"block"}}>
      <rect width={W} height={H} fill="#06080B"/>
      <path d={`M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`} fill="none" stroke="rgba(91,183,226,0.18)" strokeWidth="0.5"/>
      {ico[trackId] || ico.laguna_seca}
    </svg>
  );
}

function TrackHistoryPanel({ track }) {
  const [tab, setTab] = useStateTH("about");
  const [collapsed, setCollapsed] = useStateTH(true);
  if (!track || !track.history) return null;
  const h = track.history;
  const accent = track.accent || "#5BB7E2";

  if (collapsed) {
    return (
      <button className="track-history-pill" onClick={() => setCollapsed(false)} style={{borderColor:`${accent}66`, color: accent}} aria-label="Open circuit dossier">
        <span className="th-pill-icon">▣</span>
        <span className="th-pill-label">CIRCUIT DOSSIER</span>
        <span className="th-pill-name">{track.short}</span>
      </button>
    );
  }

  return (
    <div className="panel track-history-panel" onClick={()=>setCollapsed(true)} style={{cursor:"pointer"}}>
      <div className="panel-head th-head" style={{borderColor: `${accent}40`}}>
        <div className="th-head-left">
          <FlagBadge country={track.country} accent={accent}/>
          <div>
            <div className="panel-eyebrow" style={{color: accent}}>CIRCUIT DOSSIER · EST. {h.opened}</div>
            <div className="panel-title">{track.short} <span style={{color:"var(--muted)", fontWeight:400, fontSize:11, letterSpacing:".14em"}}>· {track.location}</span></div>
          </div>
        </div>
        <div className="th-tabs">
          <button className={tab==="about"?"th-tab th-tab-on":"th-tab"} onClick={(e)=>{e.stopPropagation();setTab("about")}} style={tab==="about"?{borderColor:accent,color:accent}:null}>HISTORY</button>
          <button className={tab==="record"?"th-tab th-tab-on":"th-tab"} onClick={(e)=>{e.stopPropagation();setTab("record")}} style={tab==="record"?{borderColor:accent,color:accent}:null}>RECORDS</button>
        </div>
      </div>

      <div className="th-body">
        <div className="th-glyph" style={{borderColor:`${accent}30`}}>
          <TrackGlyph trackId={track.id} accent={accent}/>
          <div className="th-glyph-cap">
            <span className="kv-label">SIGNATURE</span>
            <span className="th-sig" style={{color:accent}}>{track.signature}</span>
          </div>
        </div>

        {tab === "about" && (
          <>
            <div className="th-quickstats">
              <div className="th-qs"><span className="kv-label">OPENED</span><b>{h.opened}</b></div>
              <div className="th-qs"><span className="kv-label">DIR</span><b>{track.direction || "CW"}</b></div>
              <div className="th-qs"><span className="kv-label">DRS</span><b>{track.drs_zones != null ? `${track.drs_zones} ZONE${track.drs_zones===1?"":"S"}` : "—"}</b></div>
              <div className="th-qs"><span className="kv-label">SURFACE</span><b>{track.surface || "ASPHALT"}</b></div>
            </div>
            <ul className="th-facts">
              {h.facts.map((f, i) => (
                <li key={i}><span className="th-bullet" style={{background:accent}}/>{f}</li>
              ))}
            </ul>
          </>
        )}

        {tab === "record" && (
          <>
            <div className="th-record">
              <div className="th-record-label">OUTRIGHT LAP RECORD</div>
              <div className="th-record-time" style={{color:accent}}>{h.lap_record.time}</div>
              <div className="th-record-meta">
                <span>{h.lap_record.driver}</span>
                <span>·</span>
                <span>{h.lap_record.year}</span>
                <span>·</span>
                <span>{h.lap_record.car}</span>
              </div>
            </div>
            <div className="th-firstwin">
              <span className="kv-label">FIRST RACE WINNER</span>
              <span className="th-firstwin-val">{h.first_winner}</span>
            </div>
            <div className="th-legends">
              <span className="kv-label">LEGENDARY MOMENTS</span>
              <div className="th-legend-list">
                {h.legends.map((m, i) => (
                  <span key={i} className="th-legend-chip" style={{borderColor:`${accent}55`}}>{m}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

window.TrackHistoryPanel = TrackHistoryPanel;
window.TrackGlyph = TrackGlyph;
window.FlagBadge = FlagBadge;
