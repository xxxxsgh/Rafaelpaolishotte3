// ═══════════════════════════════════════════════════════════════════
// PLAYER — nave, movimento, tiro por personagem, habilidades e drones
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { CHARACTERS, SKINS, FIELD } from './config.js';
import { buildShip, buildDrone, buildShield, buildLaser } from './models.js';
import { Audio } from './audio.js';

const BULLET_SPEED = 130;

export class Player {
  constructor(scene, charId, skinId) {
    const cfg = CHARACTERS[charId] || CHARACTERS.marcelo;
    this.scene = scene;
    this.charId = charId;
    this.cfg = cfg;

    const skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
    this.rainbow = skin.color === 'animated';
    const hull = this.rainbow ? 0xff0000 : skin.color;

    this.mesh = buildShip(cfg.style, hull, cfg.color);
    this.mesh.position.set(0, 0, 0);
    this.mesh.scale.setScalar(1.15);
    scene.add(this.mesh);

    this.shieldMesh = buildShield(cfg.color);
    this.shieldMesh.visible = false;
    scene.add(this.shieldMesh);

    this.laserMesh = buildLaser(cfg.bullet);
    this.laserMesh.visible = false;
    scene.add(this.laserMesh);

    // stats de run
    this.speed = cfg.speed;
    this.baseSpeed = cfg.speed;
    this.cooldown = cfg.cooldown;
    this.damageMult = cfg.dmg;
    this.bulletColor = cfg.bullet;
    this.lives = 3;
    this.maxLives = 3;
    this.spread = 0;
    this.pierce = 0;
    this.aoe = 0;
    this.crit = 0.05;
    this.shieldBonus = 0;
    this.regen = 0;
    this.regenTimer = 0;
    this.abilityCd = cfg.abilityCd;

    // estados temporários
    this.lastShot = 0;
    this.shotIndex = 0;
    this.invincibleUntil = 0;
    this.shieldUntil = 0;
    this.doubleUntil = 0;
    this.abilityReadyAt = 0;
    this.abilityUntil = 0;
    this.abilityActive = false;
    this.laserActive = false;
    this.weaponLevel = 0;

    this.drones = [];
    this.tempDrones = [];
    this.trailTimer = 0;
    this.tilt = 0;
    this.bob = 0;
    this.alive = true;
  }

  get position() { return this.mesh.position; }

  addDrone(temp = false, life = 0) {
    const d = buildDrone(this.cfg.color);
    this.scene.add(d);
    const drone = { mesh: d, angle: Math.random() * Math.PI * 2, lastShot: 0, until: temp ? performance.now() + life : Infinity };
    (temp ? this.tempDrones : this.drones).push(drone);
    return drone;
  }

  hasShield(now) { return now < this.shieldUntil; }
  isInvincible(now) { return now < this.invincibleUntil || this.hasShield(now); }

  // ─────────────────────────────────────────────────────────────
  update(dt, input, game) {
    const now = performance.now();

    // movimento
    let dx = 0, dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy += 1;
    if (input.down) dy -= 1;
    if (input.pointer) {
      dx = THREE.MathUtils.clamp((input.px - this.mesh.position.x) * 0.25, -1, 1);
      dy = THREE.MathUtils.clamp((input.py - this.mesh.position.y) * 0.25, -1, 1);
    }
    const len = Math.hypot(dx, dy) || 1;
    if (dx || dy) {
      const sp = this.speed * (this.abilityActive && this.charId === 'felipe' ? 1.6 : 1);
      this.mesh.position.x += (dx / len) * sp * dt;
      this.mesh.position.y += (dy / len) * sp * dt;
    }
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -FIELD.x, FIELD.x);
    this.mesh.position.y = THREE.MathUtils.clamp(this.mesh.position.y, -FIELD.y, FIELD.y);

    // inclinação e flutuação
    this.tilt += ((-dx * 0.55) - this.tilt) * Math.min(1, dt * 8);
    this.bob += dt;
    this.mesh.rotation.z = this.tilt;
    this.mesh.rotation.x = Math.sin(this.bob * 1.6) * 0.05 + dy * 0.12;
    if (this.mesh.userData.spin) this.mesh.userData.spin.rotation.z += dt * 6;

    // skin arco-íris
    if (this.rainbow && this.mesh.userData.hullMat) {
      const c = new THREE.Color().setHSL((now * 0.0002) % 1, 1, 0.55);
      this.mesh.userData.hullMat.color.copy(c);
      this.mesh.userData.hullMat.emissive.copy(c);
    }

    // rastro do motor
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.05;
      game.fx.trail(this.mesh.position.x, this.mesh.position.y - 0.15, this.mesh.position.z + 2.2, this.cfg.color, 0.34, 0.45);
    }

    // piscar quando invencível
    const inv = now < this.invincibleUntil;
    this.mesh.visible = !inv || Math.floor(now / 70) % 2 === 0;

    // escudo
    const sh = this.hasShield(now);
    this.shieldMesh.visible = sh;
    if (sh) {
      this.shieldMesh.position.copy(this.mesh.position);
      this.shieldMesh.userData.spin.rotation.y += dt * 1.4;
      this.shieldMesh.userData.spin.rotation.x += dt * 0.7;
      const k = 1 + Math.sin(now * 0.008) * 0.04;
      this.shieldMesh.scale.setScalar(k);
    }

    // regeneração
    if (this.regen > 0) {
      this.regenTimer += dt;
      if (this.regenTimer >= 45 / this.regen) {
        this.regenTimer = 0;
        if (this.lives < this.maxLives + 3) {
          this.lives++;
          game.fx.text('+1', this.mesh.position.x, this.mesh.position.y + 2, this.mesh.position.z, '#39ff14', 1.3);
        }
      }
    }

    // fim de habilidade
    if (this.abilityActive && now > this.abilityUntil) this.endAbility(game);

    // laser contínuo do DeepSeek
    this.laserMesh.visible = this.laserActive;
    if (this.laserActive) {
      const len2 = Math.abs(FIELD.spawnZ - this.mesh.position.z);
      this.laserMesh.position.set(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z - len2 / 2 - 2);
      this.laserMesh.scale.set(1, 1, len2);
      this.laserMesh.children.forEach((c, i) => {
        c.material.opacity = (i === 0 ? 0.85 : 0.3) * (0.8 + Math.random() * 0.2);
      });
    }

    // drones
    const allDrones = this.drones.concat(this.tempDrones);
    for (let i = this.tempDrones.length - 1; i >= 0; i--) {
      if (now > this.tempDrones[i].until) {
        this.scene.remove(this.tempDrones[i].mesh);
        this.tempDrones.splice(i, 1);
      }
    }
    allDrones.forEach((d, i) => {
      d.angle += dt * 1.5;
      const r = 4.2;
      const a = d.angle + (i / Math.max(1, allDrones.length)) * Math.PI * 2;
      d.mesh.position.set(
        this.mesh.position.x + Math.cos(a) * r,
        this.mesh.position.y + Math.sin(a) * r * 0.5,
        this.mesh.position.z + 1.2 + Math.sin(a) * 0.8
      );
      if (d.mesh.userData.spin) d.mesh.userData.spin.rotation.z += dt * 4;
      if (now - d.lastShot > 420) {
        d.lastShot = now;
        game.playerBullets.fire({
          x: d.mesh.position.x, y: d.mesh.position.y, z: d.mesh.position.z - 1,
          vz: -BULLET_SPEED * 0.9, color: this.cfg.color,
          damage: 1 * this.damageMult * 0.5 * (now < this.doubleUntil ? 2 : 1),
          pierce: this.pierce, aoe: this.aoe, scale: 0.7,
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  canShoot(now) {
    const cd = this.cooldown * (this.abilityActive && this.charId === 'felipe' ? 0.5 : 1);
    return now - this.lastShot >= cd;
  }

  shoot(game) {
    const now = performance.now();
    if (!this.canShoot(now)) return;
    this.lastShot = now;

    const p = this.mesh.position;
    const dbl = now < this.doubleUntil ? 2 : 1;
    const crit = Math.random() < this.crit;
    const dmg = 1 * this.damageMult * dbl * (crit ? 3 : 1) * (1 + this.weaponLevel * 0.22);
    const base = {
      color: this.bulletColor, damage: dmg, pierce: this.pierce, aoe: this.aoe, crit,
    };
    const fire = (ox, oy, angle = 0, extra = {}) => {
      game.playerBullets.fire({
        ...base, ...extra,
        x: p.x + ox, y: p.y + oy, z: p.z - 2,
        vx: Math.sin(angle) * BULLET_SPEED, vy: 0, vz: -Math.cos(angle) * BULLET_SPEED,
      });
    };

    switch (this.charId) {
      case 'robos': {
        const guns = this.abilityActive ? [-2.4, -1.2, 0, 1.2, 2.4] : [-1.6, 0, 1.6];
        guns.forEach((o) => fire(o, 0));
        break;
      }
      case 'felipe':
        fire(-0.9, 0); fire(0.9, 0);
        break;
      case 'takeshi': {
        const n = this.abilityActive ? 7 : 3;
        for (let i = 0; i < n; i++) {
          const a = ((i - (n - 1) / 2) / n) * 1.1;
          fire(0, 0, a, { spin: 22 });
        }
        break;
      }
      case 'deepseek':
        if (this.abilityActive) return;   // o laser cobre esse caso
        fire(0, 0, 0, { big: true, scale: 1.2, pierce: this.pierce + 2 });
        break;
      case 'omega': {
        this.shotIndex++;
        const side = this.shotIndex % 2 === 0 ? -1.4 : 1.4;
        fire(side, -0.2, (Math.random() - 0.5) * 0.05, { scale: 0.8 });
        break;
      }
      case 'phantom':
        fire(0, 0, 0, { big: true, scale: 0.9 });
        break;
      case 'titan':
        fire(0, 0, 0, { big: true, scale: 1.6, damage: dmg });
        break;
      default:
        fire(0, 0);
        break;
    }

    // tiros angulados extras (upgrade SPREAD SHOT)
    for (let i = 1; i <= this.spread; i++) {
      const a = 0.13 * i;
      fire(0, 0, a, { damage: dmg * 0.7 });
      fire(0, 0, -a, { damage: dmg * 0.7 });
    }
    // canhões laterais do nível de arma
    if (this.weaponLevel >= 2) { fire(-2.6, 0.2, -0.05); fire(2.6, 0.2, 0.05); }

    Audio.play(this.charId === 'titan' || this.charId === 'deepseek' ? 'shootBig' : 'shoot');
  }

  // ─────────────────────────────────────────────────────────────
  useAbility(game) {
    const now = performance.now();
    if (now < this.abilityReadyAt) return false;
    this.abilityReadyAt = now + this.abilityCd;
    this.abilityUntil = now + (this.cfg.abilityDur || 200);
    this.abilityActive = true;
    Audio.play('ability');
    const p = this.mesh.position;
    game.fx.ring(p.x, p.y, p.z, this.cfg.color, 1, 16, 0.5);

    switch (this.charId) {
      case 'marcelo':
        this.addDrone(true, this.cfg.abilityDur);
        this.addDrone(true, this.cfg.abilityDur);
        break;
      case 'deepseek':
        this.laserActive = true;
        Audio.play('laser');
        break;
      case 'omega': {
        for (let i = 0; i < 16; i++) {
          const a = ((i - 7.5) / 16) * 2.2;
          game.playerBullets.fire({
            x: p.x, y: p.y, z: p.z - 2,
            vx: Math.sin(a) * 70, vy: 0, vz: -Math.cos(a) * 70,
            color: 0xffd60a, damage: 3 * this.damageMult, pierce: 1, aoe: 1,
            homing: 3.4, scale: 1.1, big: true,
          });
        }
        break;
      }
      case 'phantom':
        this.invincibleUntil = now + this.cfg.abilityDur;
        game.fx.explosion(p.x, p.y, p.z, this.cfg.color, 0.8, 22);
        this.mesh.position.z -= 8;
        setTimeout(() => { this.mesh.position.z = 0; }, 140);
        break;
      case 'titan': {
        this.shieldUntil = now + this.cfg.abilityDur;
        game.shockwave(p.x, p.y, p.z, 26, 6 * this.damageMult);
        break;
      }
      case 'felipe':
      case 'robos':
      case 'takeshi':
      default:
        break;
    }
    return true;
  }

  endAbility() {
    this.abilityActive = false;
    this.laserActive = false;
    this.laserMesh.visible = false;
  }

  // ─────────────────────────────────────────────────────────────
  /** Retorna true se o dano foi aplicado (ou seja, perdeu vida). */
  takeDamage(game, amount = 1) {
    const now = performance.now();
    if (this.isInvincible(now)) {
      if (this.hasShield(now)) {
        game.fx.ring(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, this.cfg.color, 2, 8, 0.3);
        Audio.play('shield');
      }
      return false;
    }
    this.lives -= amount;
    this.invincibleUntil = now + 1500;
    Audio.play('hurt');
    game.fx.explosion(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 0xff3333, 1.1, 30);
    game.fx.addShake(0.9);
    game.flash('#ff004c');
    if (this.lives <= 0) this.alive = false;
    return true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.shieldMesh);
    this.scene.remove(this.laserMesh);
    for (const d of this.drones.concat(this.tempDrones)) this.scene.remove(d.mesh);
    this.drones = [];
    this.tempDrones = [];
  }
}
