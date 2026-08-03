/* ═══════════════════════════════════════════════════════════════════
   GAME — loop, spawn, colisões, dano, ciclo de vida dos modos
   ═══════════════════════════════════════════════════════════════════ */

const STEP_MS = 1000 / 60;
const EB = { lat: 0.09, depth: 0.12 };   // conversão de velocidade dos tiros inimigos

const Game = {
  playerBullets: [],
  scheduled: [],
  _acc: 0,
  _lastFrame: 0,
  _comboTimer: 0,

  /* ═════════ Ciclo de vida ═════════ */

  start(mode) {
    State.mode = mode;
    State.infiniteMode = mode === 'infinite';
    State.survivorMode = mode === 'survivor';
    State.bossRushMode = mode === 'bossrush';

    this.clearWorld();
    Clock.t = 0;

    State.running = true; State.paused = false; State.over = false;
    State.scores = [0, 0];
    State.gameLevel = 1; State.wave = 1;
    State.bossSpawned = false; State.uniqueSpawned = false;
    State.lastEnemySpawn = 0; State.gameStartTime = 0;
    State.powerUpActive = false; State.shieldActive = false;
    State.doubleDamage = false; State.phoenixUsed = false;
    State.bossRushIndex = 0;
    State.runUpgrades = {};
    State.magnetRadius = 0; State.xpMultiplier = 1;
    State._runCoinMult = 1; State._shieldDurMult = 1; State._runComboBonus = 0;
    State.xp = 0; State.xpToNextLevel = 100; State.level = 1;
    State.survivorAbilities = freshSurvivorAbilities();
    State.survivorStartTime = 0; State.survivorElapsed = 0;
    State.infiniteCooldowns = { nuke: 0, heal: 0, shield: 0 };
    State.stats.phaseDamageTaken = 0;
    State.stats.currentCombo = 0; State.stats.lastKillTime = 0;
    State.stats.gamesPlayed++;

    // jogadores
    const count = State.twoPlayer ? 2 : 1;
    State.players = [];
    for (let i = 0; i < count; i++) {
      const p = new Player(State.selectedChar[i], i);
      this.applySkillBonuses(p);
      State.players.push(p);
    }

    // estatísticas de personagens
    State.selectedChar.slice(0, count).forEach(c => {
      if (!State.stats.charactersUsed.includes(c)) State.stats.charactersUsed.push(c);
      if (['omega', 'phantom', 'titan'].includes(c)) State.stats.newCharPlayed = true;
    });
    State.stats.charactersPlayed = State.stats.charactersUsed.length;

    // sp10 — Ultimate: começa com escudo
    if ((State.unlockedSkills.sp10 || 0) >= 1) {
      State.shieldActive = true;
      State.shieldEndTime = 10000;
    }

    Render.setTheme(1);
    UI.enterGame();
    UI.updateHUD();

    if (State.bossRushMode) {
      State.boss = new Boss(1);
      State.bossSpawned = true;
      UI.announce('BOSS RUSH — 12 BOSSES', '#ff6600');
    } else {
      UI.announce(
        State.infiniteMode ? 'WAVE 1 — COMEÇOU!' : State.survivorMode ? 'SOBREVIVA!' : 'FASE 1 — COMEÇOU!',
        '#00f5ff');
    }

    this._lastFrame = performance.now();
    this._acc = 0;
    if (!this._raf) this.loop();
  },

  clearWorld() {
    State.enemies.forEach(e => e.destroy()); State.enemies = [];
    State.powerUps.forEach(p => p.destroy()); State.powerUps = [];
    State.xpOrbs.forEach(o => o.destroy()); State.xpOrbs = [];
    State.enemyBullets.forEach(b => this.releaseBullet(b)); State.enemyBullets = [];
    this.playerBullets.forEach(b => this.releaseBullet(b)); this.playerBullets = [];
    State.players.forEach(p => p.destroy()); State.players = [];
    if (State.boss) { State.boss.destroy(); State.boss = null; }
    this.scheduled.length = 0;
    FX.clearTexts();
  },

  pause() {
    if (!State.running || State.over) return;
    State.paused = true;
    UI.openOverlay('pauseScreen');
  },

  resume() {
    State.paused = false;
    UI.closeOverlays();
    UI.enterGame();
    this._lastFrame = performance.now();
  },

  quitToMenu() {
    State.running = false; State.paused = false;
    this.clearWorld();
    UI.exitGame();
    UI.navigate('mainMenu');
  },

  restart() {
    UI.closeOverlays();
    this.start(State.mode);
  },

  gameOver() {
    if (State.over) return;
    State.over = true;
    State.running = false;
    const isNew = saveHighScore(getCurrentHSMode(), State.scores[0]);
    this.checkAchievements();
    saveGameData();
    UI.showGameOver(isNew, false);
  },

  victory() {
    State.over = true;
    State.running = false;
    if (State.difficulty === 'extreme' && !State.bossRushMode) State.stats.finalBossOnExtreme++;
    if (State.bossRushMode) State.stats.bossRushDone = true;
    if (State.twoPlayer) State.stats.multiplayerWins++;
    const isNew = saveHighScore(getCurrentHSMode(), State.scores[0]);
    this.checkAchievements();
    saveGameData();
    UI.showGameOver(isNew, true);
  },

  /* ═════════ Agendador (pausa junto com o jogo) ═════════ */
  schedule(delayMs, fn) { this.scheduled.push({ at: now() + delayMs, fn }); },
  runScheduled() {
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      if (now() >= this.scheduled[i].at) {
        const s = this.scheduled.splice(i, 1)[0];
        try { s.fn(); } catch (e) { /* callback obsoleto */ }
      }
    }
  },

  /* ═════════ Loop principal ═════════ */
  loop() {
    this._raf = requestAnimationFrame(() => this.loop());
    const t = performance.now();
    let frameMs = Math.min(100, t - this._lastFrame);
    this._lastFrame = t;
    const dt = frameMs / 1000;

    if (State.running && !State.paused) {
      this._acc += frameMs;
      let steps = 0;
      while (this._acc >= STEP_MS && steps < 5) {
        this._acc -= STEP_MS;
        Clock.step(STEP_MS);
        this.step();
        steps++;
      }
      this.visual(dt);
    }

    // O cenário continua se movendo mesmo no menu (fundo vivo)
    Render.update(dt, State.running && !State.paused ? 14 : 0);
    if (State.running && State.players[0]) {
      Render.followPlayer(State.players[0].x, State.players[0].y);
    } else if (!State.running) {
      const drift = UI._previewMesh ? 0 : Math.sin(t / 4000) * 2;
      Render.camera.position.x += (drift - Render.camera.position.x) * 0.03;
      Render.camera.position.y += (5.5 - Render.camera.position.y) * 0.03;
      Render.camera.lookAt(0, 1, -40);
      UI.spinPreview(dt);
    }
    FX.update(dt);
    Render.render();
  },

  /* ═════════ Um passo de simulação (1/60 s) ═════════ */
  step() {
    this.runScheduled();
    const t = now();

    // Jogadores
    State.players.forEach((p, i) => {
      if (!p.alive) return;
      p.step(Input.read(i));
    });

    // Timers globais
    this.updateTimers();

    // Inimigos
    for (let i = State.enemies.length - 1; i >= 0; i--) {
      const e = State.enemies[i];
      e.step();
      if (e.z > FIELD.killZ) { e.destroy(); State.enemies.splice(i, 1); }
    }

    if (State.boss) State.boss.step();

    // Projéteis do jogador
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      b.prevZ = b.z;
      b.life++;
      // Assistência de mira: correção leve em direção ao alvo mais próximo à frente.
      if (b.life > 6) {
        const tg = this.nearestTarget(b);
        if (tg) {
          b.vx += clamp((tg.x - b.x) * 0.05, -0.07, 0.07);
          b.vy += clamp((tg.y - b.y) * 0.05, -0.07, 0.07);
        }
      }
      b.x += b.vx; b.y += b.vy; b.z += b.vz;
      if (b.z < FIELD.spawnZ - 20 || Math.abs(b.x) > FIELD.hw + 12 || Math.abs(b.y) > FIELD.hh + 12) {
        this.releaseBullet(b); this.playerBullets.splice(i, 1);
      }
    }

    // Projéteis inimigos
    for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
      const b = State.enemyBullets[i];
      b.prevZ = b.z;
      if (b.homing) {
        const p = this.pickLivePlayer();
        if (p) {
          b.vx += clamp((p.x - b.x) * 0.004, -0.06, 0.06);
          b.vy += clamp((p.y - b.y) * 0.004, -0.06, 0.06);
        }
      }
      b.x += b.vx; b.y += b.vy; b.z += b.vz;
      if (b.z > FIELD.killZ || Math.abs(b.x) > FIELD.hw + 14 || Math.abs(b.y) > FIELD.hh + 14 || b.z < FIELD.spawnZ - 30) {
        this.releaseBullet(b); State.enemyBullets.splice(i, 1);
      }
    }

    // Power-ups
    for (let i = State.powerUps.length - 1; i >= 0; i--) {
      const pu = State.powerUps[i];
      pu.step();
      if (pu.z > FIELD.killZ) { pu.destroy(); State.powerUps.splice(i, 1); }
    }

    // Orbes de XP
    for (let i = State.xpOrbs.length - 1; i >= 0; i--) {
      const o = State.xpOrbs[i];
      o.step();
      if (o.z > FIELD.killZ + 6) { o.destroy(); State.xpOrbs.splice(i, 1); }
    }

    this.collisions();
    this.trySpawn();

    // Survivor: tempo
    if (State.survivorMode) {
      State.survivorElapsed = t / 1000;
      State.stats.maxSurvivorTime = Math.max(State.stats.maxSurvivorTime, Math.floor(State.survivorElapsed));
    }
    State.stats.longestSurvival = Math.max(State.stats.longestSurvival, Math.floor(t / 1000));

    // Combo expira
    if (State.stats.currentCombo > 0 && t - State.stats.lastKillTime > 5000) {
      State.stats.currentCombo = 0;
      UI.updateCombo();
    }

    // Derrota
    if (State.players.length && State.players.every(p => !p.alive)) this.gameOver();
  },

  visual(dt) {
    const t = now();
    State.players.forEach(p => {
      if (p.alive) p.visual(dt, t);
      else { p.mesh.visible = false; p.reticle.visible = false; }
    });
    State.enemies.forEach(e => e.visual(dt, t));
    State.boss?.visual(dt, t);
    State.powerUps.forEach(p => p.visual(dt, t));
    State.xpOrbs.forEach(o => o.visual(dt, t));
    this.playerBullets.forEach(b => {
      b.mesh.position.set(b.x, b.y, b.z);
      if (Math.random() < 0.4) FX.trail(b.x, b.y, b.z + 0.4, b.color, 0.22);
    });
    State.enemyBullets.forEach(b => {
      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.rotation.y += dt * 3;
    });
    UI.updateHUD();
  },

  /* ═════════ Projéteis ═════════ */
  spawnPlayerBullet(owner, x, y, ax, ay, dmg, big = 0) {
    const color = owner.bulletColor;
    const key = 'p' + color + big;
    const mesh = MeshPool.get(key, () => Models.playerBullet(color));
    mesh.scale.setScalar(1 + big * 0.7);
    Render.world.add(mesh);
    // fp10 — crítico
    let crit = false;
    if (owner._critChance && Math.random() < owner._critChance) { crit = true; dmg *= 3; }
    const b = {
      x, y, z: owner.z - 1.6, prevZ: owner.z - 1.6,
      vx: ax, vy: ay, vz: -11 * K.depth,
      damage: dmg, color, mesh, owner,
      pierce: (owner._piercing || 0) + (owner._pierce || 0),
      crit, radius: 0.75 + big * 0.35, life: 0, key,
      aoe: (State.unlockedSkills.fp6 || 0) >= 1 ? 2.4 : 0,
    };
    mesh.position.set(b.x, b.y, b.z);
    this.playerBullets.push(b);
    return b;
  },

  spawnEnemyBullet(x, y, z, vx, vy, vz, color = 0xffff00, scale = 1, homing = false) {
    if (State.enemyBullets.length > 420) return;
    const key = 'e' + color;
    const mesh = MeshPool.get(key, () => Models.enemyBullet(color));
    mesh.scale.setScalar(scale);
    Render.world.add(mesh);
    const b = {
      x, y, z, prevZ: z,
      vx: vx * EB.lat, vy: vy * EB.lat, vz: vz * EB.depth,
      mesh, color, radius: 0.42 * scale, homing, key,
    };
    mesh.position.set(x, y, z);
    State.enemyBullets.push(b);
    return b;
  },

  releaseBullet(b) {
    Render.world.remove(b.mesh);
    MeshPool.put(b.key, b.mesh);
  },

  /* ═════════ Colisões ═════════ */
  collisions() {
    // tiros do jogador × inimigos
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      let consumed = false;

      for (let j = State.enemies.length - 1; j >= 0 && !consumed; j--) {
        const e = State.enemies[j];
        if (!this.hitSwept(b, e)) continue;
        this.damageEnemy(e, j, b);
        FX.spawn(b.x, b.y, b.z, b.crit ? 0xffd60a : b.color, b.crit ? 14 : 7, 5, 0.4, 0.4);
        if (b.crit) FX.floatText(e.x, e.y + 1.2, e.z, 'CRIT!', '#ffd60a', 0.8);
        if (b.aoe) this.aoeDamage(b.x, b.y, b.z, b.aoe, b.damage * 0.5, b.owner, e);
        if (b.pierce > 0) b.pierce--;
        else consumed = true;
      }

      if (!consumed && State.boss && this.hitSwept(b, State.boss)) {
        this.damageBoss(b.damage, b);
        FX.spawn(b.x, b.y, b.z, b.crit ? 0xffd60a : b.color, b.crit ? 16 : 8, 6, 0.45, 0.45);
        if (b.crit) FX.floatText(b.x, b.y + 1.2, b.z, 'CRIT!', '#ffd60a', 0.8);
        consumed = true;
      }

      if (consumed) { this.releaseBullet(b); this.playerBullets.splice(i, 1); }
    }

    // laser (deepseek) — dano contínuo em túnel
    State.players.forEach(p => {
      if (!p.laserActive || !p.alive) return;
      if (now() % 100 > 20) return;   // ~10 ticks/s
      const dmg = p.damageMultiplier * 0.6 * (State.doubleDamage && now() < State.doubleDamageEnd ? 2 : 1);
      for (let j = State.enemies.length - 1; j >= 0; j--) {
        const e = State.enemies[j];
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 0.9 && e.z < p.z) {
          this.damageEnemy(e, j, { damage: dmg, owner: p, x: e.x, y: e.y, z: e.z, color: 0x00f5ff });
        }
      }
      if (State.boss && Math.hypot(State.boss.x - p.x, State.boss.y - p.y) < State.boss.radius + 0.9) {
        this.damageBoss(dmg, { x: State.boss.x, y: State.boss.y, z: State.boss.z, owner: p });
      }
    });

    // tiros inimigos × jogador
    for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
      const b = State.enemyBullets[i];
      let hit = false;
      for (const p of State.players) {
        if (!p.alive || p.invincible) continue;
        if (Math.hypot(b.x - p.x, b.y - p.y) > p.radius + b.radius) continue;
        if (!(b.prevZ <= p.z + 1 && b.z >= p.z - 1) && Math.abs(b.z - p.z) > 1.4) continue;
        // deflexão
        if (p._deflectChance && Math.random() < p._deflectChance) {
          b.vz = -Math.abs(b.vz) * 1.4; b.deflected = true;
          b.mesh.scale.setScalar(1.4);
          FX.floatText(p.x, p.y + 1.5, p.z, 'DEFLECT', '#00f5ff', 0.7);
          continue;
        }
        if (p.hasShield()) {
          FX.spawn(b.x, b.y, b.z, p.shieldColor, 14, 6, 0.5);
          playSound('hit');
          // df4 — Thorns
          if ((State.unlockedSkills.df4 || 0) >= 1 && State.boss) this.damageBoss(1 * (State.unlockedSkills.df4 || 1), { x: State.boss.x, y: State.boss.y, z: State.boss.z, owner: p });
        } else {
          this.damagePlayer(p);
        }
        hit = true;
        break;
      }
      // tiros defletidos machucam inimigos
      if (b.deflected) {
        for (let j = State.enemies.length - 1; j >= 0; j--) {
          const e = State.enemies[j];
          if (Math.hypot(b.x - e.x, b.y - e.y, b.z - e.z) < e.radius + b.radius) {
            this.damageEnemy(e, j, { damage: (State.unlockedSkills.df10 || 0) >= 1 ? 2 : 1, owner: State.players[0], x: b.x, y: b.y, z: b.z, color: 0x00f5ff });
            hit = true; break;
          }
        }
      }
      if (hit) { this.releaseBullet(b); State.enemyBullets.splice(i, 1); }
    }

    // corpo dos inimigos × jogador
    for (let j = State.enemies.length - 1; j >= 0; j--) {
      const e = State.enemies[j];
      for (const p of State.players) {
        if (!p.alive) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z) < e.radius + p.radius) {
          if (p.hasShield() || p.invincible) {
            if (!p.invincible) {
              FX.explosion(e.x, e.y, e.z, 0x00f5ff, 22);
              this.killEnemy(e, j, p, true);
            }
          } else {
            this.damagePlayer(p);
            FX.explosion(e.x, e.y, e.z, 0xff3300, 26);
            this.killEnemy(e, j, p, true);
          }
          break;
        }
      }
    }

    // boss × jogador
    if (State.boss) {
      for (const p of State.players) {
        if (!p.alive || p.invincible || p.hasShield()) continue;
        if (Math.hypot(State.boss.x - p.x, State.boss.y - p.y, State.boss.z - p.z) < State.boss.radius + p.radius) {
          this.damagePlayer(p);
        }
      }
    }

    // power-ups × jogador
    for (let i = State.powerUps.length - 1; i >= 0; i--) {
      const pu = State.powerUps[i];
      for (const p of State.players) {
        if (!p.alive) continue;
        if (Math.hypot(pu.x - p.x, pu.y - p.y, pu.z - p.z) < pu.radius + p.radius + 0.6) {
          this.collectPowerUp(pu, i, p);
          break;
        }
      }
    }

    // orbes de XP × jogador
    for (let i = State.xpOrbs.length - 1; i >= 0; i--) {
      const o = State.xpOrbs[i];
      const p = State.players[0];
      if (p && p.alive && Math.hypot(o.x - p.x, o.y - p.y, o.z - p.z) < o.radius + p.radius + 0.5) {
        this.addXP(o.value);
        FX.spawn(o.x, o.y, o.z, 0x39ff14, 6, 4, 0.35, 0.3);
        playSound('xp');
        o.destroy(); State.xpOrbs.splice(i, 1);
      }
    }
  },

  /** Teste de colisão varrido em Z (evita "tunelamento" dos tiros rápidos). */
  hitSwept(b, target) {
    const r = target.radius + b.radius;
    if (Math.abs(b.x - target.x) > r || Math.abs(b.y - target.y) > r) return false;
    const zMin = Math.min(b.prevZ, b.z), zMax = Math.max(b.prevZ, b.z);
    return zMax >= target.z - r && zMin <= target.z + r;
  },

  aoeDamage(x, y, z, radius, dmg, owner, skip) {
    FX.spawn(x, y, z, 0xff8800, 12, 8, 0.4, 0.5);
    for (let j = State.enemies.length - 1; j >= 0; j--) {
      const e = State.enemies[j];
      if (e === skip) continue;
      if (Math.hypot(e.x - x, e.y - y, e.z - z) < radius + e.radius) {
        this.damageEnemy(e, j, { damage: dmg, owner, x: e.x, y: e.y, z: e.z, color: 0xff8800 });
      }
    }
  },

  /* ═════════ Dano ═════════ */
  damageEnemy(e, idx, b) {
    e.health -= b.damage;
    playSound('hit');
    if (e.health <= 0) this.killEnemy(e, idx, b.owner, false);
  },

  killEnemy(e, idx, killer, byContact) {
    if (State.enemies[idx] !== e) idx = State.enemies.indexOf(e);
    if (idx < 0) return;

    FX.explosion(e.x, e.y, e.z, e.cfg.glow, 26);

    if (e.type === 'bomber') {
      State.stats.bombersKilled++;
      FX.explosion(e.x, e.y, e.z, 0xff6600, 55, true);
      State.players.forEach(p => {
        if (p.alive && !p.invincible && !p.hasShield() && Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z) < 8) this.damagePlayer(p);
      });
    }

    // combo
    const t = now();
    if (t - State.stats.lastKillTime < 5000) State.stats.currentCombo++;
    else State.stats.currentCombo = 1;
    State.stats.lastKillTime = t;
    State.stats.maxCombo = Math.max(State.stats.maxCombo, State.stats.currentCombo);
    State.stats.enemiesKilled++;
    UI.updateCombo();

    const pIdx = Math.max(0, killer ? State.players.indexOf(killer) : 0);
    const base = e.cfg.score;
    const finalScore = Math.floor(base * (1 + Math.min(State.stats.currentCombo - 1, 9) * 0.1));
    State.scores[pIdx] += finalScore;

    const dm = getDifficultyMult();
    let coins = e.cfg.coins * dm * (State._runCoinMult || 1);
    if ((State.unlockedSkills.ut4 || 0) >= 1) coins *= 1.1;
    addCoins(coins);

    FX.floatText(e.x, e.y + 1, e.z, '+' + finalScore, State.stats.currentCombo > 5 ? '#ff006e' : '#ffd60a', 0.85);

    // combos dão moedas extras (sp2 / ru_combo)
    const comboBonus = (State.unlockedSkills.sp2 || 0) + (State._runComboBonus || 0);
    if (State.stats.currentCombo >= 3 && comboBonus > 0) addCoins(State.stats.currentCombo * comboBonus * 0.5);

    // XP no modo survivor
    if (State.survivorMode) State.xpOrbs.push(new XPOrb(e.x, e.y, e.z, 10 + e.maxHealth * 5));

    // AoE de morte (ru_aoe)
    if (killer?._aoeBurst) this.aoeDamage(e.x, e.y, e.z, 4, 1, killer, e);

    // drop de power-up
    const dropChance = 0.08 * (1 + 0.20 * (State.unlockedSkills.ut3 || 0));
    if (Math.random() < dropChance) State.powerUps.push(new PowerUp(e.x, e.y, e.z));

    e.destroy();
    State.enemies.splice(idx, 1);

    // Infinite: nova wave quando limpa a tela
    if (State.infiniteMode && State.enemies.length === 0 && !State.boss) {
      State.wave++;
      State.stats.maxInfiniteWave = Math.max(State.stats.maxInfiniteWave, State.wave);
      this.checkAchievements();
      UI.announce('WAVE ' + State.wave, '#00f5ff');
      Render.setTheme(((State.wave - 1) % PHASE_THEMES.length) + 1);
      if (State.wave % 5 === 0 && !State.bossSpawned) {
        const lvl = Math.min(BOSSES_DATA.length, Math.floor(State.wave / 5));
        State.boss = new Boss(lvl); State.bossSpawned = true;
        playSound('levelup');
      }
    }
    this.checkAchievements();
  },

  damageBoss(dmg, b) {
    const boss = State.boss;
    if (!boss) return;
    boss.health -= dmg;
    playSound('hit');
    if (boss.health <= 0) this.bossDefeated();
  },

  bossDefeated() {
    const boss = State.boss;
    if (!boss) return;
    State.stats.bossesDefeated++;
    const lootMult = 1 + 0.25 * (State.unlockedSkills.sp3 || 0) + 0.25 * (State.unlockedSkills.ut7 || 0);
    addCoins(boss.reward * lootMult * getDifficultyMult());
    State.scores[0] += boss.reward;
    if (State.twoPlayer) State.scores[1] += Math.floor(boss.reward * 0.7);

    // sp9 — Mastery
    if ((State.unlockedSkills.sp9 || 0) >= 1) {
      State.players.forEach(p => {
        p.damageMultiplier *= 1 + 0.05 * State.unlockedSkills.sp9;
        p.speed = Math.min(p.speed + 0.3, 18);
      });
    }

    FX.explosion(boss.x, boss.y, boss.z, 0xffd700, 90, true);
    for (let i = 0; i < 6; i++) {
      this.schedule(i * 180, () => FX.explosion(boss.x + rand(-4, 4), boss.y + rand(-3, 3), boss.z + rand(-4, 4), 0xff4500, 30, true));
    }
    Render.addFlash(0.8, 0xffd700);
    playSound('levelup');

    if (State.stats.phaseDamageTaken === 0 && !State.infiniteMode) {
      State.stats.perfectLevels++;
      addCoins(100);
      UI.announce('PERFEITO! +100 💰', '#ffd60a');
    }

    boss.destroy();
    State.boss = null;
    State.bossSpawned = false;

    if (State.bossRushMode) {
      State.bossRushIndex++;
      if (State.bossRushIndex >= BOSSES_DATA.length) { this.victory(); return; }
      State.players.forEach(p => { if (p.lives < p.maxLives) p.lives++; });
      const next = State.bossRushIndex + 1;
      Render.setTheme(next);
      this.schedule(2200, () => {
        if (!State.running || !State.bossRushMode) return;
        State.boss = new Boss(next);
        State.bossSpawned = true;
      });
      UI.announce('BOSS ' + next + ' / 12', '#ff6600');
    } else if (!State.infiniteMode && !State.survivorMode) {
      if (boss.level >= BOSSES_DATA.length) { this.victory(); return; }
      State.gameLevel++;
      State.stats.maxPhase = Math.max(State.stats.maxPhase, State.gameLevel);
      State.stats.phaseDamageTaken = 0;
      this.checkAchievements();
      UI.showPhaseLoading(State.gameLevel, () => {
        Render.setTheme(State.gameLevel);
        if (State.gameLevel % 2 === 0) State.players.forEach(p => { if (p.lives < p.maxLives) p.lives++; });
        UI.announce('FASE ' + State.gameLevel + ' — ' + PHASE_THEMES[(State.gameLevel - 1) % PHASE_THEMES.length].name, '#00f5ff');
      });
    } else {
      UI.announce('BOSS DERROTADO!', '#ffd60a');
    }
    this.checkAchievements();
    saveGameData();
  },

  damagePlayer(p) {
    if (p.invincible || !p.alive) return;

    // df8 — Last Stand
    if (p.lives === 1 && (State.unlockedSkills.df8 || 0) >= 1 && !p._lastStandUsed) {
      p._lastStandUsed = true;
      p.damageMultiplier *= 1.5;
      p.invincible = true; p.invincibleEnd = now() + 2000;
      UI.announce('LAST STAND!', '#ff006e');
      return;
    }

    p.lives--;
    State.stats.phaseDamageTaken++;
    playSound('explosion');
    FX.explosion(p.x, p.y, p.z, 0xff3300, 34, true);
    Render.addShake(0.7);
    Render.addFlash(0.5, 0xff0033);
    p.invincible = true;
    p.invincibleEnd = now() + 2000 + (p._invBonus || 0) + 300 * (State.unlockedSkills.df9 || 0) + 500 * (State.unlockedSkills.ut9 || 0);
    UI.updateHUD();

    if (p.lives <= 0) {
      // df2 — Phoenix
      if ((State.unlockedSkills.df2 || 0) >= 1 && !State.phoenixUsed) {
        State.phoenixUsed = true;
        p.lives = 2;
        p.invincible = true; p.invincibleEnd = now() + 3000;
        FX.explosion(p.x, p.y, p.z, 0xffd700, 60, true);
        UI.announce('PHOENIX — RENASCEU!', '#ffd60a');
        UI.updateHUD();
        return;
      }
      FX.explosion(p.x, p.y, p.z, 0xffffff, 70, true);
      p.mesh.visible = false;
    }
  },

  collectPowerUp(pu, idx, p) {
    State.stats.powerupsCollected++;
    const cfg = POWERUP_CFG[pu.type];
    switch (pu.type) {
      case 'life':
        p.lives = Math.min(p.lives + 1, p.maxLives);
        break;
      case 'weapon':
        p.shootCooldown = 100;
        if (p.index === 0) { State.powerUpActive = true; State.powerUpEndTime = now() + 5000; }
        else this.schedule(5000, () => { p.shootCooldown = p.baseCooldown; });
        break;
      case 'shield': {
        const dur = 8000 * (p.shieldDurationMult || 1) * (State._shieldDurMult || 1);
        if (p.index === 0) { State.shieldActive = true; State.shieldEndTime = now() + dur; }
        else { p.permanentShield = true; this.schedule(dur, () => { p.permanentShield = false; }); }
        break;
      }
      case 'double': {
        const dur = 6000 * (1 + 0.15 * (State.unlockedSkills.ut10 || 0));
        State.doubleDamage = true;
        State.doubleDamageEnd = now() + dur;
        State.stats.ddCollected++;
        break;
      }
      case 'bomb':
        for (let i = State.enemies.length - 1; i >= 0; i--) {
          const e = State.enemies[i];
          FX.explosion(e.x, e.y, e.z, 0xcc00ff, 20);
          this.killEnemy(e, i, p, false);
        }
        Render.addShake(1.0);
        Render.addFlash(0.7, 0xcc00ff);
        break;
    }
    // sp4 — Synergy Core
    if ((State.unlockedSkills.sp4 || 0) >= 1) p.damageMultiplier *= 1.05;

    UI.announce(cfg.label, '#' + cfg.color.toString(16).padStart(6, '0'));
    FX.spawn(pu.x, pu.y, pu.z, cfg.color, 26, 7, 0.7);
    playSound('powerup');
    pu.destroy();
    State.powerUps.splice(idx, 1);
    UI.updateHUD();
    this.checkAchievements();
  },

  /* ═════════ Timers globais ═════════ */
  updateTimers() {
    const t = now();
    if (State.powerUpActive && t > State.powerUpEndTime) {
      State.powerUpActive = false;
      const p = State.players[0];
      if (p) p.shootCooldown = p.baseCooldown;
    }
    if (State.shieldActive && t > State.shieldEndTime) State.shieldActive = false;
    if (State.doubleDamage && t > State.doubleDamageEnd) State.doubleDamage = false;

    if (State.infiniteMode) {
      let changed = false;
      Object.keys(State.infiniteCooldowns).forEach(k => {
        if (State.infiniteCooldowns[k] > 0) { State.infiniteCooldowns[k] = Math.max(0, State.infiniteCooldowns[k] - STEP_MS); changed = true; }
      });
      if (changed) UI.updateInfiniteBar();
    }
    if (State.survivorMode) {
      let changed = false;
      State.survivorAbilities.forEach(a => {
        if (a.cooldown > 0) { a.cooldown = Math.max(0, a.cooldown - STEP_MS); changed = true; }
      });
      if (changed) UI.updateSurvivorBar();
    }
  },

  /* ═════════ Spawn ═════════ */
  getEnemyPool() {
    if (State.infiniteMode || State.survivorMode) {
      const pool = ['basic', 'ufo', 'tank', 'fast', 'spinner', 'diver'];
      if (State.wave >= 8 || State.survivorElapsed >= 120) pool.push('bomber');
      return pool;
    }
    const pool = ['basic', 'ufo'];
    if (State.gameLevel >= 2) pool.push('tank');
    if (State.gameLevel >= 3) pool.push('fast');
    if (State.gameLevel >= 5) pool.push('bomber');
    if (State.gameLevel >= 6) pool.push('spinner');
    if (State.gameLevel >= 7) pool.push('diver');
    return pool;
  },

  addEnemy(type) {
    const e = new Enemy(type);
    const dm = getDifficultyMult();
    e.speed *= 0.85 + 0.15 * dm;
    if (State.infiniteMode) {
      if (type === 'tank') { e.health = Math.min(3 + Math.floor(State.wave / 5), 10); e.maxHealth = e.health; }
      if (type === 'fast') e.speed = 5 + Math.random() + State.wave * 0.1;
    }
    if (State.survivorMode) {
      const sm = DIFFICULTY_CFG[State.survivorDifficulty]?.multiplier ?? 1;
      e.speed *= sm;
      if (type === 'tank') { e.health = Math.max(1, Math.floor(3 * sm)); e.maxHealth = e.health; }
      if (type === 'spinner') { e.health = Math.max(1, Math.floor(2 * sm)); e.maxHealth = e.health; e.shootInterval = Math.max(500, e.shootInterval / sm); }
    }
    State.enemies.push(e);
    return e;
  },

  trySpawn() {
    if (State.bossRushMode) return;

    // inimigo dourado no começo da campanha
    if (!State.uniqueSpawned && !State.infiniteMode && !State.survivorMode && State.scores[0] === 0) {
      this.addEnemy('unique');
      State.uniqueSpawned = true;
    }

    const t = now();
    let interval;
    if (State.infiniteMode) interval = Math.max(140, 620 - State.wave * 12);
    else if (State.survivorMode) interval = Math.max(160, 700 - State.survivorElapsed * 2.2);
    else interval = Math.max(360, 1150 - State.gameLevel * 55);

    const canSpawn = !State.bossSpawned || State.infiniteMode || State.survivorMode;
    if (canSpawn && t - State.lastEnemySpawn >= interval && State.enemies.length < 46) {
      State.lastEnemySpawn = t;
      const pool = this.getEnemyPool();
      let count = 1;
      if (State.infiniteMode) count = Math.min(Math.floor(State.wave / 3) + 1, 5);
      if (State.survivorMode) count = Math.min(Math.floor(State.survivorElapsed / 30) + 1, 5);
      for (let i = 0; i < count; i++) this.schedule(i * 200, () => { if (State.running) this.addEnemy(pick(pool)); });
    }

    // power-up ocasional
    if (t - (State._lastPU || 0) > 12000 && Math.random() < 0.02) {
      State._lastPU = t;
      State.powerUps.push(new PowerUp());
    }

    // boss da campanha
    if (!State.bossSpawned && !State.infiniteMode && !State.survivorMode &&
        State.scores[0] >= State.gameLevel * 100 && State.gameLevel <= BOSSES_DATA.length) {
      State.boss = new Boss(State.gameLevel);
      State.bossSpawned = true;
      playSound('levelup');
    }
  },

  /** Alvo mais próximo à frente do projétil, dentro de um cone estreito. */
  nearestTarget(b) {
    let best = null, bestD = 5.5;
    for (const e of State.enemies) {
      if (e.z > b.z) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best && State.boss && State.boss.z < b.z) {
      const d = Math.hypot(State.boss.x - b.x, State.boss.y - b.y);
      if (d < 7) best = State.boss;
    }
    return best;
  },

  pickLivePlayer() {
    const alive = State.players.filter(p => p.alive);
    return alive.length ? alive[Math.floor(Math.random() * alive.length)] : null;
  },

  /* ═════════ XP / level-up (Survivor) ═════════ */
  addXP(amount) {
    State.xp += amount * State.xpMultiplier;
    if (State.xp >= State.xpToNextLevel) this.levelUp();
    UI.updateXP();
  },

  levelUp() {
    State.xp -= State.xpToNextLevel;
    State.level++;
    State.xpToNextLevel = Math.floor(100 * Math.pow(1.2, State.level - 1));
    playSound('levelup');
    FX.spawn(State.players[0]?.x || 0, State.players[0]?.y || 0, 0, 0x39ff14, 40, 12, 1);
    UI.announce('LEVEL UP!', '#39ff14');
    UI.showUpgradeScreen();
  },

  selectUpgrade(up) {
    if (up.apply) {
      State.runUpgrades[up.id] = (State.runUpgrades[up.id] || 0) + 1;
      if (State.players[0]) up.apply(State.players[0]);
    } else {
      const ab = State.survivorAbilities.find(a => a.name === up.name);
      if (ab) {
        ab.level++;
        ab.maxCooldown = Math.max(1000, ab.maxCooldown - ab.level * 200);
        if (ab.name === 'Attack') State.players.forEach(p => { p.damageMultiplier *= 1.2; });
        State.stats.maxUpgradeLevel = Math.max(State.stats.maxUpgradeLevel, ab.level);
        this.checkAchievements();
      }
    }
    UI.closeModal('upgradeScreen');
    State.paused = false;
    this._lastFrame = performance.now();
    UI.updateSurvivorBar();
  },

  /* ═════════ Habilidades por modo ═════════ */
  useInfiniteAbility(name) {
    if (!State.infiniteMode || State.infiniteCooldowns[name] > 0) return;
    playSound('ability');
    switch (name) {
      case 'nuke':
        for (let i = State.enemies.length - 1; i >= 0; i--) {
          const e = State.enemies[i];
          FX.explosion(e.x, e.y, e.z, 0xff3333, 22);
          this.killEnemy(e, i, State.players[0], false);
        }
        Render.addShake(1.2); Render.addFlash(0.9, 0xff3333);
        UI.announce('NUKE!', '#ff3333');
        break;
      case 'heal':
        State.players.forEach(p => { p.lives = p.maxLives; });
        FX.spawn(State.players[0].x, State.players[0].y, 0, 0xff69b4, 50, 10, 1);
        UI.announce('CURA TOTAL', '#ff69b4');
        break;
      case 'shield':
        State.shieldActive = true;
        State.shieldEndTime = now() + 10000;
        State.players.forEach(p => { if (p.index > 0) { p.permanentShield = true; this.schedule(10000, () => { p.permanentShield = false; }); } });
        UI.announce('ESCUDO ATIVO', '#00f5ff');
        break;
    }
    State.infiniteCooldowns[name] = INFINITE_COOLDOWNS[name];
    UI.updateInfiniteBar();
    UI.updateHUD();
  },

  useSurvivorAbility(idx) {
    if (!State.survivorMode || State.paused) return;
    const ab = State.survivorAbilities[idx];
    if (!ab || ab.cooldown > 0 || ab.level <= 0) return;
    switch (ab.name) {
      case 'Attack':
        State.players.forEach(p => {
          for (let i = 0; i < 6 + ab.level * 2; i++) {
            this.spawnPlayerBullet(p, p.x, p.y, rand(-0.2, 0.2), rand(-0.1, 0.15), p.damageMultiplier);
          }
        });
        UI.announce('BARRAGEM!', '#ff8800');
        break;
      case 'Defense':
        State.shieldActive = true;
        State.shieldEndTime = now() + ab.level * 2000;
        UI.announce('ESCUDO', '#39ff14');
        break;
      case 'Special':
        State.players[0]?.activateAbility();
        break;
    }
    ab.cooldown = ab.maxCooldown;
    UI.updateSurvivorBar();
    playSound('ability');
  },

  /* ═════════ Skills persistentes ═════════ */
  applySkillBonuses(p) {
    const sk = State.unlockedSkills;
    if (sk.fp2) p.damageMultiplier *= 1 + 0.25 * sk.fp2;
    if (sk.fp3) { p.shootCooldown = Math.max(50, p.shootCooldown * (1 - 0.15 * sk.fp3)); p.baseCooldown = p.shootCooldown; }
    if (sk.fp4) p._piercing = sk.fp4;
    if (sk.fp7) { p.damageMultiplier *= 2; p.shootCooldown = Math.min(p.shootCooldown * 1.3, 800); p.baseCooldown = p.shootCooldown; }
    if (sk.fp9) p.damageMultiplier *= 1 + 0.5 * sk.fp9 * 0.4;
    if (sk.fp10) p._critChance = sk.fp10 * 0.05;
    if (sk.df1) p.lives += sk.df1;
    if (sk.df3) p.shieldDurationMult = 1 + 0.5 * sk.df3;
    if (sk.df5) p._regenInterval = true;
    if (sk.df6) { p.maxLives += sk.df6; p.lives += sk.df6; }
    if (sk.df7) p._deflectChance = sk.df7 * 0.20;
    if (sk.ut1) State.magnetRadius = Math.max(State.magnetRadius, 3 * sk.ut1);
    if (sk.ut2) State.xpMultiplier = Math.max(State.xpMultiplier, 1 + 0.2 * sk.ut2);
    if (sk.ut6) p.speed += sk.ut6;
    if (sk.sp1) p.abilityCooldownMult = 1 - 0.15 * sk.sp1;
    if (sk.sp8) p._overclockMult = 1 + 0.25 * sk.sp8;
    if (sk.sp6) { p.damageMultiplier *= 1 + 0.10 * sk.sp6; p.speed += 0.5 * sk.sp6; }
  },

  /* ═════════ Conquistas ═════════ */
  checkAchievements() {
    let gained = false;
    ACHIEVEMENTS_DATA.forEach(a => {
      if (State.achievements.includes(a.id)) return;
      const { cur, max } = a.progress(State.stats);
      if (cur >= max) {
        State.achievements.push(a.id);
        addCoins(a.reward);
        UI.showAchievementToast(a);
        gained = true;
      }
    });
    if (gained) saveGameData();
  },
};
