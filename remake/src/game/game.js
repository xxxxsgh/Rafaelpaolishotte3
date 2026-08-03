// ──────────────────────────────────────────────────────────────
// game.js — the simulation. Owns entities, waves, collisions and
// the run state machine. Talks to the UI only through `hooks`.
// ──────────────────────────────────────────────────────────────

import { TAU, clamp, rng, makeRng, angleTo, dist2, hit, damp, todaySeed } from '../core/math.js';
import {
  fx, resetFx, drawParticles, drawTexts, glowSprite,
  spark, burst, ring, shake, flash, text, hitstop, slowmo,
} from '../core/fx.js';
import { sfx, setMusicIntensity, setMusicScale, startMusic, stopMusic } from '../core/audio.js';
import { profile, addCoins, save } from '../core/storage.js';
import { Player, Enemy, Boss, Laser } from './entities.js';
import { poolForPhase } from '../data/bestiary.js';
import { BOSSES } from '../data/bosses.js';
import {
  DIFFICULTIES, UPGRADES, UPGRADE_BY_ID, POWERUPS, rollPowerup, DAILY_MODIFIERS,
} from '../data/progression.js';

export const FIELD_W = 600;
export const FIELD_H = 900;

const THEMES = [
  { name: 'NEBULA GATE', bg: '#020817', grid: 'rgba(0,245,255,0.055)', glow: 'rgba(123,47,255,0.10)', star: '#dff9ff' },
  { name: 'CRIMSON VOID', bg: '#0e0206', grid: 'rgba(255,70,70,0.055)', glow: 'rgba(255,0,80,0.10)', star: '#ffd0d0' },
  { name: 'TOXIC DRIFT', bg: '#02100a', grid: 'rgba(57,255,20,0.05)', glow: 'rgba(0,220,90,0.09)', star: '#d5ffd5' },
  { name: 'SOLAR FORGE', bg: '#100800', grid: 'rgba(255,170,0,0.055)', glow: 'rgba(255,90,0,0.10)', star: '#ffe9c0' },
  { name: 'ABYSSAL BLUE', bg: '#000d16', grid: 'rgba(0,180,255,0.055)', glow: 'rgba(0,90,220,0.10)', star: '#cceaff' },
  { name: 'INFERNO CORE', bg: '#120200', grid: 'rgba(255,60,0,0.06)', glow: 'rgba(200,0,0,0.11)', star: '#ffc0a0' },
  { name: 'GLACIAL ABYSS', bg: '#020d14', grid: 'rgba(130,215,255,0.06)', glow: 'rgba(60,180,255,0.09)', star: '#e8fbff' },
  { name: 'MACHINE DOMAIN', bg: '#07070b', grid: 'rgba(57,255,20,0.05)', glow: 'rgba(120,40,200,0.09)', star: '#e0ffe0' },
  { name: 'EVENT HORIZON', bg: '#010004', grid: 'rgba(106,0,255,0.07)', glow: 'rgba(60,0,180,0.12)', star: '#d8c8ff' },
  { name: 'GENESIS FIELD', bg: '#0a0810', grid: 'rgba(255,214,10,0.05)', glow: 'rgba(255,140,0,0.09)', star: '#fff3c0' },
];

const XP_CURVE = (lvl) => Math.round(28 + lvl * lvl * 4.2 + lvl * 14);

export class Game {
  constructor(hooks = {}) {
    this.hooks = hooks;
    this.bounds = {
      left: 0, right: FIELD_W, top: 0, bottom: FIELD_H,
      width: FIELD_W, height: FIELD_H, cx: FIELD_W / 2, cy: FIELD_H / 2,
    };
    this.players = [];
    this.enemies = [];
    this.pBullets = [];
    this.eBullets = [];
    this.pickups = [];
    this.shards = [];
    this.lasers = [];
    this.timers = [];
    this.stars = [];
    this.boss = null;
    this.running = false;
    this.over = false;
    this.dt = 1 / 60;
    this.initStars();
  }

  // ── setup ───────────────────────────────────────────────────

  initStars() {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      const layer = i % 3;
      this.stars.push({
        x: rng.range(0, FIELD_W),
        y: rng.range(0, FIELD_H),
        z: layer,
        s: [0.9, 1.5, 2.4][layer],
        v: [22, 52, 105][layer],
      });
    }
  }

  start({ mode = 'campaign', difficulty = 'pilot', pilots = ['marcelo'], skin = 'default', coop = false }) {
    const seed = mode === 'daily' ? todaySeed() : (Math.random() * 0xffffffff) >>> 0;
    this.rand = makeRng(seed);
    this.mode = mode;
    this.difficulty = DIFFICULTIES[difficulty] || DIFFICULTIES.pilot;
    this.coop = coop;

    this.enemies.length = 0;
    this.pBullets.length = 0;
    this.eBullets.length = 0;
    this.pickups.length = 0;
    this.shards.length = 0;
    this.lasers.length = 0;
    this.timers.length = 0;
    this.boss = null;
    resetFx();

    this.run = {
      score: 0,
      coins: 0,
      kills: 0,
      level: 1,
      xp: 0,
      xpNext: XP_CURVE(1),
      xpMul: 1,
      coinMul: 1,
      spawnMul: 1,
      enemyHpMul: 1,
      enemySpeedMul: 1,
      timeScale: 1,
      combo: 0,
      comboTimer: 0,
      bestCombo: 0,
      phase: 1,
      wave: 0,
      time: 0,
      bossesKilled: 0,
      upgrades: {},
      damageTakenThisPhase: 0,
      perfectPhases: 0,
      pendingLevelUps: 0,
      modifier: null,
    };

    this.players = pilots
      .slice(0, coop ? 2 : 1)
      .map((id, i) => new Player(id, skin, i, this));
    if (this.coop && this.players.length === 2) {
      this.players[0].x = this.bounds.cx - 70;
      this.players[1].x = this.bounds.cx + 70;
    }

    if (mode === 'daily') {
      const mod = DAILY_MODIFIERS[this.rand.int(0, DAILY_MODIFIERS.length - 1)];
      this.run.modifier = mod;
      for (const p of this.players) mod.apply(p, this.run);
    }

    // remember pilots used, for the "full squad" achievement
    for (const p of this.players) {
      if (!profile.stats.pilotsUsed.includes(p.def.id)) profile.stats.pilotsUsed.push(p.def.id);
    }
    profile.stats.runs++;
    save();

    this.running = true;
    this.over = false;
    this.paused = false;
    this.phaseState = 'intro';
    this.stateTimer = 1.6;
    this.waveQueue = [];
    this.waveSpawned = 0;
    this.announceText = null;

    this.setTheme(0);
    startMusic();
    this.hooks.onRunStart?.(this);
    this.announce(this.modeIntroText(), '#00f5ff');
    this.hooks.onHud?.(this);
  }

  modeIntroText() {
    if (this.mode === 'bossrush') return 'BOSS RUSH';
    if (this.mode === 'endless') return 'ONDA 1';
    if (this.mode === 'daily') return this.run.modifier ? this.run.modifier.name : 'DESAFIO DIÁRIO';
    return 'FASE 1';
  }

  setTheme(i) {
    this.theme = THEMES[i % THEMES.length];
    setMusicScale(i);
    this.hooks.onTheme?.(this.theme);
  }

  stop() {
    this.running = false;
    stopMusic();
  }

  // ── facade used by data modules ──────────────────────────────

  queue(delay, fn) {
    this.timers.push({ t: delay, fn });
  }

  announce(str, color = '#00f5ff') {
    this.hooks.onAnnounce?.(str, color);
  }

  nearestPlayer(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const p of this.players) {
      if (!p.alive) continue;
      const d = dist2(x, y, p.x, p.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  spawnPlayerBullet(o) {
    const p = this.players[o.owner] || this.players[0];
    let dmg = o.dmg;
    let crit = false;
    if (p && this.rand() < p.crit) {
      dmg *= 3;
      crit = true;
    }
    if (p && p.doubleUntil > 0) dmg *= 2;
    this.pBullets.push({
      x: o.x, y: o.y, vx: o.vx, vy: o.vy, r: o.r ?? 4,
      dmg, crit, pierce: o.pierce ?? 0, hits: null,
      kind: o.kind ?? 'bolt', color: o.color ?? '#39ff14',
      life: o.life ?? 2.4, homing: o.homing ?? 0, owner: o.owner ?? 0,
      spin: 0,
    });
  }

  spawnEnemyBullet(o) {
    this.eBullets.push({
      x: o.x, y: o.y, vx: o.vx, vy: o.vy, r: o.r ?? 6,
      color: o.color ?? '#ff4d6d', life: o.life ?? 7, t: 0,
    });
  }

  spawnLaser(o) {
    this.lasers.push(new Laser(o));
    sfx('bossWarn', { throttle: 400 });
  }

  summon(type, count) {
    for (let i = 0; i < count; i++) {
      const x = this.rand.range(60, FIELD_W - 60);
      this.enemies.push(new Enemy(type, x, -50 - i * 40, this, this.enemyMods()));
    }
  }

  shockwave(x, y, radius, dmg, knock = 260) {
    for (const e of this.enemies) {
      const d2 = dist2(x, y, e.x, e.y);
      if (d2 < radius * radius) {
        const a = angleTo(x, y, e.x, e.y);
        e.x += Math.cos(a) * knock * 0.12;
        e.y += Math.sin(a) * knock * 0.12;
        if (e.hurt(dmg, this)) this.killEnemy(e, null);
      }
    }
    if (this.boss && dist2(x, y, this.boss.x, this.boss.y) < (radius + this.boss.r) ** 2) {
      if (this.boss.hurt(dmg)) this.killBoss();
    }
    // clear nearby enemy fire
    for (let i = this.eBullets.length - 1; i >= 0; i--) {
      const b = this.eBullets[i];
      if (dist2(x, y, b.x, b.y) < radius * radius) {
        spark(b.x, b.y, b.color, 3, { speed: 90, life: 0.25 });
        this.eBullets.splice(i, 1);
      }
    }
  }

  applyPull(x, y, strength, dt) {
    for (const p of this.players) {
      if (!p.alive) continue;
      const a = angleTo(p.x, p.y, x, y);
      p.x += Math.cos(a) * strength * dt;
      p.y += Math.sin(a) * strength * dt;
    }
  }

  applyBeam(p) {
    const def = p.def.beam;
    const boost = p.beamBoost > 0;
    const w = def.width * (boost ? 4 : 1) * (p.spread + 1);
    const dps = def.dps * (boost ? 3 : 1) * p.damageMultiplierNow();
    p.beamW = w;

    for (const e of this.enemies) {
      if (Math.abs(e.x - p.x) < w / 2 + e.r && e.y < p.y) {
        e.flash = Math.max(e.flash, 0.4);
        if (e.hurt(dps * this.dt, this)) this.killEnemy(e, p);
      }
    }
    if (this.boss && Math.abs(this.boss.x - p.x) < w / 2 + this.boss.r && this.boss.y < p.y) {
      this.boss.flash = Math.max(this.boss.flash, 0.3);
      if (this.boss.hurt(dps * this.dt)) this.killBoss();
    }
    if (this.rand() < 0.4) {
      spark(p.x + rng.range(-w / 2, w / 2), rng.range(0, p.y), '#c9a6ff', 1, { speed: 40, life: 0.25, size: 3 });
    }
  }

  applyOrbits(p) {
    for (let i = 0; i < p.orbits; i++) {
      const a = p.orbitAngle + (i / p.orbits) * TAU;
      const ox = p.x + Math.cos(a) * 62;
      const oy = p.y + Math.sin(a) * 62;
      for (const e of this.enemies) {
        if (dist2(ox, oy, e.x, e.y) < (e.r + 10) ** 2) {
          if (e.hurt(24 * this.dt * p.damageMul, this)) this.killEnemy(e, p);
        }
      }
      if (this.boss && dist2(ox, oy, this.boss.x, this.boss.y) < (this.boss.r + 10) ** 2) {
        if (this.boss.hurt(24 * this.dt * p.damageMul)) this.killBoss();
      }
      for (let k = this.eBullets.length - 1; k >= 0; k--) {
        const b = this.eBullets[k];
        if (dist2(ox, oy, b.x, b.y) < (b.r + 10) ** 2) {
          spark(b.x, b.y, b.color, 3, { speed: 80, life: 0.2 });
          this.eBullets.splice(k, 1);
        }
      }
    }
  }

  onPlayerHurt(p, amount) {
    this.run.damageTakenThisPhase += amount;
    profile.stats.damageTaken += amount;
    fx.vignette = 1;
    this.breakCombo();
    this.hooks.onHud?.(this);
  }

  onPlayerDown(p) {
    if (this.players.every((q) => !q.alive && q.lives <= 0)) {
      this.queue(1.2, () => this.gameOver());
    }
    this.hooks.onHud?.(this);
  }

  onHpChanged() {
    this.hooks.onHud?.(this);
  }

  onAbilityUsed(p) {
    this.hooks.onHud?.(this);
  }

  // ── run state machine ───────────────────────────────────────

  enemyMods() {
    const d = this.difficulty;
    const scale = this.mode === 'endless' ? 1 + this.run.wave * 0.09 : 1 + (this.run.phase - 1) * 0.14;
    return {
      hp: d.enemyHp * scale * this.run.enemyHpMul,
      speed: d.enemySpeed * Math.min(1.8, 1 + (scale - 1) * 0.4) * this.run.enemySpeedMul,
    };
  }

  buildWave() {
    const r = this.rand;
    const phase = this.mode === 'endless' ? Math.min(10, 1 + Math.floor(this.run.wave / 2)) : this.run.phase;
    const pool = poolForPhase(phase);
    const budget = Math.round(
      (this.mode === 'endless' ? 5 + this.run.wave * 1.5 : 6 + phase * 1.6 + this.run.wave * 1.2) * this.run.spawnMul,
    );
    const q = [];
    let t = 0;
    let placed = 0;

    while (placed < budget) {
      const shape = r.pick(['line', 'vee', 'stream', 'flank', 'cluster']);
      const type = r.pick(pool);
      const n = clamp(r.int(3, 6), 1, budget - placed);

      switch (shape) {
        case 'line': {
          const y = -40;
          const gap = FIELD_W / (n + 1);
          for (let i = 0; i < n; i++) q.push({ t: t + i * 0.06, type, x: gap * (i + 1), y });
          t += 1.1;
          break;
        }
        case 'vee': {
          const cx = r.range(140, FIELD_W - 140);
          for (let i = 0; i < n; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const k = Math.floor(i / 2);
            q.push({ t, type, x: clamp(cx + side * k * 62, 40, FIELD_W - 40), y: -40 - k * 46 });
          }
          t += 1.3;
          break;
        }
        case 'stream': {
          const x = r.range(60, FIELD_W - 60);
          for (let i = 0; i < n; i++) q.push({ t: t + i * 0.28, type, x: x + Math.sin(i) * 40, y: -40 });
          t += 1.5;
          break;
        }
        case 'flank': {
          for (let i = 0; i < n; i++) {
            const left = i % 2 === 0;
            q.push({ t: t + i * 0.16, type, x: left ? 55 : FIELD_W - 55, y: -40 - i * 30 });
          }
          t += 1.2;
          break;
        }
        default: {
          const cx = r.range(120, FIELD_W - 120);
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            q.push({ t, type, x: clamp(cx + Math.cos(a) * 70, 40, FIELD_W - 40), y: -60 + Math.sin(a) * 50 });
          }
          t += 1.4;
        }
      }
      placed += n;
    }

    // an elite escorts every third wave
    if (this.run.wave % 3 === 2 || (this.mode === 'endless' && this.run.wave % 4 === 3)) {
      q.push({ t: t * 0.5, type: 'elite', x: FIELD_W / 2, y: -70 });
    }

    q.sort((a, b) => a.t - b.t);
    return q;
  }

  startWave() {
    this.run.wave++;
    this.waveQueue = this.buildWave();
    this.waveSpawned = 0;
    this.waveClock = 0;
    this.phaseState = 'wave';
    if (this.mode === 'endless') this.announce(`ONDA ${this.run.wave}`, '#00f5ff');
    this.hooks.onHud?.(this);
  }

  wavesPerPhase() {
    return 2 + Math.min(3, Math.floor(this.run.phase / 3));
  }

  startBoss(index = null) {
    const i = index ?? (this.run.phase - 1) % BOSSES.length;
    const def = BOSSES[i];
    let hpMul = this.difficulty.enemyHp;
    if (this.mode === 'endless') hpMul *= 1 + Math.floor(this.run.wave / 5) * 0.5;
    if (this.coop) hpMul *= 1.6;
    this.boss = new Boss(def, this, hpMul);
    this.phaseState = 'boss';
    this.hooks.onBossStart?.(def, this.boss);
    sfx('bossWarn');
    setMusicIntensity(1);
    this.hooks.onHud?.(this);
  }

  killBoss() {
    const b = this.boss;
    if (!b) return;
    const def = b.def;
    this.boss = null;
    this.run.bossesKilled++;
    profile.stats.bosses++;

    const coins = Math.round(def.coins * this.difficulty.reward * this.run.coinMul);
    this.run.coins += coins;
    this.run.score += def.score * this.difficulty.reward;

    // spectacle
    for (let i = 0; i < 14; i++) {
      this.queue(i * 0.07, () => {
        const x = b.x + rng.range(-b.r, b.r);
        const y = b.y + rng.range(-b.r, b.r);
        burst(x, y, def.color, 1.4);
        sfx('explode', { throttle: 40 });
      });
    }
    this.queue(1.0, () => {
      flash('#ffffff', 0.85);
      sfx('bigExplode');
      shake(1);
      burst(b.x, b.y, '#ffffff', 4);
      this.eBullets.length = 0;
      this.lasers.length = 0;
    });
    slowmo(1.2);
    shake(0.7);
    text(b.x, b.y - 40, `+${coins}`, '#ffd60a', { size: 26, life: 1.6 });
    this.hooks.onBossEnd?.();
    setMusicIntensity(0.4);

    this.phaseState = 'bossdead';
    this.stateTimer = 2.4;
  }

  advancePhase() {
    if (this.run.damageTakenThisPhase === 0) {
      this.run.perfectPhases++;
      profile.stats.perfectPhases++;
      this.run.score += 500;
      this.announce('FASE PERFEITA +500', '#39ff14');
    }
    this.run.damageTakenThisPhase = 0;

    if (this.mode === 'campaign' || this.mode === 'daily') {
      const last = this.mode === 'daily' ? 5 : BOSSES.length;
      if (this.run.phase >= last) {
        this.victory();
        return;
      }
      this.run.phase++;
      this.run.wave = 0;
      this.setTheme(this.run.phase - 1);
      this.phaseState = 'intro';
      this.stateTimer = 2.2;
      this.announce(`FASE ${this.run.phase}`, '#00f5ff');
      // small breather
      for (const p of this.players) {
        if (p.alive && p.hp < p.maxHp) p.hp++;
      }
      profile.stats.phaseReached = Math.max(profile.stats.phaseReached, this.run.phase);
    } else if (this.mode === 'bossrush') {
      this.run.phase++;
      if (this.run.phase > BOSSES.length) {
        this.victory();
        return;
      }
      this.setTheme(this.run.phase - 1);
      for (const p of this.players) if (p.alive) p.hp = Math.min(p.maxHp, p.hp + 1);
      this.phaseState = 'intro';
      this.stateTimer = 1.8;
    } else {
      this.phaseState = 'wave';
      this.startWave();
    }
    this.hooks.onHud?.(this);
  }

  updateState(dt) {
    switch (this.phaseState) {
      case 'intro':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          if (this.mode === 'bossrush') this.startBoss((this.run.phase - 1) % BOSSES.length);
          else this.startWave();
        }
        break;

      case 'wave': {
        this.waveClock += dt;
        while (this.waveSpawned < this.waveQueue.length && this.waveQueue[this.waveSpawned].t <= this.waveClock) {
          const s = this.waveQueue[this.waveSpawned++];
          this.enemies.push(new Enemy(s.type, s.x, s.y, this, this.enemyMods()));
        }
        const done = this.waveSpawned >= this.waveQueue.length && this.enemies.length === 0;
        if (done) {
          this.phaseState = 'wavedone';
          this.stateTimer = 1.1;
        }
        break;
      }

      case 'wavedone':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          if (this.mode === 'endless') {
            if (this.run.wave % 5 === 0) this.startBoss(Math.floor(this.run.wave / 5 - 1) % BOSSES.length);
            else this.startWave();
            profile.bestWave = Math.max(profile.bestWave || 0, this.run.wave);
          } else if (this.run.wave >= this.wavesPerPhase()) {
            this.startBoss();
          } else {
            this.startWave();
          }
        }
        break;

      case 'boss':
        setMusicIntensity(this.boss ? 0.6 + (1 - this.boss.hp / this.boss.maxHp) * 0.4 : 0.5);
        break;

      case 'bossdead':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.advancePhase();
        break;
    }
  }

  // ── kills & rewards ─────────────────────────────────────────

  addScore(n) {
    this.run.score += n * this.comboMultiplier();
  }

  comboMultiplier() {
    return 1 + Math.min(this.run.combo, 60) * 0.05;
  }

  bumpCombo() {
    this.run.combo++;
    this.run.comboTimer = 2.6;
    if (this.run.combo > this.run.bestCombo) this.run.bestCombo = this.run.combo;
    if (this.run.combo > 0 && this.run.combo % 10 === 0) {
      this.announce(`COMBO ×${this.run.combo}`, '#ffd60a');
      sfx('achievement');
    }
    this.hooks.onCombo?.(this.run.combo, this.comboMultiplier());
  }

  breakCombo() {
    if (this.run.combo >= 5) text(this.bounds.cx, 130, 'COMBO PERDIDO', '#ff006e', { size: 16, life: 0.8 });
    this.run.combo = 0;
    this.run.comboTimer = 0;
    this.hooks.onCombo?.(0, 1);
  }

  killEnemy(e, killer) {
    if (e.dead) return;
    e.dead = true;
    e.alive = false;
    const def = e.def;

    burst(e.x, e.y, def.color, e.r / 20);
    sfx('explode', { throttle: 45 });
    shake(0.06);
    this.run.kills++;
    profile.stats.kills++;
    this.bumpCombo();
    this.addScore(def.score * this.difficulty.reward);

    const coins = Math.max(1, Math.round(def.coins * this.difficulty.reward * this.run.coinMul));
    this.run.coins += coins;

    // XP shard
    this.shards.push({
      x: e.x, y: e.y,
      vx: rng.range(-60, 60), vy: rng.range(-90, -20),
      xp: def.xp * this.run.xpMul, t: 0,
    });

    // bombers take the neighbourhood with them
    if (def.explodes) {
      ring(e.x, e.y, '#ff8c00', 10, def.explodes.radius, 0.35, 5);
      flash('#ff8c00', 0.25);
      shake(0.25);
      sfx('explode');
      this.shockwave(e.x, e.y, def.explodes.radius, 6);
      for (const p of this.players) {
        if (p.alive && dist2(e.x, e.y, p.x, p.y) < def.explodes.radius ** 2) p.hurt(def.explodes.damage, this);
      }
    }

    // nova upgrade
    if (killer && killer.nova > 0) {
      ring(e.x, e.y, '#ffd60a', 6, 70 * killer.nova, 0.3, 3);
      this.shockwave(e.x, e.y, 70 * killer.nova, 2 * killer.nova * killer.damageMul, 100);
    }

    if (killer && killer.lifesteal > 0 && this.rand() < killer.lifesteal && killer.hp < killer.maxHp) {
      killer.hp++;
      text(killer.x, killer.y - 34, '+1', '#ff006e', { size: 14 });
      this.hooks.onHud?.(this);
    }

    // power-up drop
    const dropChance = def.alwaysDrops ? 1 : 0.08;
    if (this.rand() < dropChance) {
      this.pickups.push({ x: e.x, y: e.y, type: rollPowerup(this.rand), t: 0, vy: 90 });
    }

    this.hooks.onHud?.(this);
  }

  grantXp(amount) {
    const run = this.run;
    run.xp += amount;
    while (run.xp >= run.xpNext) {
      run.xp -= run.xpNext;
      run.level++;
      run.xpNext = XP_CURVE(run.level);
      run.pendingLevelUps++;
      profile.stats.levelsGained++;
    }
    if (run.pendingLevelUps > 0 && !this.paused) this.openLevelUp();
    this.hooks.onHud?.(this);
  }

  /** Three distinct cards the player has not maxed out. */
  rollUpgradeChoices() {
    const run = this.run;
    const avail = UPGRADES.filter((u) => (run.upgrades[u.id] || 0) < u.max);
    const picked = [];
    const pool = avail.slice();
    while (picked.length < 3 && pool.length) {
      const i = this.rand.int(0, pool.length - 1);
      picked.push(pool.splice(i, 1)[0]);
    }
    return picked;
  }

  openLevelUp() {
    const choices = this.rollUpgradeChoices();
    if (!choices.length) {
      // Everything is maxed — bank the level as score and keep playing,
      // otherwise the run would sit frozen behind an empty card screen.
      this.run.score += 1000 * this.run.pendingLevelUps;
      this.run.pendingLevelUps = 0;
      this.paused = false;
      this.hooks.onLevelUpDone?.();
      return;
    }
    this.paused = true;
    sfx('levelUp');
    this.hooks.onLevelUp?.(choices, this.run.level);
  }

  chooseUpgrade(id) {
    const u = UPGRADE_BY_ID[id];
    if (!u) return;
    this.run.upgrades[id] = (this.run.upgrades[id] || 0) + 1;
    for (const p of this.players) u.apply(p, this.run);
    this.run.pendingLevelUps--;
    sfx('buy');
    ring(this.bounds.cx, this.bounds.cy, u.color, 20, 320, 0.6, 5);
    if (this.run.pendingLevelUps > 0) {
      this.openLevelUp();
    } else {
      this.paused = false;
      this.hooks.onLevelUpDone?.();
    }
    this.hooks.onHud?.(this);
  }

  takePickup(p, pk) {
    const def = POWERUPS[pk.type];
    profile.stats.powerupsTaken++;
    sfx('pickup');
    text(p.x, p.y - 40, def.label, def.color, { size: 15, life: 1 });
    ring(p.x, p.y, def.color, 8, 90, 0.35);

    switch (pk.type) {
      case 'heal':
        if (p.hp < p.maxHp) p.hp++;
        else this.run.score += 250;
        break;
      case 'rapid':
        p.rapidUntil = def.duration;
        break;
      case 'shield':
        p.shieldUntil = def.duration * p.shieldMul;
        break;
      case 'double':
        p.doubleUntil = def.duration;
        break;
      case 'magnet':
        p.magnetUntil = def.duration;
        break;
      case 'nuke': {
        flash('#ffffff', 1);
        shake(0.9);
        sfx('nuke');
        slowmo(0.6);
        const list = this.enemies.slice();
        for (const e of list) {
          burst(e.x, e.y, e.def.color, 1.2);
          this.killEnemy(e, p);
        }
        this.eBullets.length = 0;
        if (this.boss && this.boss.hurt(this.boss.maxHp * 0.08)) this.killBoss();
        break;
      }
    }
    this.hooks.onHud?.(this);
  }

  gameOver() {
    if (this.over) return;
    this.over = true;
    this.running = false;
    stopMusic();
    sfx('gameOver');
    this.commitRun();
    this.hooks.onGameOver?.(this.summary(false));
  }

  victory() {
    if (this.over) return;
    this.over = true;
    this.running = false;
    stopMusic();
    sfx('victory');
    flash('#ffffff', 1);
    if (this.mode === 'campaign') profile.stats.campaignClears++;
    this.run.score += 5000;
    this.commitRun();
    this.hooks.onVictory?.(this.summary(true));
  }

  commitRun() {
    addCoins(this.run.coins);
    profile.stats.bestCombo = Math.max(profile.stats.bestCombo, this.run.bestCombo);
    profile.stats.playSeconds = Math.round(profile.stats.playSeconds + this.run.time);
    save();
  }

  summary(won) {
    return {
      won,
      mode: this.mode,
      score: Math.round(this.run.score),
      coins: this.run.coins,
      kills: this.run.kills,
      level: this.run.level,
      phase: this.run.phase,
      wave: this.run.wave,
      time: this.run.time,
      bestCombo: this.run.bestCombo,
      bosses: this.run.bossesKilled,
      upgrades: this.run.upgrades,
    };
  }

  // ── simulation step (fixed dt) ───────────────────────────────

  step(dt, intents) {
    if (!this.running || this.paused) return;
    this.dt = dt;
    const run = this.run;
    run.time += dt;

    // deferred callbacks
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) {
        this.timers.splice(i, 1);
        t.fn();
      }
    }

    // combo decay
    if (run.combo > 0) {
      run.comboTimer -= dt;
      if (run.comboTimer <= 0) this.breakCombo();
    }

    for (let i = 0; i < this.players.length; i++) {
      this.players[i].update(dt, intents[i] || { mx: 0, my: 0, fire: false, ability: false, dragX: 0, dragY: 0 }, this);
    }

    this.updateState(dt);

    // ── enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this);
      if (e.y > FIELD_H + 90 || e.y < -400 || !e.alive) {
        if (!e.alive && !e.dead) this.killEnemy(e, null);
        this.enemies.splice(i, 1);
      }
    }

    if (this.boss) this.boss.update(dt, this);

    // ── lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.update(dt);
      if (l.active) {
        for (const p of this.players) {
          if (p.alive && Math.abs(p.x - l.x) < l.width / 2 + p.r * 0.5) p.hurt(this.difficulty.enemyDmg, this);
        }
        if (this.rand() < 0.6) {
          spark(l.x + rng.range(-l.width / 2, l.width / 2), rng.range(0, FIELD_H), l.color, 1, { speed: 60, life: 0.3 });
        }
      }
      if (l.dead) this.lasers.splice(i, 1);
    }

    // ── player bullets
    for (let i = this.pBullets.length - 1; i >= 0; i--) {
      const b = this.pBullets[i];
      b.life -= dt;
      b.spin += dt * 14;

      if (b.homing) {
        const target = this.nearestTarget(b.x, b.y);
        if (target) {
          const want = angleTo(b.x, b.y, target.x, target.y);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          const na = cur + clamp(diff, -b.homing * dt, b.homing * dt);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(na) * sp;
          b.vy = Math.sin(na) * sp;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.life <= 0 || b.y < -40 || b.y > FIELD_H + 40 || b.x < -40 || b.x > FIELD_W + 40) {
        this.pBullets.splice(i, 1);
        continue;
      }

      let consumed = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (b.hits && b.hits.includes(e)) continue;
        if (!hit(b, e)) continue;
        spark(b.x, b.y, '#ffffff', 4, { speed: 130, life: 0.22, size: 2 });
        sfx('hit', { throttle: 55 });
        if (e.hurt(b.dmg, this, b.crit)) this.killEnemy(e, this.players[b.owner]);
        if (b.pierce > 0) {
          b.pierce--;
          (b.hits || (b.hits = [])).push(e);
        } else {
          consumed = true;
        }
        break;
      }

      if (!consumed && this.boss && hit(b, this.boss)) {
        spark(b.x, b.y, '#ffffff', 5, { speed: 150, life: 0.22, size: 2 });
        sfx('hit', { throttle: 55 });
        if (b.crit) text(b.x, b.y, 'CRIT', '#ffd60a', { size: 13, life: 0.45 });
        if (this.boss.hurt(b.dmg)) {
          this.killBoss();
        } else {
          hitstop(0.012);
        }
        if (b.pierce > 0) b.pierce--;
        else consumed = true;
      }

      if (consumed) this.pBullets.splice(i, 1);
    }

    // ── enemy bullets
    const slowers = this.players.filter((p) => p.alive && p.slowField);
    for (let i = this.eBullets.length - 1; i >= 0; i--) {
      const b = this.eBullets[i];
      b.t += dt;
      b.life -= dt;
      let mul = 1;
      for (const p of slowers) {
        if (dist2(b.x, b.y, p.x, p.y) < 150 * 150) mul = 0.7;
      }
      b.x += b.vx * dt * mul;
      b.y += b.vy * dt * mul;
      if (b.life <= 0 || b.y > FIELD_H + 30 || b.y < -60 || b.x < -60 || b.x > FIELD_W + 60) {
        this.eBullets.splice(i, 1);
        continue;
      }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) ** 2) {
          p.hurt(this.difficulty.enemyDmg, this);
          spark(b.x, b.y, b.color, 8, { speed: 150, life: 0.3 });
          this.eBullets.splice(i, 1);
          break;
        }
      }
    }

    // ── enemy bodies vs players (ramming hurts both)
    for (const e of this.enemies) {
      if (!e.alive) continue;
      for (const p of this.players) {
        if (!p.alive) continue;
        if (dist2(e.x, e.y, p.x, p.y) >= (e.r + p.r) ** 2) continue;
        if (p.hurt(this.difficulty.enemyDmg, this) && e.hurt(8, this)) this.killEnemy(e, p);
        break;
      }
    }

    if (this.boss && this.boss.entering <= 0) {
      for (const p of this.players) {
        if (p.alive && dist2(this.boss.x, this.boss.y, p.x, p.y) < (this.boss.r * 0.8 + p.r) ** 2) {
          p.hurt(this.difficulty.enemyDmg, this);
        }
      }
    }

    // ── pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.t += dt;
      pk.y += pk.vy * dt;
      let taken = false;
      for (const p of this.players) {
        if (!p.alive) continue;
        const pull = p.magnet * (p.magnetUntil > 0 ? 4 : 1);
        const d2 = dist2(pk.x, pk.y, p.x, p.y);
        if (d2 < pull * pull) {
          const a = angleTo(pk.x, pk.y, p.x, p.y);
          const s = 260 + (1 - Math.sqrt(d2) / pull) * 420;
          pk.x += Math.cos(a) * s * dt;
          pk.y += Math.sin(a) * s * dt;
        }
        if (d2 < (p.r + 18) ** 2) {
          this.takePickup(p, pk);
          taken = true;
          break;
        }
      }
      if (taken || pk.y > FIELD_H + 40) this.pickups.splice(i, 1);
    }

    // ── xp shards
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.t += dt;
      s.vy += 420 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let taken = false;
      for (const p of this.players) {
        if (!p.alive) continue;
        const pull = p.magnet * (p.magnetUntil > 0 ? 4 : 1);
        const d2 = dist2(s.x, s.y, p.x, p.y);
        if (d2 < pull * pull) {
          const a = angleTo(s.x, s.y, p.x, p.y);
          const sp = 300 + (1 - Math.sqrt(d2) / pull) * 500;
          s.vx = damp(s.vx, Math.cos(a) * sp, 8, dt);
          s.vy = damp(s.vy, Math.sin(a) * sp, 8, dt);
        }
        if (d2 < (p.r + 16) ** 2) {
          this.grantXp(s.xp);
          sfx('xp', { throttle: 45 });
          spark(s.x, s.y, '#00f5ff', 3, { speed: 90, life: 0.25, size: 2 });
          taken = true;
          break;
        }
      }
      if (taken || s.y > FIELD_H + 60) this.shards.splice(i, 1);
    }

    // parallax
    for (const st of this.stars) {
      st.y += st.v * dt * (this.phaseState === 'boss' ? 1.7 : 1);
      if (st.y > FIELD_H) {
        st.y = -4;
        st.x = rng.range(0, FIELD_W);
      }
    }
  }

  nearestTarget(x, y) {
    let best = this.boss && this.boss.entering <= 0 ? this.boss : null;
    let bestD = best ? dist2(x, y, best.x, best.y) : Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  // ── rendering ───────────────────────────────────────────────

  render(ctx, alpha = 1) {
    const th = this.theme || THEMES[0];
    ctx.save();
    ctx.translate(fx.shakeX, fx.shakeY);

    // background
    ctx.fillStyle = th.bg;
    ctx.fillRect(-40, -40, FIELD_W + 80, FIELD_H + 80);

    const t = this.run ? this.run.time : 0;

    // moving neon grid
    ctx.save();
    ctx.strokeStyle = th.grid;
    ctx.lineWidth = 1;
    const gap = 60;
    const off = (t * 46) % gap;
    ctx.beginPath();
    for (let x = 0; x <= FIELD_W; x += gap) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD_H);
    }
    for (let y = -gap; y <= FIELD_H + gap; y += gap) {
      ctx.moveTo(0, y + off);
      ctx.lineTo(FIELD_W, y + off);
    }
    ctx.stroke();
    ctx.restore();

    // ambient glow
    const g1 = ctx.createRadialGradient(FIELD_W / 2, 120, 30, FIELD_W / 2, 120, 520);
    g1.addColorStop(0, th.glow);
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // stars
    ctx.fillStyle = th.star;
    for (const s of this.stars) {
      ctx.globalAlpha = 0.25 + s.z * 0.28;
      ctx.fillRect(s.x, s.y, s.s, s.s * 2.4);
    }
    ctx.globalAlpha = 1;

    // lasers behind entities
    for (const l of this.lasers) l.draw(ctx, this.bounds);

    // xp shards
    for (const s of this.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.t * 6);
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(-3.5, -3.5, 7, 7);
      ctx.restore();
    }

    // pickups
    for (const pk of this.pickups) {
      const def = POWERUPS[pk.type];
      const r = 15 + Math.sin(pk.t * 5) * 2;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, r * 1.7, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = def.color;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#01121f';
      ctx.font = '700 17px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, pk.x, pk.y + 1);
      ctx.restore();
    }

    // beams (drawn under ships)
    for (const p of this.players) {
      if (p.alive && p.def.beam && p.beamHot > 0) {
        const w = p.beamW || p.def.beam.width;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grd = ctx.createLinearGradient(0, 0, 0, p.y);
        grd.addColorStop(0, 'rgba(123,47,255,0.05)');
        grd.addColorStop(1, 'rgba(201,166,255,0.75)');
        ctx.fillStyle = grd;
        ctx.fillRect(p.x - w / 2, 0, w, p.y);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(p.x - w / 6, 0, w / 3, p.y);
        ctx.restore();
      }
    }

    for (const e of this.enemies) e.draw(ctx);
    if (this.boss) this.boss.draw(ctx);

    // enemy bullets — glow blitted from a cached sprite, then a hard core
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.eBullets) {
      const g = b.r * 2.1;
      ctx.drawImage(glowSprite(b.color), b.x - g, b.y - g, g * 2, g * 2);
    }
    ctx.restore();
    ctx.save();
    for (const b of this.eBullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.42, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // player bullets
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.pBullets) {
      const g = b.r * 2.2;
      ctx.drawImage(glowSprite(b.color), b.x - g, b.y - g, g * 2, g * 2);
      ctx.fillStyle = b.color;
      if (b.kind === 'blade') {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.spin);
        ctx.fillRect(-b.r, -1.6, b.r * 2, 3.2);
        ctx.fillRect(-1.6, -b.r, 3.2, b.r * 2);
        ctx.restore();
      } else if (b.kind === 'shell' || b.kind === 'missile') {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillRect(b.x - b.r * 0.55, b.y - b.r * 2, b.r * 1.1, b.r * 4);
      }
    }
    ctx.restore();

    for (const p of this.players) p.draw(ctx);

    drawParticles(ctx);
    drawTexts(ctx);

    // vignette on damage
    if (fx.vignette > 0) {
      const gv = ctx.createRadialGradient(FIELD_W / 2, FIELD_H / 2, FIELD_H * 0.25, FIELD_W / 2, FIELD_H / 2, FIELD_H * 0.7);
      gv.addColorStop(0, 'rgba(255,0,60,0)');
      gv.addColorStop(1, `rgba(255,0,60,${0.5 * fx.vignette})`);
      ctx.fillStyle = gv;
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    }

    ctx.restore();

    if (fx.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, fx.flash);
      ctx.fillStyle = fx.flashColor;
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      ctx.restore();
    }
  }
}
