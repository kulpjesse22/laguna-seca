// Decode-on-hover label: glyphs cycle and resolve left to right, width locked by an
// invisible copy so nothing reflows. Screen readers get the real text via aria-label.

const SCRAMBLE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/\\<>*+=-";
const SCRAMBLE_KEEP = new Set([" ", "·", "→", "←", "↗", "↘", "#", "+", ".", ":"]);
const scrambleReduced = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useScramble(text, { stagger = 26, lead = 60, tail = 80, tick = 33 } = {}) {
  const [shown, setShown] = React.useState(text);
  const raf = React.useRef(0);
  React.useEffect(() => setShown(text), [text]);
  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const start = React.useCallback(() => {
    if (scrambleReduced()) return;
    cancelAnimationFrame(raf.current);
    const chars = [...text];
    const settle = chars.map((_, i) => lead + stagger * i);
    const end = (settle[settle.length - 1] || 0) + tail;
    const t0 = performance.now();
    let last = -tick;
    const step = (now) => {
      const dt = now - t0;
      if (dt >= end) { setShown(text); return; }
      if (dt - last >= tick) {
        last = dt;
        setShown(chars.map((c, i) =>
          SCRAMBLE_KEEP.has(c) || dt >= settle[i]
            ? c
            : SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0]
        ).join(""));
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [text, stagger, lead, tail, tick]);

  const stop = React.useCallback(() => {
    cancelAnimationFrame(raf.current);
    setShown(text);
  }, [text]);

  return { shown, start, stop };
}

function ScrambleText({ text, as = "span", href, className = "", style, onClick, title, ...rest }) {
  const { shown, start, stop } = useScramble(String(text));
  const inner = (
    <span className="ls-scramble" aria-hidden="true">
      <span className="ls-scramble-ghost">{text}</span>
      <span className="ls-scramble-live">{shown}</span>
    </span>
  );
  const Tag = href ? "a" : as;
  return (
    <Tag
      href={href}
      className={"ls-scramble-host " + className}
      style={style}
      title={title}
      aria-label={String(text)}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      onClick={onClick}
      {...rest}
    >
      {inner}
    </Tag>
  );
}

window.useScramble = useScramble;
window.ScrambleText = ScrambleText;
