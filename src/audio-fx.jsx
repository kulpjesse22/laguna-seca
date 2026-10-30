// BROADCAST AUDIO — looping MP3 with dynamic volume modulation
// Uses Web Audio API for smooth gain control. Volume swells and dips
// to simulate cars approaching and receding, like a real trackside mic.
(function() {
  const useS = React.useState;
  const useE = React.useEffect;
  const useR = React.useRef;

  function AudioToggle() {
    const [on, setOn] = useS(false);
    const [masterVol, setMasterVol] = useS(0.7);
    const ctxRef = useR(null);
    const sourceRef = useR(null);
    const gainRef = useR(null);
    const modRef = useR(null);
    const bufferRef = useR(null);
    const audioElRef = useR(null);
    const rafRef = useR(null);

    const ensureCtx = () => {
      if (ctxRef.current) return ctxRef.current;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      // Master gain node
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      gainRef.current = gain;

      return ctx;
    };

    // Dynamic volume modulation — smooth random swells that feel like
    // cars passing the mic position at varying distances
    const startModulation = () => {
      const gain = gainRef.current;
      if (!gain) return;

      let phase = 0;
      let phase2 = Math.random() * Math.PI * 2;
      let phase3 = Math.random() * Math.PI * 2;
      let last = performance.now();

      const tick = (now) => {
        const dt = (now - last) / 1000;
        last = now;

        // Three overlapping sine waves at different speeds for organic feel
        // Fast wave: individual cars passing (2-4s cycle)
        phase += dt * (1.8 + Math.sin(phase3) * 0.6);
        // Medium wave: pack movement (6-10s cycle)
        phase2 += dt * 0.45;
        // Slow wave: broadcast drama swell (15-25s cycle)
        phase3 += dt * 0.18;

        const fast = Math.sin(phase) * 0.25;               // ±25% — car passes
        const med = Math.sin(phase2) * 0.15;                // ±15% — pack flow
        const slow = Math.sin(phase3) * 0.12;               // ±12% — broadcast drama
        const spike = Math.max(0, Math.sin(phase * 1.7) - 0.7) * 0.4; // occasional sharp swell

        const mod = Math.max(0.15, Math.min(1, 0.55 + fast + med + slow + spike));
        const target = masterVol * mod;

        // Smooth ramp — prevents clicks/pops
        const t = ctxRef.current ? ctxRef.current.currentTime : 0;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(target, t, 0.08);

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const stopModulation = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    useE(() => {
      if (on) {
        const ctx = ensureCtx();
        if (ctx.state === "suspended") ctx.resume();

        // Create audio source from the mp3
        if (!audioElRef.current) {
          const a = new Audio("assets/audio/grandprix.mp3");
          a.loop = true;
          a.preload = "auto";
          a.crossOrigin = "anonymous";
          audioElRef.current = a;
        }

        if (!sourceRef.current) {
          sourceRef.current = ctx.createMediaElementSource(audioElRef.current);
          sourceRef.current.connect(gainRef.current);
        }

        // Fade in over 1.5s
        const t = ctx.currentTime;
        gainRef.current.gain.cancelScheduledValues(t);
        gainRef.current.gain.setValueAtTime(0, t);
        gainRef.current.gain.linearRampToValueAtTime(masterVol * 0.5, t + 1.5);

        const p = audioElRef.current.play();
        if (p && p.catch) p.catch(() => {});

        startModulation();
      } else {
        stopModulation();
        if (gainRef.current && ctxRef.current) {
          // Fade out over 0.8s
          const t = ctxRef.current.currentTime;
          gainRef.current.gain.cancelScheduledValues(t);
          gainRef.current.gain.setTargetAtTime(0, t, 0.25);
          // Pause audio after fade
          const el = audioElRef.current;
          if (el) setTimeout(() => { if (!on) el.pause(); }, 900);
        }
      }

      return () => stopModulation();
    }, [on]);

    // Update master volume baseline
    useE(() => {
      // modulation loop handles the actual gain; this just stores the new master
    }, [masterVol]);

    // Cleanup on unmount
    useE(() => () => {
      stopModulation();
      if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.currentTime = 0; }
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        try { ctxRef.current.close(); } catch(e) {}
      }
    }, []);

    const toggle = () => setOn(v => !v);

    return (
      <div className={`audio-fx ${on ? "on" : ""}`}>
        <button
          className="audio-fx-btn"
          onClick={toggle}
          title={on ? "Mute broadcast audio" : "Play broadcast audio"}
          aria-pressed={on}>
          {on ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          )}
          <span className="audio-fx-label">{on ? "AUDIO ON" : "AUDIO OFF"}</span>
        </button>
        {on && (
          <div className="audio-fx-vol">
            <input type="range" min="0" max="1" step="0.01" value={masterVol}
              onChange={(e) => setMasterVol(parseFloat(e.target.value))}
              title="Broadcast volume"/>
          </div>
        )}
      </div>
    );
  }

  window.AudioToggle = AudioToggle;
})();
