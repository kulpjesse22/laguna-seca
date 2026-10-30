// Trailer cold open: ~14 s (about 6 s in embed and on phones), letterboxed, silent, skippable from
// the first frame. Built from photographic stills: slow Ken Burns moves, a few hard cuts between
// dissolves, film grain, vignette and a warm halation on the highlights, sparse lower-thirds, five
// pairs of red lights going out, a beat of black, the title, then a hard cut into the race.
(function () {
  const { useEffect, useRef, useState } = React;
  const TYPE = "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif";
  const MONO = "'JetBrains Mono', ui-monospace, monospace";
  const DIR = "assets/film/";
  const SRC_W = 1280, SRC_H = 720;
  const LOAD_TIMEOUT = 4000, DISSOLVE = 0.4;

  // kb: [scale from, scale to, zoom origin x, zoom origin y] in frame fractions; fy: vertical crop focus.
  function shotList(short, cond, laps) {
    const wetOrNight = cond.weather === "rain" || cond.tod === "night";
    if (short) return [
      { id: "driver-visor", d: 1.3, kb: [1.0, 1.1, 0.5, 0.47] },
      { id: "pit-stop", d: 1.0, cut: true, kb: [1.02, 1.08, 0.5, 0.55] },
      { id: wetOrNight ? "night-barrier" : "corkscrew", d: 1.1, kb: [1.0, 1.07, 0.55, 0.5] },
      { id: "start-lights", d: 1.4, cut: true, kb: [1.0, 1.03, 0.5, 0.35], fy: 0.45, fx: "lights", cap: `Lap 1 of ${laps}` },
      { id: "black", d: 0.3 },
      { id: "title", d: 0.9 },
    ];
    return [
      { id: "tarmac-kerb", d: 1.3, kb: [1.0, 1.08, 0.3, 0.6], cap: "Monterey, California" },
      { id: "garage-helmet", d: 1.1, kb: [1.03, 1.08, 0.68, 0.35] },
      { id: "driver-visor", d: 1.6, cut: true, kb: [1.0, 1.16, 0.5, 0.47], hold: true },
      { id: "pit-wall-engineer", d: 1.0, kb: [1.07, 1.0, 0.6, 0.4] },
      { id: "pit-stop", d: 1.0, cut: true, kb: [1.0, 1.06, 0.5, 0.55] },
      { id: "tyre-macro", d: 0.9, cut: true, kb: [1.03, 1.1, 0.6, 0.5] },
      { id: "corkscrew", d: 1.3, kb: [1.0, 1.08, 0.45, 0.45], cap: "Turn 8 · The Corkscrew" },
      { id: "night-barrier", d: 1.1, kb: [1.02, 1.08, 0.62, 0.55] },
      { id: "halo-pov-rain", d: 1.4, cut: true, kb: [1.03, 1.08, 0.5, 0.45], fx: "pov" },
      { id: "start-lights", d: 1.5, cut: true, kb: [1.0, 1.04, 0.5, 0.35], fy: 0.45, fx: "lights", cap: `Lap 1 of ${laps}` },
      { id: "black", d: 0.35 },
      { id: "title", d: 1.5 },
    ];
  }

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const bandH = (W, H) => Math.min(H, Math.max(W / 2.39, H * 0.56));

  function noiseTile() {
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const x = c.getContext("2d"), img = x.createImageData(160, 160), r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0);
    return c;
  }

  // Highlights only, heavily downsampled (upscaling blurs it), tinted warm: film halation.
  function halation(img) {
    const w = 96, h = 54, c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, w, h);
    try {
      const d = x.getImageData(0, 0, w, h), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const l = (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / 255, k = Math.max(0, l - 0.62) * 2.6;
        p[i] = 255 * Math.min(1, k * 1.1); p[i + 1] = 255 * Math.min(1, k * 0.55); p[i + 2] = 255 * Math.min(1, k * 0.32); p[i + 3] = 255;
      }
      x.putImageData(d, 0, 0);
    } catch (e) { return null; }
    return c;
  }
  function soft(img) {
    const c = document.createElement("canvas");
    c.width = 160; c.height = 90;
    c.getContext("2d").drawImage(img, 0, 0, 160, 90);
    return c;
  }

  function text(ctx, s, x, y, size, opts = {}) {
    ctx.save();
    const set = (z) => {
      ctx.font = `${opts.weight || 800} ${z}px ${opts.family || TYPE}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${(opts.track || 0) * z}px`;
    };
    set(size);
    if (opts.fit) {
      const w = ctx.measureText(s).width;
      if (w > opts.fit) { size *= opts.fit / w; set(size); }
    }
    ctx.textAlign = opts.align || "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
    ctx.fillStyle = opts.color || "#EDE6DA";
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  // Sets up the Ken Burns transform so callers draw in 1280x720 source units.
  function frameXf(ctx, e, sh, k) {
    const [s0, s1, ox, oy] = sh.kb || [1, 1, 0.5, 0.5];
    const m = sh.hold ? easeOut(k * 1.25) : k;
    const s = s0 + (s1 - s0) * m;
    const cover = Math.max(e.bw / SRC_W, e.bh / SRC_H);
    const dx = (e.bw - SRC_W * cover) / 2, dy = (e.bh - SRC_H * cover) * (sh.fy == null ? 0.5 : sh.fy);
    ctx.translate(ox * e.bw, oy * e.bh); ctx.scale(s, s); ctx.translate(-ox * e.bw, -oy * e.bh);
    ctx.translate(dx, dy); ctx.scale(cover, cover);
  }

  function drawShot(ctx, e, sh, k, alpha) {
    if (sh.id === "black") { ctx.fillStyle = "#000"; ctx.globalAlpha = alpha; ctx.fillRect(0, 0, e.bw, e.bh); ctx.globalAlpha = 1; return; }
    if (sh.id === "title") return titleCard(ctx, e, k, alpha);
    const P = e.photos[sh.id];
    if (!P) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (sh.fx === "pov") {
      const t = e.t;
      ctx.translate(Math.sin(t * 37) * 1.6 + Math.sin(t * 23.3) * 1.1, Math.sin(t * 29.1) * 1.3 + Math.sin(t * 51) * 0.6);
    }
    ctx.save();
    frameXf(ctx, e, sh, k);
    if (sh.fx === "pov") {
      // Soft edges: blurred frame underneath, the sharp frame masked to the centre on top.
      ctx.drawImage(P.soft, 0, 0, SRC_W, SRC_H);
      const off = e.off(), o = off.getContext("2d");
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.clearRect(0, 0, off.width, off.height);
      o.setTransform(e.dpr, 0, 0, e.dpr, 0, 0);
      frameXf(o, e, sh, k);
      o.drawImage(P.img, 0, 0, SRC_W, SRC_H);
      o.setTransform(1, 0, 0, 1, 0, 0);
      const cx = off.width / 2, cy = off.height * 0.46;
      const g = o.createRadialGradient(cx, cy, off.height * 0.22, cx, cy, off.width * 0.5);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      o.globalCompositeOperation = "destination-in"; o.fillStyle = g; o.fillRect(0, 0, off.width, off.height);
      o.globalCompositeOperation = "source-over";
      ctx.restore(); ctx.save();
      ctx.drawImage(off, 0, 0, e.bw, e.bh);
      frameXf(ctx, e, sh, k);
    } else {
      ctx.drawImage(P.img, 0, 0, SRC_W, SRC_H);
    }
    if (sh.fx === "lights") lightsOut(ctx, k, alpha);
    if (P.glow) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = alpha * 0.34;
      ctx.drawImage(P.glow, 6, 0, SRC_W, SRC_H);
      ctx.globalAlpha = alpha * 0.16;
      ctx.drawImage(P.glow, -10, -4, SRC_W * 1.02, SRC_H * 1.02);
    }
    ctx.restore();
    if (sh.fx === "pov") rainStreaks(ctx, e, alpha);
    ctx.restore();
  }

  // The photo has all ten lamps lit; pairs go dark left to right, then a held beat.
  const LAMPS = [[266, 318], [447, 498], [627, 678], [807, 858], [986, 1036]], LAMP_Y = 239, LAMP_R = 22;
  function lightsOut(ctx, k, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    LAMPS.forEach((pair, i) => {
      const out = clamp01((k - (0.3 + i * 0.1)) / 0.05);
      if (!out) return;
      pair.forEach((x) => {
        const g = ctx.createRadialGradient(x, LAMP_Y, 0, x, LAMP_Y, LAMP_R * 2);
        g.addColorStop(0, `rgba(16,6,6,${out})`); g.addColorStop(0.5, `rgba(14,6,6,${out * 0.97})`);
        g.addColorStop(0.72, `rgba(20,10,10,${out * 0.5})`); g.addColorStop(1, "rgba(20,10,10,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, LAMP_Y, LAMP_R * 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,80,60,${0.05 * out})`; ctx.beginPath(); ctx.arc(x - 6, LAMP_Y - 6, 5, 0, Math.PI * 2); ctx.fill();
      });
    });
    const n = LAMPS.filter((_, i) => k > 0.3 + i * 0.1).length;
    ctx.fillStyle = `rgba(0,0,0,${0.07 * n})`;
    ctx.fillRect(0, 0, SRC_W, SRC_H);
    ctx.restore();
  }

  function rainStreaks(ctx, e, alpha) {
    const r = rng(11), t = e.t;
    ctx.save();
    ctx.globalAlpha = alpha * 0.28;
    ctx.strokeStyle = "rgba(220,228,236,1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 90; i++) {
      const x0 = r() * e.bw * 1.3, sp = 1.4 + r() * 1.2, len = e.bh * (0.06 + r() * 0.1);
      const y = ((r() + t * sp) % 1) * (e.bh + len) - len, x = x0 - y * 0.22;
      ctx.moveTo(x, y); ctx.lineTo(x - len * 0.22, y + len);
    }
    ctx.stroke();
    ctx.restore();
  }

  function titleCard(ctx, e, k, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, e.bw, e.bh);
    const a = ease(k / 0.18) * alpha, size = Math.min(e.bw * 0.052, e.bh * 0.12) * (1 + 0.03 * k), tr = 0.5 - 0.06 * k;
    const g = ctx.createRadialGradient(e.bw / 2, e.bh * 0.47, 0, e.bw / 2, e.bh * 0.47, e.bw * 0.3);
    g.addColorStop(0, `rgba(255,190,140,${0.06 * a})`); g.addColorStop(1, "rgba(255,190,140,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, e.bw, e.bh);
    text(ctx, e.name, e.bw / 2 + tr * size / 2, e.bh * 0.47, size, { weight: 300, track: tr, alpha: a, fit: e.bw * 0.8 });
    const sub = Math.max(9, size * 0.2);
    text(ctx, e.round, e.bw / 2 + 0.25 * sub, e.bh * 0.47 + size * 1.1, sub, { weight: 500, family: MONO, track: 0.5, alpha: a * 0.45, fit: e.bw * 0.8 });
    ctx.restore();
  }

  function caption(ctx, e, s, k, d) {
    const a = Math.min(ease((k * d - 0.2) / 0.35), ease((d - k * d) / 0.3));
    if (a <= 0) return;
    const size = Math.max(9, Math.min(13, e.bw * 0.0095)), x = Math.max(16, e.bw * 0.045), y = e.bh - Math.max(18, e.bh * 0.09);
    ctx.save();
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = "#EDE6DA";
    ctx.fillRect(x, y - size * 1.4, size * 2.2, 1);
    ctx.restore();
    text(ctx, s.toUpperCase(), x, y, size, { weight: 500, family: MONO, track: 0.32, alpha: a * 0.82, align: "left", fit: e.bw * 0.8 });
  }

  function grade(ctx, e, grainPat, t) {
    const W = e.bw, bh = e.bh;
    const v = ctx.createRadialGradient(W / 2, bh / 2, Math.min(W, bh) * 0.36, W / 2, bh / 2, Math.hypot(W, bh) * 0.62);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, bh);
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.11;
    const r = rng(Math.floor(t * 24));
    ctx.translate(-r() * 160, -r() * 160);
    ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W + 160, bh + 160);
    ctx.restore();
  }

  function Intro({ track, trackEvent, short, reduce, freezeAt, onReveal, onDone }) {
    const wrapRef = useRef(null), canvasRef = useRef(null);
    const doneRef = useRef(false), revealRef = useRef(false);
    const [ready, setReady] = useState(false);
    const cond = (window.RaceModel && window.RaceModel.COND) || { tod: "day", weather: "dry" };
    const reveal = () => { if (!revealRef.current) { revealRef.current = true; onReveal(); } };
    const shots = reduce ? [{ id: "driver-visor", d: 1, kb: [1.04, 1.04, 0.5, 0.47] }] : shotList(short, cond, track.laps || 95);
    const total = shots.reduce((s, x) => s + x.d, 0);
    const finish = () => { if (doneRef.current) return; doneRef.current = true; reveal(); onDone(); };

    useEffect(() => {
      const cv = canvasRef.current, wrap = wrapRef.current, ctx = cv.getContext("2d");
      const grainPat = ctx.createPattern(noiseTile(), "repeat");
      const env = {
        photos: {},
        name: track.short.toUpperCase(), round: `${trackEvent.round} · ${(track.location || "").split(",")[0]}`.toUpperCase(),
      };
      let offC = null;
      env.off = () => {
        const w = cv.width, h = Math.round(env.bh * dpr);
        if (!offC) offC = document.createElement("canvas");
        if (offC.width !== w || offC.height !== h) { offC.width = w; offC.height = h; }
        return offC;
      };
      let W = 0, H = 0, dpr = 1, raf = 0, elapsed = freezeAt != null ? freezeAt : 0, last = null, loaded = false, dead = false;
      const resize = () => {
        const r = wrap.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
        cv.width = W * dpr; cv.height = H * dpr;
      };
      const shotAt = (t) => {
        let acc = 0, i = 0;
        while (i < shots.length - 1 && t >= acc + shots[i].d) { acc += shots[i].d; i++; }
        return [i, acc];
      };
      const frame = (t) => {
        const bh = bandH(W, H), y0 = (H - bh) / 2;
        Object.assign(env, { bw: W, bh, y0, t, dpr });
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
        if (!loaded) return;
        ctx.save();
        ctx.translate(0, y0);
        ctx.beginPath(); ctx.rect(0, 0, W, bh); ctx.clip();
        if (reduce) {
          drawShot(ctx, env, shots[0], 0, 1);
          const sh = ctx.createLinearGradient(0, bh * 0.45, 0, bh);
          sh.addColorStop(0, "rgba(0,0,0,0.15)"); sh.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = sh; ctx.fillRect(0, 0, W, bh);
          titleText(ctx, env);
          grade(ctx, env, grainPat, 0);
        } else {
          const [i, acc] = shotAt(t), sh = shots[i], lt = t - acc, k = clamp01(lt / sh.d);
          const prev = shots[i - 1];
          const blend = i > 0 && !sh.cut && prev.id !== "black" && sh.id !== "title" && lt < DISSOLVE;
          if (blend) drawShot(ctx, env, prev, 1 + lt / prev.d, 1);
          const inA = i === 0 ? ease(lt / 0.5) : blend ? ease(lt / DISSOLVE) : 1;
          if (i === 0) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, bh); }
          drawShot(ctx, env, sh, k, inA);
          if (sh.id !== "title" && sh.id !== "black") grade(ctx, env, grainPat, t);
          if (sh.cap) caption(ctx, env, sh.cap, k, sh.d);
          if (sh.id === "title" && freezeAt == null) reveal();
        }
        ctx.restore();
      };
      resize();
      const ro = new ResizeObserver(() => { resize(); frame(elapsed); });
      ro.observe(wrap);

      const need = [...new Set(shots.map((s) => s.id).filter((id) => id !== "black" && id !== "title"))];
      const suffix = short ? "-sm" : "";
      const timeout = setTimeout(() => { if (!loaded) finish(); }, LOAD_TIMEOUT);
      Promise.all(need.map((id) => new Promise((res, rej) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => res([id, img]));
        img.onerror = rej;
        img.src = `${DIR}${id}${suffix}.webp`;
      }))).then((list) => {
        if (dead || doneRef.current) return;
        list.forEach(([id, img]) => { env.photos[id] = { img, glow: halation(img), soft: soft(img) }; });
        loaded = true;
        clearTimeout(timeout);
        setReady(true);
        start();
      }).catch(() => { if (!dead) finish(); });

      const tick = (now) => {
        // Wall-clock pacing so slow devices still finish on time; hiding the tab resets `last`.
        if (last != null) elapsed += Math.min(1, (now - last) / 1000);
        last = now;
        if (elapsed >= total) { finish(); return; }
        frame(elapsed);
        raf = requestAnimationFrame(tick);
      };
      const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (loaded && !raf && !doneRef.current) { last = null; raf = requestAnimationFrame(tick); } };
      const start = () => {
        if (reduce || freezeAt != null) { frame(elapsed); return; }
        raf = requestAnimationFrame(tick);
        document.addEventListener("visibilitychange", onVis);
      };
      frame(0);
      return () => { dead = true; clearTimeout(timeout); cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); };
    }, []);

    useEffect(() => {
      const onKey = (e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopImmediatePropagation(); finish(); }
      };
      window.addEventListener("keydown", onKey, true);
      return () => window.removeEventListener("keydown", onKey, true);
    }, []);

    return (
      <div className={`intro ${ready ? "is-ready" : ""}`} ref={wrapRef} onClick={finish}>
        <canvas ref={canvasRef} className="intro-canvas" role="img"
          aria-label={`Trailer: ${track.short}, ${trackEvent.round}. A simulated race, ${env0(cond)}.`}/>
        {reduce
          ? <button type="button" className="intro-skip intro-enter" autoFocus onClick={(e) => { e.stopPropagation(); finish(); }}><window.StageIX.Scr text="Enter"/> <kbd>↵</kbd></button>
          : <button type="button" className="intro-skip" autoFocus onClick={(e) => { e.stopPropagation(); finish(); }}><window.StageIX.Scr text="Skip"/> <kbd>Esc</kbd></button>}
      </div>
    );
  }
  function titleText(ctx, e) {
    const size = Math.min(e.bw * 0.07, e.bh * 0.15);
    text(ctx, e.name, e.bw / 2, e.bh * 0.76, size, { weight: 300, track: 0.55, fit: e.bw * 0.84 });
    text(ctx, e.round, e.bw / 2, e.bh * 0.76 + size * 0.95, Math.max(9, size * 0.17), { track: 0.4, weight: 500, family: MONO, alpha: 0.6, fit: e.bw * 0.9 });
  }
  const env0 = (c) => `${c.tod}${c.weather === "rain" ? ", in the rain" : ""}`;

  window.Intro = Intro;
})();
