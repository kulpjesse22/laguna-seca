// Main App — composes Track + side panels + tweaks
const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR } = React;

const QS = new URLSearchParams(location.search);
const EMBED = QS.get("embed") === "1" || (QS.get("embed") !== "0" && (() => {
  try { return window.top !== window.self; } catch (e) { return true; }
})());
const EDIT = QS.get("edit") === "1";
const REDUCE = window.RaceClock.reduceMotion;
if (EMBED) document.documentElement.classList.add("is-embed");
const LAYOUT_KEY = "apex-layout";
const readPitwall = () => {
  if (QS.get("layout")) return QS.get("layout") === "pitwall";
  try { return localStorage.getItem(LAYOUT_KEY) === "pitwall"; } catch (e) { return false; }
};

const INTRO_KEY = "apex-intro", HINT_KEY = "apex-hint";
const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return "1"; } };
const ssSet = (k) => { try { sessionStorage.setItem(k, "1"); } catch (e) {} };
const INTRO_AT = QS.get("introAt") != null ? Math.max(0, +QS.get("introAt") || 0) : null;
const introWanted = () => QS.get("f1") !== "1" && QS.get("intro") !== "0" &&
  (QS.get("intro") === "1" || INTRO_AT != null || !ssGet(INTRO_KEY));
const sur = (c) => c.name.split(" ").slice(-1)[0];

const useNarrow = () => {
  const q = "(max-width: 700px)";
  const [n, setN] = useS(() => window.matchMedia(q).matches);
  useE(() => {
    const m = window.matchMedia(q), on = () => setN(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return n;
};

const REGION_ORDER = { desk: ["left", "right", "bottom"], mobile: ["left", "right", "bottom"], embed: ["all"] };

// The race on the lower-third: the newest director event, otherwise the battle the camera follows.
function CineCaption({ cars, race, model }) {
  const recent = window.RaceModel.recent(model, race.t, 4.5);
  const cap = [...recent].reverse().find((e) => e.text && e.kind !== "radio");
  const byNo = (no) => cars.find((c) => c.no === no);
  const subject = (window.CineDirector.now.subject || []).map(byNo).filter(Boolean).sort((x, y) => x.pos - y.pos);
  const [a, b] = subject.length ? subject : [...cars].sort((x, y) => x.pos - y.pos);
  const gap = a && b ? (b.pos === a.pos + 1 ? b._intS : b._gapS - a._gapS) : null;
  const key = a && b ? [a.no, b.no].sort((x, y) => x - y).join("-") : "";
  const [capKind, ...capRest] = cap ? cap.text.split(" · ") : [];
  return (
    <div className="cine-lower">
      {cap ? (
        <span className="cl-event" key={cap.t}><span className="cl-kind">{capKind}</span>{capRest.join(" · ")}</span>
      ) : a && (
        <span className="cl-battle" key={key}>
          <span className="cl-p">P{a.pos}</span><b>{sur(a)}</b>
          {b && <><span className="cl-p">P{b.pos}</span><b>{sur(b)}</b><span className="cl-gap">+{gap.toFixed(1)}s</span>
            {b._drs && <span className="cl-drs">DRS</span>}</>}
        </span>
      )}
      <span className="sr-only" aria-live="polite">{cap ? cap.text : ""}</span>
    </div>
  );
}

function StageTunnel({ car, carClass, model, track, onClose }) {
  const { cur } = window.useCarSample(model, car, track, 1);
  const ref = useR(null);
  useE(() => { const b = ref.current && ref.current.querySelector(".stt-close"); if (b) b.focus({ preventScroll: true }); }, []);
  return (
    <div className="stage-tunnel" ref={ref} role="region" aria-label={`Wind tunnel, car ${car.no}`}>
      <div className="stt-head">
        <span className="stt-title">Wind tunnel · #{car.no} {car.team}</span>
        <button type="button" className="stt-close" onClick={onClose}>Back to race <kbd>Esc</kbd></button>
      </div>
      <window.AeroSimulator car={car} carClass={carClass} speed={Math.round(window.remapSpeed(cur.speed, carClass))} initialView="side" initialDrs={false}/>
    </div>
  );
}

// Default layout: the race is the stage; quiet card regions sit around it as part of the layout.
function CineView({ mode, track, cars, race, model, carClass, focused, onFocus, S, sel, setSel, mobileRegion, setMobileRegion, tunnel, closeTunnel, togglePitwall, hint,
  follow, onFollow, airflow, onAirflow, onTunnel, view, setView }) {
  const cockpit = view === "cockpit" && !tunnel;
  const SL = window.StageLayout;
  const cond = window.RaceModel.COND;
  const lap = race.flag === "checkered" ? "Finish" : `Lap ${race.lap}/${race.lapsTotal}`;
  const radio = [...window.RaceModel.recent(model, race.t, 4.5)].reverse().find((e) => e.kind === "radio");
  const flagChip = race.flag === "vsc" ? "VSC" : race.flag === "yellow" ? `Yellow · S${race.yellowSector}` : null;
  const region = (id, extra) => {
    const cards = SL.cardsFor(id, S);
    const cur = sel[id] && cards.some((c) => c.id === sel[id]) ? sel[id] : cards[0].id;
    const dock = mode === "desk" && id === "bottom";
    return <SL.Region key={id} id={id} label={SL.LABELS[id]} cards={cards} cur={cur} onChange={(c) => setSel(id, c)} className={extra}
      tabs={dock} dock={dock} photo={dock ? SL.condPhoto(cond) : null} expandable={mode === "desk"}/>;
  };
  const insRef = useR({ at: -99, ev: null });
  const ins = insRef.current;
  if (race.t < ins.at - 1) Object.assign(ins, { at: -99, ev: null });
  if (!tunnel && !REDUCE && race.t - ins.at >= 30) {
    const ev = [...window.RaceModel.recent(model, race.t, 0.8)].reverse().find((e) => (e.kind === "pit" || e.kind === "lockup") && e.text);
    if (ev && ev !== ins.ev) Object.assign(ins, { ev, at: race.t });
  }
  const insert = ins.ev && race.t - ins.at < 1.2 ? ins : null;
  const sm = mode === "desk" ? "" : "-sm";
  useE(() => {
    if (REDUCE) return;
    const id = setTimeout(() => ["pit-stop", "tyre-macro"].forEach((n) => { new Image().src = `assets/film/${n}${sm}.webp`; }), 4000);
    return () => clearTimeout(id);
  }, []);
  const condLabel = cond.weather === "rain" ? `Rain · ${cond.tod}` : cond.tod === "day" ? "Dry" : `Dry · ${cond.tod}`;
  return (
    <div className={`cine stage stage-${mode} ${tunnel ? "stage-tunnel-on" : ""} ${cockpit ? "stage-cockpit" : ""}`}>
      <header className="stage-top">
        <span className="stage-top-l">
          {!EMBED && <a className="stage-back" href="https://os.kulpritt.com/"><window.StageIX.Scr text="← Kulpritt OS"/></a>}
          <span className="cine-tag"><span data-scr=""><window.StageIX.Scr text={`Simulated race · ${track.short || track.name}`}/></span>{flagChip && <span className={`cine-flag cine-flag-${race.flag}`}>{flagChip}</span>}</span>
        </span>
        <span className="stage-top-r">
          <span className="stage-cond">{condLabel}</span>
          <span className="cine-lap">{lap}</span>
          <span className="stage-views" role="group" aria-label="Camera">
            <button type="button" className={view !== "cockpit" ? "on" : ""} aria-pressed={view !== "cockpit"} onClick={() => setView("broadcast")} data-tip="Race cameras · C"><window.StageIX.Scr text="Broadcast"/></button>
            <button type="button" className={view === "cockpit" ? "on" : ""} aria-pressed={view === "cockpit"} onClick={() => setView("cockpit")} data-tip="Driver's eye · C"><window.StageIX.Scr text="Cockpit"/></button>
          </span>
          {mode !== "embed" && <button type="button" className="stage-pw" onClick={togglePitwall} data-tip="Every panel at once · P"><window.StageIX.Scr text="Pit wall"/></button>}
          {EMBED && <a className="stage-open" href="https://laguna-seca.app/" target="_blank" rel="noopener noreferrer" title="Open the full app in a new tab">↗</a>}
        </span>
      </header>
      <main className="stage-center">
        <div className={`cine-band ${tunnel ? "pip" : ""}`}>
          {cockpit ? <window.Cockpit model={model} track={track} cars={cars} no={focused ? focused.no : cars[0].no} carClass={carClass} cond={cond}/> :
          <Track track={track} cars={cars} focusedNo={focused && focused.no} onFocus={onFocus} onZoom={() => setSel("right", "driver")}
            lap={race.lap} lapsTotal={race.lapsTotal} flag={race.flag} timeOfDay="day" weather="dry" cond={cond}
            showSectors={false} showTurns={false} carClass={carClass} model={model} cine
            follow={tunnel ? null : follow} onFollow={onFollow} airflow={airflow} onAirflow={onAirflow} onTunnel={onTunnel} loupe={mode === "desk" && !tunnel}/>}
          {!cockpit && insert && <div className="cine-insert" key={insert.at} aria-hidden="true">
            <img src={`assets/film/${insert.ev.kind === "pit" ? "pit-stop" : "tyre-macro"}${sm}.webp`} alt=""/>
            <span>{insert.ev.text}</span>
          </div>}
          {cockpit && focused && (() => {
            const order = [...cars].sort((x, y) => x.pos - y.pos), i = order.findIndex((c) => c.no === focused.no);
            const step = (d) => onFocus(order[(i + d + order.length) % order.length].no);
            return <div className="ck-onboard">
              <button type="button" onClick={() => step(-1)} aria-label="Car ahead" data-tip="Car ahead">‹</button>
              <span className="ck-ob-t"><span className="ck-ob-l">Onboard</span><span className="cf-dot" style={{ background: focused.livery.primary }}/>
                <b data-driver={focused.no}>P{focused.pos} {focused.name}</b></span>
              <button type="button" onClick={() => step(1)} aria-label="Car behind" data-tip="Car behind">›</button>
            </div>;
          })()}
          <div className="cine-grade" aria-hidden="true"/>
          <div className="cine-grain" aria-hidden="true"/>
          {!tunnel && !cockpit && radio && <div className="cine-radio" key={radio.t}><span className="cr-who">Radio · {radio.who}</span><q>{radio.text}</q></div>}
          {!tunnel && !cockpit && !insert && <CineCaption cars={cars} race={race} model={model}/>}
          {tunnel && <button type="button" className="pip-back" onClick={closeTunnel} aria-label="Back to the race"/>}
        </div>
        {tunnel && focused && <StageTunnel car={focused} carClass={carClass} model={model} track={track} onClose={closeTunnel}/>}
        {hint && <div className="cine-hint" aria-hidden="true">{hint}</div>}
      </main>
      {mode === "desk" && <>{region("left", "sl-side")}{region("right", "sl-side")}{region("bottom", "sl-strip")}</>}
      {mode === "mobile" && <div className="stage-mob">
        <div className="sl-tabs" role="tablist" aria-label="Card groups">
          {REGION_ORDER.mobile.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={mobileRegion === id} className={mobileRegion === id ? "on" : ""}
              onClick={() => setMobileRegion(id)}>{SL.LABELS[id]}</button>
          ))}
        </div>
        {region(mobileRegion, "sl-mob")}
      </div>}
      {mode === "embed" && region("all", "sl-strip sl-embed")}
      <window.StageIX.DriverHover cars={cars}/>
    </div>
  );
}

function App() {
  const D = window.APEX_DATA;
  const [focusedNo, setFocusedNo] = useS(7);
  const [trackId, setTrackId] = useS("laguna_seca");
  const [classId, setClassId] = useS("open_wheel");
  const track = window.TRACKS[trackId];
  const trackEvent = window.TRACK_EVENTS[trackId];
  const carClass = window.CAR_CLASSES[classId];
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks({ timeOfDay: "day", showSectors: true, showTurns: true, weather: "dry" }) : [{ timeOfDay:"day", showSectors:true, showTurns:true, weather:"dry" }, ()=>{}];
  const [tab, setTab] = useS(["telem", "car", "team"].includes(QS.get("tab")) ? QS.get("tab") : "telem");
  const [lightboxOpen, setLightboxOpen] = useS(false);
  const [tunnelOpen, setTunnelOpen] = useS(QS.get("tunnel") === "1" && QS.get("f1") !== "1");
  const tunnelOpener = useR(null);
  const openTunnel = () => { tunnelOpener.current = document.activeElement; setLightboxOpen(false); setTunnelOpen(true); };
  const closeTunnel = () => {
    setTunnelOpen(false);
    const el = tunnelOpener.current;
    if (el && el.isConnected && el.focus) setTimeout(() => el.focus(), 0);
  };
  const [broadcast, setBroadcast] = useS(QS.get("broadcast") === "1");
  const [f1Mode, setF1Mode] = useS(QS.get("f1") === "1");
  const [mobilePane, setMobilePane] = useS("center");
  const [pitwall, setPitwall] = useS(readPitwall);
  const cine = !pitwall && !f1Mode;
  const togglePitwall = () => setPitwall(v => {
    try { localStorage.setItem(LAYOUT_KEY, v ? "cinema" : "pitwall"); } catch (e) {}
    return !v;
  });
  const [intro, setIntro] = useS(introWanted);
  const [live, setLive] = useS(() => !introWanted());
  const [hint, setHint] = useS(null);
  const [sel, setSel] = window.StageLayout.useCardSel();
  const narrow = useNarrow();
  const stageMode = EMBED ? "embed" : narrow ? "mobile" : "desk";
  const [mobileRegion, setMobileRegion] = useS("left");
  const [follow, setFollow] = useS(null);
  const [view, setViewS] = useS(() => { if (QS.get("view")) return QS.get("view") === "cockpit" ? "cockpit" : "broadcast"; try { return localStorage.getItem("apex-view") === "cockpit" ? "cockpit" : "broadcast"; } catch (e) { return "broadcast"; } });
  const setView = (v) => { setViewS(v); setFollow(null); setAirflow(false); try { localStorage.setItem("apex-view", v); } catch (e) {} };
  const [airflow, setAirflow] = useS(false);

  const model = useM(() => window.RaceModel.build(window.applyClassToCars(D.CARS, classId), carClass, track.laps, track), [classId, trackId]);
  useE(() => { window.RaceClock.reset(); window.RaceClock.loopAt = model.finishT + 30; }, [model]);
  const t = window.useRaceTime(REDUCE && !cine ? 1 : 4);
  const race = useM(() => window.RaceModel.state(model, t), [model, t]);
  const t1 = Math.floor(t);
  const race1 = useM(() => window.RaceModel.state(model, t1), [model, t1]);

  // The newest broadcast caption, straight from the race simulation.
  const event = useM(() => {
    const list = window.RaceModel.recent(model, race.t, 12).filter((e) => e.text && e.kind !== "radio");
    const e = list[list.length - 1];
    return e ? { text: e.text, at: e.t, kind: e.kind } : null;
  }, [model, race.t]);

  const f1 = window.useF1Replay(f1Mode);
  const f1Cars = f1.data ? f1.data.cars : [];
  const cars = f1Mode ? f1Cars : race.cars;
  const focused = cars.find(c => c.no === focusedNo) || cars[0];
  const accent = focused ? window.inkOn(focused.livery) : "#E8E4DC";

  // Shortcut hint: once per session, a few seconds after the race appears.
  useE(() => {
    if (!cine || !live || intro || ssGet(HINT_KEY)) return;
    ssSet(HINT_KEY);
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    setHint(coarse || EMBED ? "Swipe the cards for timing, driver and more" : "← → cards · [ ] switch panel · W wind tunnel · P pit wall");
    const id = setTimeout(() => setHint(null), 5000);
    return () => clearTimeout(id);
  }, [cine, live, intro]);
  useE(() => {
    if (cars.length && !cars.find(c => c.no === focusedNo)) setFocusedNo(cars[0].no);
  }, [f1Mode, cars.length]);

  const toggleF1 = () => { setF1Mode(v => !v); setBroadcast(false); setLightboxOpen(false); setTunnelOpen(false); };

  const regions = REGION_ORDER[stageMode];
  const focusRegion = (id, card) => {
    if (card) setSel(id, card);
    if (stageMode === "mobile") setMobileRegion(id);
    const go = () => { const el = document.querySelector(`.stage [data-region="${stageMode === "embed" ? "all" : id}"]`); if (el) el.focus({ preventScroll: true }); };
    setTimeout(go, 0);
  };
  const activeRegion = () => {
    const el = document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-region]");
    return el ? el.dataset.region : stageMode === "mobile" ? mobileRegion : null;
  };
  const stageKey = (e, k) => {
    if (e.key === "[" || e.key === "]") {
      const cur = regions.indexOf(activeRegion());
      const n = cur < 0 ? (e.key === "]" ? 0 : regions.length - 1) : (cur + (e.key === "]" ? 1 : -1) + regions.length) % regions.length;
      focusRegion(regions[n]);
      return true;
    }
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !document.activeElement.closest("[data-region]")) {
      e.preventDefault();
      const id = activeRegion() || regions[0], cards = window.StageLayout.cardsFor(id, S);
      const i = Math.max(0, cards.findIndex(c => c.id === sel[id]));
      focusRegion(id, cards[(i + (e.key === "ArrowRight" ? 1 : -1) + cards.length) % cards.length].id);
      return true;
    }
    const jump = { t: ["left", "lb"], d: ["right", "driver"], r: ["bottom", "tl"] }[k];
    if (jump) { focusRegion(stageMode === "embed" ? "all" : jump[0], jump[1]); return true; }
    return false;
  };
  const followCar = (no) => {
    setFollow(no);
    if (no != null) { setFocusedNo(no); setSel("right", "driver"); } else setAirflow(false);
  };
  const keyRef = useR(null);
  keyRef.current = (e) => {
    if (intro) return;
    if (e.key === "Escape") {
      if (tunnelOpen) closeTunnel();
      else if (follow != null) followCar(null);
      else if (lightboxOpen) setLightboxOpen(false);
      else setBroadcast(false);
      return;
    }
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")) return;
    if (e.metaKey || e.ctrlKey || e.altKey || lightboxOpen || (tunnelOpen && !cine)) return;
    const k = e.key.toLowerCase();
    if (cine && k === "a" && follow != null && !tunnelOpen) { setAirflow(v => !v); return; }
    if (cine && k === "c" && !tunnelOpen && !f1Mode) { setView(view === "cockpit" ? "broadcast" : "cockpit"); return; }
    if (cine && (stageKey(e, k) || tunnelOpen)) return;
    if (k === "w" && !f1Mode) openTunnel();
    else if (k === "p" && !f1Mode) togglePitwall();
    else if (!cine && k === "b" && !f1Mode) setBroadcast(v => !v);
  };
  useE(() => {
    const onKey = (e) => keyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actions = (
    <>
      {!f1Mode && <button
        className={`broadcast-toggle ${broadcast ? "on" : ""}`}
        onClick={() => setBroadcast(v => !v)}
        aria-pressed={broadcast}
        title="Broadcast mode (B)">
        <span className="bc-dot"/>
        {broadcast ? "EXIT BROADCAST" : <><span className="lbl-long">BROADCAST</span><span className="lbl-short">BCAST</span></>}
      </button>}
      <button
        className={`f1-mode-toggle ${f1Mode ? "on" : ""}`}
        onClick={toggleF1}
        aria-pressed={f1Mode}
        title={f1Mode ? "Back to the simulated APEX race" : "Final classification of the latest real F1 session, from OpenF1"}>
        {f1Mode ? "← SIM RACE" : <><span className="lbl-long">REAL F1 · REPLAY</span><span className="lbl-short">REAL F1</span></>}
      </button>
      <button
        className={`pitwall-toggle ${pitwall ? "on" : ""}`}
        onClick={togglePitwall}
        aria-pressed={pitwall}
        title={pitwall ? "Back to the cinema view (P)" : "Pit wall: every panel and trace at once (P)"}>
        PIT WALL
      </button>
    </>
  );
  const trail = EMBED && <a className="open-full" href="https://laguna-seca.app/" target="_blank" rel="noopener noreferrer" title="Open the full app in a new tab">↗</a>;

  const paneLabels = f1Mode ? ["RESULT", "SESSION", "DRIVER"] : ["TIMING", "TRACK", "CAR"];
  const tabs = [["telem", "TELEMETRY"], ["car", "DRIVER"], ["team", "TEAM"]];
  const replayIntro = () => { setTunnelOpen(false); setLive(false); setIntro(true); };
  const cars1 = [...race1.cars].sort((x, y) => x.pos - y.pos);
  const S = {
    cars: cars1, model, track, carClass, t: race1.t, lap: race1.lap,
    focused: cars1.find(c => c.no === (focused && focused.no)) || cars1[0], focusedNo: focused && focused.no, onFocus: setFocusedNo,
    subject: window.CineDirector.now.subject || [], cond: window.RaceModel.COND, view,
    openTunnel, replayIntro, toggleF1, trackId, setTrackId, classId, setClassId,
  };
  const introCars = window.APEX_DATA.CARS;
  const introLivery = (no) => (introCars.find(c => c.no === no) || introCars[0]).livery;

  return (
    <div className={`app ${cine ? "app-cine" : "app-pitwall"} ${broadcast && !cine ? "app-broadcast" : ""} ${f1Mode ? "app-f1" : ""} ${EMBED ? "app-embed" : ""} app-pane-${mobilePane} app-tod-${tweaks.timeOfDay}`}
      style={cine ? { "--accent": accent } : undefined}>
      {cine ? (live && <CineView mode={stageMode} track={track} cars={cars} race={race} model={model} carClass={carClass}
        focused={focused} onFocus={setFocusedNo} S={S} sel={sel} setSel={setSel} mobileRegion={mobileRegion} setMobileRegion={setMobileRegion}
        tunnel={tunnelOpen && !f1Mode} closeTunnel={closeTunnel} togglePitwall={togglePitwall} hint={hint}
        follow={follow} onFollow={followCar} airflow={airflow} onAirflow={setAirflow} onTunnel={openTunnel} view={view} setView={setView}/>) : <>
      <div className="app-top">
        <TopBar
          track={track}
          trackEvent={trackEvent}
          trackId={trackId}
          onTrackChange={setTrackId}
          race={race}
          classId={classId}
          onClassChange={setClassId}
          f1Mode={f1Mode}
          f1={f1}
          actions={actions}
          trail={trail}
          compact={EMBED}
        />
      </div>

      <div className="mobile-tabs" role="tablist" aria-label="Panels">
        {["left", "center", "right"].map((p, i) => (
          <button key={p} role="tab" aria-selected={mobilePane === p}
            className={`mt-tab ${mobilePane === p ? "on" : ""}`} onClick={() => setMobilePane(p)}>{paneLabels[i]}</button>
        ))}
      </div>

      <aside className="app-left">
        <Leaderboard cars={cars} focusedNo={focused && focused.no} onFocus={setFocusedNo}
          lap={race.lap} lapsTotal={race.lapsTotal} mode={f1Mode ? "f1" : "sim"} event={event}/>
      </aside>

      <main className="app-center">
        {f1Mode ? (
          <F1ReplayBoard f1={f1} focusedNo={focused && focused.no} onFocus={setFocusedNo}/>
        ) : <>
          <div className="center-track">
            <Track
              track={track}
              cars={cars}
              focusedNo={focused && focused.no}
              onFocus={setFocusedNo}
              onZoom={() => setLightboxOpen(true)}
              lap={race.lap}
              lapsTotal={race.lapsTotal}
              flag={race.flag}
              timeOfDay={tweaks.timeOfDay}
              weather={tweaks.weather}
              showSectors={tweaks.showSectors}
              showTurns={tweaks.showTurns}
              carClass={carClass}
              model={model}
              broadcast={broadcast}
            />
            {window.TrackHistoryPanel && <window.TrackHistoryPanel track={track}/>}
          </div>
          <div className="center-bottom">
            <StrategyPanel car={focused} carClass={carClass} cars={cars} lap={race.lap} lapsTotal={race.lapsTotal}/>
            <PitLogStrip carClass={carClass}/>
          </div>
        </>}
      </main>

      <aside className="app-right" key={(f1Mode ? "f1-" : "") + (focused && focused.no)}>
        {f1Mode ? (
          <F1DriverCard car={focused} f1={f1}/>
        ) : <>
        <div className="rr-tabs" role="tablist" aria-label="Car detail">
          {tabs.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id}
              className={tab === id ? "rr-tab rr-tab-on" : "rr-tab"} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        {tab==="telem" && <>
          <FocusedCarHeader car={focused} onZoomPhoto={() => setLightboxOpen(true)} onTunnel={openTunnel} carClass={carClass}/>
          <Telemetry car={focused} carClass={carClass} model={model} track={track}/>
        </>}
        {tab==="car" && <window.DriverProfile car={focused} onZoomPhoto={() => setLightboxOpen(true)} carClass={carClass}
          cars={cars} track={track} model={model}/>}
        {tab==="team" && focused && <TeamTab car={focused} carClass={carClass}/>}
        </>}
      </aside>
      </>}

      {intro && <window.Intro track={track} trackEvent={trackEvent} livery={introLivery(7)} livery2={introLivery(22)} no={7}
        short={EMBED || narrow} reduce={REDUCE} freezeAt={INTRO_AT}
        onReveal={() => { if (!live) window.RaceClock.t = 6; setLive(true); }}
        onDone={() => { setIntro(false); setLive(true); ssSet(INTRO_KEY); }}/>}

      {lightboxOpen && focused && !f1Mode && (
        <div className="cdx-overlay" role="dialog" aria-modal="true" aria-label={`Dossier · #${focused.no} ${focused.name}`}
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false); }}>
          <div className="cdx-scroll">
            <button className="cdx-close" onClick={() => setLightboxOpen(false)} autoFocus>
              <span className="cdx-close-x">+</span>
              <span className="cdx-close-label">CLOSE</span>
            </button>

            <section className="cdx-aero-top">
              <div className="cdx-aero-top-eyebrow">
                <span className="cdx-dot" style={{background: focused.livery.accent}}/>
                {focused.team} · #{String(focused.no).padStart(2,"0")} · AERO SIM
              </div>
              <button className="wt-open wt-open-lg" onClick={openTunnel}>
                <span className="wt-open-icon" aria-hidden="true">≋</span> OPEN WIND TUNNEL <span className="wt-open-sub">STREAMLINES · PRESSURE · DRS</span>
              </button>
            </section>

            {/* HERO SECTION */}
            <section className="cdx-hero">
              <div className="cdx-hero-content">
                <div className="cdx-hero-eyebrow">
                  <span className="cdx-dot" style={{background: focused.livery.accent}}/>
                  {focused.team}
                </div>
                <div className="cdx-hero-no" style={{color: focused.livery.accent === "#FFFFFF" ? "#fff" : focused.livery.accent}}>
                  {String(focused.no).padStart(2,"0")}
                </div>
                <div className="cdx-hero-name">{focused.name}</div>
                <div className="cdx-hero-sub">{focused.chassis} · {focused.engine}</div>
              </div>
              <div className="cdx-hero-photo-small">
                <window.PhotoCard car={focused} carClass={carClass}/>
              </div>
            </section>

            {/* SPEC STRIP */}
            <section className="cdx-specs">
              {[
                { label: "POSITION", val: "P" + focused.pos },
                { label: "LAST LAP", val: focused.last_lap },
                { label: "BEST LAP", val: focused.best_lap },
                { label: "GAP", val: focused.gap },
                { label: "TYRE", val: focused.tire + " · " + focused.tire_age + " LAPS" },
                { label: "FUEL", val: Math.round(focused.fuel) + "%" },
              ].map((s, i) => (
                <div key={i} className="cdx-spec">
                  <div className="cdx-spec-label">{s.label}</div>
                  <div className="cdx-spec-val">{s.val}</div>
                </div>
              ))}
            </section>

            {/* DRIVER & CREW */}
            <section className="cdx-section">
              <div className="cdx-section-eyebrow">DRIVER</div>
              <div className="cdx-section-title">{focused.name}</div>
              <div className="cdx-driver-grid">
                <div className="cdx-driver-card">
                  <window.HelmetPortrait car={focused}/>
                  <div className="cdx-driver-meta">
                    <span>{focused.country} · AGE {focused.age}</span>
                    <span>{focused.team}</span>
                  </div>
                </div>
                <div className="cdx-driver-bio">{focused.bio}</div>
              </div>
              <div className="cdx-crew-row">
                <div className="cdx-crew-card">
                  <div className="cdx-crew-role">CREW CHIEF</div>
                  <div className="cdx-crew-name">{focused.crew_chief}</div>
                </div>
                <div className="cdx-crew-card">
                  <div className="cdx-crew-role">RACE ENGINEER</div>
                  <div className="cdx-crew-name">{focused.race_engineer}</div>
                </div>
              </div>
            </section>

            {/* LIVERY */}
            <section className="cdx-section">
              <div className="cdx-section-eyebrow">LIVERY</div>
              <div className="cdx-section-title">{focused.team}</div>
              <LiveryCard car={focused}/>
            </section>

            {/* SECTORS */}
            <section className="cdx-section">
              <div className="cdx-section-eyebrow">SECTOR TIMES</div>
              <div className="cdx-sectors">
                {focused.sectors.map((s, i) => (
                  <div key={i} className={`cdx-sector cdx-sector-${s.state}`}>
                    <div className="cdx-sector-label">{s.s}</div>
                    <div className="cdx-sector-time">{s.t}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="cdx-footer">
              <span>APEX SERIES · #{focused.no} {focused.name} · {focused.team}</span>
            </div>
          </div>
        </div>
      )}

      {broadcast && !f1Mode && !cine && <BroadcastOverlay
        cars={cars}
        focused={focused}
        track={track}
        trackEvent={trackEvent}
        carClass={carClass}
        race={race}
        model={model}
        event={event}
        onExit={() => setBroadcast(false)}
        onTunnel={openTunnel}
      />}

      {tunnelOpen && focused && !f1Mode && !cine && window.WindTunnel &&
        <TunnelHost car={focused} carClass={carClass} model={model} track={track} onClose={closeTunnel}/>}

      {EDIT && window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Track">
            <window.TweakRadio label="Time of day" value={tweaks.timeOfDay} onChange={v => setTweak("timeOfDay", v)} options={[{label:"Day",value:"day"},{label:"Dusk",value:"dusk"},{label:"Night",value:"night"}]}/>
            <window.TweakToggle label="Sector overlay" value={tweaks.showSectors} onChange={v => setTweak("showSectors", v)}/>
            <window.TweakToggle label="Turn labels" value={tweaks.showTurns} onChange={v => setTweak("showTurns", v)}/>
            <window.TweakRadio label="Weather" value={tweaks.weather} onChange={v => setTweak("weather", v)} options={[{label:"Dry",value:"dry"},{label:"Wet",value:"wet"},{label:"Rain",value:"rain"}]}/>
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

// Bottom-right strip: condensed pit replay below the track
function PitLogStrip({ carClass }) {
  const log = window.APEX_DATA.PIT_LOG;
  const cleanS = carClass ? carClass.pit_clean_s : 2.45;
  const goodCut = cleanS;
  const badCut = cleanS * 1.04;
  // Scale base pit log durations against class baseline (open-wheel = 2.45 reference)
  const scale = cleanS / 2.45;
  return (
    <div className="panel pit-panel" style={{paddingBottom: 10}}>
      <div className="panel-head"><div className="panel-eyebrow">PIT REPLAY · LAST 6 STOPS · {carClass ? carClass.short : ""}</div><div className="panel-meta">CLEAN STOP &lt; {cleanS.toFixed(2)}s</div></div>
      <div className="pit-list">
        {log.map((p, i) => {
          const dur = p.duration * scale;
          return (
            <div key={i} className="pit-row">
              <span className="pit-lap">L{p.lap}</span>
              <span className="pit-no">#{p.no}</span>
              <span className="pit-team">{p.team}</span>
              <span className="pit-action">{p.action}</span>
              <span className={`pit-dur ${dur < goodCut ? "good" : dur > badCut ? "bad" : ""}`}>{dur.toFixed(2)}s</span>
              <span className="pit-notes">{p.notes}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function FocusedCarHeader({ car, onZoomPhoto, onTunnel, carClass }) {
  if (!car) return null;
  return (
    <div className="panel" style={{paddingBottom:10}}>
      <div className="panel-head focus-head" style={{borderBottom:"none", marginBottom:8, paddingBottom:0}}>
        <div>
          <div className="panel-eyebrow">FOCUSED · POS {String(car.pos).padStart(2,"0")}</div>
          <div className="focus-no" style={{ color: window.inkOn(car.livery) }}>
            {String(car.no).padStart(2,"0")}
          </div>
        </div>
        <div className="focus-flag">
          <div className="focus-country">{car.country}</div>
          <div className="focus-driver">{car.name}</div>
          <div className="focus-team">{car.team}</div>
        </div>
      </div>
      <window.PhotoCard car={car} label={`#${car.no} · ${car.name.split(" ").slice(-1)[0]} · ${car.gap === "LEADER" ? "LEADING" : car.gap}`} onZoom={onZoomPhoto} carClass={carClass}/>
      <button className="wt-open" onClick={onTunnel}>
        <span className="wt-open-icon" aria-hidden="true">≋</span> WIND TUNNEL <span className="wt-open-sub">AERO · SIM</span>
      </button>
    </div>
  );
}

function TeamTab({ car, carClass }) {
  const [slide, setSlide] = useS(0);
  const accent = car.livery.accent === "#FFFFFF" ? "#E8E4DC" : car.livery.accent;
  const pri = car.livery.primary;
  const sec = car.livery.secondary || "#222";

  const scenes = [
    { label: "GARAGE", desc: "Race bay preparation" },
    { label: "PIT WALL", desc: "Strategy command center" },
    { label: "ON TRACK", desc: "Race action" },
    { label: "ENGINEERING", desc: "Technical development" },
  ];

  useE(() => {
    if (REDUCE) return;
    const id = setInterval(() => setSlide(s => (s + 1) % scenes.length), 5000);
    return () => clearInterval(id);
  }, []);

  const cls = (carClass && carClass.id) || "open_wheel";

  // Generate team hero SVG scene — cinematic, atmospheric, animated
  const renderScene = (idx) => {
    const VW = 400, VH = 220;
    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} className="team-slide-svg">
        <defs>
          <radialGradient id="tg1" cx="50%" cy="55%" r="65%">
            <stop offset="0%" stopColor={pri} stopOpacity="0.3"/>
            <stop offset="60%" stopColor={pri} stopOpacity="0.05"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="tg-spot" cx="50%" cy="30%" r="40%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.08"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="tg-floor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)"/>
            <stop offset="50%" stopColor="rgba(255,255,255,0.01)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
          </linearGradient>
          <linearGradient id="tg-vfade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.5)"/>
            <stop offset="15%" stopColor="rgba(0,0,0,0)"/>
            <stop offset="70%" stopColor="rgba(0,0,0,0)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.95)"/>
          </linearGradient>
          <filter id="tg-blur"><feGaussianBlur stdDeviation="6"/></filter>
          <filter id="tg-blur2"><feGaussianBlur stdDeviation="3"/></filter>
          <filter id="tg-glow"><feGaussianBlur stdDeviation="2" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
          <clipPath id="tg-clip"><rect width={VW} height={VH}/></clipPath>
        </defs>
        <g clipPath="url(#tg-clip)">
        <rect width={VW} height={VH} fill="#050709"/>
        <rect width={VW} height={VH} fill="url(#tg1)"/>

        {idx === 0 && <g>
          <ellipse cx={VW/2} cy={VH*0.4} rx="200" ry="80" fill={pri} opacity="0.04" filter="url(#tg-blur)"/>
          {[100,200,300].map((x,i) => (
            <g key={i}>
              <rect x={x-18} y="0" width="36" height="3" fill="#2a2a2a"/>
              <line x1={x} y1="3" x2={x} y2="14" stroke="#333" strokeWidth="1.5"/>
              <rect x={x-14} y="12" width="28" height="6" fill="#3a3a3a" rx="1"/>
              <polygon points={`${x-4},18 ${x+4},18 ${x+50},${VH-40} ${x-50},${VH-40}`} fill="rgba(255,240,210,0.02)"/>
              <ellipse cx={x} cy="18" rx="6" ry="2" fill="#FFE4B5" opacity="0.7"/>
              <ellipse cx={x} cy="18" rx="12" ry="4" fill="#FFE4B5" opacity="0.15" filter="url(#tg-blur2)"/>
              <ellipse cx={x} cy={VH-30} rx="55" ry="12" fill="rgba(255,240,210,0.03)"/>
            </g>
          ))}
          <rect x="0" y={VH*0.72} width={VW} height={VH*0.28} fill="url(#tg-floor)"/>
          <line x1="0" y1={VH*0.72} x2={VW} y2={VH*0.72} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
          <g transform={`translate(${VW/2},${VH*0.72})`}>
            <ellipse cx="0" cy="1" rx="155" ry="5" fill="#000" opacity="0.7"/>
            <window.F1Car.SVG view="side" livery={car.livery} number={car.no} scale={52}/>
          </g>
          <g transform={`translate(${VW/2},${VH*0.72 + 1}) scale(1,-0.3)`} opacity="0.08">
            <window.F1Car.SVG view="side" livery={car.livery} scale={52}/>
          </g>
          {!REDUCE && [0,1,2,3,4,5].map(i => (
            <circle key={`sp${i}`} cx={150 + i * 7} cy={VH*0.48} r="1" fill="#FFE4B5" opacity="0">
              <animate attributeName="cy" from={VH*0.48} to={VH*0.48 + 25 + i*5} dur={`${0.6+i*0.15}s`} begin={`${i*0.2}s`} repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.9;0" dur={`${0.6+i*0.15}s`} begin={`${i*0.2}s`} repeatCount="indefinite"/>
              <animate attributeName="cx" from={148 + i * 7} to={145 + i * 9} dur={`${0.6+i*0.15}s`} begin={`${i*0.2}s`} repeatCount="indefinite"/>
            </circle>
          ))}
          <rect x="12" y="55" width="22" height="55" fill="#111" rx="2" opacity="0.5"/>
          <rect x="12" y="50" width="22" height="8" fill="#1a1a1a" rx="1"/>
          <rect x={VW-34} y="60" width="22" height="50" fill="#111" rx="2" opacity="0.5"/>
        </g>}

        {idx === 1 && <g>
          <ellipse cx={VW/2} cy={VH*0.35} rx="180" ry="70" fill="rgba(91,183,226,0.04)" filter="url(#tg-blur)"/>
          <path d={`M 10,${VH*0.58} L ${VW-10},${VH*0.58} L ${VW-10},${VH*0.62} L 10,${VH*0.62} Z`} fill="#1a1a1a" stroke="#333" strokeWidth="0.5"/>
          {[0,1,2,3,4].map(i => {
            const mx = 22 + i * 72;
            const isMain = i === 2;
            return (
              <g key={i}>
                <rect x={mx} y={VH*0.18} width="60" height="72" fill="#0a0a0a" stroke={isMain ? accent : "#333"} strokeWidth={isMain ? 1 : 0.5} rx="2"/>
                <rect x={mx+2} y={VH*0.18+2} width="56" height="60" fill={isMain ? `rgba(91,183,226,0.06)` : "rgba(91,183,226,0.03)"}/>
                <polyline points={Array.from({length: 10}, (_, j) => `${mx+6+j*5.2},${VH*0.18+18+Math.sin(j*0.8+i)*12}`).join(" ")} fill="none" stroke={isMain ? accent : "rgba(91,183,226,0.4)"} strokeWidth={isMain ? 1.2 : 0.7}/>
                {[0,1,2].map(j => (
                  <rect key={j} x={mx+6} y={VH*0.18+42+j*8} width={20+j*10} height="2" fill={isMain && j===0 ? accent : "rgba(91,183,226,0.15)"} rx="1" opacity={isMain ? 0.6 : 0.3}/>
                ))}
                <ellipse cx={mx+30} cy={VH*0.58} rx="20" ry="4" fill={isMain ? accent : "rgba(91,183,226,0.3)"} opacity="0.04"/>
                <rect x={mx+25} y={VH*0.18+72} width="10" height="10" fill="#1a1a1a"/>
              </g>
            );
          })}
          {[90,200,310].map((x,i) => (
            <g key={`eng${i}`} opacity="0.12">
              <circle cx={x} cy={VH*0.12} r="5" fill="#fff"/>
              <rect x={x-4} y={VH*0.12+5} width="8" height="12" fill="#fff" rx="2"/>
              <path d={`M ${x-6},${VH*0.12-1} C ${x-6},${VH*0.12-7} ${x+6},${VH*0.12-7} ${x+6},${VH*0.12-1}`} fill="none" stroke="#fff" strokeWidth="1.5"/>
            </g>
          ))}
          {[0,1,2,3,4,5,6,7].map(i => (
            <rect key={`dp${i}`} x={50+i*42} y={VH*0.4} width="2" height="2" fill="rgba(91,183,226,0.3)" rx="0.5">
              <animate attributeName="y" from={VH*0.35} to={VH*0.08} dur={`${2+i*0.5}s`} begin={`${i*0.4}s`} repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.5;0" dur={`${2+i*0.5}s`} begin={`${i*0.4}s`} repeatCount="indefinite"/>
            </rect>
          ))}
          <rect x="0" y={VH*0.62} width={VW} height={VH*0.38} fill="url(#tg-floor)" opacity="0.5"/>
        </g>}

        {idx === 2 && <g>
          <rect width={VW} height={VH*0.35} fill="rgba(20,30,50,0.4)"/>
          {Array.from({length: 30}, (_, i) => {
            const y = 8 + i * 6.5;
            const nearCar = Math.abs(y - VH*0.48) < 30;
            const w = nearCar ? 2 : 0.6 + Math.random() * 0.4;
            const len = 80 + Math.random() * 250;
            const x = Math.random() * (VW - len);
            return <rect key={i} x={x} y={y} width={len} height={w} fill={nearCar ? accent : "rgba(91,183,226,0.12)"} opacity={nearCar ? 0.2 : 0.08} rx={w/2}/>;
          })}
          <rect x="0" y={VH*0.66} width={VW} height={VH*0.34} fill="rgba(30,30,35,0.8)"/>
          <line x1="0" y1={VH*0.66} x2={VW} y2={VH*0.66} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
          {Array.from({length: 12}, (_, i) => (
            <rect key={i} x={i*34} y={VH*0.66} width="17" height="4" fill={i%2===0 ? "#C8102E" : "#E8E4DC"} opacity="0.2"/>
          ))}
          <g transform={`translate(${VW*0.48},${VH*0.66})`}>
            <rect x="-200" y="-22" width="90" height="4" fill={pri} opacity="0.08" rx="2"/>
            <rect x="-230" y="-12" width="70" height="3" fill={pri} opacity="0.05" rx="1.5"/>
            <ellipse cx="0" cy="1" rx="130" ry="4" fill="#000" opacity="0.6"/>
            <window.F1Car.SVG view="side" livery={car.livery} number={car.no} scale={44}/>
            {!REDUCE && [window.F1Car.FA, window.F1Car.RA].map(x => {
              const cx = (x - window.F1Car.LEN / 2) * 44, cy = -window.F1Car.R * 44;
              return (
                <circle key={x} cx={cx} cy={cy} r="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" strokeDasharray="2 4">
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`-360 ${cx} ${cy}`} dur="0.3s" repeatCount="indefinite"/>
                </circle>
              );
            })}
          </g>
          {[0,1,2].map(i => (
            <ellipse key={`ts${i}`} cx={VW*0.48-110-i*25} cy={VH*0.56} rx={15+i*10} ry={6+i*4} fill="rgba(200,200,200,0.03)" filter="url(#tg-blur)">
              <animate attributeName="rx" from={12+i*8} to={25+i*15} dur={`${1.5+i*0.5}s`} repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.04;0.01;0.04" dur={`${1.5+i*0.5}s`} repeatCount="indefinite"/>
            </ellipse>
          ))}
        </g>}

        {idx === 3 && <g>
          {Array.from({length: 20}, (_, i) => (
            <line key={`eg${i}`} x1={i*20} y1="0" x2={i*20} y2={VH} stroke="rgba(91,183,226,0.03)" strokeWidth="0.5"/>
          ))}
          {Array.from({length: 20}, (_, i) => {
            const y = 20 + i * 10;
            const nearBody = Math.abs(y - VH*0.45) < 28;
            const deflect = nearBody ? (y < VH*0.45 ? -15 : 12) * (1 - Math.abs(y - VH*0.45)/28) : 0;
            return (
              <path key={i} d={`M 0,${y} C 120,${y} 160,${y+deflect*0.5} 200,${y+deflect} S 270,${y+deflect*0.8} ${VW},${y+deflect*0.3}`} fill="none" stroke={nearBody ? accent : "rgba(91,183,226,0.1)"} strokeWidth={nearBody ? 1.5 : 0.6} opacity={nearBody ? 0.35 : 0.12} strokeDasharray={nearBody ? "15 6" : "none"}>
                {nearBody && <animate attributeName="stroke-dashoffset" from="0" to="-42" dur="1s" repeatCount="indefinite"/>}
              </path>
            );
          })}
          <g transform={`translate(${VW*0.5},${VH*0.45}) rotate(180)`}>
            <window.F1Car.SVG view="top" livery={car.livery} scale={34}/>
          </g>
          {[0,1,2].map(i => {
            const vx = VW*0.5 - 80 - i * 25;
            return (
              <circle key={`vt${i}`} cx={vx} cy={VH*0.45} r={5+i*6} fill="none" stroke="rgba(239,68,68,0.12)" strokeWidth="0.7" strokeDasharray="2 3">
                <animateTransform attributeName="transform" type="rotate" from={`0 ${vx} ${VH*0.45}`} to={`${i%2===0?360:-360} ${vx} ${VH*0.45}`} dur={`${2+i}s`} repeatCount="indefinite"/>
              </circle>
            );
          })}
          <ellipse cx={VW*0.5+60} cy={VH*0.43} rx="10" ry="8" fill="rgba(239,68,68,0.08)">
            <animate attributeName="rx" values="8;12;8" dur="2s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx={VW*0.5} cy={VH*0.35} rx="30" ry="5" fill="rgba(59,130,246,0.06)">
            <animate attributeName="opacity" values="0.04;0.08;0.04" dur="3s" repeatCount="indefinite"/>
          </ellipse>
        </g>}

        <rect width={VW} height={VH} fill="url(#tg-vfade)"/>
        </g>
      </svg>
    );
  };
  return (
    <div className="panel team-panel">
      {/* Team header */}
      <div className="team-header">
        <div className="team-badge" style={{borderColor: accent}}>
          <div className="team-badge-inner" style={{background: car.livery.primary}}>
            <span style={{color: accent, fontSize: 18, fontWeight: 900, fontFamily: "Geist, sans-serif"}}>{car.no}</span>
          </div>
        </div>
        <div className="team-info">
          <div className="team-name">{car.team}</div>
          <div className="team-sub">{car.chassis} · {car.engine}</div>
        </div>
      </div>

      {/* Image carousel — cinematic SVG scenes */}
      <div className="team-carousel">
        <div className="team-slide">
          {renderScene(slide)}
          <div className="team-slide-label">{scenes[slide].label}</div>
          <div className="team-slide-desc">{scenes[slide].desc}</div>
        </div>
        <div className="team-dots">
          {scenes.map((_, i) => (
            <button key={i} className={`team-dot ${i === slide ? "on" : ""}`} aria-label={`Show ${scenes[i].label.toLowerCase()} scene`}
              aria-pressed={i === slide} onClick={() => setSlide(i)} style={i === slide ? {background: accent} : {}}/>
          ))}
        </div>
      </div>

      {/* Crew */}
      <div className="team-crew">
        <div className="team-crew-title">CREW</div>
        <div className="team-crew-list">
          <div className="team-crew-item">
            <div className="team-crew-role">CREW CHIEF</div>
            <div className="team-crew-person">{car.crew_chief}</div>
          </div>
          <div className="team-crew-item">
            <div className="team-crew-role">RACE ENGINEER</div>
            <div className="team-crew-person">{car.race_engineer}</div>
          </div>
          <div className="team-crew-item">
            <div className="team-crew-role">DRIVER</div>
            <div className="team-crew-person">{car.name}</div>
          </div>
        </div>
      </div>

      {/* Sponsors */}
      <div className="team-sponsors">
        <div className="team-crew-title">PARTNERS · FICTIONAL BRANDS</div>
        <div className="team-sponsor-row">
          <span className="team-sponsor-badge title" style={{borderColor: accent}}>{car.sponsors.title}</span>
          {car.sponsors.primary.map((s, i) => <span key={i} className="team-sponsor-badge">{s}</span>)}
        </div>
      </div>

      {/* Hear from the Pros */}
      <div className="team-pros">
        <div className="team-crew-title">FROM THE GARAGE · FICTIONAL QUOTES</div>
        <div className="team-pros-list">
          <div className="team-pro-card">
            <div className="team-pro-play">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" stroke={accent} strokeWidth="1.5" opacity="0.6"/>
                <polygon points="10,7 18,12 10,17" fill={accent} opacity="0.8"/>
              </svg>
            </div>
            <div className="team-pro-info">
              <div className="team-pro-name">{car.crew_chief}</div>
              <div className="team-pro-role">CREW CHIEF</div>
              <div className="team-pro-quote">"Setup is everything at {car.team}. We chase the balance lap by lap."</div>
            </div>
          </div>
          <div className="team-pro-card">
            <div className="team-pro-play">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" stroke={accent} strokeWidth="1.5" opacity="0.6"/>
                <polygon points="10,7 18,12 10,17" fill={accent} opacity="0.8"/>
              </svg>
            </div>
            <div className="team-pro-info">
              <div className="team-pro-name">{car.race_engineer}</div>
              <div className="team-pro-role">RACE ENGINEER</div>
              <div className="team-pro-quote">"Strategy calls win races. We model every scenario before the lights go out."</div>
            </div>
          </div>
          <div className="team-pro-card">
            <div className="team-pro-play">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" stroke={accent} strokeWidth="1.5" opacity="0.6"/>
                <polygon points="10,7 18,12 10,17" fill={accent} opacity="0.8"/>
              </svg>
            </div>
            <div className="team-pro-info">
              <div className="team-pro-name">AERO DEPARTMENT</div>
              <div className="team-pro-role">TECHNICAL INSIGHT</div>
              <div className="team-pro-quote">"Every surface is a wing. We find downforce in places the regulations forgot to restrict."</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// BROADCAST OVERLAY — full-bleed track + 3 lower-thirds
// =============================================================
function BroadcastOverlay({ cars, focused, track, trackEvent, carClass, race, model, event, onExit, onTunnel }) {
  const { cur } = window.useCarSample(model, focused, track, REDUCE ? 1 : 10);
  if (!focused) return null;
  const sorted = [...cars].sort((a,b) => a.pos - b.pos);
  const top3 = sorted.slice(0, 3);
  const tint = window.inkOn(focused.livery);
  const speed = Math.round(window.remapSpeed(cur.speed, carClass));
  const showEvent = event && race.t - event.at < 8;

  return (
    <div className="bcast">
      {!EMBED && <window.AudioToggle/>}
      <div className="bcast-top">
        <div className="bcast-network">
          <span className="brand-mark">▲</span>
          <span className="bcast-net-name">APEX</span>
          <span className="bcast-net-sub"><span className="lbl-long">SIMULATED RACE · {trackEvent.round}</span><span className="lbl-short">SIM RACE</span></span>
        </div>
        <div className="bcast-event">{trackEvent.event} · APEX Series is fictional</div>
        <div className="bcast-flag">
          <span className="bc-dot" style={{background: race.flag === "checkered" ? "#fff" : "#7DC383"}}/>
          L{race.lap}/{race.lapsTotal}
        </div>
        <div className="bcast-actions">
          <button className="f1-mode-toggle bcast-exit" onClick={onExit} title="Exit broadcast (B or Esc)"><span className="lbl-long">EXIT BROADCAST</span><span className="lbl-short">EXIT</span></button>
          {EMBED && <a className="open-full" href="https://laguna-seca.app/" target="_blank" rel="noopener noreferrer" title="Open the full app in a new tab">↗</a>}
        </div>
      </div>

      {showEvent && <div className="bcast-event-banner" role="status">{event.text}</div>}

      <div className="bcast-lt bcast-lt-l">
        <div className="bcast-lt-head">
          <span className="bcast-lt-eyebrow">RUNNING ORDER</span>
          <span className="bcast-lt-meta">INT</span>
        </div>
        {top3.map((c) => (
          <div key={c.no} className={`bcast-row ${focused.no === c.no ? "on" : ""}`}>
            <span className="bcast-pos">{String(c.pos).padStart(2,"0")}</span>
            <span className="bcast-livery" style={{background: c.livery.primary, borderColor: c.livery.secondary}}/>
            <span className="bcast-driver">{c.name.split(" ").slice(-1)[0]}</span>
            <span className="bcast-team">{c.short}</span>
            <span className="bcast-gap">{c.pos === 1 ? "LEADER" : c.interval}</span>
          </div>
        ))}
      </div>

      <div className="bcast-lt bcast-lt-c" style={{borderTopColor: tint}}>
        <div className="bcast-hero-no" style={{color: tint}}>{String(focused.no).padStart(2,"0")}</div>
        <div className="bcast-hero-info">
          <div className="bcast-lt-eyebrow">FOCUSED · POS {String(focused.pos).padStart(2,"0")}</div>
          <div className="bcast-hero-name">{focused.name}</div>
          <div className="bcast-hero-team" style={{color: tint}}>{focused.team}</div>
          <div className="bcast-hero-stats">
            <span><b>{focused.last_lap}</b><i>LAST</i></span>
            <span><b>{focused.best_lap}</b><i>BEST</i></span>
            <span><b>{focused.tire}<sub>{focused.tire_age}</sub></b><i>TYRE</i></span>
            <span><b>{focused.gap}</b><i>GAP</i></span>
          </div>
        </div>
      </div>

      <div className="bcast-lt bcast-lt-r">
        <div className="bcast-lt-head">
          <span className="bcast-lt-eyebrow">TELEMETRY · #{focused.no}</span>
          <button className="bcast-wt" onClick={onTunnel} title="Open the wind tunnel for this car">WIND TUNNEL</button>
          <span className="bcast-live">SIM</span>
        </div>
        <div className="bcast-tele-row">
          <div className="bcast-tele-stat">
            <i>SPEED</i>
            <b>{speed}</b><u>kph</u>
          </div>
          <div className="bcast-tele-stat">
            <i>THR</i>
            <b style={{color: "#7DC383"}}>{Math.round(cur.throttle)}</b><u>%</u>
          </div>
          <div className="bcast-tele-stat">
            <i>BRK</i>
            <b style={{color: "#E5484D"}}>{Math.round(cur.brake)}</b><u>%</u>
          </div>
        </div>
        <div className="bcast-tb-bars">
          <div className="bcast-tb-bar"><div className="bcast-tb-fill bcast-thr" style={{width: `${cur.throttle}%`}}/></div>
          <div className="bcast-tb-bar"><div className="bcast-tb-fill bcast-brk" style={{width: `${cur.brake}%`}}/></div>
        </div>
      </div>

      <div className="bcast-bug">
        <span className="bcast-bug-mark">▲</span>
        <span className="bcast-bug-text">APEX</span>
        <span className="bcast-bug-live">SIM</span>
      </div>

      <div className="bcast-hint">TAP A CAR TO FOLLOW · <kbd>B</kbd> OR <kbd>ESC</kbd> TO EXIT</div>
    </div>
  );
}

function TunnelHost({ car, carClass, model, track, onClose }) {
  const { cur } = window.useCarSample(model, car, track, 1);
  return <window.WindTunnel car={car} carClass={carClass} speed={Math.round(window.remapSpeed(cur.speed, carClass))} onClose={onClose}/>;
}

// =============================================================
// REAL F1 · REPLAY — centre board and driver card
// =============================================================
const OPENF1_CREDIT = (
  <p className="f1-credit">
    Data: <a href="https://openf1.org" target="_blank" rel="noopener noreferrer">OpenF1</a> (unofficial, CC BY-NC-SA 4.0).
    Not affiliated with Formula 1. Final results only — the free API has no live timing.
  </p>
);

function F1ReplayBoard({ f1, focusedNo, onFocus }) {
  const d = f1.data;
  if (!d) {
    return (
      <div className="f1-board f1-board-empty">
        <div className="panel-eyebrow">REAL F1 · REPLAY</div>
        <div className="f1-board-msg" role="status">{window.f1StatusText(f1)}</div>
        {f1.status === "error" && <p className="f1-note">OpenF1 didn't answer. Retrying in a minute.</p>}
        {OPENF1_CREDIT}
      </div>
    );
  }
  const s = d.session, m = d.meeting;
  const podium = d.cars.filter(c => c.pos <= 3);
  return (
    <div className="f1-board">
      <div className="panel-eyebrow">REAL F1 · {d.ended ? "REPLAY · FINAL CLASSIFICATION" : "SESSION IN PROGRESS · NOT LIVE"}</div>
      <h2 className="f1-board-title">{m ? m.meeting_name : s.location}</h2>
      <div className="f1-board-sub">{s.session_name} · {s.circuit_short_name}, {s.country_name} · {window.fmtF1Date(s.date_start)}</div>
      {f1.status === "rate-limited" && <div className="f1-warn" role="status">Rate limited by OpenF1 · retrying in {f1.retryIn}s · showing the last result</div>}
      <div className="f1-podium">
        {podium.map(c => (
          <button key={c.no} type="button" className={`f1-podium-card ${c.no === focusedNo ? "on" : ""}`}
            style={{ borderTopColor: c.livery.primary }} onClick={() => onFocus(c.no)} aria-pressed={c.no === focusedNo}>
            <span className="f1-podium-pos">P{c.pos}</span>
            <span className="f1-podium-name">{c.name}</span>
            <span className="f1-podium-team" style={{ color: c.livery.primary }}>{c.team}</span>
            <span className="f1-podium-gap">{c.gap}</span>
          </button>
        ))}
      </div>
      <p className="f1-note">The track map is Laguna Seca only, so it's hidden for this {s.circuit_short_name} session. Positions, gaps, laps and tyres are OpenF1's final figures; nothing here is simulated.</p>
      {OPENF1_CREDIT}
    </div>
  );
}

function F1DriverCard({ car, f1 }) {
  if (!car) return <div className="panel"><div className="panel-eyebrow">REAL F1 · REPLAY</div><p className="f1-note">{window.f1StatusText(f1)}</p></div>;
  return (
    <div className="panel f1-driver">
      <div className="panel-eyebrow">REAL F1 · DRIVER · FINAL</div>
      <div className="f1-driver-no" style={{ color: car.livery.primary }}>{car.no}</div>
      <div className="f1-driver-name">{car.name}</div>
      <div className="f1-driver-team" style={{ color: car.livery.primary }}>{car.team}</div>
      <dl className="f1-driver-stats">
        <div><dt>POSITION</dt><dd>P{car.pos}</dd></div>
        <div><dt>GAP</dt><dd>{car.gap}</dd></div>
        <div><dt>LAPS</dt><dd>{car.laps != null ? car.laps : "—"}</dd></div>
        <div><dt>POINTS</dt><dd>{car.points != null ? car.points : "—"}</dd></div>
      </dl>
      {car._stints.length > 0 && <>
        <div className="kv-label">STINTS</div>
        <ol className="f1-stints">
          {car._stints.map((st, i) => (
            <li key={i}><span className={`tyre tyre-${st.compound}`}>{st.compound}</span> L{st.from}–L{st.to}</li>
          ))}
        </ol>
      </>}
      <p className="f1-note">Telemetry, fuel and strategy aren't shown for real drivers: this view only uses OpenF1's published results.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
