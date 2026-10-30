// Default layout: the race is the stage; three quiet regions around it (left, right, a bottom
// strip) each show one card at a time. Cards are part of the layout, not overlays. Numbers in
// cards come from a 1 Hz snapshot of the same race model the stage draws.
(function () {
  const { useState, useEffect, useRef, useMemo, useLayoutEffect } = React;
  const sur = (c) => (c && c.name ? c.name.split(" ").slice(-1)[0] : "");
  const RM = () => window.RaceModel;
  const IX = () => window.StageIX;
  const CARDS_KEY = "apex-cards";

  function readCards() {
    try { return JSON.parse(localStorage.getItem(CARDS_KEY)) || {}; } catch (e) { return {}; }
  }
  function useCardSel() {
    const [sel, setSel] = useState(readCards);
    const set = (region, id) => setSel((s) => {
      const n = { ...s, [region]: id };
      try { localStorage.setItem(CARDS_KEY, JSON.stringify(n)); } catch (e) {}
      return n;
    });
    return [sel, set];
  }

  const ExpandIcon = ({ open }) => (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
      {open ? <path d="M4.5 1v3.5H1M7.5 1v3.5H11M4.5 11V7.5H1M7.5 11V7.5H11"/> : <path d="M1 4.5V1h3.5M11 4.5V1H7.5M1 7.5V11h3.5M11 7.5V11H7.5"/>}
    </svg>
  );

  // Tab row with a sliding underline under the active tab.
  function Tabs({ cards, idx, pick }) {
    const wrap = useRef(null);
    const [ul, setUl] = useState(null);
    useLayoutEffect(() => {
      const w = wrap.current;
      if (!w) return;
      const measure = () => { const b = w.children[idx]; if (b) setUl({ x: b.offsetLeft, w: b.offsetWidth }); };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(w);
      return () => ro.disconnect();
    }, [idx, cards.length]);
    const Scr = IX().Scr;
    return (
      <div className="sl-tabrow" role="tablist" aria-label="Race detail" ref={wrap}>
        {cards.map((c, i) => (
          <button key={c.id} type="button" role="tab" tabIndex={-1} aria-selected={i === idx} className={i === idx ? "on" : ""}
            onClick={() => pick(i)}><Scr text={c.tab || c.title}/></button>
        ))}
        {ul && <span className="sl-ul" style={{ transform: `translateX(${ul.x}px)`, width: ul.w }} aria-hidden="true"/>}
      </div>
    );
  }

  // One card at a time; swipe, drag, trackpad, arrows, dots, tabs or ←/→ to move. The bottom
  // dock rests slim and rises into focus on hover, focus or tap; any region can be expanded.
  function Region({ id, label, cards, cur, onChange, className = "", tabs = false, dock = false, photo = null, expandable = false }) {
    const idx = Math.max(0, cards.findIndex((c) => c.id === cur));
    const card = cards[idx];
    const [dir, setDir] = useState(0);
    const [dx, setDx] = useState(0);
    const [up, setUp] = useState(false);
    const [open, setOpen] = useState(false);
    const drag = useRef(null), wheel = useRef({ acc: 0, at: 0 }), sec = useRef(null), downT = useRef(0);
    const raised = open || (dock && up);
    const go = (d) => {
      if (cards.length < 2) return;
      const n = (idx + d + cards.length) % cards.length;
      setDir(d); onChange(cards[n].id);
    };
    const pick = (i) => { if (i !== idx) { setDir(i > idx ? 1 : -1); onChange(cards[i].id); } };
    const raise = () => { clearTimeout(downT.current); setUp(true); };
    const settle = () => {
      clearTimeout(downT.current);
      downT.current = setTimeout(() => {
        const el = sec.current, a = document.activeElement;
        if (el && a && el.contains(a) && a.matches(":focus-visible")) return;
        setUp(false);
      }, 400);
    };
    useEffect(() => () => clearTimeout(downT.current), []);
    useEffect(() => {
      if (!raised) return;
      const away = (e) => {
        const el = sec.current;
        if (!el || el.contains(e.target) || (e.target.closest && e.target.closest(".dh"))) return;
        if (open) setOpen(false);
        if (e.pointerType !== "mouse") setUp(false);
      };
      document.addEventListener("pointerdown", away);
      return () => document.removeEventListener("pointerdown", away);
    }, [raised, open]);
    const onPointerDown = (e) => {
      if (dock && e.pointerType !== "mouse") raise();
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest("button, a, input, select")) return;
      drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    };
    const onPointerMove = (e) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const ddx = e.clientX - d.x, ddy = e.clientY - d.y;
      if (!d.moved && Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy) * 1.2) {
        d.moved = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (d.moved) setDx(ddx);
    };
    const onPointerUp = () => {
      const d = drag.current;
      drag.current = null;
      if (d && d.moved && Math.abs(dx) > 44) go(dx < 0 ? 1 : -1);
      setDx(0);
    };
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const w = wheel.current, now = performance.now();
      if (now - w.at < 420) return;
      w.acc += e.deltaX;
      if (Math.abs(w.acc) > 46) { go(w.acc > 0 ? 1 : -1); w.acc = 0; w.at = now; }
    };
    const onKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "Enter" && e.target === e.currentTarget && expandable) { e.preventDefault(); setOpen((v) => !v); }
      else if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); }
    };
    const Scr = IX().Scr;
    const head = (
      <header className="sl-head">
        <span className="sl-title" data-scr=""><Scr text={card.title}/></span>
        {tabs && <Tabs cards={cards} idx={idx} pick={pick}/>}
        <span className="sl-nav">
          {cards.length > 1 && <>
            <button type="button" className="sl-arrow" tabIndex={-1} aria-label="Previous card" data-tip="Previous · ←" onClick={() => go(-1)}>‹</button>
            {!tabs && <span className="sl-dots">
              {cards.map((c, i) => <button type="button" key={c.id} tabIndex={-1} className={i === idx ? "on" : ""} aria-label={c.title}
                aria-current={i === idx ? "true" : undefined} onClick={() => pick(i)}/>)}
            </span>}
            <button type="button" className="sl-arrow" tabIndex={-1} aria-label="Next card" data-tip="Next · →" onClick={() => go(1)}>›</button>
          </>}
          {expandable && <button type="button" className="sl-x" tabIndex={-1} aria-expanded={raised} aria-label={raised ? "Collapse" : "Expand"}
            data-tip={raised && open ? "Collapse · Esc" : "Expand · Enter"} onClick={() => { setOpen((v) => !v); if (open) setUp(false); }}><ExpandIcon open={open}/></button>}
        </span>
      </header>
    );
    const body = (
      <div className="sl-body" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onWheel={onWheel} style={dx ? { transform: `translateX(${dx * 0.35}px)`, opacity: 1 - Math.min(0.5, Math.abs(dx) / 420) } : undefined}>
        <div className={`sl-card ${dir > 0 ? "sl-from-r" : dir < 0 ? "sl-from-l" : ""}`} key={card.id}>{card.render({ raised })}</div>
      </div>
    );
    return (
      <section ref={sec} className={`sl-region sl-${id} ${className} ${dock ? "sl-dock" : ""} ${raised ? "up" : ""} ${open ? "sl-open" : ""}`}
        data-region={id} tabIndex={0} role="region" aria-roledescription="carousel"
        aria-label={`${label}: ${card.title}, card ${idx + 1} of ${cards.length}`}
        onKeyDown={onKeyDown}
        onPointerEnter={dock ? (e) => { if (e.pointerType === "mouse") raise(); } : undefined}
        onPointerLeave={dock ? (e) => { if (e.pointerType === "mouse" && !open) settle(); } : undefined}
        onFocus={dock ? raise : undefined}
        onBlur={dock ? (e) => { if (!e.currentTarget.contains(e.relatedTarget) && !open) settle(); } : undefined}>
        {dock ? <div className="sl-dock-in">
          {photo && <div className="sl-dock-ph" aria-hidden="true"><img src={`assets/film/${photo}-sm.webp`} alt="" width="640" height="360" loading="lazy" decoding="async"/></div>}
          {head}{body}
        </div> : <>{head}{body}</>}
        <span className="sl-kbd" aria-hidden="true">{cards.length > 1 ? "← → cards · " : ""}{expandable ? `Enter ${open ? "collapse" : "expand"} · ` : ""}[ ] panels</span>
      </section>
    );
  }

  // Card header still: a small, dimmed crop of a trailer photo with the card's lead line set on top.
  const Photo = ({ id, pos = "50% 50%", children }) => (
    <div className="sc-photo">
      <img src={`assets/film/${id}-sm.webp`} alt="" width="640" height="360" loading="lazy" decoding="async" style={{ objectPosition: pos }}/>
      {children && <div className="sc-photo-t">{children}</div>}
    </div>
  );
  const Row = ({ k, v, dim, className = "" }) => <div className={`sc-kv ${dim ? "dim" : ""} ${className}`}><span>{k}</span><b><Tk v={v}/></b></div>;
  const Tk = ({ v }) => { const T = IX().Tick; return <T v={v}/>; };
  const Name = ({ c, children, as: Tag = "span", className = "" }) => {
    const Scr = IX().Scr;
    return <Tag className={className} data-driver={c.no} data-scr=""><Scr text={children || sur(c)}/></Tag>;
  };

  // Fastest-lap flash: the car whose fastest lap landed in the last 2.4 s.
  const freshFastest = (S) => {
    const ev = [...S.model.events].reverse().find((e) => e.kind === "fastest" && e.t <= S.t);
    return ev && S.t - ev.t < 2.4 ? ev : null;
  };

  // ---------------------------------------------------------------- left
  function Leaderboard({ S }) {
    const mem = useRef({});
    const m = mem.current;
    S.cars.forEach((c) => {
      const p = m[c.no];
      if (!p || S.t < p.seen) m[c.no] = { pos: c.pos, at: -99, dir: 0, seen: S.t };
      else { if (p.pos !== c.pos) { p.dir = c.pos < p.pos ? 1 : -1; p.at = S.t; p.pos = c.pos; } p.seen = S.t; }
    });
    const fl = freshFastest(S), Scr = IX().Scr;
    return (
      <ol className="sc-lb">
        {S.cars.map((c) => {
          const tr = m[c.no], moved = tr && S.t - tr.at < 6;
          return (
            <li key={c.no}>
              <button type="button" data-driver={c.no} className={`${c.no === S.focusedNo ? "on" : ""} ${S.subject.includes(c.no) ? "bt" : ""}`} onClick={() => S.onFocus(c.no)}>
                <span className="p">{c.pos}</span>
                <span className={`n ${fl && fl.nos[0] === c.no ? "fl" : ""}`} key={fl && fl.nos[0] === c.no ? fl.t : "n"}>
                  <Scr text={sur(c)}/>{moved && <i className={`lb-tr ${tr.dir > 0 ? "up" : "dn"}`} key={tr.at} aria-label={tr.dir > 0 ? "gained a place" : "lost a place"}>{tr.dir > 0 ? "▲" : "▼"}</i>}
                </span>
                <span className="g"><Tk v={c.pos === 1 ? "Leader" : c._pit ? "Pit" : `+${c._intS.toFixed(1)}`}/></span>
                <span className="ty">{c.tire}</span>
              </button>
            </li>
          );
        })}
      </ol>
    );
  }

  function battlePair(S) {
    const subj = S.subject.map((no) => S.cars.find((c) => c.no === no)).filter(Boolean).sort((a, b) => a.pos - b.pos);
    if (subj.length === 2 && subj[1].pos === subj[0].pos + 1) return subj;
    let best = null;
    for (let i = 1; i < S.cars.length; i++) {
      const b = S.cars[i];
      if (!b._pit && !S.cars[i - 1]._pit && (!best || b._intS < best[1]._intS)) best = [S.cars[i - 1], b];
    }
    return best;
  }

  function Battle({ S }) {
    const pair = battlePair(S);
    const hist = useMemo(() => {
      if (!pair) return [];
      const out = [];
      for (let i = 7; i >= 0; i--) {
        const tt = Math.max(0.5, S.t - i * 4), st = RM().state(S.model, tt);
        const a = st.cars.find((c) => c.no === pair[0].no), b = st.cars.find((c) => c.no === pair[1].no);
        if (a && b) out.push(Math.abs(b._gapS - a._gapS));
      }
      return out;
    }, [pair && pair[0].no, pair && pair[1].no, Math.floor(S.t / 4)]);
    if (!pair) return <p className="sc-quiet">No battle within a second.</p>;
    const [a, b] = pair, gap = b._intS, prev = hist.length > 1 ? hist[hist.length - 2] : gap;
    const trend = gap < prev - 0.05 ? "closing" : gap > prev + 0.05 ? "easing" : "holding";
    const W = 100, H = 26, mx = Math.max(1.5, ...hist);
    const d = hist.map((g, i) => `${i ? "L" : "M"}${(i / Math.max(1, hist.length - 1)) * W} ${H - (g / mx) * H}`).join(" ");
    return (
      <div className="sc-battle">
        {[a, b].map((c) => (
          <div className="sb-who" key={c.no}>
            <span className="p">P{c.pos}</span><Name c={c} as="b"/><span className="ty">{c.tire} · {c.tire_age}L</span>
          </div>
        ))}
        <div className="sb-gap"><b><Tk v={gap.toFixed(1)}/></b><i>s · {trend}</i>
          {trend !== "holding" && <span className={`sb-tr ${trend}`} key={trend} aria-hidden="true">{trend === "closing" ? "▼" : "▲"}</span>}
          {b._drs && <span className="sb-drs">DRS</span>}</div>
        <svg className="sb-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true"><path d={d}/></svg>
        <span className="sc-foot">Gap, last 30 s</span>
      </div>
    );
  }

  function Fastest({ S }) {
    const list = [...S.cars].filter((c) => c.best_lap).sort((x, y) => (x.best_lap < y.best_lap ? -1 : 1)).slice(0, 6);
    const ev = [...S.model.events].reverse().find((e) => e.kind === "fastest" && e.t <= S.t);
    const fl = freshFastest(S);
    return (
      <div className="sc-fast">
        <ol>
          {list.map((c, i) => <li key={c.no} className={`${i === 0 ? "top" : ""} ${fl && fl.nos[0] === c.no ? "fl" : ""}`}>
            <Name c={c} className="n"/><span className="g"><Tk v={c.best_lap}/></span></li>)}
        </ol>
        {ev && <span className="sc-foot">Last fastest lap · {ev.text.split(" · ").slice(1).join(" ")} · {fmtAgo(S.t - ev.t)}</span>}
      </div>
    );
  }
  const fmtAgo = (s) => (s < 60 ? `${Math.round(s)}s ago` : `${Math.floor(s / 60)}m ago`);

  // ---------------------------------------------------------------- right
  function Driver({ S }) {
    const c = S.focused;
    if (!c) return null;
    const fl = freshFastest(S);
    return (
      <div className="sc-driver">
        <Photo id="driver-visor" pos="50% 46%">
          <div className="sd-head"><span className="sd-no" style={{ "--team": window.inkOn(c.livery) }}>{String(c.no).padStart(2, "0")}</span>
            <div><Name c={c} as="b">{c.name}</Name><span>{c.team}</span></div></div>
        </Photo>
        <Row k="Position" v={`P${c.pos}`}/>
        <Row k="Gap" v={c.pos === 1 ? "Leader" : `+${c._gapS.toFixed(1)}s`}/>
        <Row k="Last lap" v={c.last_lap}/>
        <Row k="Best lap" v={c.best_lap} className={fl && fl.nos[0] === c.no ? "fl" : ""}/>
        <Row k="Tyre" v={`${c.tire} · ${c.tire_age} laps`}/>
        <div className="sd-sec">{c.sectors.map((s) => <span key={s.s} className={s.state}>{s.s} {s.t}</span>)}</div>
      </div>
    );
  }

  const STRATS = ["Iris Calder", "Tomás Brandt", "Wen Okafor", "Lotte Ruiz", "Dev Anand", "Mara Kessel", "Joon Park", "Ada Novak", "Ravi Solberg", "Noor Haddad", "Elio Marchetti", "Kit Laurent"];
  function Crew({ S }) {
    const c = S.focused;
    if (!c) return null;
    const radio = [...S.model.events].reverse().find((e) => e.kind === "radio" && e.no === c.no && e.t <= S.t);
    return (
      <div className="sc-crew">
        {c._pit ? <Photo id="pit-stop" pos="55% 55%"><b>Stop in progress</b></Photo>
          : <Photo id="pit-wall-engineer" pos="62% 38%"><b>{c.race_engineer || "Race engineer"}</b><span>On the pit wall</span></Photo>}
        <Row k="Crew chief" v={c.crew_chief || "—"}/>
        <Row k="Race engineer" v={c.race_engineer || "—"}/>
        <Row k="Strategist" v={STRATS[c.no % STRATS.length]}/>
        <div className="sc-radio">{radio ? <><span>Last radio · {fmtAgo(S.t - radio.t)}</span><q>{radio.text}</q></> : <span>Radio quiet</span>}</div>
      </div>
    );
  }

  function Telemetry({ S }) {
    const c = S.focused;
    const s = window.useCarSample(S.model, c, S.track, 1);
    if (!c || !s.tele) return null;
    const speed = Math.round(window.remapSpeed(s.cur.speed, S.carClass)), gear = window.gearFor(speed, S.carClass);
    const W = 100, H = 30;
    const d = s.tele.map((p, i) => `${i ? "L" : "M"}${(i / 99) * W} ${H - ((p.speed - 80) / 240) * H}`).join(" ");
    return (
      <div className="sc-tel">
        <div className="st-nums"><div><b>{speed}</b><i>kph</i></div><div><b>{gear}</b><i>gear</i></div></div>
        <svg className="st-trace" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={d}/><line x1={(s.idx / 99) * W} x2={(s.idx / 99) * W} y1="0" y2={H}/>
        </svg>
        <span className="sc-foot">Speed · this lap</span>
      </div>
    );
  }

  function pitPlan(S, c) {
    const T = RM().TYRES, mc = S.model.cars.find((q) => q.no === c.no);
    const stopped = mc && mc.stints.filter((q) => q.t <= S.t).length > 1;
    const cliff = T.CLIFF[c.tire] || 30;
    const open = Math.max(0, Math.round(cliff * 0.62 - c.tire_age)), close = Math.max(open + 2, Math.round(cliff * 0.92 - c.tire_age));
    return { stopped, cliff, open, close, next: T.NEXT_TYRE[c.tire] || c.tire, life: Math.max(0, 1 - c.tire_age / cliff) };
  }

  function NextPit({ S }) {
    const c = S.focused;
    if (!c) return null;
    const p = pitPlan(S, c), lap = S.lap;
    return (
      <div className="sc-pit">
        <Photo id="tyre-macro" pos="62% 45%"><b>{c.tire} · {c.tire_age} laps</b><span>{Math.round(p.life * 100)}% life left</span></Photo>
        {c._pit ? <p className="sc-hi">In the pit lane</p> : p.stopped
          ? <p className="sc-hi">Stop done · no further stop planned</p>
          : <Row k="Window" v={p.open === 0 ? `Open · until L${lap + p.close}` : `L${lap + p.open} – L${lap + p.close}`}/>}
        <Row k="Tyre plan" v={p.stopped ? `${c.tire} to the flag` : `${c.tire} → ${p.next}`}/>
        <div className="sp-life"><span style={{ width: `${Math.round(p.life * 100)}%` }}/></div>
        <span className="sc-foot">Tyre life · {c.tire_age} of ~{p.cliff} laps</span>
      </div>
    );
  }

  function TunnelCard({ S }) {
    const Scr = IX().Scr;
    return (
      <div className="sc-wt">
        <svg viewBox="-3.2 -1.6 6.4 2" aria-hidden="true">
          {[-1.25, -1.0, -0.72, -0.45, -0.2].map((y, i) => (
            <path key={i} d={`M-3.2 ${y} C -1.5 ${y - 0.06 * (5 - i)}, 0.4 ${y - 0.1 * (5 - i)}, 3.2 ${y + 0.04 * i}`} className="wt-line"/>
          ))}
          <window.F1Car.SVG view="side" livery={S.focused.livery} lod="mid" scale={1}/>
        </svg>
        <button type="button" className="sc-open" onClick={S.openTunnel}><Scr text="Open wind tunnel"/> <kbd>W</kbd></button>
      </div>
    );
  }

  // ---------------------------------------------------------------- bottom
  const TL_KINDS = { overtake: "Pass", cutback: "Pass", pit: "Pit", vsc: "VSC", yellow: "Yellow", green: "Green", fastest: "Fastest", off: "Off", spin: "Spin", lockup: "Lock-up", defend: "Held" };
  function Timeline({ S, x }) {
    const evs = S.model.events.filter((e) => e.t <= S.t && e.text && TL_KINDS[e.kind]);
    const span = Math.max(120, S.t), t0 = S.t - span;
    const last = evs.slice(x && x.raised ? -12 : -4).reverse();
    return (
      <div className="sc-tl">
        <div className="tl-axis">
          {evs.map((e, i) => <i key={i} className={`k-${e.kind}`} style={{ left: `${((e.t - t0) / span) * 100}%` }} title={e.text}/>)}
          <span className="tl-now"/>
        </div>
        <ul className="tl-list">
          {last.map((e, i) => <li key={e.t + ":" + i}><span>{fmtAgo(S.t - e.t)}</span>{e.text}</li>)}
          {!last.length && <li className="tl-empty"><span>—</span>Quiet so far. Passes, pit stops and flags land here.</li>}
        </ul>
      </div>
    );
  }

  function PitWindows({ S }) {
    return (
      <div className="sc-pw">
        {S.cars.map((c) => {
          const p = pitPlan(S, c);
          return (
            <div key={c.no} className={`pw ${c.no === S.focusedNo ? "on" : ""}`}>
              <span className="n" data-driver={c.no}>{sur(c).slice(0, 3)}</span>
              <span className="bar"><span style={{ width: `${Math.round((1 - p.life) * 100)}%` }}/>{!p.stopped && <i style={{ left: `${Math.min(100, (1 - p.life + p.open / p.cliff) * 100)}%` }}/>}</span>
              <span className="s">{c._pit ? "In" : p.stopped ? "Done" : p.open === 0 ? "Open" : `${p.open}L`}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const skyOf = (c) => (c.weather === "rain" ? "Rain · full wets" : c.tod === "night" ? "Clear · floodlit" : c.tod === "dusk" ? "Clear · low sun" : "Clear · dry");
  const condPhoto = (c) => (c.weather === "rain" || c.tod === "night" ? "night-barrier" : "corkscrew");
  function Conditions({ S, x }) {
    const c = S.cond, sky = skyOf(c);
    return (
      <div className={`sc-cond ${x && x.raised ? "raised" : ""}`}>
        <Photo id={condPhoto(c)} pos="55% 50%"><b>{sky}</b><span>{c.air}° air · {c.trackT}° track</span></Photo>
        <Row k="Session" v={`${c.tod[0].toUpperCase()}${c.tod.slice(1)}`}/>
        <Row k="Sky" v={sky}/>
        <Row k="Air · track" v={`${c.air}° · ${c.trackT}°C`}/>
        <Row k="Wind" v={`${c.wind} km/h`}/>
        <Row k="Grip" v={`${Math.round(c.grip * 100)}%`}/>
        {x && x.raised && <p className="sc-note">{c.weather === "rain" ? "Standing water at T2 and the Corkscrew exit; spray halves visibility behind a car." : `Track ${c.trackT - c.air}° above air. ${c.tod === "day" ? "Grip builds as the line rubbers in." : "Cooling track; front tyres slow to switch on."}`}</p>}
      </div>
    );
  }

  // Gap to the leader: a quiet ruler at rest, a bar per car when raised.
  function Gaps({ S, x }) {
    const run = S.cars.filter((c) => !c._pit || c.pos === 1);
    const mx = Math.max(4, ...S.cars.map((c) => Math.min(c._gapS, 60)));
    if (!(x && x.raised)) return (
      <div className="sc-gaps rest">
        <div className="gp-ruler">
          {S.cars.map((c) => <i key={c.no} data-driver={c.no} className={c.no === S.focusedNo ? "on" : ""}
            style={{ left: `${(Math.min(c._gapS, 60) / mx) * 100}%`, "--c": c.livery.primary }}/>)}
        </div>
        <div className="gp-scale"><span>Leader</span><span>+{(mx / 2).toFixed(0)}s</span><span>+{mx.toFixed(0)}s</span></div>
        <span className="sc-foot">{run.length} running · spread {S.cars[S.cars.length - 1]._gapS.toFixed(1)}s</span>
      </div>
    );
    return (
      <div className="sc-gaps">
        {S.cars.map((c) => (
          <div key={c.no} className={`gp ${c.no === S.focusedNo ? "on" : ""}`}>
            <span className="p">{c.pos}</span><Name c={c} className="n"/>
            <span className="bar"><span style={{ width: `${(Math.min(c._gapS, 60) / mx) * 100}%`, background: c.livery.primary }}/></span>
            <span className="g"><Tk v={c.pos === 1 ? "—" : `+${c._gapS.toFixed(1)}`}/></span>
            <span className="i">{c.pos === 1 ? "" : `${c._intS.toFixed(1)}`}</span>
          </div>
        ))}
      </div>
    );
  }

  const COMP = { S: "#B8574C", M: "#C4A04E", H: "#CFC8BB", I: "#6D9E6E", W: "#5A88B5" };
  function Stints({ S, x }) {
    const lapsTotal = S.model.lapsTotal, lapNow = S.lap;
    const rows = S.cars.map((c) => {
      const mc = S.model.cars.find((q) => q.no === c.no);
      const st = (mc ? mc.stints : []).filter((q) => q.t <= S.t);
      const segs = st.map((q, i) => ({ comp: q.comp, from: i ? q.lap : q.lap - q.age0, to: i < st.length - 1 ? st[i + 1].lap : c._lap }));
      return { c, segs };
    });
    const lap0 = Math.max(1, Math.min(...rows.flatMap((r) => r.segs.map((s) => s.from))));
    const X = (l) => `${((l - lap0) / Math.max(1, lapsTotal - lap0)) * 100}%`;
    return (
      <div className={`sc-st ${x && x.raised ? "raised" : ""}`}>
        {rows.map(({ c, segs }) => (
          <div key={c.no} className={`st ${c.no === S.focusedNo ? "on" : ""}`}>
            <span className="n" data-driver={c.no}>{sur(c).slice(0, x && x.raised ? 12 : 3)}</span>
            <span className="bar">
              {segs.map((s, i) => <i key={i} style={{ left: X(s.from), width: `calc(${X(Math.max(s.to, s.from + 0.4))} - ${X(s.from)})`, background: COMP[s.comp] || "#888" }}
                title={`${s.comp} · L${s.from}–L${s.to}`}/>)}
              <b style={{ left: X(lapNow) }}/>
            </span>
            {x && x.raised && <span className="s">{segs.map((s) => s.comp).join(" › ")}</span>}
          </div>
        ))}
        {x && x.raised && <div className="st-axis"><span>L{lap0}</span><span>L{lapNow}</span><span>L{lapsTotal}</span></div>}
      </div>
    );
  }

  function Session({ S }) {
    const Scr = IX().Scr;
    return (
      <div className="sc-sess">
        <label><span>Circuit</span>
          <select value={S.trackId} onChange={(e) => S.setTrackId(e.target.value)}>
            {window.TRACK_LIST.map((id) => <option key={id} value={id}>{window.TRACKS[id].short || window.TRACKS[id].name}</option>)}
          </select>
        </label>
        <label><span>Class</span>
          <select value={S.classId} onChange={(e) => S.setClassId(e.target.value)}>
            {window.CAR_CLASS_LIST.map((id) => <option key={id} value={id}>{window.CAR_CLASSES[id].name || window.CAR_CLASSES[id].short}</option>)}
          </select>
        </label>
        <button type="button" onClick={S.replayIntro}><Scr text="Replay trailer"/></button>
        <button type="button" onClick={S.toggleF1}><Scr text="Real F1 replay"/></button>
      </div>
    );
  }

  const CARDS = {
    left: [["lb", "Leaderboard", Leaderboard], ["battle", "Current battle", Battle], ["fast", "Fastest laps", Fastest]],
    right: [["driver", "Focused driver", Driver], ["crew", "Crew", Crew], ["tel", "Telemetry", Telemetry], ["pit", "Next pit stop", NextPit], ["wt", "Wind tunnel", TunnelCard]],
    bottom: [["tl", "Race timeline", Timeline], ["pw", "Pit windows", PitWindows], ["cond", "Weather", Conditions], ["gaps", "Gaps to leader", Gaps, "Gaps"],
      ["stints", "Tyre stints", Stints], ["sess", "Session", Session]],
  };
  const LABELS = { left: "Race", right: "Driver", bottom: "Race detail", all: "Race cards" };
  const cardsFor = (region, S) => {
    const CK = S.view === "cockpit" && window.CockpitCards;
    if (CK) {
      const list = region === "all" ? [...CK.left, ...CK.right, ...CK.bottom] : CK[region] || [];
      return list.map(([id, title, C, tab]) => ({ id, title, tab, render: (x) => <C S={S} x={x}/> }));
    }
    const list = region === "all" ? [...CARDS.bottom.slice(0, 1), ...CARDS.left, ...CARDS.right.filter(([id]) => id !== "wt"), ...CARDS.bottom.slice(1)] : CARDS[region];
    return list.map(([id, title, C, tab]) => ({ id, title, tab, render: (x) => <C S={S} x={x}/> }));
  };

  window.StageLayout = { Region, useCardSel, cardsFor, LABELS, CARDS, condPhoto };
})();
