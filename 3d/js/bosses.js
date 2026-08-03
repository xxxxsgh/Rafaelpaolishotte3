// ═══════════════════════════════════════════════════════════════════
// BOSSES — 12 chefes: movimento, padrões de tiro e modo fúria
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { BOSSES, FIELD } from './config.js';
import { buildBoss } from './models.js';
import { Audio } from './audio.js';

export class Boss {
  constructor(scene, index, hpScale = 1) {
    const data = BOSSES[index % BOSSES.length];
    this.data = data;
    this.index = index;
    this.scene = scene;
    this.mesh = buildBoss(data.style, data.color, data.accent);
    this.mesh.position.set(0, 2, FIELD.spawnZ * 0.85);
    scene.add(this.mesh);

    this.maxHp = Math.round(data.hp * hpScale);
    this.hp = this.maxHp;
    this.radius = 7.5;
    this.alive = true;
    this.dead = false;
    this.entering = true;
    this.t = 0;
    this.attackTimer = 2.4;
    this.rage = false;
    this.flash = 0;
    this.teleportTimer = 3;
    this.spiralAngle = 0;
    this.baseY = 2;
    this.dir = 1;
  }

  get position() { return this.mesh.position; }

  update(dt, game) {
    this.t += dt;
    const p = this.mesh.position;
    const player = game.player ? game.player.position : null;

    // entrada dramática
    if (this.entering) {
      p.z += 40 * dt;
      if (p.z >= FIELD.bossZ) { p.z = FIELD.bossZ; this.entering = false; }
    }

    // partes girando/pulsando
    const parts = this.mesh.userData.parts;
    if (parts) {
      parts.spin.forEach((m, i) => {
        m.rotation.z += dt * (0.5 + i * 0.18) * (this.rage ? 2.2 : 1);
        m.rotation.y += dt * 0.3;
      });
      const k = 1 + Math.sin(this.t * (this.rage ? 8 : 3)) * 0.09;
      parts.pulse.forEach((m) => m.scale.setScalar(k));
    }

    if (this.entering) return;

    // ─ movimento ─
    const spd = this.rage ? 1.55 : 1;
    switch (this.data.movement) {
      case 'horizontal':
        p.x += this.dir * 9 * spd * dt;
        if (Math.abs(p.x) > FIELD.x * 0.7) this.dir *= -1;
        break;
      case 'sinusoidal':
        p.x = Math.sin(this.t * 0.9) * FIELD.x * 0.6;
        p.y = this.baseY + Math.sin(this.t * 1.7) * 3;
        break;
      case 'teleport':
        this.teleportTimer -= dt;
        if (this.teleportTimer <= 0) {
          this.teleportTimer = this.rage ? 1.6 : 2.8;
          game.fx.explosion(p.x, p.y, p.z, this.data.accent, 1.6, 30);
          p.x = (Math.random() - 0.5) * FIELD.x * 1.3;
          p.y = (Math.random() - 0.5) * FIELD.y * 0.8 + 2;
          game.fx.ring(p.x, p.y, p.z, this.data.accent, 1, 18, 0.5);
        }
        this.mesh.rotation.z += dt * 1.4;
        break;
      case 'armored':
        p.x += this.dir * 6 * spd * dt;
        if (Math.abs(p.x) > FIELD.x * 0.55) this.dir *= -1;
        p.y = this.baseY + Math.sin(this.t) * 1.2;
        break;
      case 'chaotic':
        p.x = Math.sin(this.t * 1.3) * FIELD.x * 0.55 + Math.sin(this.t * 2.7) * 4;
        p.y = this.baseY + Math.cos(this.t * 1.9) * 5;
        this.mesh.rotation.y += dt * 0.5;
        break;
      case 'zigzag':
        p.x += this.dir * 15 * spd * dt;
        if (Math.abs(p.x) > FIELD.x * 0.65) { this.dir *= -1; p.y = this.baseY + (Math.random() - 0.5) * 8; }
        break;
      case 'float':
        p.y = this.baseY + Math.sin(this.t * 0.8) * 6;
        p.x = Math.sin(this.t * 0.45) * FIELD.x * 0.5;
        break;
      case 'turret':
        p.y = this.baseY + Math.sin(this.t * 0.6) * 1.5;
        this.mesh.rotation.z = Math.sin(this.t * 0.5) * 0.2;
        break;
      case 'gravity': {
        p.x = Math.sin(this.t * 0.7) * FIELD.x * 0.4;
        p.y = this.baseY + Math.cos(this.t * 0.55) * 4;
        // puxa o jogador na direção do buraco negro
        if (player) {
          const dx = p.x - player.x, dy = p.y - player.y;
          const l = Math.hypot(dx, dy) || 1;
          const pull = (this.rage ? 7 : 4.2) * dt;
          player.x += (dx / l) * pull;
          player.y += (dy / l) * pull;
        }
        break;
      }
      case 'adaptive':
        if (player) {
          p.x += THREE.MathUtils.clamp(player.x - p.x, -1, 1) * 7 * spd * dt;
          p.y += THREE.MathUtils.clamp(player.y + 3 - p.y, -1, 1) * 4 * spd * dt;
        }
        this.mesh.rotation.z += dt * 0.4;
        break;
      case 'genesis':
        p.x = Math.sin(this.t * 0.8) * FIELD.x * 0.5;
        p.y = this.baseY + Math.sin(this.t * 1.3) * 4;
        this.mesh.rotation.z += dt * 0.35;
        this.mesh.rotation.y += dt * 0.2;
        break;
    }
    p.x = THREE.MathUtils.clamp(p.x, -FIELD.x, FIELD.x);
    p.y = THREE.MathUtils.clamp(p.y, -FIELD.y + 4, FIELD.y);

    // ─ ataques ─
    this.attackTimer -= dt * (this.rage ? 1.6 : 1) * game.difficultyMult;
    if (this.attackTimer <= 0) {
      this.attackTimer = this.attackInterval();
      this.attack(game);
    }

    if (this.flash > 0) this.flash -= dt * 3;
  }

  attackInterval() {
    const base = {
      triple: 1.5, fan: 1.5, circle: 1.7, burst: 1.9, spiral: 0.55, fireball: 1.3,
      ice_shard: 1.5, laser_grid: 2.0, black_hole: 1.7, ultimate: 1.2, amalgam: 1.1, genesis: 0.9,
    }[this.data.pattern] || 1.6;
    return base * (0.85 + Math.random() * 0.3);
  }

  attack(game) {
    const p = this.mesh.position;
    const player = game.player ? game.player.position : null;
    if (!player) return;
    const c = this.data.color, a = this.data.accent;
    const S = 46 + game.difficultyMult * 8;
    const aimVec = () => {
      const dx = player.x - p.x, dy = player.y - p.y, dz = player.z - p.z;
      const l = Math.hypot(dx, dy, dz) || 1;
      return [dx / l, dy / l, dz / l];
    };
    const shot = (vx, vy, vz, color = c, r = 0.8, opts = {}) =>
      game.enemyBullets.fire(p.x, p.y, p.z + 4, vx, vy, vz, color, 1, r, opts);

    switch (this.data.pattern) {
      case 'triple': {
        const [ux, uy, uz] = aimVec();
        for (const off of [-0.22, 0, 0.22]) {
          shot(ux * S + off * S, uy * S, uz * S, c, 0.8);
        }
        break;
      }
      case 'fan': {
        const n = this.rage ? 11 : 7;
        for (let i = 0; i < n; i++) {
          const ang = ((i - (n - 1) / 2) / n) * 1.6;
          shot(Math.sin(ang) * S, 0, Math.cos(ang) * S, c, 0.75);
        }
        break;
      }
      case 'circle': {
        const n = this.rage ? 20 : 14;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          shot(Math.cos(ang) * S * 0.7, Math.sin(ang) * S * 0.7, S * 0.55, a, 0.7);
        }
        break;
      }
      case 'burst': {
        for (let k = 0; k < 3; k++) {
          setTimeout(() => {
            if (!this.alive) return;
            const [ux, uy, uz] = aimVec();
            for (const off of [-0.12, 0.12]) shot(ux * S + off * S, uy * S, uz * S, c, 1.0);
          }, k * 180);
        }
        break;
      }
      case 'spiral': {
        this.spiralAngle += 0.55;
        for (let i = 0; i < 3; i++) {
          const ang = this.spiralAngle + (i / 3) * Math.PI * 2;
          shot(Math.cos(ang) * S * 0.75, Math.sin(ang) * S * 0.75, S * 0.6, a, 0.7);
        }
        break;
      }
      case 'fireball': {
        const [ux, uy, uz] = aimVec();
        shot(ux * S * 0.8, uy * S * 0.8, uz * S * 0.8, 0xff4400, 1.8, { homing: 0.5 });
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          shot(Math.cos(ang) * S * 0.5, Math.sin(ang) * S * 0.5, S * 0.7, 0xff8800, 0.7);
        }
        break;
      }
      case 'ice_shard': {
        const n = this.rage ? 14 : 9;
        for (let i = 0; i < n; i++) {
          const x = -FIELD.x + (i / (n - 1)) * FIELD.x * 2;
          game.enemyBullets.fire(x, FIELD.y, p.z + 10, 0, -12, S * 0.8, 0x88ddff, 1, 0.9);
        }
        break;
      }
      case 'laser_grid': {
        // paredes horizontais/verticais com uma brecha
        const gap = Math.floor(Math.random() * 7);
        for (let i = 0; i < 7; i++) {
          if (i === gap) continue;
          const x = -FIELD.x + (i / 6) * FIELD.x * 2;
          shot((x - p.x) * 0.35, 0, S * 0.85, a, 0.85);
        }
        break;
      }
      case 'black_hole': {
        const n = this.rage ? 24 : 16;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + this.t;
          shot(Math.cos(ang) * S * 0.55, Math.sin(ang) * S * 0.55, S * 0.65, 0x9944ff, 0.8, { homing: 0.25 });
        }
        break;
      }
      case 'ultimate': {
        const mode = Math.floor(this.t / 4) % 3;
        if (mode === 0) {
          const [ux, uy, uz] = aimVec();
          for (let i = 0; i < 5; i++) {
            const o = (i - 2) * 0.16;
            shot(ux * S + o * S, uy * S, uz * S, a, 0.9, { homing: 0.3 });
          }
        } else if (mode === 1) {
          for (let i = 0; i < 18; i++) {
            const ang = (i / 18) * Math.PI * 2;
            shot(Math.cos(ang) * S * 0.7, Math.sin(ang) * S * 0.7, S * 0.6, c, 0.8);
          }
        } else {
          this.spiralAngle += 0.7;
          for (let i = 0; i < 4; i++) {
            const ang = this.spiralAngle + (i / 4) * Math.PI * 2;
            shot(Math.cos(ang) * S * 0.8, Math.sin(ang) * S * 0.8, S * 0.7, 0xffd60a, 0.85);
          }
        }
        break;
      }
      case 'amalgam': {
        // mistura de padrões + invoca lacaios
        const r = Math.random();
        if (r < 0.33) {
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            shot(Math.cos(ang) * S * 0.6, Math.sin(ang) * S * 0.6, S * 0.7, c, 0.8);
          }
        } else if (r < 0.66) {
          const [ux, uy, uz] = aimVec();
          for (const off of [-0.3, -0.1, 0.1, 0.3]) shot(ux * S + off * S, uy * S, uz * S, a, 0.9);
        } else if (game.spawnMinions) {
          game.spawnMinions(2, p.x, p.y);
        }
        break;
      }
      case 'genesis': {
        const phase = this.hp / this.maxHp;
        if (phase > 0.66) {
          for (let i = 0; i < 20; i++) {
            const ang = (i / 20) * Math.PI * 2 + this.t * 0.5;
            shot(Math.cos(ang) * S * 0.7, Math.sin(ang) * S * 0.7, S * 0.6, 0xffffff, 0.75);
          }
        } else if (phase > 0.33) {
          this.spiralAngle += 0.5;
          for (let i = 0; i < 6; i++) {
            const ang = this.spiralAngle + (i / 6) * Math.PI * 2;
            shot(Math.cos(ang) * S * 0.85, Math.sin(ang) * S * 0.85, S * 0.7, a, 0.85, { homing: 0.2 });
          }
        } else {
          const [ux, uy, uz] = aimVec();
          for (let i = 0; i < 7; i++) {
            const o = (i - 3) * 0.14;
            shot(ux * S * 1.15 + o * S, uy * S, uz * S * 1.15, 0xffffff, 1.0, { homing: 0.4 });
          }
          if (game.spawnMinions && Math.random() < 0.4) game.spawnMinions(2, p.x, p.y);
        }
        break;
      }
    }
    Audio.play('enemyShot');
  }

  damage(amount, game) {
    if (this.entering) return false;
    this.hp -= amount;
    this.flash = 1;
    if (!this.rage && this.hp <= this.maxHp * 0.3) {
      this.rage = true;
      Audio.play('warn');
      game.fx.ring(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 0xff0000, 2, 40, 0.9);
      game.onBossRage(this);
    }
    if (this.hp <= 0) { this.kill(game); return true; }
    return false;
  }

  kill(game) {
    if (this.dead) return;
    this.dead = true;
    this.alive = false;
    const p = this.mesh.position;
    game.fx.bigExplosion(p.x, p.y, p.z, this.data.color, 3);
    for (let i = 0; i < 6; i++) {
      setTimeout(() => game.fx.bigExplosion(
        p.x + (Math.random() - 0.5) * 14, p.y + (Math.random() - 0.5) * 12, p.z + (Math.random() - 0.5) * 8,
        this.data.accent, 1.6), i * 130);
    }
    Audio.play('bossDeath');
    game.fx.addShake(1.8);
    game.onBossKilled(this);
  }

  dispose() { this.scene.remove(this.mesh); }
}
