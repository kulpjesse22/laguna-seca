// Real F1 · replay — final classification of the most recent session from OpenF1.
// OpenF1's free tier serves historical data only (3 req/s, 30 req/min), so this never
// claims to be live. Requests go out one at a time; the only repeat request is a
// session-key check every 60 s while the tab is visible, with backoff on 429.

const { useState: useStateF1, useEffect: useEffectF1, useRef: useRefF1 } = React;

const OPENF1 = "https://api.openf1.org/v1";
const F1_POLL_MS = 60000;
const F1_CACHE_KEY = "laguna.f1replay.v1";

class RateLimited extends Error {
  constructor(retryAfter) { super("rate limited"); this.retryAfter = retryAfter; }
}

async function f1Get(path) {
  const r = await fetch(OPENF1 + path);
  if (r.status === 429) throw new RateLimited(parseInt(r.headers.get("retry-after"), 10) || 0);
  if (!r.ok) throw new Error(`OpenF1 ${r.status}`);
  return r.json();
}

const f1Pause = (ms) => new Promise((r) => setTimeout(r, ms));

function lastValue(v) {
  if (Array.isArray(v)) {
    for (let i = v.length - 1; i >= 0; i--) if (v[i] != null) return v[i];
    return null;
  }
  return v;
}

function f1Gap(row) {
  if (row.dsq) return "DSQ";
  if (row.dns) return "DNS";
  if (row.dnf) return "DNF";
  if (row.position === 1) return "WINNER";
  const g = lastValue(row.gap_to_leader);
  if (g == null) return "—";
  if (typeof g === "number") return `+${g.toFixed(3)}`;
  const s = String(g);
  return s.startsWith("+") ? s : `+${s}`;
}

const TYRE_LETTER = { SOFT: "S", MEDIUM: "M", HARD: "H", INTERMEDIATE: "I", WET: "W" };

function buildReplay(session, meeting, results, drivers, stints) {
  const driverBy = {};
  drivers.forEach((d) => { driverBy[d.driver_number] = d; });
  const stintsBy = {};
  stints.forEach((s) => { (stintsBy[s.driver_number] = stintsBy[s.driver_number] || []).push(s); });
  const rows = [...results].sort((a, b) => (a.position || 99) - (b.position || 99));
  const cars = rows.map((row, i) => {
    const d = driverBy[row.driver_number] || {};
    const colour = d.team_colour ? `#${d.team_colour}` : "#9A9A9A";
    const st = (stintsBy[row.driver_number] || []).sort((a, b) => a.stint_number - b.stint_number);
    const lastStint = st[st.length - 1];
    const tyreAge = lastStint ? (lastStint.tyre_age_at_start || 0) + Math.max(0, (lastStint.lap_end || 0) - (lastStint.lap_start || 0)) : null;
    const name = d.full_name || `Driver ${row.driver_number}`;
    return {
      no: row.driver_number,
      pos: row.position || i + 1,
      name: name.toUpperCase(),
      short: (d.name_acronym || "").toUpperCase(),
      team: d.team_name || "",
      country: d.country_code || "",
      livery: { primary: colour, secondary: "#111111", accent: colour, pattern: "solid" },
      gap: f1Gap(row),
      laps: row.number_of_laps != null ? row.number_of_laps : null,
      points: row.points != null ? row.points : null,
      tire: lastStint ? (TYRE_LETTER[lastStint.compound] || "?") : "—",
      tire_age: tyreAge,
      _stints: st.map((s) => ({ compound: TYRE_LETTER[s.compound] || "?", from: s.lap_start, to: s.lap_end })),
      _real: true,
    };
  });
  return {
    session,
    meeting,
    cars,
    ended: session.date_end ? Date.parse(session.date_end) < Date.now() : false,
    fetchedAt: Date.now(),
  };
}

async function loadReplay(sessionKey) {
  const sessions = await f1Get(`/sessions?session_key=${sessionKey || "latest"}`);
  if (!sessions || !sessions.length) throw new Error("No session found");
  const session = sessions[sessions.length - 1];
  const k = session.session_key;
  await f1Pause(400);
  const results = await f1Get(`/session_result?session_key=${k}`);
  await f1Pause(400);
  const drivers = await f1Get(`/drivers?session_key=${k}`);
  await f1Pause(400);
  const stints = await f1Get(`/stints?session_key=${k}`);
  await f1Pause(400);
  const meetings = await f1Get(`/meetings?meeting_key=${session.meeting_key}`).catch(() => []);
  return buildReplay(session, meetings[0] || null, results || [], drivers || [], stints || []);
}

function readCache() {
  try {
    const c = JSON.parse(sessionStorage.getItem(F1_CACHE_KEY));
    if (c && Date.now() - c.fetchedAt < 10 * 60 * 1000) return c;
  } catch {}
  return null;
}

// status: idle | loading | ready | empty | rate-limited | error
function useF1Replay(enabled) {
  const [st, setSt] = useStateF1(() => {
    const cached = readCache();
    return cached ? { status: "ready", data: cached } : { status: "idle", data: null };
  });
  const [retryAt, setRetryAt] = useStateF1(0);
  const [now, setNow] = useStateF1(Date.now());
  const backoff = useRefF1(30);
  const dataRef = useRefF1(st.data);
  dataRef.current = st.data;

  useEffectF1(() => {
    if (!enabled) return;
    let alive = true, timer = 0;

    const schedule = (ms) => { clearTimeout(timer); timer = setTimeout(tick, ms); };
    const fail = (e) => {
      if (!alive) return;
      if (e instanceof RateLimited) {
        const wait = Math.max(e.retryAfter || 0, backoff.current);
        backoff.current = Math.min(backoff.current * 2, 240);
        setRetryAt(Date.now() + wait * 1000);
        setSt((s) => ({ ...s, status: "rate-limited" }));
        schedule(wait * 1000);
      } else {
        setSt((s) => ({ ...s, status: s.data ? "ready" : "error", error: e.message }));
        schedule(F1_POLL_MS);
      }
    };
    async function full() {
      setSt((s) => ({ ...s, status: s.data ? s.status : "loading" }));
      const data = await loadReplay();
      if (!alive) return;
      backoff.current = 30;
      try { sessionStorage.setItem(F1_CACHE_KEY, JSON.stringify(data)); } catch {}
      setSt({ status: data.cars.length ? "ready" : "empty", data });
    }
    async function tick() {
      if (document.hidden) { schedule(F1_POLL_MS); return; }
      try {
        const cur = dataRef.current;
        if (!cur) await full();
        else {
          const latest = await f1Get("/sessions?session_key=latest");
          const s = latest && latest[latest.length - 1];
          if (s && s.session_key !== cur.session.session_key) await full();
          else setSt((x) => ({ ...x, status: x.data && x.data.cars.length ? "ready" : x.status }));
        }
        schedule(F1_POLL_MS);
      } catch (e) { fail(e); }
    }
    const onVis = () => { if (!document.hidden && !dataRef.current) schedule(0); };
    document.addEventListener("visibilitychange", onVis);
    schedule(dataRef.current ? F1_POLL_MS : 0);
    return () => { alive = false; clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [enabled]);

  useEffectF1(() => {
    if (st.status !== "rate-limited") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [st.status]);

  return {
    ...st,
    retryIn: st.status === "rate-limited" ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0,
  };
}

function fmtF1Date(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

// Short one-line status used in the top bar chip.
function f1StatusText(f1) {
  if (f1.status === "loading" || f1.status === "idle") return "LOADING OPENF1…";
  if (f1.status === "rate-limited") return `RATE LIMITED · RETRYING IN ${f1.retryIn}s`;
  if (f1.status === "error") return "OPENF1 UNAVAILABLE · RETRYING";
  if (f1.status === "empty") return "NO RESULTS YET";
  const s = f1.data && f1.data.session;
  if (!s) return "";
  return `${f1.data.ended ? "REPLAY" : "IN PROGRESS · NOT LIVE"} · ${s.session_name} · ${s.circuit_short_name}`;
}

window.useF1Replay = useF1Replay;
window.fmtF1Date = fmtF1Date;
window.f1StatusText = f1StatusText;
