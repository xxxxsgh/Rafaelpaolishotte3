// ═══════════════════════════════════════════════════════════════════
// BULLETS — pools de projéteis do jogador e dos inimigos
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { buildBullet, buildEnemyBullet } from './models.js';
import { FIELD } from './config.js';

class Pool {
  constructor(scene, factory, size) {
    this.scene = scene;
    this.factory = factory;
    this.items = [];
    this.active = [];
    for (let i = 0; i < size; i++) this.items.push(this._make());
  }

  _make() {
    const mesh = this.factory();
    mesh.visible = false;
    this.scene.add(mesh);
    return { mesh, alive: false };
  }

  acquire() {
    let it = this.items.find((i) => !i.alive);
    if (!it) { it = this._make(); this.items.push(it); }
    it.alive = true;
    it.mesh.visible = true;
    this.active.push(it);
    return it;
  }

  release(it) {
    it.alive = false;
    it.mesh.visible = false;
    const i = this.active.indexOf(it);
    if (i >= 0) this.active.splice(i, 1);
  }

  clear() {
    for (const it of this.active.slice()) this.release(it);
  }
}

export class PlayerBullets {
  constructor(scene) {
    this.scene = scene;
    this.pools = new Map();
  }

  _pool(color, big) {
    const key = color + (big ? 'b' : 's');
    if (!this.pools.has(key)) {
      this.pools.set(key, new Pool(this.scene, () => buildBullet(color, big), big ? 24 : 60));
    }
    return this.pools.get(key);
  }

  get list() {
    const out = [];
    for (const p of this.pools.values()) out.push(...p.active);
    return out;
  }

  fire(opts) {
    const p = this._pool(opts.color, !!opts.big);
    const b = p.acquire();
    b.pool = p;
    b.mesh.position.set(opts.x, opts.y, opts.z);
    b.vx = opts.vx || 0;
    b.vy = opts.vy || 0;
    b.vz = opts.vz;
    b.damage = opts.damage;
    b.pierce = opts.pierce || 0;
    b.radius = opts.radius || (opts.big ? 1.1 : 0.55);
    b.aoe = opts.aoe || 0;
    b.crit = !!opts.crit;
    b.homing = opts.homing || 0;
    b.spin = opts.spin || 0;
    b.hit = new Set();
    b.life = opts.life || 4;
    const s = opts.scale || 1;
    b.mesh.scale.setScalar(s);
    return b;
  }

  update(dt, enemies) {
    for (const p of this.pools.values()) {
      for (const b of p.active.slice()) {
        b.life -= dt;
        if (b.homing && enemies && enemies.length) {
          // procura o alvo mais próximo à frente
          let best = null, bd = 1e9;
          for (const e of enemies) {
            const d = e.mesh.position.distanceToSquared(b.mesh.position);
            if (d < bd) { bd = d; best = e; }
          }
          if (best && bd < 90 * 90) {
            const dir = best.mesh.position.clone().sub(b.mesh.position).normalize();
            const sp = Math.hypot(b.vx, b.vy, b.vz);
            b.vx += (dir.x * sp - b.vx) * Math.min(1, b.homing * dt);
            b.vy += (dir.y * sp - b.vy) * Math.min(1, b.homing * dt);
            b.vz += (dir.z * sp - b.vz) * Math.min(1, b.homing * dt);
          }
        }
        b.mesh.position.x += b.vx * dt;
        b.mesh.position.y += b.vy * dt;
        b.mesh.position.z += b.vz * dt;
        if (b.spin) b.mesh.rotation.z += b.spin * dt;
        else b.mesh.lookAt(
          b.mesh.position.x + b.vx, b.mesh.position.y + b.vy, b.mesh.position.z + b.vz
        );
        if (b.life <= 0 || b.mesh.position.z < FIELD.spawnZ - 40 || b.mesh.position.z > FIELD.despawnZ + 20 ||
            Math.abs(b.mesh.position.x) > FIELD.x + 40 || Math.abs(b.mesh.position.y) > FIELD.y + 40) {
          p.release(b);
        }
      }
    }
  }

  clear() { for (const p of this.pools.values()) p.clear(); }
}

export class EnemyBullets {
  constructor(scene) {
    this.scene = scene;
    this.pools = new Map();
  }

  _pool(color) {
    if (!this.pools.has(color)) {
      this.pools.set(color, new Pool(this.scene, () => buildEnemyBullet(color), 90));
    }
    return this.pools.get(color);
  }

  get list() {
    const out = [];
    for (const p of this.pools.values()) out.push(...p.active);
    return out;
  }

  fire(x, y, z, vx, vy, vz, color, damage = 1, radius = 0.6, opts = {}) {
    const p = this._pool(color);
    const b = p.acquire();
    b.pool = p;
    b.mesh.position.set(x, y, z);
    b.mesh.scale.setScalar(radius / 0.34);
    b.vx = vx; b.vy = vy; b.vz = vz;
    b.damage = damage;
    b.radius = radius;
    b.life = opts.life || 9;
    b.bomb = opts.bomb || false;
    b.homing = opts.homing || 0;
    b.gravity = opts.gravity || 0;
    b.color = color;
    return b;
  }

  update(dt, playerPos) {
    for (const p of this.pools.values()) {
      for (const b of p.active.slice()) {
        b.life -= dt;
        if (b.homing && playerPos) {
          const dx = playerPos.x - b.mesh.position.x;
          const dy = playerPos.y - b.mesh.position.y;
          const dz = playerPos.z - b.mesh.position.z;
          const len = Math.hypot(dx, dy, dz) || 1;
          const sp = Math.hypot(b.vx, b.vy, b.vz);
          const k = Math.min(1, b.homing * dt);
          b.vx += ((dx / len) * sp - b.vx) * k;
          b.vy += ((dy / len) * sp - b.vy) * k;
          b.vz += ((dz / len) * sp - b.vz) * k;
        }
        if (b.gravity) b.vy -= b.gravity * dt;
        b.mesh.position.x += b.vx * dt;
        b.mesh.position.y += b.vy * dt;
        b.mesh.position.z += b.vz * dt;
        if (b.life <= 0 || b.mesh.position.z > FIELD.despawnZ + 14 || b.mesh.position.z < FIELD.spawnZ - 30 ||
            Math.abs(b.mesh.position.x) > FIELD.x + 45 || Math.abs(b.mesh.position.y) > FIELD.y + 45) {
          p.release(b);
        }
      }
    }
  }

  clear() { for (const p of this.pools.values()) p.clear(); }
}
