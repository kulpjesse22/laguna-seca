// Precompiles src/*.jsx into one minified app.bundle.js (no Babel in the browser).
// Uses the Oxc transformer + minifier that ship inside the repo's Vite dependency.
// Run from the repo root:  node sites/laguna-seca/build.mjs   (add --dev for an unminified bundle)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transformWithOxc, minify } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes("--dev");

// Load order matters: files share state through window.* globals.
const FILES = [
  "data.jsx",
  "scramble-text.jsx",
  "classes.jsx",
  "tracks.jsx",
  "race-model.jsx",
  "cine-director.jsx",
  "f1-car.jsx",
  "track-history.jsx",
  "airflow.jsx",
  "track-component.jsx",
  "panels.jsx",
  "driver-view.jsx",
  "tweaks-panel.jsx",
  "audio-fx.jsx",
  "openf1.jsx",
  "weather-fx.jsx",
  "aero-sim.jsx",
  "intro.jsx",
  "stage-ix.jsx",
  "cockpit.jsx",
  "cockpit-cards.jsx",
  "stage-layout.jsx",
  "app.jsx",
];

const parts = [];
for (const f of FILES) {
  const src = readFileSync(join(here, "src", f), "utf8");
  const { code } = await transformWithOxc(src, f, {
    lang: "jsx",
    jsx: { runtime: "classic", pragma: "React.createElement", pragmaFrag: "React.Fragment" },
    target: "es2020",
  });
  parts.push(`// ${f}\n${code}`);
}
let out = `(function(){\n${parts.join("\n")}\n})();\n`;
if (!dev) {
  const res = await minify("app.bundle.js", out, { compress: true, mangle: true });
  out = res.code;
}
writeFileSync(join(here, "app.bundle.js"), out);
console.log(`app.bundle.js ${(out.length / 1024).toFixed(1)} KB${dev ? " (dev)" : ""}`);
