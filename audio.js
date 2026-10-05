// ============ MOGUL: THE MONEY RACE — AUDIO (v3) ============
// Tiny procedural WebAudio synth. No files, no fuss.
// Restrained by default — think Notion, not slot-machine hell.
// (The casino is exempt from good taste.)
"use strict";

const Sound = (() => {
  let ctx = null;
  let master = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { return false; }
    return true;
  }

  // one enveloped oscillator note
  function note(freq, { t = 0, dur = 0.09, type = "sine", vol = 0.5, glide = 0 } = {}) {
    const start = ctx.currentTime + t;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + glide), start + dur);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
    osc.connect(g).connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  function noiseBurst({ t = 0, dur = 0.05, vol = 0.18, freq = 3000 } = {}) {
    const start = ctx.currentTime + t;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.4;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(master);
    src.start(start);
  }

  const SOUNDS = {
    click:  () => note(2400, { dur: 0.035, type: "triangle", vol: 0.12 }),
    tick:   () => noiseBurst({ dur: 0.025, vol: 0.14, freq: 4200 }),
    buy:    () => { note(523.25, { dur: 0.07, type: "triangle", vol: 0.3 }); note(783.99, { t: 0.06, dur: 0.1, type: "triangle", vol: 0.3 }); },
    sell:   () => { note(659.25, { dur: 0.07, type: "triangle", vol: 0.3 }); note(440,    { t: 0.06, dur: 0.1, type: "triangle", vol: 0.3 }); },
    win:    () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, { t: i * 0.07, dur: 0.14, type: "triangle", vol: 0.32 })),
    lose:   () => { note(130.81, { dur: 0.22, type: "sine", vol: 0.42, glide: -40 }); noiseBurst({ dur: 0.08, vol: 0.1, freq: 300 }); },
    unlock: () => { note(880, { dur: 0.12, type: "sine", vol: 0.3 }); note(1318.5, { t: 0.09, dur: 0.22, type: "sine", vol: 0.28 }); },
    swan:   () => { note(55, { dur: 1.1, type: "sawtooth", vol: 0.22, glide: -18 }); note(58.27, { dur: 1.1, type: "sawtooth", vol: 0.16, glide: -20 }); },
    jackpot:() => [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => note(f, { t: i * 0.08, dur: 0.2, type: "square", vol: 0.16 })),
  };

  function play(name) {
    if (typeof S !== "undefined" && S && S.settings && S.settings.muted) return;
    if (!ensure()) return;
    if (ctx.state === "suspended") ctx.resume();
    const fn = SOUNDS[name];
    if (fn) { try { fn(); } catch (e) {} }
  }

  // browsers need a user gesture before audio can start
  function init() {
    const kick = () => { ensure(); if (ctx && ctx.state === "suspended") ctx.resume(); };
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
  }

  return { play, init };
})();
