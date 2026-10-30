// Cockpit-mode cards: what a driver actually has — mirrors, the engineer in their ear, the next
// corner, tyre and brake temperatures, energy, and the road ahead. All derived from the same
// race model snapshot (S) the stage uses, for the focused car.
(function () {
  const RM = () => window.RaceModel;
  const Tk = (p) => { const K = window.StageIX.Tick; return <K {...p}/>; };
  const Sc = (p) => { const K = window.StageIX.Scr; return <K {...p}/>; };
  const sur = (c) => (c && c.name ? c.name.split(" ").slice(-1)[0] : "");
  const kph = (v, S) => Math.round((v / S.model.k) * (((S.carClass && S.carClass.speedRange) || [80, 310])[1]));
  const mpu = (S, geom) => ((S.track.length_km || 3.6) * 1000) / geom.len;

  function ctx(S) {
    const c = S.focused, model = S.model, geom = window.trackGeom(S.track);
    const mc = model.cars.find((q) => q.no === c.no);
    const me = RM().sampleAt(model, mc, S.t);
    const P = RM().profile(S.track);
    const ahead = S.cars.find((q) => q.pos === c.pos - 1), behind = S.cars.find((q) => q.pos === c.pos + 1);
    const corners = geom.corners.map((k) => ({ ...k, ds: ((k.frac - me.frac) % 1 + 1) % 1 * geom.len * mpu(S, geom) }))
      .sort((a, b) => a.ds - b.ds);
    const pc = (k) => P.corners.reduce((b, q) => (Math.abs(q.frac - k.frac) < Math.abs(b.frac - k.frac) ? q : b), P.corners[0]);
    return { c, me, geom, P, ahead, behind, corners, pc, model, mc };
  }

  const Row = ({ k, v, tone }) => (
    <div className={`sc-kv ${tone ? "ck-" + tone : ""}`}><span>{k}</span><b><Tk v={v}/></b></div>
  );

  function Mirrors({ S }) {
    const X = ctx(S), b = X.behind, a = X.ahead;
    const gapB = b ? b._intS : null, gapA = a ? X.c._intS : null;
    const threat = gapB != null && gapB < 1;
    return (
      <div className="ck-card ck-mirrors">
        <div className={`ck-mir ${threat ? "hot" : ""}`}>
          <span className="ck-lbl">Behind</span>
          {b ? <><b data-driver={b.no} data-scr=""><Sc text={sur(b)}/></b><span className="ck-big"><Tk v={`+${gapB.toFixed(1)}`}/><i>s</i></span>
            <span className="ck-sub">{threat ? "Inside DRS range" : gapB < 2 ? "Closing in" : "Clear"}</span></> : <span className="ck-sub">Nobody behind</span>}
        </div>
        <div className="ck-mir">
          <span className="ck-lbl">Ahead</span>
          {a ? <><b data-driver={a.no} data-scr=""><Sc text={sur(a)}/></b><span className="ck-big"><Tk v={`−${gapA.toFixed(1)}`}/><i>s</i></span>
            <span className="ck-sub">{gapA < 1 ? "DRS available" : gapA < 2.5 ? "Within reach" : "Out of range"}</span></> : <span className="ck-sub">Leading the race</span>}
        </div>
      </div>
    );
  }

  function Engineer({ S, x }) {
    const X = ctx(S), c = X.c;
    const said = X.model.events.filter((e) => e.kind === "radio" && e.no === c.no && e.t <= S.t).slice(-3).reverse();
    const b = X.behind, a = X.ahead, next = X.corners[0];
    const auto = c._pit ? "Pit limiter on. Watch the line."
      : b && b._intS < 1 ? `${sur(b)} is in DRS. Defend into ${next ? next.label : "the next corner"}.`
      : a && c._intS < 1 ? `DRS enabled. Gap to ${sur(a)} ${c._intS.toFixed(1)}.`
      : c.tire_age > 20 ? "Tyres are going off. Manage the rears."
      : "Good pace. Target lap one-ten-three.";
    const lines = [{ text: auto, live: true }, ...said.map((e) => ({ text: e.text, t: e.t }))].slice(0, x && x.raised ? 4 : 2);
    return (
      <div className="ck-card ck-radio">
        {lines.map((l, i) => (
          <p key={i} className={i ? "old" : "now"}><span className="ck-lbl">{l.live ? "Engineer · now" : `Engineer · ${Math.round(S.t - l.t)}s ago`}</span>“{l.text}”</p>
        ))}
      </div>
    );
  }

  function NextCorner({ S }) {
    const X = ctx(S), k = X.corners[0], k2 = X.corners[1];
    if (!k) return null;
    const pc = X.pc(k), apex = kph(pc.vMin * S.model.k, S);
    const gear = window.gearFor ? window.gearFor(apex, S.carClass) : "—";
    const dist = Math.max(0, Math.round(k.ds));
    const board = dist > 300 ? null : dist > 200 ? 3 : dist > 100 ? 2 : 1;
    return (
      <div className="ck-card ck-next">
        <div className="ck-turn"><b>{k.label}</b>{k.name && <span>{k.name.toLowerCase()}</span>}</div>
        <div className="ck-dist"><Tk v={dist}/><i>m</i></div>
        <div className="ck-bar"><span style={{ width: `${Math.max(0, 100 - dist / 6)}%` }}/></div>
        <Row k="Brake" v={board ? `${board}00 board` : "flat out"} tone={board ? "warn" : null}/>
        <Row k="Apex" v={`${apex} km/h · G${gear}`}/>
        {k2 && <Row k="Then" v={`${k2.label}${k2.name ? " " + k2.name.toLowerCase() : ""}`}/>}
      </div>
    );
  }

  const heat = (v, lo, hi) => {
    const a = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    return a < 0.5 ? `rgb(${Math.round(90 + a * 2 * 110)},${Math.round(150 + a * 2 * 40)},${Math.round(200 - a * 2 * 110)})` : `rgb(${Math.round(200 + (a - 0.5) * 2 * 55)},${Math.round(190 - (a - 0.5) * 2 * 130)},${Math.round(90 - (a - 0.5) * 2 * 40)})`;
  };
  function Tyres({ S }) {
    const X = ctx(S), c = X.c, wet = S.cond.weather === "rain";
    const k = X.corners[0], braking = k && k.ds < 120;
    const base = (wet ? 72 : 92) + Math.min(14, c.tire_age * 0.5), load = Math.min(1, X.me.v / S.model.k);
    const side = k ? (X.pc(k).side || 1) : 1;
    const w = [
      ["FL", base + 6 * (side < 0 ? 1 : 0.4) + load * 4], ["FR", base + 6 * (side > 0 ? 1 : 0.4) + load * 4],
      ["RL", base + 3 + load * 3], ["RR", base + 3 + load * 3],
    ];
    const brake = braking ? 820 - k.ds * 2 : 420 + load * 120;
    return (
      <div className="ck-card ck-tyres">
        <div className="ck-car">
          {w.map(([n, v]) => (
            <div key={n} className={`ck-ty ck-${n}`} style={{ "--h": heat(v, 60, 120) }}>
              <span>{n}</span><b><Tk v={Math.round(v)}/>°</b>
            </div>
          ))}
          <div className="ck-body" aria-hidden="true"/>
        </div>
        <Row k="Compound" v={`${c.tire} · ${c.tire_age} laps`}/>
        <Row k="Brakes" v={`${Math.round(brake)}°C`} tone={brake > 700 ? "warn" : null}/>
      </div>
    );
  }

  function Energy({ S }) {
    const X = ctx(S), v = X.me.v, drs = !!(X.me.flags & RM().FLAGS.DRS);
    const k = X.corners[0];
    const harvesting = k && k.ds < 110;
    const ers = Math.round(35 + 45 * (0.5 + 0.5 * Math.sin(S.t / 9 + X.c.no)));
    return (
      <div className="ck-card ck-energy">
        <div className="ck-ers"><span className="ck-lbl">ERS</span><div className="ck-bar"><span style={{ width: `${ers}%` }}/></div><b>{ers}%</b></div>
        <Row k="Mode" v={harvesting ? "Harvest" : v > S.model.k * 0.75 ? "Deploy" : "Balanced"}/>
        <Row k="DRS" v={drs ? "Open" : "Closed"} tone={drs ? "ok" : null}/>
        <Row k="Fuel" v={`${(X.c.fuel || 38).toFixed(1)} kg`}/>
        <Row k="Speed" v={`${kph(v, S)} km/h`}/>
      </div>
    );
  }

  function Ahead({ S, x }) {
    const X = ctx(S), span = x && x.raised ? 2400 : 1400;
    const list = X.corners.filter((k) => k.ds < span);
    const a = X.ahead;
    const aDs = a ? (() => { const so = RM().sampleAt(X.model, X.model.cars.find((q) => q.no === a.no), S.t); return (((so.d - X.me.d) % 1 + 1) % 1) * X.geom.len * mpu(S, X.geom); })() : null;
    return (
      <div className="ck-card ck-ahead">
        <div className="ck-road">
          <span className="ck-you" style={{ left: 0 }}><i/>You</span>
          {list.map((k) => <span key={k.label} className={`ck-k ${k.important ? "big" : ""}`} style={{ left: `${(k.ds / span) * 100}%` }}>
            <i/>{k.label}{k.important && k.name ? <em>{k.name.toLowerCase()}</em> : null}<small>{Math.round(k.ds)} m</small></span>)}
          {a && aDs < span && <span className="ck-car-a" style={{ left: `${(aDs / span) * 100}%`, "--c": a.livery.primary }} data-driver={a.no}><i/>{sur(a)}</span>}
        </div>
      </div>
    );
  }

  function Sectors({ S }) {
    const c = S.focused, parts = [c.s1, c.s2, c.s3].map((v, i) => v || ["21.3", "27.8", "21.9"][i]);
    const tone = (i) => (i === (Math.floor(S.t / 23) + c.no) % 3 ? "pb" : i === 1 ? "slow" : "ok");
    return (
      <div className="ck-card ck-sectors">
        {parts.map((v, i) => <div key={i} className={`ck-sec ${tone(i)}`}><span>S{i + 1}</span><b>{v}</b></div>)}
        <div className="ck-sec"><span>Last</span><b>{c.last_lap}</b></div>
        <div className="ck-sec"><span>Best</span><b>{c.best_lap}</b></div>
      </div>
    );
  }

  const CARDS = {
    left: [["ck-mir", "Mirrors", Mirrors], ["ck-radio", "Race engineer", Engineer]],
    right: [["ck-next", "Next corner", NextCorner], ["ck-tyres", "Tyres & brakes", Tyres], ["ck-energy", "Energy", Energy]],
    bottom: [["ck-ahead", "Road ahead", Ahead], ["ck-sec", "Sectors", Sectors]],
  };
  window.CockpitCards = CARDS;
})();
