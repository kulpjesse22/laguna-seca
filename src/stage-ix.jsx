// Quiet interaction pieces shared by the stage: decode-on-hover labels that follow their host
// control, numbers that tick when they change, and the driver hovercard.
(function () {
  const { useState, useEffect, useRef, useLayoutEffect } = React;
  const reduced = () => window.RaceClock && window.RaceClock.reduceMotion;

  // Decode label inside a button/link/title: the whole host triggers it, not just the glyphs.
  function Scr({ text }) {
    const { shown, start, stop } = window.useScramble(String(text));
    const ref = useRef(null);
    useEffect(() => {
      const el = ref.current;
      const host = el && (el.parentElement.closest("button, a, [data-scr]") || el);
      if (!host) return;
      host.classList.add("scr");
      const touch = (e) => { if (e.pointerType !== "mouse") start(); };
      host.addEventListener("mouseenter", start);
      host.addEventListener("mouseleave", stop);
      host.addEventListener("focus", start);
      host.addEventListener("blur", stop);
      host.addEventListener("pointerdown", touch);
      return () => {
        host.removeEventListener("mouseenter", start);
        host.removeEventListener("mouseleave", stop);
        host.removeEventListener("focus", start);
        host.removeEventListener("blur", stop);
        host.removeEventListener("pointerdown", touch);
      };
    }, [start, stop]);
    return (
      <span className="ls-scramble" ref={ref}>
        <span className="sr-only">{text}</span>
        <span className="ls-scramble-ghost" aria-hidden="true">{text}</span>
        <span className="ls-scramble-live" aria-hidden="true">{shown}</span>
      </span>
    );
  }

  // A value that rolls in quietly when it changes (not on first paint).
  function Tick({ v, className = "" }) {
    const r = useRef({ v, n: 0 });
    if (r.current.v !== v) { r.current.v = v; r.current.n++; }
    return <span className={`tk ${r.current.n && !reduced() ? "tk-on" : ""} ${className}`} key={r.current.n}>{v}</span>;
  }

  const lumOf = (hex) => {
    const h = String(hex || "#888").replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  };
  function Avatar({ car, size = 44 }) {
    const pri = car.livery.primary;
    return (
      <span className="dh-av" style={{ "--team": pri, width: size, height: size }}>
        <img src="assets/film/driver-visor-sm.webp" alt="" width="640" height="360" decoding="async"/>
        <i style={{ background: pri, color: lumOf(pri) < 130 ? "#F4EEE4" : "#111" }}>{car.no}</i>
      </span>
    );
  }

  // Hover (mouse, 150 ms), keyboard focus or tap on any [data-driver] element.
  function DriverHover({ cars }) {
    const [st, setSt] = useState(null);
    const cur = useRef(null), showT = useRef(0), hideT = useRef(0);
    useEffect(() => {
      const rectOf = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
      const find = (e) => e.target && e.target.closest && e.target.closest("[data-driver]");
      const show = (el, touch) => setSt({ no: +el.dataset.driver, r: rectOf(el), touch });
      const over = (e) => {
        if (e.pointerType !== "mouse") return;
        const el = find(e);
        if (!el) return;
        clearTimeout(hideT.current);
        if (cur.current === el) return;
        cur.current = el;
        clearTimeout(showT.current);
        showT.current = setTimeout(() => el.isConnected && show(el, false), 150);
      };
      const out = (e) => {
        if (e.pointerType !== "mouse" || !cur.current) return;
        if (e.relatedTarget && cur.current.contains(e.relatedTarget)) return;
        cur.current = null;
        clearTimeout(showT.current);
        hideT.current = setTimeout(() => setSt(null), 90);
      };
      const up = (e) => {
        if (e.pointerType === "mouse") return;
        const el = find(e);
        if (!el) { setSt(null); return; }
        const no = +el.dataset.driver;
        setSt((s) => (s && s.no === no ? null : { no, r: rectOf(el), touch: true }));
      };
      const fin = (e) => {
        const el = find(e);
        if (el && el.matches(":focus-visible")) { clearTimeout(showT.current); showT.current = setTimeout(() => el.isConnected && show(el, false), 150); }
      };
      const fout = () => { clearTimeout(showT.current); setSt((s) => (s && s.touch ? s : null)); };
      const key = (e) => { if (e.key === "Escape") setSt(null); };
      document.addEventListener("pointerover", over);
      document.addEventListener("pointerout", out);
      document.addEventListener("pointerup", up);
      document.addEventListener("focusin", fin);
      document.addEventListener("focusout", fout);
      document.addEventListener("keydown", key);
      return () => {
        clearTimeout(showT.current); clearTimeout(hideT.current);
        document.removeEventListener("pointerover", over);
        document.removeEventListener("pointerout", out);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("focusin", fin);
        document.removeEventListener("focusout", fout);
        document.removeEventListener("keydown", key);
      };
    }, []);
    const ref = useRef(null);
    const [pos, setPos] = useState(null);
    useLayoutEffect(() => {
      if (!st || !ref.current) { setPos(null); return; }
      const cw = ref.current.offsetWidth, ch = ref.current.offsetHeight, { r } = st;
      const vw = window.innerWidth, vh = window.innerHeight;
      let x = r.x + r.w + 10, y = r.y + r.h / 2 - ch / 2;
      if (x + cw > vw - 8) x = r.x - cw - 10;
      if (x < 8) { x = Math.min(vw - cw - 8, Math.max(8, r.x + r.w / 2 - cw / 2)); y = r.y + r.h + 8; if (y + ch > vh - 8) y = r.y - ch - 8; }
      setPos({ x: Math.round(x), y: Math.round(Math.max(8, Math.min(vh - ch - 8, y))) });
    }, [st]);
    const c = st && cars.find((q) => q.no === st.no);
    if (!c) return null;
    const gap = c.pos === 1 ? "Leader" : c._pit ? "In pit" : `+${c._gapS.toFixed(1)}s`;
    return (
      <div className={`dh ${pos ? "dh-on" : ""}`} ref={ref} role="tooltip" style={pos ? { left: pos.x, top: pos.y } : { left: -9999, top: 0 }}>
        <div className="dh-top">
          <Avatar car={c}/>
          <div className="dh-who"><b>{c.name}</b><span>{c.team}</span></div>
        </div>
        <dl className="dh-kv">
          <div><dt>Pos</dt><dd>P{c.pos}</dd></div>
          <div><dt>Gap</dt><dd>{gap}</dd></div>
          <div><dt>Tyres</dt><dd>{c.tire} · {c.tire_age}L</dd></div>
          <div><dt>Last lap</dt><dd>{c.last_lap}</dd></div>
        </dl>
      </div>
    );
  }

  window.StageIX = { Scr, Tick, Avatar, DriverHover };
})();
