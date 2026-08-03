// ═══════════════════════════════════════════════════════════════════
// ENEMIES — 8 tipos com comportamentos e padrões de tiro próprios
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { ENEMY_TYPES, FIELD } from './config.js';
import { buildEnemy } from './models.js';
import { Audio } from './audio.js';

export class Enemy {
  constructor(scene, type, x, y, z, scale = 1) {
    const cfg = ENEMY_TYPES[type];
    this.type = type;
    this.cfg = cfg;
    this.scene = scene;
    this.mesh = buildEnemy(type, cfg.color);
    this.mesh.position.set(x, y, z);
    this.mesh.scale.setScalar(cfg.size * 0.9);
    scene.add(this.mesh);

    this.maxHp = Math.max(1, Math.round(cfg.hp * scale));
    this.hp = this.maxHp;
    this.speed = cfg.speed * (0.85 + Math.random() * 0.3) * Math.min(1.7, 0.9 + scale * 0.12);
    this.radius = cfg.size * 1.1;
    this.fireTimer = 600 + Math.random() * (cfg.fire || 2000);
    this.phase = Math.random() * Math.PI * 2;
    this.baseX = x;
    this.baseY = y;
    this.alive = true;
    this.flash = 0;
    this.hitScale = 1;
    this.dead = false;
    this.scaleFactor = scale;
  }

  update(dt, game) {
    const p = this.mesh.position;
    const player = game.player ? game.player.position : null;
    this.phase += dt;

    switch (this.cfg.behavior) {
      case 'sway':
        p.z += this.speed * dt;
        p.x = this.baseX + Math.sin(this.phase * 1.6) * 5.5;
        p.y = this.baseY + Math.cos(this.phase * 1.1) * 2.2;
        break;
      case 'rush':
        p.z += this.speed * dt;
        break;
      case 'orbit': {
        p.z += this.speed * dt;
        const r = 6;
        p.x = this.baseX + Math.cos(this.phase * 1.8) * r;
        p.y = this.baseY + Math.sin(this.phase * 1.8) * r * 0.6;
        break;
      }
      case 'dive':
        p.z += this.speed * dt;
        if (player && p.z > FIELD.spawnZ * 0.55) {
          p.x += THREE.MathUtils.clamp(player.x - p.x, -1, 1) * 14 * dt;
          p.y += THREE.MathUtils.clamp(player.y - p.y, -1, 1) * 14 * dt;
        }
        break;
      case 'straight':
      default:
        p.z += this.speed * dt;
        p.x = this.baseX + Math.sin(this.phase * 0.7) * 1.2;
        break;
    }

    // rotação/idle
    this.mesh.rotation.z += dt * 0.6;
    if (this.mesh.userData.spin) this.mesh.userData.spin.rotation.z += dt * 3.2;
    if (this.type === 'diver' || this.type === 'fast') this.mesh.rotation.y += dt * 2.4;

    // flash de dano
    if (this.flash > 0) {
      this.flash -= dt * 4;
      const s = this.cfg.size * 0.9 * (1 + Math.max(0, this.flash) * 0.16);
      this.mesh.scale.setScalar(s);
    }

    // tiro
    if (this.cfg.fire > 0 && p.z > FIELD.spawnZ * 0.8) {
      this.fireTimer -= dt * 1000 * game.difficultyMult;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.cfg.fire * (0.75 + Math.random() * 0.5);
        this.fire(game);
      }
    }
  }

  fire(game) {
    const p = this.mesh.position;
    const player = game.player ? game.player.position : null;
    if (!player) return;
    const speed = this.cfg.bulletSpeed * (0.85 + game.difficultyMult * 0.3);
    const aim = () => {
      const dx = player.x - p.x, dy = player.y - p.y, dz = player.z - p.z;
      const l = Math.hypot(dx, dy, dz) || 1;
      return [(dx / l) * speed, (dy / l) * speed, (dz / l) * speed];
    };

    if (this.cfg.radial) {
      const n = this.cfg.radial;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + this.phase;
        game.enemyBullets.fire(p.x, p.y, p.z, Math.cos(a) * speed * 0.7, Math.sin(a) * speed * 0.7, speed * 0.75, this.cfg.color, 1, 0.55);
      }
    } else if (this.cfg.burst) {
      for (let i = 0; i < this.cfg.burst; i++) {
        setTimeout(() => {
          if (!this.alive) return;
          const [vx, vy, vz] = aim();
          game.enemyBullets.fire(p.x, p.y, p.z, vx, vy, vz, this.cfg.color, 1, 0.7);
        }, i * 140);
      }
    } else if (this.cfg.bomb) {
      const [vx, vy, vz] = aim();
      game.enemyBullets.fire(p.x, p.y, p.z, vx * 0.6, vy * 0.6, vz * 0.8, 0xff3300, 1, 1.0, { bomb: true });
    } else {
      const [vx, vy, vz] = aim();
      game.enemyBullets.fire(p.x, p.y, p.z, vx, vy, vz, this.cfg.color, 1, 0.55, { homing: this.cfg.homing ? 0.6 : 0 });
    }
    Audio.play('enemyShot');
  }

  damage(amount, game, source) {
    this.hp -= amount;
    this.flash = 1;
    const p = this.mesh.position;
    game.fx.sparks(p.x, p.y, p.z, 0xffffff, 5, 0.8);
    if (this.hp <= 0) {
      this.kill(game, source);
      return true;
    }
    Audio.play('hit');
    return false;
  }

  kill(game, source) {
    if (this.dead) return;
    this.dead = true;
    this.alive = false;
    const p = this.mesh.position;
    game.fx.explosion(p.x, p.y, p.z, this.cfg.color, this.cfg.size * 0.55, 24);
    Audio.play('explosion');
    game.onEnemyKilled(this, source);
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}
