// ──────────────────────────────────────────────────────────────
// audio.js — everything is synthesised at runtime; no asset files.
// ──────────────────────────────────────────────────────────────

import { profile } from './storage.js';
import { rng } from './math.js';

let ctx = null;
let sfxBus = null;
let musicBus = null;
let noiseBuffer = null;
let unlocked = false;

/** SFX fired in the same millisecond get thinned out to avoid clipping. */
const lastPlayed = new Map();

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  sfxBus = ctx.createGain();
  musicBus = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 8;
  sfxBus.connect(comp);
  musicBus.connect(comp);
  comp.connect(ctx.destination);
  applyVolumes();

  // Shared white-noise buffer for explosions / hits.
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

export function applyVolumes() {
  if (!ctx) return;
  const s = profile.settings;
  sfxBus.gain.value = s.master * s.sfx;
  musicBus.gain.value = s.master * s.music * 0.5;
}

/** Browsers require a user gesture before audio may start. */
export function unlockAudio() {
  if (unlocked) return;
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  unlocked = true;
}

function env(node, peak, attack, decay, when) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  node.connect(g);
  return g;
}

function tone({ freq, to, type = 'square', peak = 0.2, attack = 0.005, decay = 0.12, delay = 0, detune = 0 }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, t);
  if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + attack + decay);
  const g = env(osc, peak, attack, decay, t);
  g.connect(sfxBus);
  osc.start(t);
  osc.stop(t + attack + decay + 0.02);
}

function noise({ peak = 0.3, decay = 0.3, cutoff = 900, sweepTo = 60, type = 'lowpass', delay = 0 }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  src.playbackRate.value = 0.8 + rng() * 0.5;
  const filt = c.createBiquadFilter();
  filt.type = type;
  filt.frequency.setValueAtTime(cutoff, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + decay);
  src.connect(filt);
  const g = env(filt, peak, 0.005, decay, t);
  g.connect(sfxBus);
  src.start(t);
  src.stop(t + decay + 0.05);
}

const RECIPES = {
  shoot: () => tone({ freq: 880, to: 300, type: 'square', peak: 0.055, decay: 0.06 }),
  shootHeavy: () => {
    tone({ freq: 300, to: 90, type: 'sawtooth', peak: 0.09, decay: 0.13 });
    noise({ peak: 0.05, decay: 0.09, cutoff: 1400 });
  },
  laser: () => {
    tone({ freq: 1500, to: 260, type: 'sawtooth', peak: 0.08, decay: 0.22 });
    tone({ freq: 760, to: 130, type: 'square', peak: 0.05, decay: 0.22, detune: 8 });
  },
  hit: () => noise({ peak: 0.12, decay: 0.07, cutoff: 2600, sweepTo: 700, type: 'bandpass' }),
  explode: () => {
    noise({ peak: 0.34, decay: 0.42, cutoff: 700, sweepTo: 40 });
    tone({ freq: 160, to: 40, type: 'triangle', peak: 0.16, decay: 0.32 });
  },
  bigExplode: () => {
    noise({ peak: 0.45, decay: 0.9, cutoff: 500, sweepTo: 30 });
    tone({ freq: 110, to: 24, type: 'sine', peak: 0.3, decay: 0.8 });
    noise({ peak: 0.2, decay: 0.5, cutoff: 1800, sweepTo: 200, delay: 0.08 });
  },
  pickup: () => [660, 880, 1320].forEach((f, i) => tone({ freq: f, type: 'sine', peak: 0.13, decay: 0.1, delay: i * 0.05 })),
  coin: () => tone({ freq: 1500, to: 2100, type: 'sine', peak: 0.06, decay: 0.06 }),
  xp: () => tone({ freq: 1250, to: 1600, type: 'sine', peak: 0.04, decay: 0.045 }),
  levelUp: () => [392, 523, 659, 880, 1175].forEach((f, i) => tone({ freq: f, type: 'triangle', peak: 0.2, decay: 0.22, delay: i * 0.07 })),
  ability: () => {
    tone({ freq: 220, to: 1100, type: 'sawtooth', peak: 0.12, decay: 0.28 });
    noise({ peak: 0.1, decay: 0.25, cutoff: 3000, sweepTo: 500, type: 'bandpass' });
  },
  damage: () => {
    noise({ peak: 0.3, decay: 0.3, cutoff: 400, sweepTo: 60 });
    tone({ freq: 200, to: 60, type: 'square', peak: 0.16, decay: 0.25 });
  },
  shield: () => tone({ freq: 300, to: 900, type: 'sine', peak: 0.15, decay: 0.35 }),
  nuke: () => {
    noise({ peak: 0.5, decay: 1.4, cutoff: 900, sweepTo: 30 });
    tone({ freq: 90, to: 20, type: 'sine', peak: 0.34, decay: 1.2 });
  },
  bossWarn: () => [110, 110, 146].forEach((f, i) => tone({ freq: f, type: 'sawtooth', peak: 0.22, decay: 0.35, delay: i * 0.34 })),
  ui: () => tone({ freq: 620, to: 780, type: 'square', peak: 0.05, decay: 0.05 }),
  uiBack: () => tone({ freq: 420, to: 260, type: 'square', peak: 0.05, decay: 0.07 }),
  buy: () => [523, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', peak: 0.16, decay: 0.16, delay: i * 0.06 })),
  denied: () => tone({ freq: 180, to: 120, type: 'square', peak: 0.12, decay: 0.18 }),
  gameOver: () => [440, 349, 261, 174].forEach((f, i) => tone({ freq: f, type: 'triangle', peak: 0.22, decay: 0.5, delay: i * 0.18 })),
  victory: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, type: 'square', peak: 0.18, decay: 0.3, delay: i * 0.12 })),
  achievement: () => [880, 1174, 1568].forEach((f, i) => tone({ freq: f, type: 'sine', peak: 0.18, decay: 0.25, delay: i * 0.09 })),
};

export function sfx(name, { throttle = 0 } = {}) {
  if (!unlocked || profile.settings.master <= 0 || profile.settings.sfx <= 0) return;
  const recipe = RECIPES[name];
  if (!recipe) return;
  if (throttle) {
    const now = performance.now();
    if (now - (lastPlayed.get(name) || 0) < throttle) return;
    lastPlayed.set(name, now);
  }
  try {
    recipe();
  } catch {
    /* audio glitches must never break the game loop */
  }
}

// ── Music: a slow arpeggiated bass pad that swaps scale per phase ──

const SCALES = [
  [55, 65.41, 82.41, 98, 110, 130.81],   // A minor-ish
  [61.74, 73.42, 92.5, 110, 123.47, 146.83],
  [49, 58.27, 73.42, 87.31, 98, 116.54],
  [65.41, 77.78, 98, 116.54, 130.81, 155.56],
];

const music = { on: false, step: 0, timer: 0, scale: 0, intensity: 0, tempo: 0.28 };

export function setMusicScale(i) {
  music.scale = i % SCALES.length;
}

export function setMusicIntensity(v) {
  music.intensity = v;
}

export function startMusic() {
  if (!ensure()) return;
  music.on = true;
  music.step = 0;
  music.timer = 0;
}

export function stopMusic() {
  music.on = false;
}

/** Driven from the render loop so it pauses with the game. */
export function updateMusic(dt) {
  if (!music.on || !ctx || profile.settings.music <= 0 || profile.settings.master <= 0) return;
  const tempo = music.tempo * (1 - music.intensity * 0.28);
  music.timer += dt;
  if (music.timer < tempo) return;
  music.timer -= tempo;

  const scale = SCALES[music.scale];
  const step = music.step++;
  const t = ctx.currentTime;

  // Bass root every 4 steps
  if (step % 4 === 0) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = scale[0] / 2;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(320 + music.intensity * 500, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.24, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + tempo * 3.4);
    o.connect(f);
    f.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + tempo * 3.6);
  }

  // Arp voice
  const note = scale[(step * 2 + (step % 3)) % scale.length] * (step % 8 < 4 ? 2 : 4);
  const o2 = ctx.createOscillator();
  o2.type = step % 2 ? 'triangle' : 'square';
  o2.frequency.value = note;
  const g2 = ctx.createGain();
  const peak = 0.05 + music.intensity * 0.05;
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + tempo * 0.9);
  o2.connect(g2);
  g2.connect(musicBus);
  o2.start(t);
  o2.stop(t + tempo);

  // Hat on the offbeat once the fight heats up
  if (music.intensity > 0.25 && step % 2 === 1 && noiseBuffer) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.06 * music.intensity, t);
    g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(hp);
    hp.connect(g3);
    g3.connect(musicBus);
    src.start(t);
    src.stop(t + 0.08);
  }
}
