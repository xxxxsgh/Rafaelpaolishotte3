// ═══════════════════════════════════════════════════════════════════
// PICKUPS — power-ups, orbes de XP e moedas (com ímã)
// ═══════════════════════════════════════════════════════════════════
import { POWERUPS } from './config.js';
import { buildPowerUp, buildOrb, buildCoin } from './models.js';

export class Pickup {
  constructor(scene, kind, x, y, z, opts = {}) {
    this.scene = scene;
    this.kind = kind;           // 'power' | 'xp' | 'coin'
    this.type = opts.type || null;
    this.value = opts.value || 1;
    this.alive = true;
    this.t = Math.random() * 6;

    if (kind === 'power') {
      this.mesh = buildPowerUp(POWERUPS[this.type].color);
      this.radius = 2.0;
      this.driftZ = 13;
    } else if (kind === 'coin') {
      this.mesh = buildCoin();
      this.radius = 1.2;
      this.driftZ = 10;
    } else {
      this.mesh = buildOrb(opts.color || 0x39ff14, opts.size || 0.36);
      this.radius = 1.0;
      this.driftZ = 10;
    }
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6;
  }

  update(dt, player, magnetRadius) {
    this.t += dt;
    const p = this.mesh.position;

    if (this.kind === 'power') {
      this.mesh.rotation.y += dt * 1.2;
      if (this.mesh.userData.spin) this.mesh.userData.spin.rotation.x += dt * 1.6;
      if (this.mesh.userData.core) this.mesh.userData.core.rotation.z += dt * 2.4;
    } else {
      this.mesh.rotation.z += dt * 5;
      this.mesh.rotation.x += dt * 3;
    }

    // atração magnética
    if (player) {
      const dx = player.x - p.x, dy = player.y - p.y, dz = player.z - p.z;
      const d = Math.hypot(dx, dy, dz);
      const mag = this.kind === 'power' ? magnetRadius * 0.55 : magnetRadius;
      if (d < mag) {
        const pull = (1 - d / mag) * 78 + 16;
        p.x += (dx / d) * pull * dt;
        p.y += (dy / d) * pull * dt;
        p.z += (dz / d) * pull * dt;
        return;
      }
    }

    this.vx *= 0.97; this.vy *= 0.97;
    p.x += this.vx * dt;
    p.y += this.vy * dt + Math.sin(this.t * 2) * dt * 1.4;
    p.z += this.driftZ * dt;
  }

  dispose() { this.scene.remove(this.mesh); }
}

/** Sorteia um tipo de power-up respeitando as chances da config. */
export function rollPowerUpType() {
  const r = Math.random();
  let acc = 0;
  for (const [id, cfg] of Object.entries(POWERUPS)) {
    acc += cfg.chance;
    if (r <= acc) return id;
  }
  return 'weapon';
}
