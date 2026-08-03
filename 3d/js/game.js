// ═══════════════════════════════════════════════════════════════════
// GAME — máquina de estados, ondas, colisões e progressão
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import {
  FIELD, DIFFICULTY, CHARACTERS, SKINS, PHASE_ENEMY_POOL, BOSSES,
  THEMES, POWERUPS, RUN_UPGRADES, xpForLevel,
} from './config.js';
import { World } from './world.js';
import { FX } from './fx.js';
import { Player } from './player.js';
import { Enemy } from './enemies.js';
import { Boss } from './bosses.js';
import { PlayerBullets, EnemyBullets } from './bullets.js';
import { Pickup, rollPowerUpType } from './pickups.js';
import { buildShip } from './models.js';
import { Audio } from './audio.js';
import { Save } from './save.js';
import { UI } from './ui.js';

const clamp = THREE.MathUtils.clamp;

export class Game {
  constructor(canvas) {
    this.world = new World(canvas);
    this.fx = new FX(this.world.scene);
    this.playerBullets = new PlayerBullets(this.world.scene);
    this.enemyBullets = new EnemyBullets(this.world.scene);
    this.ui = new UI(this);

    this.enemies = [];
    this.pickups = [];
    this.boss = null;
    this.player = null;
    this.previewMesh = null;

    this.running = false;
    this.paused = false;
    this.over = false;
    this.mode = 'campaign';
    this.difficulty = 'normal';
    this.difficultyMult = 1;
    this.pendingMode = null;

    this.input = { left: false, right: false, up: false, down: false, fire: false, pointer: false, px: 0, py: 0 };
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.ndc = new THREE.Vector2();
    this.hitPoint = new THREE.Vector3();

    this.lastTime = performance.now();
    this.fpsAcc = 0; this.fpsFrames = 0;

    this.bindInput();
    this.resetRunState();
  }

  // ═════════════════════════════════════════════════════════════
  // INPUT
  // ═════════════════════════════════════════════════════════════
  bindInput() {
    const keyMap = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    };
    addEventListener('keydown', (e) => {
      Audio.resume();
      if (keyMap[e.code]) { this.input[keyMap[e.code]] = true; this.input.pointer = false; e.preventDefault(); }
      if (e.code === 'Space') { this.input.fire = true; e.preventDefault(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (this.running && !this.paused && this.player) this.player.useAbility(this);
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.running && !this.over && this.ui.current !== 'levelup') this.togglePause();
      }
    });
    addEventListener('keyup', (e) => {
      if (keyMap[e.code]) this.input[keyMap[e.code]] = false;
      if (e.code === 'Space') this.input.fire = false;
    });

    const canvas = this.world.canvas;
    const toWorld = (cx, cy) => {
      this.ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
      this.raycaster.setFromCamera(this.ndc, this.world.camera);
      this.raycaster.ray.intersectPlane(this.plane, this.hitPoint);
      this.input.px = clamp(this.hitPoint.x, -FIELD.x, FIELD.x);
      this.input.py = clamp(this.hitPoint.y, -FIELD.y, FIELD.y);
      this.input.pointer = true;
    };

    canvas.addEventListener('pointerdown', (e) => {
      Audio.resume();
      if (!this.running || this.paused) return;
      if (e.button === 2) { this.player && this.player.useAbility(this); return; }
      this.input.fire = true;
      toWorld(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.running || this.paused) return;
      if (e.pointerType === 'touch' && !this.input.fire) return;
      toWorld(e.clientX, e.clientY);
    });
    addEventListener('pointerup', () => { this.input.fire = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('blur', () => {
      this.input.left = this.input.right = this.input.up = this.input.down = this.input.fire = false;
      if (this.running && !this.paused && !this.over) this.togglePause(true);
    });
  }

  // ═════════════════════════════════════════════════════════════
  // ESTADO DA RUN
  // ═════════════════════════════════════════════════════════════
  resetRunState() {
    this.score = 0;
    this.runCoins = 0;
    this.kills = 0;
    this.killsThisPhase = 0;
    this.bossesKilled = 0;
    this.level = 1;
    this.xp = 0;
    this.xpMult = 1;
    this.coinMult = 1;
    this.magnetRadius = 12;
    this.combo = 1;
    this.maxCombo = 1;
    this.comboTimer = 0;
    this.phase = 0;
    this.wave = 1;
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.spawnQueue = 0;
    this.phaseQuota = 14;
    this.powerupTimer = 12;
    this.upgradeLevels = {};
    this.waitingBoss = false;
    this.phaseTransition = 0;
    this.victory = false;
    this.pendingLevelUps = 0;
    this.nextBossAt = 90;      // survivor: chefe a cada 90s
    this.nextThemeAt = 60;     // survivor: troca de cenário
  }

  // ═════════════════════════════════════════════════════════════
  // MENU / PREVIEW
  // ═════════════════════════════════════════════════════════════
  showMenu() {
    this.ui.show('main');
    this.ui.showHUD(false);
    this.previewCharacter(Save.data.equippedChar);
    Audio.startMusic(0);
  }

  previewCharacter(id) {
    if (this.previewMesh) { this.world.scene.remove(this.previewMesh); this.previewMesh = null; }
    if (this.running) return;
    const cfg = CHARACTERS[id] || CHARACTERS.marcelo;
    const skinCfg = SKINS.find((s) => s.id === Save.data.equippedSkin) || SKINS[0];
    const hull = skinCfg.color === 'animated' ? 0xff00ff : skinCfg.color;
    const m = buildShip(cfg.style, hull, cfg.color);
    m.position.set(0, -1.5, 6);
    m.scale.setScalar(2.1);
    this.previewMesh = m;
    this.world.scene.add(m);
  }

  // ═════════════════════════════════════════════════════════════
  // INÍCIO / FIM
  // ═════════════════════════════════════════════════════════════
  start(mode, difficulty) {
    this.clearEntities();
    this.resetRunState();
    this.mode = mode;
    this.difficulty = difficulty;
    this.difficultyMult = DIFFICULTY[difficulty].mult;
    this.coinMult = DIFFICULTY[difficulty].coin;

    if (this.previewMesh) { this.world.scene.remove(this.previewMesh); this.previewMesh = null; }

    const charId = Save.data.equippedChar;
    this.player = new Player(this.world.scene, charId, Save.data.equippedSkin);
    Save.markCharPlayed(charId);
    Save.data.stats.runs++;
    Save.save();

    this.running = true;
    this.paused = false;
    this.over = false;
    this.ui.hideOverlay();
    this.ui.showHUD(true);
    this.ui.setBossBar(false);
    document.getElementById('fps').classList.toggle('hidden', !Save.data.settings.fps);

    if (mode === 'campaign') {
      this.setPhase(0);
    } else if (mode === 'infinite') {
      this.world.setTheme(0);
      this.startWave(1);
      this.ui.banner('MODO INFINITO', 'SOBREVIVA ÀS ONDAS');
    } else {
      this.world.setTheme(2);
      this.ui.banner('SURVIVOR', 'RESISTA O MÁXIMO QUE PUDER');
      this.spawnTimer = 1;
    }

    Audio.startMusic(mode === 'campaign' ? 0 : mode === 'infinite' ? 1 : 2);
  }

  restart() {
    this.start(this.mode, this.difficulty);
  }

  quitToMenu() {
    this.clearEntities();
    this.running = false;
    this.over = false;
    this.paused = false;
    this.ui.setBossBar(false);
    this.showMenu();
  }

  togglePause(force) {
    const next = force !== undefined ? force : !this.paused;
    this.paused = next;
    if (next) { this.ui.showPause(this); Audio.stopMusic(); }
    else {
      this.ui.hideOverlay();
      if (Save.data.settings.music) Audio.startMusic(this.phase % 3);
    }
  }

  clearEntities() {
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
    for (const p of this.pickups) p.dispose();
    this.pickups = [];
    if (this.boss) { this.boss.dispose(); this.boss = null; }
    if (this.player) { this.player.dispose(); this.player = null; }
    this.playerBullets.clear();
    this.enemyBullets.clear();
    this.fx.clear();
    this.world.setCamPullback(0);
  }

  gameOver(victory = false) {
    if (this.over) return;
    this.over = true;
    this.running = false;
    this.victory = victory;
    Audio.stopMusic();
    Audio.play(victory ? 'victory' : 'gameOver');

    Save.addCoins(this.runCoins);
    Save.stat('kills', this.kills);
    Save.stat('maxCombo', this.maxCombo, 'max');
    Save.stat('maxLevel', this.level, 'max');
    Save.stat('bosses', this.bossesKilled);
    if (this.mode === 'campaign') Save.stat('maxPhase', this.phase + (victory ? 1 : 0), 'max');
    if (this.mode === 'infinite') Save.stat('maxWave', this.wave, 'max');
    if (this.mode === 'survivor') Save.stat('bestSurvival', Math.floor(this.elapsed), 'max');
    const newAch = Save.checkAchievements();
    Save.highscore(this.mode, this.score);
    Save.save();

    for (const a of newAch) this.ui.toast(`🏆 ${a.name} +${a.reward} ⬤`);
    setTimeout(() => this.ui.showGameOver(this, victory), 900);
  }

  // ═════════════════════════════════════════════════════════════
  // FASES E ONDAS
  // ═════════════════════════════════════════════════════════════
  setPhase(i) {
    this.phase = i;
    this.killsThisPhase = 0;
    this.phaseQuota = 12 + i * 3;
    this.waitingBoss = false;
    this.spawnQueue = this.phaseQuota;
    const theme = this.world.setTheme(i);
    this.ui.banner(`FASE ${i + 1}`, theme.name);
    Audio.play('ui');
  }

  startWave(n) {
    this.wave = n;
    this.spawnQueue = 5 + n * 2;
    this.waitingBoss = false;
    this.world.setTheme((n - 1) % THEMES.length);
    if (n > 1) this.ui.banner(`ONDA ${n}`, THEMES[(n - 1) % THEMES.length].name, 1600);
  }

  spawnBoss(index) {
    const hpScale = this.difficultyMult * (this.mode === 'campaign' ? 1 : 1 + this.wave * 0.12);
    this.boss = new Boss(this.world.scene, index, hpScale);
    this.waitingBoss = true;
    this.world.setCamPullback(6);
    Audio.play('bossIntro');
    this.ui.banner(this.boss.data.name, this.boss.data.subtitle, 2600);
    this.ui.setBossBar(true, this.boss.data.name, this.boss.data.subtitle, 1);
  }

  onBossRage() {
    this.ui.toast('⚠ MODO FÚRIA');
    this.fx.addShake(0.9);
  }

  onBossKilled(boss) {
    this.bossesKilled++;
    this.score += 500 + boss.index * 250;
    this.addCoins(boss.data.reward);
    this.addXP(60 + boss.index * 12);
    this.ui.setBossBar(false);
    this.world.setCamPullback(0);
    this.fx.addShake(1.5);

    // chuva de recompensas
    const p = boss.mesh.position;
    for (let i = 0; i < 10; i++) {
      this.pickups.push(new Pickup(this.world.scene, 'coin', p.x + (Math.random() - 0.5) * 12, p.y + (Math.random() - 0.5) * 10, p.z, { value: 5 }));
    }
    for (let i = 0; i < 2; i++) {
      this.pickups.push(new Pickup(this.world.scene, 'power', p.x + (Math.random() - 0.5) * 10, p.y, p.z, { type: rollPowerUpType() }));
    }

    setTimeout(() => {
      if (this.boss) { this.boss.dispose(); this.boss = null; }
      if (this.mode === 'campaign') {
        if (this.phase >= BOSSES.length - 1) { this.gameOver(true); return; }
        this.setPhase(this.phase + 1);
      } else if (this.mode === 'infinite') {
        this.startWave(this.wave + 1);
      } else {
        this.ui.banner('CHEFE ABATIDO', 'CONTINUE SOBREVIVENDO', 1800);
      }
    }, 1600);
  }

  spawnMinions(n, x, y) {
    for (let i = 0; i < n; i++) {
      const type = Math.random() < 0.5 ? 'fast' : 'basic';
      const e = new Enemy(this.world.scene, type,
        x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 8, FIELD.bossZ + 8, this.enemyScale());
      this.enemies.push(e);
    }
  }

  enemyScale() {
    const base = this.mode === 'campaign' ? 1 + this.phase * 0.28
      : this.mode === 'infinite' ? 1 + this.wave * 0.2
        : 1 + this.elapsed / 55;
    return base * this.difficultyMult;
  }

  pickEnemyType() {
    if (this.mode === 'campaign') {
      const pool = PHASE_ENEMY_POOL[Math.min(this.phase, PHASE_ENEMY_POOL.length - 1)];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const tier = this.mode === 'infinite' ? this.wave : Math.floor(this.elapsed / 30) + 1;
    const pool = PHASE_ENEMY_POOL[Math.min(tier, PHASE_ENEMY_POOL.length - 1)];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  spawnFormation() {
    const type = this.pickEnemyType();
    const scale = this.enemyScale();
    const shape = Math.random();
    const cx = (Math.random() - 0.5) * FIELD.x * 1.2;
    const cy = (Math.random() - 0.5) * FIELD.y * 1.1;
    const push = (x, y, zOff = 0) => {
      const e = new Enemy(this.world.scene, type,
        clamp(x, -FIELD.x, FIELD.x), clamp(y, -FIELD.y, FIELD.y), FIELD.spawnZ - zOff, scale);
      this.enemies.push(e);
      this.spawnQueue--;
    };

    if (shape < 0.3) {
      // linha
      const n = Math.min(4, Math.max(1, this.spawnQueue));
      for (let i = 0; i < n; i++) push(cx + (i - (n - 1) / 2) * 6, cy, i * 3);
    } else if (shape < 0.55) {
      // V
      const n = Math.min(5, Math.max(1, this.spawnQueue));
      for (let i = 0; i < n; i++) {
        const o = i - (n - 1) / 2;
        push(cx + o * 5, cy + Math.abs(o) * 2.4, Math.abs(o) * 6);
      }
    } else if (shape < 0.75) {
      // círculo
      const n = Math.min(6, Math.max(1, this.spawnQueue));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        push(cx + Math.cos(a) * 7, cy + Math.sin(a) * 5, 0);
      }
    } else {
      push(cx, cy, 0);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // RECOMPENSAS
  // ═════════════════════════════════════════════════════════════
  addCoins(n) {
    this.runCoins += Math.round(n * this.coinMult);
  }

  addXP(n) {
    this.xp += n * this.xpMult;
    while (this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level);
      this.level++;
      this.pendingLevelUps++;
    }
    if (this.pendingLevelUps > 0 && this.ui.current !== 'levelup' && !this.paused) this.openLevelUp();
  }

  openLevelUp() {
    Audio.play('levelUp');
    const pool = RUN_UPGRADES.filter((u) => (this.upgradeLevels[u.id] || 0) < u.max);
    const choices = [];
    const copy = pool.slice();
    for (let i = 0; i < 3 && copy.length; i++) {
      choices.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    if (!choices.length) { this.pendingLevelUps = 0; return; }
    this.paused = true;
    this.fx.ring(this.player.position.x, this.player.position.y, this.player.position.z, 0xffd60a, 1, 20, 0.7);
    this.ui.showLevelUp(choices, (up) => {
      up.apply(this);
      this.upgradeLevels[up.id] = (this.upgradeLevels[up.id] || 0) + 1;
      this.pendingLevelUps--;
      this.ui.toast(`${up.icon} ${up.name}`);
      if (this.pendingLevelUps > 0) this.openLevelUp();
      else { this.paused = false; this.ui.hideOverlay(); }
    });
  }

  onEnemyKilled(enemy, source) {
    this.kills++;
    this.killsThisPhase++;
    this.combo++;
    this.comboTimer = 3;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const p = enemy.mesh.position;
    const comboBonus = 1 + Math.min(2, this.combo * 0.05);
    this.score += Math.round(enemy.cfg.score * comboBonus * this.difficultyMult);
    this.addCoins(enemy.cfg.coins * comboBonus);

    // orbe de XP + moeda
    this.pickups.push(new Pickup(this.world.scene, 'xp', p.x, p.y, p.z, {
      value: 3 + Math.round(enemy.cfg.score / 6), color: 0x39ff14, size: 0.42,
    }));
    if (Math.random() < 0.5) {
      this.pickups.push(new Pickup(this.world.scene, 'coin', p.x, p.y, p.z, { value: enemy.cfg.coins }));
    }

    // chance de power-up
    const dropChance = 0.055 + (this.mode === 'survivor' ? 0.02 : 0);
    if (Math.random() < dropChance) {
      this.pickups.push(new Pickup(this.world.scene, 'power', p.x, p.y, p.z, { type: rollPowerUpType() }));
    }

    if (this.combo > 0 && this.combo % 10 === 0) {
      this.ui.toast(`COMBO ×${this.combo}!`);
      this.addCoins(this.combo);
    }

    // explosão em área do upgrade NOVA BURST
    if (source && source.aoe) {
      this.shockwave(p.x, p.y, p.z, 7 + source.aoe * 3, 1.5 * source.aoe, enemy);
    }
  }

  /** Dano em área a partir de um ponto. */
  shockwave(x, y, z, radius, damage, exclude = null) {
    this.fx.ring(x, y, z, 0xffaa00, 1, radius, 0.4);
    for (const e of this.enemies) {
      if (e === exclude || !e.alive) continue;
      if (e.mesh.position.distanceTo(new THREE.Vector3(x, y, z)) < radius) e.damage(damage, this, null);
    }
    if (this.boss && this.boss.alive && this.boss.mesh.position.distanceTo(new THREE.Vector3(x, y, z)) < radius + 6) {
      this.boss.damage(damage, this);
    }
  }

  collectPowerUp(type) {
    const p = this.player;
    const now = performance.now();
    Audio.play('powerup');
    Save.stat('powerups', 1);
    const label = POWERUPS[type].label;
    switch (type) {
      case 'life':
        p.lives = Math.min(p.lives + 1, 6);
        break;
      case 'weapon':
        p.weaponLevel = Math.min(p.weaponLevel + 1, 4);
        break;
      case 'shield':
        p.shieldUntil = now + 8000 * (1 + p.shieldBonus);
        break;
      case 'double':
        p.doubleUntil = now + 10000;
        break;
      case 'bomb': {
        this.fx.bigExplosion(p.position.x, p.position.y, p.position.z - 30, 0xcc00ff, 3);
        this.fx.addShake(1.4);
        Audio.play('bigExplosion');
        for (const e of this.enemies.slice()) e.damage(9999, this, null);
        if (this.boss && this.boss.alive) this.boss.damage(40 * this.difficultyMult, this);
        this.enemyBullets.clear();
        break;
      }
    }
    this.ui.toast(`⚡ ${label}`);
    this.fx.text(label, p.position.x, p.position.y + 3, p.position.z, '#00f5ff', 1.4);
  }

  flash(color) { this.ui.flash(color); }

  // ═════════════════════════════════════════════════════════════
  // COLISÕES
  // ═════════════════════════════════════════════════════════════
  /** Distância mínima entre o segmento percorrido pelo tiro e um alvo. */
  segmentHit(b, dt, target, radius) {
    const px = b.mesh.position.x, py = b.mesh.position.y, pz = b.mesh.position.z;
    const ax = px - b.vx * dt, ay = py - b.vy * dt, az = pz - b.vz * dt;
    const abx = px - ax, aby = py - ay, abz = pz - az;
    const len2 = abx * abx + aby * aby + abz * abz;
    let t = 0;
    if (len2 > 1e-6) {
      t = ((target.x - ax) * abx + (target.y - ay) * aby + (target.z - az) * abz) / len2;
      t = clamp(t, 0, 1);
    }
    const cx = ax + abx * t, cy = ay + aby * t, cz = az + abz * t;
    const dx = target.x - cx, dy = target.y - cy, dz = target.z - cz;
    return dx * dx + dy * dy + dz * dz <= radius * radius;
  }

  handleCollisions(dt) {
    const p = this.player;
    if (!p) return;
    const now = performance.now();

    // ─ tiros do jogador × inimigos ─
    for (const b of this.playerBullets.list) {
      if (!b.alive) continue;
      for (const e of this.enemies) {
        if (!e.alive || b.hit.has(e)) continue;
        if (this.segmentHit(b, dt, e.mesh.position, e.radius + b.radius)) {
          b.hit.add(e);
          const died = e.damage(b.damage, this, p);
          if (b.crit) this.fx.text('CRIT', e.mesh.position.x, e.mesh.position.y + 1.5, e.mesh.position.z, '#ffd60a', 1.2, 0.7);
          if (b.aoe && died) this.shockwave(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, 6, b.damage * 0.6, e);
          if (b.pierce > 0) b.pierce--;
          else { b.pool.release(b); break; }
        }
      }
      if (!b.alive) continue;
      if (this.boss && this.boss.alive && !this.boss.entering && !b.hit.has(this.boss)) {
        if (this.segmentHit(b, dt, this.boss.mesh.position, this.boss.radius + b.radius)) {
          b.hit.add(this.boss);
          this.boss.damage(b.damage, this);
          this.fx.sparks(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, 0xffffff, 6, 1);
          if (b.crit) this.fx.text('CRIT', b.mesh.position.x, b.mesh.position.y + 2, b.mesh.position.z, '#ffd60a', 1.3, 0.7);
          if (b.pierce > 0) b.pierce--;
          else b.pool.release(b);
        }
      }
    }

    // ─ laser contínuo ─
    if (p.laserActive) {
      const lx = p.position.x, ly = p.position.y;
      const dmg = 26 * p.damageMult * dt;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.abs(e.mesh.position.x - lx) < e.radius + 1.2 &&
            Math.abs(e.mesh.position.y - ly) < e.radius + 1.2 &&
            e.mesh.position.z < p.position.z) {
          e.damage(dmg, this, p);
          this.fx.sparks(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, 0x00f5ff, 2, 0.6);
        }
      }
      if (this.boss && this.boss.alive && !this.boss.entering &&
          Math.abs(this.boss.mesh.position.x - lx) < this.boss.radius + 1 &&
          Math.abs(this.boss.mesh.position.y - ly) < this.boss.radius + 1) {
        this.boss.damage(dmg, this);
      }
    }

    // ─ tiros inimigos × jogador ─
    const pr = 1.7;
    for (const b of this.enemyBullets.list) {
      if (!b.alive) continue;
      const d = b.mesh.position.distanceTo(p.position);
      if (d < pr + b.radius) {
        if (b.bomb) {
          this.fx.explosion(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, 0xff3300, 1.6, 30);
          Audio.play('explosion');
        }
        b.pool.release(b);
        p.takeDamage(this, 1);
        if (!p.alive) { this.onPlayerDeath(); return; }
      } else if (p.hasShield(now) && d < 4.4) {
        // escudo destrói projéteis próximos
        this.fx.sparks(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, p.cfg.color, 4, 0.7);
        b.pool.release(b);
      }
    }

    // ─ colisão corpo a corpo ─
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.mesh.position.distanceTo(p.position) < pr + e.radius) {
        e.kill(this, p);
        p.takeDamage(this, 1);
        if (!p.alive) { this.onPlayerDeath(); return; }
      }
    }
    if (this.boss && this.boss.alive && !this.boss.entering &&
        this.boss.mesh.position.distanceTo(p.position) < pr + this.boss.radius) {
      p.takeDamage(this, 1);
      if (!p.alive) { this.onPlayerDeath(); return; }
    }

    // ─ coletáveis ─
    for (const pk of this.pickups) {
      if (!pk.alive) continue;
      if (pk.mesh.position.distanceTo(p.position) < pr + pk.radius) {
        pk.alive = false;
        if (pk.kind === 'power') this.collectPowerUp(pk.type);
        else if (pk.kind === 'coin') { this.addCoins(pk.value); Audio.play('coin'); }
        else { this.addXP(pk.value); Audio.play('xp'); }
      }
    }
  }

  onPlayerDeath() {
    const p = this.player;
    this.fx.bigExplosion(p.position.x, p.position.y, p.position.z, 0x00f5ff, 2.4);
    this.fx.addShake(1.6);
    p.mesh.visible = false;
    p.shieldMesh.visible = false;
    p.laserMesh.visible = false;
    this.gameOver(false);
  }

  // ═════════════════════════════════════════════════════════════
  // LOOP
  // ═════════════════════════════════════════════════════════════
  tick() {
    requestAnimationFrame(() => this.tick());
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05;     // evita saltos após travadas/abas em segundo plano

    // FPS
    this.fpsAcc += dt; this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      const el = document.getElementById('fps');
      if (!el.classList.contains('hidden')) el.textContent = Math.round(this.fpsFrames / this.fpsAcc) + ' FPS';
      this.fpsAcc = 0; this.fpsFrames = 0;
    }

    const active = this.running && !this.paused && !this.over;

    if (active) this.updateGameplay(dt);
    else if (this.previewMesh) {
      this.previewMesh.rotation.y += dt * 0.6;
      this.previewMesh.position.y = -1.5 + Math.sin(now * 0.0015) * 0.4;
    }

    this.fx.update(dt);
    this.world.scrollSpeed = active ? (this.boss ? 0.45 : 1) : 0.5;
    this.world.update(dt, this.player && this.running ? this.player.position : null, this.fx.shake);
    this.world.render();
  }

  updateGameplay(dt) {
    this.elapsed += dt;

    // combo decai
    this.comboTimer -= dt;
    if (this.comboTimer <= 0 && this.combo > 1) { this.combo = 1; }

    // jogador
    this.player.update(dt, this.input, this);
    if (this.input.fire) this.player.shoot(this);

    // inimigos
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this);
      if (!e.alive) { e.dispose(); this.enemies.splice(i, 1); continue; }
      if (e.mesh.position.z > FIELD.despawnZ) {
        e.alive = false; e.dispose(); this.enemies.splice(i, 1);
        if (this.combo > 1) this.combo = 1;
      }
    }

    // chefe
    if (this.boss) {
      this.boss.update(dt, this);
      this.ui.setBossBar(true, this.boss.data.name, this.boss.data.subtitle, this.boss.hp / this.boss.maxHp);
      if (!this.boss.alive && this.boss.dead) { /* removido no callback */ }
    }

    // projéteis
    this.playerBullets.update(dt, this.enemies.concat(this.boss && this.boss.alive ? [this.boss] : []));
    this.enemyBullets.update(dt, this.player.position);

    // coletáveis
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.update(dt, this.player.position, this.magnetRadius);
      if (!pk.alive || pk.mesh.position.z > FIELD.despawnZ + 8) { pk.dispose(); this.pickups.splice(i, 1); }
    }

    this.handleCollisions(dt);
    if (this.over) return;

    this.updateSpawning(dt);
    this.ui.updateHUD(this);
  }

  updateSpawning(dt) {
    // power-up periódico "de graça"
    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0) {
      this.powerupTimer = 22 + Math.random() * 14;
      this.pickups.push(new Pickup(this.world.scene, 'power',
        (Math.random() - 0.5) * FIELD.x * 1.4, (Math.random() - 0.5) * FIELD.y * 1.2, FIELD.spawnZ * 0.5,
        { type: rollPowerUpType() }));
    }

    if (this.boss) return;

    this.spawnTimer -= dt;

    if (this.mode === 'campaign') {
      if (!this.waitingBoss && this.killsThisPhase >= this.phaseQuota && this.enemies.length === 0) {
        this.spawnBoss(this.phase);
        return;
      }
      if (this.spawnQueue > 0 && this.spawnTimer <= 0 && this.enemies.length < 22) {
        this.spawnTimer = Math.max(0.5, 1.45 - this.phase * 0.08);
        this.spawnFormation();
      }
      // repõe a fila se o jogador deixou inimigos escaparem
      if (this.spawnQueue <= 0 && this.killsThisPhase < this.phaseQuota && this.enemies.length === 0) {
        this.spawnQueue = this.phaseQuota - this.killsThisPhase;
      }
    } else if (this.mode === 'infinite') {
      if (this.spawnQueue > 0 && this.spawnTimer <= 0 && this.enemies.length < 26) {
        this.spawnTimer = Math.max(0.4, 1.9 - this.wave * 0.08);
        this.spawnFormation();
      }
      if (this.spawnQueue <= 0 && this.enemies.length === 0) {
        if (this.wave % 5 === 0) this.spawnBoss((Math.floor(this.wave / 5) - 1) % BOSSES.length);
        else this.startWave(this.wave + 1);
      }
    } else {
      // survivor: fluxo contínuo que acelera com o tempo
      if (this.spawnTimer <= 0 && this.enemies.length < 30) {
        this.spawnTimer = Math.max(0.35, 1.7 - this.elapsed / 90);
        this.spawnQueue = 6;
        this.spawnFormation();
      }
      if (this.elapsed >= this.nextBossAt) {
        this.nextBossAt += 90;
        this.spawnBoss(Math.min(BOSSES.length - 1, this.bossesKilled));
        return;
      }
      if (this.elapsed >= this.nextThemeAt) {
        this.nextThemeAt += 60;
        const t = this.world.setTheme(Math.floor(this.elapsed / 60) % THEMES.length);
        this.ui.banner('SETOR ' + (Math.floor(this.elapsed / 60) + 1), t.name, 1600);
      }
      this.score += Math.round(dt * 12);
    }
  }
}
