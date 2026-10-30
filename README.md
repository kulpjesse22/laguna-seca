# Laguna Seca

A simulated race-control dashboard for the fictional APEX Series, plus a replay view of real F1 results from [OpenF1](https://openf1.org). Deployed at [laguna-seca.app](https://laguna-seca.app) (Vercel project `laguna-seca`, root directory `sites/laguna-seca`).

It's a static site. The source is plain JSX in `src/`, where each file exposes its components on `window`. Those files are compiled in a fixed order into one minified bundle, `app.bundle.js`, which is committed. React 18.3.1 production builds load from unpkg with SRI. There's no Babel at runtime.

Build: `node sites/laguna-seca/build.mjs` (run from the repo root; add `--dev` for an unminified bundle)

The build uses the Oxc transform and minifier that ship with the repo's `vite` dependency, so it installs nothing extra. Rebuild and commit `app.bundle.js` whenever you change `src/`.

Run locally: `python3 -m http.server 4402 --directory sites/laguna-seca`

URL flags:

- `?embed=1` gives the compact layout used inside Kulpritt OS. It turns on automatically when the page is framed, and `?embed=0` forces it off.
- `?f1=1` opens the Real F1 replay.
- `?edit=1` shows the tweaks panel.
- `?intro=0` skips the trailer; `?intro=1` forces it. `?seed=N` replays a specific race.

Interacting with the race view:

- Hover the bottom strip to raise it; its tabs switch between timeline, pit windows, weather, gaps, tyre stints and session.
- Hover any driver name (or car) for a hovercard. Click a car to follow it; Esc or a click on empty track releases.
- While following, `A` toggles the live airflow overlay (wake, dirty air on the car behind, DRS); `W` opens the full wind tunnel.
- With a mouse, hovering the track shows a 2.5× loupe with corner names.
- `C` (or the Broadcast / Cockpit toggle) switches to the driver's-eye view of the focused car (`src/cockpit.jsx`); ‹ › in the Onboard label steps through the field. In the cockpit the side and bottom panels become driver instruments: mirrors, race engineer, next corner, tyres and brakes, energy, road ahead and sectors (`src/cockpit-cards.jsx`). `?view=cockpit`, `?tod=day|dusk|night` and `?weather=dry|rain` open it directly.
- `←`/`→` move between cards, `[`/`]` switch panels, `P` opens the pit wall. Labels decode on hover (`src/scramble-text.jsx`).

Everything in the simulated race is fictional: teams, drivers, sponsors, telemetry and timing. One seeded model (`src/race-model.jsx`) drives the map, gaps, laps and positions.
