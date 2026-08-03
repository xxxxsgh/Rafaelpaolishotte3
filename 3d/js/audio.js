// ═══════════════════════════════════════════════════════════════════
// AUDIO — sons sintetizados via Web Audio API (sem arquivos externos)
// Portado e ampliado a partir do playSound() do jogo 2D original.
// ═══════════════════════════════════════════════════════════════════

let ctx = null;
let master = null;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;

export const Audio = {
  volume: 0.5,
  enabled: true,
  musicEnabled: true,

  init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    return ctx;
  },

  resume() {
    if (!ctx) this.init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  },

  setVolume(v) {
    this.volume = v;
    if (master) master.gain.value = v;
  },

  // ─ helpers ─────────────────────────────────────────────────────
  _gain(vol, dur, t0) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, vol), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(master);
    return g;
  },

  _tone(type, f0, f1, vol, dur, delay = 0) {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    const g = this._gain(vol, dur, t0);
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },

  _noise(vol, dur, cutFrom, cutTo) {
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutFrom, t0);
    f.frequency.exponentialRampToValueAtTime(cutTo, t0 + dur);
    const g = this._gain(vol, dur, t0);
    src.connect(f); f.connect(g);
    src.start(t0);
    src.stop(t0 + dur);
  },

  // ─ efeitos ─────────────────────────────────────────────────────
  play(name) {
    if (!this.enabled) return;
    if (!ctx) this.init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    try {
      switch (name) {
        case 'shoot':     this._tone('square', 900, 400, 0.07, 0.07); break;
        case 'shootBig':  this._tone('sawtooth', 420, 120, 0.10, 0.16); break;
        case 'laser':     this._tone('sawtooth', 1400, 300, 0.10, 0.18); break;
        case 'enemyShot': this._tone('triangle', 320, 140, 0.05, 0.12); break;
        case 'hit':       this._tone('square', 1200, 700, 0.05, 0.05); break;
        case 'explosion': this._noise(0.30, 0.45, 500, 40); break;
        case 'bigExplosion':
          this._noise(0.45, 0.9, 800, 30);
          this._tone('sine', 120, 30, 0.28, 0.8);
          break;
        case 'hurt':
          this._tone('sawtooth', 260, 60, 0.22, 0.35);
          this._noise(0.14, 0.25, 900, 100);
          break;
        case 'powerup':
          [523, 659, 784, 1047].forEach((f, i) => this._tone('sine', f, f, 0.10, 0.11, i * 0.07));
          break;
        case 'levelUp':
          [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this._tone('sine', f, f, 0.15, 0.17, i * 0.09));
          break;
        case 'coin':      this._tone('square', 1560, 2100, 0.05, 0.07); break;
        case 'xp':        this._tone('sine', 1400, 1900, 0.04, 0.06); break;
        case 'ability':
          this._tone('sawtooth', 180, 900, 0.14, 0.28);
          this._tone('sine', 900, 1800, 0.08, 0.3, 0.05);
          break;
        case 'shield':    this._tone('sine', 300, 1200, 0.12, 0.4); break;
        case 'bossIntro':
          [110, 110, 146, 110, 196, 185].forEach((f, i) => this._tone('sawtooth', f, f * 0.98, 0.16, 0.4, i * 0.24));
          break;
        case 'bossDeath':
          this._noise(0.5, 1.6, 1200, 20);
          [220, 165, 110, 55].forEach((f, i) => this._tone('sawtooth', f, f * 0.5, 0.2, 0.7, i * 0.18));
          break;
        case 'gameOver':
          [440, 349, 261, 174].forEach((f, i) => this._tone('triangle', f, f * 0.94, 0.2, 0.6, i * 0.22));
          break;
        case 'victory':
          [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this._tone('square', f, f, 0.13, 0.3, i * 0.12));
          break;
        case 'ui':        this._tone('square', 700, 900, 0.04, 0.04); break;
        case 'warn':      this._tone('sawtooth', 180, 180, 0.10, 0.2); break;
      }
    } catch (e) { /* áudio nunca deve quebrar o jogo */ }
  },

  // ─ trilha: arpejo procedural em loop ───────────────────────────
  startMusic(scaleIdx = 0) {
    if (!this.musicEnabled) return;
    if (!ctx) this.init();
    if (!ctx) return;
    this.stopMusic();
    const scales = [
      [55, 65.4, 82.4, 98, 110, 130.8],   // menor
      [58.3, 69.3, 87.3, 103.8, 116.5, 138.6],
      [61.7, 73.4, 92.5, 110, 123.5, 146.8],
    ];
    const scale = scales[scaleIdx % scales.length];
    musicStep = 0;
    const tick = () => {
      if (!this.musicEnabled || !ctx) return;
      const t0 = ctx.currentTime;
      const root = scale[musicStep % scale.length];
      // baixo
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(root, t0);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(600, t0);
      o.connect(f); f.connect(g); g.connect(musicGain);
      o.start(t0); o.stop(t0 + 0.5);
      // arpejo agudo a cada 2 passos
      if (musicStep % 2 === 0) {
        const o2 = ctx.createOscillator();
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(root * 4, t0);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.0001, t0);
        g2.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o2.connect(g2); g2.connect(musicGain);
        o2.start(t0); o2.stop(t0 + 0.32);
      }
      musicStep++;
    };
    tick();
    musicTimer = setInterval(tick, 380);
  },

  stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  },
};
