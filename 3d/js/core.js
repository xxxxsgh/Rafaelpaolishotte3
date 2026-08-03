/* ═══════════════════════════════════════════════════════════════════
   CORE — estado, save, áudio, utilitários, input
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Utilitários ─────────────────────────────────────────────────── */
const clamp = (v, mn, mx) => (v < mn ? mn : v > mx ? mx : v);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const pad2 = n => n.toString().padStart(2, '0');
const formatTime = s => pad2(Math.floor(s / 60)) + ':' + pad2(Math.floor(s % 60));
const getDifficultyMult = () => DIFFICULTY_CFG[State.difficulty]?.multiplier ?? 1;
const $ = id => document.getElementById(id);

/* ─── Relógio de jogo (pausa junto com o jogo) ────────────────────── */
const Clock = {
  t: 0,
  step(ms) { this.t += ms; },
  now() { return this.t; },
};
const now = () => Clock.t;

/* ─── Estado ──────────────────────────────────────────────────────── */
const State = {
  running: false, paused: false, over: false,
  mode: 'campaign',           // campaign | infinite | survivor | bossrush
  infiniteMode: false, survivorMode: false, bossRushMode: false, twoPlayer: false,
  difficulty: 'normal', survivorDifficulty: 'normal',
  selectedChar: ['marcelo', 'robos'],
  players: [],
  enemies: [], boss: null, powerUps: [], xpOrbs: [], enemyBullets: [],
  scores: [0, 0],
  gameLevel: 1, wave: 1, bossSpawned: false, uniqueSpawned: false, lastEnemySpawn: 0,
  powerUpActive: false, powerUpEndTime: 0, shieldActive: false, shieldEndTime: 0,
  doubleDamage: false, doubleDamageEnd: 0,
  xp: 0, xpToNextLevel: 100, level: 1,
  survivorAbilities: freshSurvivorAbilities(),
  survivorStartTime: 0, survivorElapsed: 0, magnetRadius: 0, xpMultiplier: 1,
  infiniteCooldowns: { nuke: 0, heal: 0, shield: 0 },
  bossRushIndex: 0,
  runUpgrades: {}, phoenixUsed: false,
  gameStartTime: 0,
  // persistente
  coins: 0, equippedSkin: 'default', unlockedSkins: ['default'],
  unlockedChars: ['marcelo'], achievements: [], unlockedSkills: {},
  stats: {
    enemiesKilled: 0, bossesDefeated: 0, totalCoinsEarned: 0,
    longestSurvival: 0, perfectLevels: 0, finalBossOnExtreme: 0,
    powerupsCollected: 0, maxCombo: 0, currentCombo: 0, lastKillTime: 0,
    phaseDamageTaken: 0, maxInfiniteWave: 0, charactersPlayed: 0,
    charactersUsed: [], maxSurvivorTime: 0, maxUpgradeLevel: 0,
    multiplayerWins: 0, maxPhase: 0, gamesPlayed: 0,
    bombersKilled: 0, ddCollected: 0, newCharPlayed: false,
    bossRushDone: false, rainbowUsed: false, skillsUnlocked: 0,
  },
};

/* ─── Persistência ────────────────────────────────────────────────── */
function saveGameData() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1,
      coins: State.coins, equippedSkin: State.equippedSkin,
      unlockedSkins: State.unlockedSkins, unlockedChars: State.unlockedChars,
      achievements: State.achievements, unlockedSkills: State.unlockedSkills,
      stats: State.stats, difficulty: State.difficulty,
    }));
  } catch (e) { /* storage cheio ou bloqueado */ }
}

function loadGameData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    State.coins = d.coins || 0;
    State.equippedSkin = d.equippedSkin || 'default';
    State.unlockedSkins = d.unlockedSkins || ['default'];
    State.unlockedChars = d.unlockedChars || ['marcelo'];
    State.achievements = d.achievements || [];
    State.unlockedSkills = d.unlockedSkills || {};
    State.difficulty = d.difficulty || 'normal';
    Object.assign(State.stats, d.stats || {});
  } catch (e) { /* save corrompido — ignora */ }
}

function addCoins(amount) {
  const n = Math.floor(amount);
  if (n <= 0) return;
  State.coins += n;
  State.stats.totalCoinsEarned += n;
  UI.updateCoins();
}

/* ─── High scores ─────────────────────────────────────────────────── */
function loadHighScores() {
  try { return JSON.parse(localStorage.getItem(HS_KEY)) || { campaign: [], infinite: [], survivor: [], bossrush: [] }; }
  catch (e) { return { campaign: [], infinite: [], survivor: [], bossrush: [] }; }
}

function saveHighScore(mode, score) {
  const hs = loadHighScores();
  if (!hs[mode]) hs[mode] = [];
  const isNew = hs[mode].length < 5 || score > (hs[mode][hs[mode].length - 1] || 0);
  hs[mode].push(score);
  hs[mode].sort((a, b) => b - a);
  hs[mode] = hs[mode].slice(0, 5);
  try { localStorage.setItem(HS_KEY, JSON.stringify(hs)); } catch (e) { /* noop */ }
  return isNew && score > 0;
}

const getCurrentHSMode = () =>
  State.bossRushMode ? 'bossrush' : State.survivorMode ? 'survivor' : State.infiniteMode ? 'infinite' : 'campaign';

/* ─── Áudio sintetizado (mesmos sons do original) ─────────────────── */
let _audioCtx = null;
const Audio3D = {
  volume: 0.5,
  enabled: true,
  ctx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
  },
  gain(ctx, vol) {
    const g = ctx.createGain();
    g.gain.value = Math.max(0.001, vol * this.volume);
    g.connect(ctx.destination);
    return g;
  },
  play(name) {
    if (!this.enabled) return;
    const ctx = this.ctx();
    if (!ctx) return;
    try {
      switch (name) {
        case 'shoot': {
          const o = ctx.createOscillator(), g = this.gain(ctx, 0.10);
          o.type = 'square';
          o.frequency.setValueAtTime(900, ctx.currentTime);
          o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.07);
          g.gain.setValueAtTime(0.10 * this.volume, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
          o.connect(g); o.start(); o.stop(ctx.currentTime + 0.07);
          break;
        }
        case 'explosion': {
          const buf = ctx.createBuffer(1, ctx.sampleRate * 0.45, ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          const src = ctx.createBufferSource(); src.buffer = buf;
          const f = ctx.createBiquadFilter(); f.type = 'lowpass';
          f.frequency.setValueAtTime(500, ctx.currentTime);
          f.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.45);
          const g = this.gain(ctx, 0.30);
          g.gain.setValueAtTime(0.30 * this.volume, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
          src.connect(f); f.connect(g); src.start(); src.stop(ctx.currentTime + 0.45);
          break;
        }
        case 'powerup':
        case 'ability': {
          [523, 659, 784, 1047].forEach((freq, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            g.connect(ctx.destination);
            o.type = 'sine'; o.frequency.value = freq;
            const t = ctx.currentTime + i * 0.08;
            g.gain.setValueAtTime(0.12 * this.volume, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            o.connect(g); o.start(t); o.stop(t + 0.1);
          });
          break;
        }
        case 'levelup': {
          [392, 523, 659, 784, 1047, 1319].forEach((freq, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            g.connect(ctx.destination);
            o.type = 'sine'; o.frequency.value = freq;
            const t = ctx.currentTime + i * 0.1;
            g.gain.setValueAtTime(0.20 * this.volume, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            o.connect(g); o.start(t); o.stop(t + 0.15);
          });
          break;
        }
        case 'laser': {
          const o = ctx.createOscillator(), g = this.gain(ctx, 0.16);
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(1400, ctx.currentTime);
          o.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.18);
          g.gain.setValueAtTime(0.16 * this.volume, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
          o.connect(g); o.start(); o.stop(ctx.currentTime + 0.18);
          break;
        }
        case 'xp': {
          const o = ctx.createOscillator(), g = this.gain(ctx, 0.07);
          o.type = 'sine'; o.frequency.value = 1400;
          g.gain.setValueAtTime(0.07 * this.volume, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
          o.connect(g); o.start(); o.stop(ctx.currentTime + 0.06);
          break;
        }
        case 'hit': {
          const o = ctx.createOscillator(), g = this.gain(ctx, 0.22);
          o.type = 'triangle';
          o.frequency.setValueAtTime(160, ctx.currentTime);
          o.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.25);
          g.gain.setValueAtTime(0.22 * this.volume, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          o.connect(g); o.start(); o.stop(ctx.currentTime + 0.25);
          break;
        }
      }
    } catch (e) { /* áudio indisponível */ }
  },
};
const playSound = n => Audio3D.play(n);

/* ─── Configurações ───────────────────────────────────────────────── */
const Settings = {
  quality: 'high',   // high | low
  invertY: false,
  load() {
    try {
      const s = JSON.parse(localStorage.getItem('rp3d_settings') || '{}');
      Audio3D.volume = s.volume ?? 0.5;
      Audio3D.enabled = s.sound !== false;
      this.quality = s.quality || 'high';
      this.invertY = !!s.invertY;
    } catch (e) { /* noop */ }
  },
  save() {
    try {
      localStorage.setItem('rp3d_settings', JSON.stringify({
        volume: Audio3D.volume, sound: Audio3D.enabled,
        quality: this.quality, invertY: this.invertY,
      }));
    } catch (e) { /* noop */ }
  },
};

/* ─── Input ───────────────────────────────────────────────────────── */
const Input = {
  keys: {},
  touch: { left: false, right: false, up: false, down: false, fire: false, ability: false },
  init() {
    window.addEventListener('keydown', e => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys[k] = true;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (k === 'p' || k === 'Escape') { State.running && (State.paused ? Game.resume() : Game.pause()); }
      if (!State.running || State.paused) return;
      if (k === 'q') State.players[0]?.activateAbility();
      if (k === 'g' && State.twoPlayer) State.players[1]?.activateAbility();
      if (State.infiniteMode) {
        if (k === '1') Game.useInfiniteAbility('nuke');
        if (k === '2') Game.useInfiniteAbility('heal');
        if (k === '3') Game.useInfiniteAbility('shield');
      }
      if (State.survivorMode) {
        if (k === '1') Game.useSurvivorAbility(0);
        if (k === '2') Game.useSurvivorAbility(1);
        if (k === '3') Game.useSurvivorAbility(2);
      }
    });
    window.addEventListener('keyup', e => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys[k] = false;
    });
    window.addEventListener('blur', () => { this.keys = {}; });
    this.initTouch();
  },
  initTouch() {
    const bind = (id, prop) => {
      const el = $(id);
      if (!el) return;
      const on = e => { e.preventDefault(); this.touch[prop] = true; };
      const off = e => { e.preventDefault(); this.touch[prop] = false; };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
    };
    bind('tcLeft', 'left'); bind('tcRight', 'right');
    bind('tcUp', 'up'); bind('tcDown', 'down');
    bind('tcFire', 'fire'); bind('tcAbility', 'ability');
  },
  isTouchDevice: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,

  /** Lê o input de um jogador e devolve o vetor de movimento + ações. */
  read(idx) {
    const k = this.keys, t = this.touch;
    let left, right, up, down, fire, ability;
    if (idx === 0) {
      left = k.ArrowLeft || t.left;
      right = k.ArrowRight || t.right;
      up = k.ArrowUp || t.up;
      down = k.ArrowDown || t.down;
      fire = k[' '] || t.fire;
      ability = t.ability;
      if (!State.twoPlayer) {
        left = left || k.a; right = right || k.d;
        up = up || k.w; down = down || k.s;
      }
    } else {
      left = k.a; right = k.d; up = k.w; down = k.s; fire = k.f; ability = false;
    }
    // Gamepad
    const gp = navigator.getGamepads?.()[idx];
    if (gp) {
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (ax < -0.25) left = true;
      if (ax > 0.25) right = true;
      if (ay < -0.25) up = true;
      if (ay > 0.25) down = true;
      if (gp.buttons[0]?.pressed || gp.buttons[7]?.pressed) fire = true;
      if (gp.buttons[1]?.pressed || gp.buttons[5]?.pressed) ability = true;
    }
    if (Settings.invertY) { const tmp = up; up = down; down = tmp; }
    return { left, right, up, down, fire, ability };
  },
};
