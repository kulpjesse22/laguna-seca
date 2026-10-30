// WEATHER EFFECTS — rain particles and wet track overlay for the track SVG
// Activated via the Tweaks panel weather setting.
(function() {

  function WeatherOverlay({ weather, viewBox }) {
    if (!weather || weather === "dry") return null;
    const VW = 1000, VH = 560;
    const isRain = weather === "rain";
    const dropCount = isRain ? 80 : 30;

    // Seeded pseudo-random positions so drops don't jump on re-render
    const drops = [];
    for (let i = 0; i < dropCount; i++) {
      const seed = (i * 7919 + 1301) % 10007;
      drops.push({
        x: (seed * 3) % VW,
        y: (seed * 7) % VH,
        len: isRain ? 6 + (i % 4) * 2 : 3 + (i % 3),
        speed: 0.8 + (i % 5) * 0.25,
        opacity: isRain ? 0.3 + (i % 3) * 0.1 : 0.15 + (i % 3) * 0.05,
        delay: (i % 7) * 0.15,
      });
    }

    return (
      <g className="weather-fx">
        {/* Wet track sheen — reflective highlight on the asphalt */}
        {(isRain || weather === "wet") && (
          <g>
            <path d="M0,0 H1000 V560 H0Z" fill="rgba(91,183,226,0.03)"/>
          </g>
        )}

        {/* Rain drops — animated falling lines */}
        {isRain && drops.map((d, i) => (
          <line
            key={i}
            x1={d.x} y1={d.y}
            x2={d.x + 1} y2={d.y + d.len}
            stroke="rgba(200,220,240,0.35)"
            strokeWidth="0.7"
            strokeLinecap="round"
            opacity={d.opacity}>
            <animate
              attributeName="y1"
              from={-d.len}
              to={VH}
              dur={`${d.speed}s`}
              begin={`${d.delay}s`}
              repeatCount="indefinite"/>
            <animate
              attributeName="y2"
              from={0}
              to={VH + d.len}
              dur={`${d.speed}s`}
              begin={`${d.delay}s`}
              repeatCount="indefinite"/>
          </line>
        ))}

        {/* Spray mist near the track surface — subtle fog layer at the bottom third */}
        {isRain && (
          <rect x="0" y={VH * 0.6} width={VW} height={VH * 0.4}
            fill="rgba(180,200,220,0.06)"/>
        )}
      </g>
    );
  }

  window.WeatherOverlay = WeatherOverlay;
})();
