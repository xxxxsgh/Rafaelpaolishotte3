/* ═══════════════════════════════════════════════════════════════════
   ENTITIES — jogador, inimigos, boss, projéteis, itens
   Passo de simulação fixo: 1 step = 1/60 s (igual ao jogo original).
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Pool de meshes (evita alocar/destruir a cada tiro) ──────────── */
const MeshPool = {
  pools: new Map(),
  get(key, factory) {
    let p = this.pools.get(key);
    if (!p) { p = []; this.pools.set(key, p); }
    const m = p.pop();
    if (m) { m.visible = true; return m; }
    return factory();
  },
  put(key, mesh) {
    mesh.visible = false;
    const p = this.pools.get(key) || [];
    if (p.length < 220) p.push(mesh);
    this.pools.set(key, p);
  },
};

/* ═══════════════════════════════════════════════════════════════════
   PLAYER
   ═══════════════════════════════════════════════════════════════════ */
class Player {
  constructor(characterId, index) {
    const cfg = CHARACTER_CFG[characterId] || CHARACTER_CFG.marcelo;
    this.index = index;
    this.character = characterId;
    this.x = index === 0 ? (State.twoPlayer ? -3.5 : 0) : 3.5;
    this.y = -1.5;
    this.z = FIELD.playerZ;
    this.radius = 1.05;
    this.speed = cfg.speed;
    this.baseCooldown = cfg.shootCooldown;
    this.shootCooldown = cfg.shootCooldown;
    this.damageMultiplier = cfg.dmgMult;
    this.lives = 3;
    this.maxLives = 5;
    this.lastShootTime = -9999;
    this.invincible = false;
    this.invincibleEnd = 0;
    this.abilityActive = false;
    this.abilityCooldown = 0;
    this.abilityEndTime = 0;
    this.abilityCooldownMult = 1;
    this.laserActive = false;
    this.laserEndTime = 0;
    this.permanentShield = false;
    this.shieldDurationMult = 1;
    this.drones = [];
    this.shotCounter = 0;
    this._invBonus = 0;
    this._critChance = 0;
    this._deflectChance = 0;
    this._piercing = 0;
    this._extraSpread = 0;
    this._regenTimer = 0;
    this._turbo = 1;
    this._lastRegen = 0;

    const skin = SKINS_DATA.find(s => s.id === State.equippedSkin) || SKINS_DATA[0];
    this.skinId = skin.id;
    this.skinAnimated = skin.color === 'animated';
    this.baseColor = this.skinAnimated ? 0xffffff : parseInt(skin.color.slice(1), 16);
    this.bulletColor = index === 0 ? 0x39ff14 : 0xff7700;
    this.shieldColor = index === 0 ? 0x00f5ff : 0xffff00;

    if (this.skinId === 'rainbow') State.stats.rainbowUsed = true;

    // 3D
    this.mesh = Models.playerShip(characterId, this.baseColor);
    this.mesh.scale.setScalar(1.3);
    this.mesh.position.set(this.x, this.y, this.z);
    Render.world.add(this.mesh);

    this.shieldMesh = Models.shieldSphere(this.shieldColor);
    this.shieldMesh.visible = false;
    this.mesh.add(this.shieldMesh);

    this.laserMesh = Models.laserBeam(index === 0 ? 0x00f5ff : 0xff7700);
    this.laserMesh.visible = false;
    this.laserMesh.position.z = -100;
    this.mesh.add(this.laserMesh);

    this.reticle = Models.reticle(this.bulletColor);
    Render.world.add(this.reticle);
  }

  hasShield() {
    if (this.permanentShield) return true;
    if (this.index === 0 && State.shieldActive && now() < State.shieldEndTime) return true;
    return false;
  }

  get alive() { return this.lives > 0; }

  /* ─── Movimento + tiro ───────────────────────────────────────── */
  step(input) {
    const sp = this.speed * K.lat * this._turbo;
    if (input.left) this.x -= sp;
    if (input.right) this.x += sp;
    if (input.up) this.y += sp * 0.85;
    if (input.down) this.y -= sp * 0.85;
    this.x = clamp(this.x, -FIELD.hw, FIELD.hw);
    this.y = clamp(this.y, -FIELD.hh, FIELD.hh);

    if (input.fire) this.shoot();
    if (input.ability) this.activateAbility();

    if (this.invincible && now() > this.invincibleEnd) this.invincible = false;
    if (this.abilityActive && now() > this.abilityEndTime) this.endAbility();
    if (this.laserActive && now() > this.laserEndTime) { this.laserActive = false; this.laserMesh.visible = false; }

    // regen (ru_regen)
    if (this._regenInterval && now() - this._lastRegen > 20000) {
      this._lastRegen = now();
      if (this.lives < this.maxLives) { this.lives++; UI.updateHUD(); FX.floatText(this.x, this.y + 2, this.z, '+1 HP', '#39ff14'); }
    }

    this.drones.forEach(d => d.step(this));
  }

  visual(dt, t) {
    this.mesh.position.set(this.x, this.y, this.z);
    this.reticle.position.set(this.x, this.y, this.z);
    this.reticle.rotation.z += dt * 0.5;
    // inclinação nas curvas
    const tgtRoll = ((this._lastX ?? this.x) - this.x) * 2.4;
    this.mesh.rotation.z += (clamp(tgtRoll, -0.7, 0.7) - this.mesh.rotation.z) * 0.18;
    const tgtPitch = clamp(((this._lastY ?? this.y) - this.y) * 1.4, -0.35, 0.35);
    this.mesh.rotation.x += (tgtPitch - this.mesh.rotation.x) * 0.18;
    this._lastX = this.x; this._lastY = this.y;

    if (this.mesh.userData.spin) this.mesh.userData.spin.rotation.z += dt * 5;

    // skin rainbow
    if (this.skinAnimated) {
      const c = new THREE.Color().setHSL((t * 0.0002) % 1, 1, 0.55);
      this.mesh.traverse(o => {
        if (o.isMesh && o.material?.emissive && o.material.userData?.skin !== false) {
          o.material.color.copy(c);
          if (o.material.emissive) o.material.emissive.copy(c);
        }
      });
    }

    // piscando quando invencível
    const blink = this.invincible && Math.floor(t / 90) % 2 === 0;
    this.mesh.visible = !blink;

    // escudo
    const sh = this.hasShield();
    this.shieldMesh.visible = sh;
    if (sh) {
      this.shieldMesh.rotation.y += dt * 1.4;
      this.shieldMesh.rotation.x += dt * 0.8;
      this.shieldMesh.material.color.setHex(this.permanentShield ? 0xff00ff : this.shieldColor);
      this.shieldMesh.material.opacity = 0.18 + Math.sin(t / 120) * 0.07;
    }

    // laser
    this.laserMesh.visible = this.laserActive;
    if (this.laserActive) {
      this.laserMesh.material.opacity = 0.45 + Math.random() * 0.3;
      this.laserMesh.scale.set(1 + Math.random() * 0.15, 1, 1 + Math.random() * 0.15);
    }

    // motores + trilha
    const eScale = 0.7 + Math.random() * 0.5 * (this._turbo > 1 ? 1.8 : 1);
    (this.mesh.userData.engines || []).forEach(e => {
      e.scale.set(1, eScale, 1);
      e.material.color.setHex(this._turbo > 1 ? 0xffaa00 : (this.index === 0 ? 0x00f5ff : 0xff7700));
    });
    if (Math.random() < 0.85) {
      FX.trail(this.x + rand(-0.5, 0.5), this.y - 0.15, this.z + 1.9,
        this.index === 0 ? 0x00b4d8 : 0xff7700, 0.4);
    }
  }

  shoot() {
    if (now() - this.lastShootTime <= this.shootCooldown / this._turbo) return;
    this.lastShootTime = now();
    const dm = this.damageMultiplier * (State.doubleDamage && now() < State.doubleDamageEnd ? 2 : 1);
    const add = (ox, oy, ax, ay, mult = 1, big = 0) =>
      Game.spawnPlayerBullet(this, this.x + ox, this.y + oy, ax, ay, dm * mult, big);

    this.shotCounter++;
    // fp5 — a cada 5º disparo, rajada tripla
    const burst = (State.unlockedSkills.fp5 || 0) >= 1 && this.shotCounter % 5 === 0;

    switch (this.character) {
      case 'takeshi':
        [-0.16, 0, 0.16].forEach(a => add(0, 0.1, a, 0));
        break;
      case 'deepseek':
        if (!this.laserActive) { this.laserActive = true; this.laserEndTime = now() + 1000; playSound('laser'); }
        return;
      case 'robos':
        [-0.8, 0, 0.8].forEach(o => add(o, 0.1, 0, 0));
        break;
      case 'omega':
        add(rand(-0.25, 0.25), 0.1, 0, 0);
        break;
      case 'phantom':
        add(0, 0.1, 0, 0, 1, 1);
        break;
      case 'titan':
        add(0, 0.1, 0, 0, 3, 2);
        break;
      default:
        add(0, 0.1, 0, 0);
        if (State.powerUpActive && this.index === 0 && this.shootCooldown === 100) {
          add(-0.6, 0, -0.05, 0); add(0.6, 0, 0.05, 0);
        }
    }

    // fp1 — tiros laterais extras
    if ((State.unlockedSkills.fp1 || 0) >= 1) { add(-0.75, 0, -0.06, 0); add(0.75, 0, 0.06, 0); }
    // fp8 — canhões duplos
    if ((State.unlockedSkills.fp8 || 0) >= 1) { add(-1.2, -0.2, 0, 0); add(1.2, -0.2, 0, 0); }
    // upgrade de run: spread
    for (let i = 0; i < (this._extraSpread || 0); i++) {
      add(0, 0, -0.12 * (i + 1), 0); add(0, 0, 0.12 * (i + 1), 0);
    }
    if (burst) { add(-0.4, 0.3, -0.08, 0.04); add(0.4, 0.3, 0.08, 0.04); }

    playSound('shoot');
  }

  activateAbility() {
    if (this.abilityActive || now() < this.abilityCooldown) return;
    const cdM = this.abilityCooldownMult;
    const durM = this._overclockMult || 1;
    this.abilityActive = true;

    switch (this.character) {
      case 'marcelo':
        this.drones = [new Drone(this, -3), new Drone(this, 3)];
        this.abilityEndTime = now() + 10000 * durM;
        this.abilityCooldown = now() + 20000 * cdM;
        break;
      case 'felipe':
        this._turbo = 1.5;
        this.abilityEndTime = now() + 5000 * durM;
        this.abilityCooldown = now() + 10000 * cdM;
        break;
      case 'takeshi':
        for (let i = 0; i < 3; i++) {
          [-0.26, 0, 0.26].forEach(a =>
            Game.spawnPlayerBullet(this, this.x, this.y + 0.1 + i * 0.35, a, 0.05 * i, this.damageMultiplier * 1.5));
        }
        this.abilityActive = false;
        this.abilityCooldown = now() + 8000 * cdM;
        break;
      case 'deepseek':
        this.laserActive = true;
        this.laserEndTime = now() + 2000 * durM;
        this.abilityActive = false;
        this.abilityCooldown = now() + 12000 * cdM;
        playSound('laser');
        break;
      case 'omega':
        for (let i = 0; i < 8; i++) {
          const off = (i / 7 - 0.5) * 0.55;
          Game.spawnPlayerBullet(this, this.x, this.y + 0.1, off, rand(-0.05, 0.05), this.damageMultiplier, 1);
        }
        this.abilityActive = false;
        this.abilityCooldown = now() + 6000 * cdM;
        break;
      case 'phantom':
        FX.explosion(this.x, this.y, this.z, 0x9400d3, 30);
        this.y = clamp(this.y + 3, -FIELD.hh, FIELD.hh);
        this.z = -6;
        this.invincible = true;
        this.invincibleEnd = now() + 2000 * durM;
        this.abilityEndTime = now() + 2000 * durM;
        this.abilityCooldown = now() + 12000 * cdM;
        break;
      case 'titan': {
        this.permanentShield = true;
        this.abilityEndTime = now() + 3000 * durM;
        this.abilityCooldown = now() + 15000 * cdM;
        State.enemies.forEach(e => {
          const dx = e.x - this.x, dy = e.y - this.y, dz = e.z - this.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          if (d < 22) { e.x += (dx / d) * 4; e.y += (dy / d) * 4; e.z -= 14; }
        });
        Render.addShake(0.5);
        break;
      }
      default:
        this.abilityActive = false;
        return;
    }
    playSound('ability');
    FX.spawn(this.x, this.y, this.z, 0xff00ff, 26, 10, 0.7);
  }

  endAbility() {
    this.abilityActive = false;
    if (this.character === 'marcelo') { this.drones.forEach(d => d.destroy()); this.drones = []; }
    if (this.character === 'felipe') this._turbo = 1;
    if (this.character === 'titan') this.permanentShield = false;
    if (this.character === 'phantom') this.z = FIELD.playerZ;
  }

  destroy() {
    this.drones.forEach(d => d.destroy());
    Render.world.remove(this.mesh);
    Render.world.remove(this.reticle);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   DRONE ALIADO
   ═══════════════════════════════════════════════════════════════════ */
class Drone {
  constructor(owner, offset) {
    this.owner = owner;
    this.offset = offset;
    this.x = owner.x + offset; this.y = owner.y + 1; this.z = owner.z - 1;
    this.lastShot = 0;
    this.phase = Math.random() * 6;
    this.mesh = Models.drone(owner.index === 0 ? 0x00b4d8 : 0xff7700);
    Render.world.add(this.mesh);
  }
  step(owner) {
    this.phase += 0.05;
    const tx = owner.x + this.offset + Math.sin(this.phase) * 0.6;
    const ty = owner.y + 1.2 + Math.cos(this.phase * 0.7) * 0.4;
    this.x += (tx - this.x) * 0.14;
    this.y += (ty - this.y) * 0.14;
    this.z += (owner.z - 1.5 - this.z) * 0.14;
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = Math.sin(this.phase) * 0.3;
    if (now() - this.lastShot > 900) {
      this.lastShot = now();
      Game.spawnPlayerBullet(owner, this.x, this.y, 0, 0, 1);
      playSound('shoot');
    }
  }
  destroy() { Render.world.remove(this.mesh); }
}

/* ═══════════════════════════════════════════════════════════════════
   ENEMY
   ═══════════════════════════════════════════════════════════════════ */
class Enemy {
  constructor(type) {
    const cfg = ENEMY_CFG[type] || ENEMY_CFG.basic;
    this.type = type;
    this.cfg = cfg;
    this.radius = cfg.r * 1.3;
    this.health = cfg.health;
    this.maxHealth = cfg.health;
    this.speed = rand(cfg.speed[0], cfg.speed[1]);
    // nasce numa faixa em torno do jogador — no 3D isso mantém a ação enquadrada
    const p = State.players[0];
    this.x = clamp((p ? p.x : 0) + rand(-9, 9), -FIELD.hw + 1, FIELD.hw - 1);
    this.y = clamp((p ? p.y : 0) + rand(-6, 6), -FIELD.hh + 1.5, FIELD.hh - 1.5);
    this.z = FIELD.spawnZ - rand(0, 30);
    this.lastShot = now() - rand(0, 1500);
    this.shootInterval = rand(cfg.shoot[0], cfg.shoot[1]);
    this.phase = Math.random() * Math.PI * 2;
    this.angle = 0;
    this.isDiving = false;
    this.target = null;
    this.stunUntil = 0;
    this.mesh = Models.enemy(type);
    this.mesh.scale.setScalar(1.3);
    this.mesh.position.set(this.x, this.y, this.z);
    Render.world.add(this.mesh);
  }

  step() {
    if (now() < this.stunUntil) return;
    const dz = this.speed * K.depth;
    switch (this.type) {
      case 'ufo':
        this.x += Math.sin(now() / 300 + this.phase) * 0.07;
        this.y += Math.cos(now() / 420 + this.phase) * 0.04;
        this.z += dz;
        break;
      case 'diver': {
        if (this.z < -70 && !this.isDiving) { this.z += dz; }
        else {
          this.isDiving = true;
          const t = this.target && this.target.alive ? this.target : Game.pickLivePlayer();
          this.target = t;
          if (t) {
            const dx = t.x - this.x, dy = t.y - this.y, ddz = (t.z - this.z);
            const d = Math.hypot(dx, dy, ddz) || 1;
            const s = dz * 1.5;
            this.x += (dx / d) * s * 2.4;
            this.y += (dy / d) * s * 2.4;
            this.z += (ddz / d) * s;
          } else this.z += dz;
        }
        break;
      }
      case 'spinner':
        this.x += Math.sin(now() / 500 + this.phase) * 0.05;
        this.z += dz;
        break;
      default:
        this.z += dz;
    }
    // convergência suave: os inimigos derivam na direção do jogador enquanto se aproximam
    if (this.type !== 'diver') {
      const t = State.players[0];
      if (t && t.alive) {
        this.x += clamp((t.x - this.x) * 0.006, -0.09, 0.09);
        this.y += clamp((t.y - this.y) * 0.005, -0.07, 0.07);
      }
    }
    this.x = clamp(this.x, -FIELD.hw - 2, FIELD.hw + 2);
    this.y = clamp(this.y, -FIELD.hh - 2, FIELD.hh + 2);

    if (now() - this.lastShot > this.shootInterval && this.z > FIELD.spawnZ + 40 && this.z < 4) {
      this.lastShot = now();
      this.shoot();
    }
  }

  shoot() {
    const t = Game.pickLivePlayer();
    if (this.type === 'spinner') {
      for (let i = 0; i < 4; i++) {
        const a = this.angle + (i * Math.PI) / 2;
        Game.spawnEnemyBullet(this.x, this.y, this.z, Math.cos(a) * 3, Math.sin(a) * 3, 3.6, 0xaa00ff);
      }
      this.angle += Math.PI / 8;
      return;
    }
    // tiro mirado no jogador
    let ax = 0, ay = 0;
    if (t) {
      const dx = t.x - this.x, dy = t.y - this.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      ax = (dx / d) * 1.4; ay = (dy / d) * 1.4;
    }
    Game.spawnEnemyBullet(this.x, this.y, this.z, ax, ay, 4, 0xffff00);
  }

  visual(dt, t) {
    this.mesh.position.set(this.x, this.y, this.z);
    if (this.mesh.userData.spin) this.mesh.userData.spin.rotation.z += dt * 3;
    if (this.mesh.userData.spark) this.mesh.userData.spark.visible = Math.floor(t / 150) % 2 === 0;
    switch (this.type) {
      case 'basic': this.mesh.rotation.z = Math.sin(t / 600 + this.phase) * 0.3; break;
      case 'ufo': this.mesh.rotation.y += dt * 1.6; break;
      case 'fast': this.mesh.rotation.z += dt * 4; break;
      case 'bomber': this.mesh.rotation.x += dt * 1.2; break;
      case 'diver': {
        const t2 = this.target;
        if (t2) {
          this.mesh.lookAt(t2.x, t2.y, t2.z);
        }
        break;
      }
      case 'tank': this.mesh.rotation.y = Math.sin(t / 900 + this.phase) * 0.2; break;
    }
    if (this.health < this.maxHealth) {
      // pisca vermelho quando ferido
      const k = this.health / this.maxHealth;
      this.mesh.traverse(o => { if (o.isMesh && o.material?.emissiveIntensity !== undefined) o.material.emissiveIntensity = 0.5 + (1 - k) * 0.9; });
    }
  }

  destroy() {
    Render.world.remove(this.mesh);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   BOSS
   ═══════════════════════════════════════════════════════════════════ */
class Boss {
  constructor(level) {
    const data = BOSSES_DATA[level - 1];
    this.level = level;
    this.data = data;
    this.name = data.name;
    this.subtitle = data.subtitle;
    this.health = data.health;
    this.maxHealth = data.health;
    this.reward = data.reward;
    this.pattern = data.pattern;
    this.basePattern = data.pattern;
    this.movement = data.movement;
    this.size = 4.6 + level * 0.3;
    this.x = 0; this.y = 1.5;
    this.z = -(20 + this.size * 1.8);   // bosses maiores ficam mais longe
    this.radius = this.size * 1.05;
    this.lastShot = now();
    this.shootInterval = Math.max(500, 1500 - level * 100);
    this.enraged = false;
    this.animation = 0;
    this.spawnT = now();
    this.baseZ = this.z;

    this.mesh = Models.boss(data.model, data.color, data.accent, this.size);
    this.mesh.position.set(this.x, this.y, this.z);
    Render.world.add(this.mesh);
    this.light = new THREE.PointLight(data.accent, 3.5, 70, 2);
    this.mesh.add(this.light);

    UI.showBossIntro(data);
    UI.showBossBar(data.name);
  }

  isEnraged() { return this.health / this.maxHealth < 0.3; }

  step() {
    this.animation += 0.05;
    if (this.isEnraged() && !this.enraged) {
      this.enraged = true;
      this.shootInterval = Math.max(200, this.shootInterval * 0.5);
      FX.explosion(this.x, this.y, this.z, 0xff006e, 45, true);
      UI.announce('BOSS ENFURECIDO!', '#ff006e');
    }
    this._move();
    this.x = clamp(this.x, -FIELD.hw + 1, FIELD.hw - 1);
    this.y = clamp(this.y, -FIELD.hh + 1, FIELD.hh + 1);
    this.z = clamp(this.z, this.baseZ - 12, this.baseZ + 10);

    if (now() - this.lastShot > this.shootInterval) {
      this.lastShot = now();
      this.shoot();
    }
    UI.setBossBar(this.health / this.maxHealth, this.isEnraged());
  }

  _move() {
    const t = now(), rage = this.isEnraged() ? 1.8 : 1;
    switch (this.movement) {
      case 'horizontal': this.x = Math.sin(t / 900) * 9 * rage; break;
      case 'sinusoidal': this.x = Math.sin(t / 700) * 10 * rage; this.y = 1 + Math.cos(t / 1100) * 3; break;
      case 'teleport':
        if (t - (this._lastTp || 0) > 3000) {
          this._lastTp = t;
          FX.explosion(this.x, this.y, this.z, 0x0088ff, 30);
          this.x = rand(-10, 10); this.y = rand(-3, 5);
          FX.explosion(this.x, this.y, this.z, 0x0088ff, 30);
        }
        this.x += Math.sin(t / 400) * 0.06;
        break;
      case 'armored':
        this.x = Math.sin(t / 500) * 8 * rage;
        this.z = this.baseZ + Math.sin(t / 2600) * 9 * (this.isEnraged() ? 1.5 : 1);
        break;
      case 'chaotic':
        this.x += rand(-0.22, 0.22) * rage; this.y += rand(-0.12, 0.12);
        this.x *= 0.995; this.y = 1 + (this.y - 1) * 0.99;
        break;
      case 'zigzag': this.x = Math.sin(t / 380) * 11 * rage; this.y = 1 + Math.sin(t / 900) * 3.5; break;
      case 'float_sink': this.y = 1 + Math.sin(t / 1200) * 5; this.x = Math.sin(t / 1800) * 6; break;
      case 'static_turret': this.x = Math.sin(t / 2500) * 3; this.y = 1 + Math.cos(t / 2100) * 2; break;
      case 'gravity':
        this.x *= 0.985; this.y += (1 - this.y) * 0.015;
        this.z += Math.sin(t / 1500) * 0.08;
        break;
      case 'adaptive': {
        const p = Game.pickLivePlayer();
        if (p) { this.x += (p.x - this.x) * 0.012 * rage; this.y += (p.y + 1.5 - this.y) * 0.010; }
        break;
      }
      case 'genesis': {
        const p = Game.pickLivePlayer();
        if (p) { this.x += (p.x - this.x) * 0.022 * rage; this.y += (p.y + 1 - this.y) * 0.018; }
        this.x += rand(-0.18, 0.18) * rage;
        this.z = this.baseZ + Math.sin(t / 1700) * 8;
        break;
      }
    }
  }

  /** Padrões de tiro — anéis/leques no plano X/Y avançando em Z. */
  shoot() {
    const rage = this.isEnraged();
    const B = (vx, vy, vz, c) => Game.spawnEnemyBullet(this.x, this.y, this.z + this.size * 0.8, vx, vy, vz, c);
    const spd = rage ? 5.5 : 4;

    switch (this.pattern) {
      case 'triple':
        [-2.2, 0, 2.2].forEach(ox => Game.spawnEnemyBullet(this.x + ox, this.y, this.z, 0, 0, spd, 0xffff00));
        break;
      case 'fan': {
        const n = rage ? 7 : 5;
        for (let i = 0; i < n; i++) B((i - (n - 1) / 2) * 1.5, 0, spd, 0xffaa00);
        break;
      }
      case 'circle': {
        const n = rage ? 14 : 9, base = now() / 500;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + base;
          B(Math.cos(a) * 3, Math.sin(a) * 3, spd * 0.8, 0x00ccff);
        }
        break;
      }
      case 'burst':
        for (let i = 0; i < 3; i++) {
          Game.schedule(i * 300, () => {
            for (let j = -1; j <= 1; j++) B(j * 1.2 + rand(-0.4, 0.4), rand(-0.6, 0.6), rage ? 7 : 5.4, 0x66ff66);
          });
        }
        break;
      case 'spiral': {
        const sa = now() / 200;
        for (let i = 0; i < 4; i++) {
          const a = sa + (i / 4) * Math.PI * 2;
          B(Math.cos(a) * 4, Math.sin(a) * 4, spd * 0.9, 0xff8800);
        }
        B(0, 0, rage ? 8 : 6.5, 0xffcc00);
        break;
      }
      case 'fireball': {
        const count = 3 + Math.floor(this.level / 2) + (rage ? 2 : 0);
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          B(Math.cos(a) * rand(1, 4), Math.sin(a) * rand(1, 4), spd + rand(0, 2), 0xff4500);
        }
        break;
      }
      case 'ice_shard': {
        const count = 4 + Math.floor(this.level / 2) + (rage ? 2 : 0);
        for (let i = 0; i < count; i++) B(rand(-2, 2), rand(-1.6, 1.6), spd * 0.85, 0x00bfff);
        break;
      }
      case 'laser_grid': {
        const count = 3 + Math.floor(this.level / 3) + (rage ? 2 : 0);
        for (let i = 0; i < count; i++) {
          Game.schedule(i * 200, () => {
            const gx = -8 + (16 / (count - 1 || 1)) * i;
            for (let r = -1; r <= 1; r++)
              Game.spawnEnemyBullet(this.x + gx, this.y + r * 3, this.z, 0, 0, spd * 1.15, 0x39ff14);
          });
        }
        break;
      }
      case 'black_hole': {
        Game.spawnEnemyBullet(this.x, this.y, this.z, 0, 0, 2, 0xaa00ff, 0.75, true);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + now() / 700;
          B(Math.cos(a) * 2.2, Math.sin(a) * 2.2, spd * 0.7, 0x7b2fff);
        }
        break;
      }
      case 'ultimate': {
        const cycle = ['spiral', 'fan', 'burst', 'triple', 'circle'];
        this.pattern = cycle[Math.floor(now() / 2600) % cycle.length];
        this.shoot();
        this.pattern = 'ultimate';
        break;
      }
      case 'amalgam': {
        const patterns = ['triple', 'fan', 'circle', 'burst', 'spiral', 'fireball', 'ice_shard', 'laser_grid', 'black_hole'];
        const chosen = patterns[Math.floor(now() / 2000) % patterns.length];
        this.pattern = chosen; this.shoot(); this.pattern = 'amalgam';
        break;
      }
      case 'genesis': {
        const base = now() / 300;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + base;
          B(Math.cos(a) * 4, Math.sin(a) * 4, 4.2, 0xff00ff);
        }
        for (let i = 0; i < 4; i++) {
          const a = base + (i / 4) * Math.PI * 2;
          B(Math.cos(a) * 6, Math.sin(a) * 6, 6, 0xffd700);
        }
        if (State.enemies.length < 10) { Game.addEnemy('ufo'); Game.addEnemy('fast'); }
        break;
      }
    }
  }

  visual(dt, t) {
    this.mesh.position.set(this.x, this.y, this.z);
    if (this.mesh.userData.spin) {
      this.mesh.userData.spin.rotation.y += dt * 0.9;
      this.mesh.userData.spin.rotation.x += dt * 0.35;
    }
    this.mesh.rotation.y = Math.sin(t / 1400) * 0.25;
    const pulse = 1 + Math.sin(t / 260) * 0.035;
    this.mesh.scale.setScalar(pulse * (this.isEnraged() ? 1.1 : 1));
    this.light.intensity = 3 + Math.sin(t / 180) * 1.2 + (this.isEnraged() ? 2 : 0);
    if (this.isEnraged() && Math.random() < 0.35) {
      FX.trail(this.x + rand(-this.size, this.size), this.y + rand(-this.size, this.size), this.z, 0xff006e, 0.6);
    }
  }

  destroy() {
    Render.world.remove(this.mesh);
    UI.hideBossBar();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   POWER-UP / XP ORB
   ═══════════════════════════════════════════════════════════════════ */
class PowerUp {
  constructor(x, y, z) {
    const r = Math.random();
    this.type = r < 0.38 ? 'life' : r < 0.75 ? 'weapon' : r < 0.90 ? 'shield' : r < 0.95 ? 'double' : 'bomb';
    this.x = x ?? rand(-FIELD.hw + 2, FIELD.hw - 2);
    this.y = y ?? rand(-FIELD.hh + 2, FIELD.hh - 2);
    this.z = z ?? FIELD.spawnZ;
    this.radius = 1.3;
    this.speed = 2.5 * (1 + 0.15 * (State.unlockedSkills.sp5 || 0));
    this.mesh = Models.powerUp(this.type);
    this.mesh.position.set(this.x, this.y, this.z);
    Render.world.add(this.mesh);
  }
  step() { this.z += this.speed * K.depth; }
  visual(dt, t) {
    this.mesh.position.set(this.x, this.y + Math.sin(t / 300) * 0.25, this.z);
    this.mesh.rotation.y += dt * 1.6;
    if (this.mesh.userData.spin) this.mesh.userData.spin.rotation.x += dt * 2.2;
  }
  destroy() { Render.world.remove(this.mesh); }
}

class XPOrb {
  constructor(x, y, z, value) {
    this.x = x; this.y = y; this.z = z;
    this.value = value;
    this.radius = 0.9;
    this.vx = rand(-1.5, 1.5); this.vy = rand(-1.5, 1.5);
    this.mesh = Models.xpOrb();
    this.mesh.position.set(x, y, z);
    Render.world.add(this.mesh);
  }
  step() {
    const p = State.players[0];
    this.z += 1.4 * K.depth * 3;
    if (p && p.alive) {
      const dx = p.x - this.x, dy = p.y - this.y, dz = p.z - this.z;
      const d = Math.hypot(dx, dy, dz);
      const mag = 6 + State.magnetRadius;
      if (d < mag) {
        const pull = 0.16 * (1 + State.magnetRadius / 10);
        this.x += dx * pull; this.y += dy * pull; this.z += dz * pull;
      }
    }
    this.x += this.vx * 0.02; this.y += this.vy * 0.02;
    this.vx *= 0.96; this.vy *= 0.96;
  }
  visual(dt, t) {
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y += dt * 4;
    this.mesh.rotation.x += dt * 2.5;
  }
  destroy() { Render.world.remove(this.mesh); }
}
