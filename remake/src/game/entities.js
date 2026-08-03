// ──────────────────────────────────────────────────────────────
// entities.js — Player, Enemy, Boss and the small stuff.
// Entities never touch the DOM; they only talk to the Game facade.
// ──────────────────────────────────────────────────────────────

import { TAU, clamp, rng, damp } from '../core/math.js';
import { spark, ring, burst, shake, text } from '../core/fx.js';
import { sfx } from '../core/audio.js';
import { PILOT_BY_ID, skinColor } from '../data/pilots.js';
import { ENEMIES } from '../data/bestiary.js';

// ── Player ────────────────────────────────────────────────────

export class Player {
  constructor(pilotId, skinId, index, g) {
    const def = PILOT_BY_ID[pilotId] || PILOT_BY_ID.marcelo;
    this.def = def;
    this.index = index;
    this.skin = skinId;
    this.r = 16;
    this.x = g.bounds.cx + (index === 0 ? 0 : 80) * (index ? 1 : 0);
    this.y = g.bounds.bottom - 110;

    this.maxHp = def.hp;
    this.hp = def.hp;
    this.lives = 2; // extra respawns after the hull is gone
    this.alive = true;
    this.respawnIn = 0;

    // multipliers — upgrades and power-ups only ever touch these
    this.speedMul = 1;
    this.fireMul = 1;
    this.damageMul = 1;
    this.spread = 0;
    this.pierce = 0;
    this.magnet = 90;
    this.crit = 0.05;
    this.nova = 0;
    this.orbits = 0;
    this.lifesteal = 0;
    this.regen = 0;
    this.shieldMul = 1;
    this.cooldownMul = 1;
    this.invulnBonus = 0;
    this.slowField = 0;

    this.fireCd = 0;
    this.abilityCd = 0;
    this.abilityUntil = 0;
    this.invuln = 1.5;
    this.regenTimer = 0;

    this.rapidUntil = 0;
    this.doubleUntil = 0;
    this.shieldUntil = 0;
    this.magnetUntil = 0;

    this.drones = [];
    this.orbitAngle = 0;
    this.beamHot = 0;
    this.beamBoost = 0;
    this.bulwark = 0;
    this.t = 0;
    this.trailCd = 0;
    this.bulletColor = index === 0 ? '#39ff14' : '#ff9d00';
    this.accent = def.accent;
  }

  get shielded() {
    return this.shieldUntil > 0 || this.bulwark > 0;
  }

  get abilityReady() {
    return this.abilityCd <= 0 && this.abilityUntil <= 0;
  }

  get color() {
    return skinColor(this.skin, this.t);
  }

  update(dt, intent, g) {
    this.t += dt;

    if (!this.alive) {
      this.respawnIn -= dt;
      if (this.respawnIn <= 0 && this.lives > 0) {
        this.lives--;
        this.alive = true;
        this.hp = this.maxHp;
        this.invuln = 2.5;
        this.x = g.bounds.cx;
        this.y = g.bounds.bottom - 110;
        ring(this.x, this.y, this.accent, 6, 130, 0.5);
        sfx('shield');
      }
      return;
    }

    // ── timers
    this.invuln = Math.max(0, this.invuln - dt);
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    this.rapidUntil = Math.max(0, this.rapidUntil - dt);
    this.doubleUntil = Math.max(0, this.doubleUntil - dt);
    this.shieldUntil = Math.max(0, this.shieldUntil - dt);
    this.magnetUntil = Math.max(0, this.magnetUntil - dt);
    this.bulwark = Math.max(0, this.bulwark - dt);
    this.beamHot = Math.max(0, this.beamHot - dt);

    if (this.abilityUntil > 0) {
      this.abilityUntil -= dt;
      if (this.abilityUntil <= 0) {
        this.abilityUntil = 0;
        this.def.onAbilityEnd?.(g, this);
        this.abilityCd = this.def.ability.cooldown * this.cooldownMul;
      }
    }

    if (this.regen > 0) {
      this.regenTimer += dt;
      if (this.regenTimer >= 25 / this.regen) {
        this.regenTimer = 0;
        if (this.hp < this.maxHp) {
          this.hp++;
          text(this.x, this.y - 30, '+1', '#39ff14', { size: 15 });
          g.onHpChanged();
        }
      }
    }

    // ── movement
    const speed = this.def.speed * this.speedMul;
    this.x += intent.mx * speed * dt + intent.dragX;
    this.y += intent.my * speed * dt + intent.dragY;
    this.x = clamp(this.x, g.bounds.left + this.r, g.bounds.right - this.r);
    this.y = clamp(this.y, g.bounds.top + this.r + 20, g.bounds.bottom - this.r);

    // engine trail
    this.trailCd -= dt;
    if (this.trailCd <= 0) {
      this.trailCd = 0.03;
      spark(this.x + rng.range(-5, 5), this.y + 20, this.accent, 1, {
        speed: 70, dir: Math.PI / 2, spread: 0.7, life: 0.32, size: 3, drag: 3,
      });
    }

    // ── weapons
    const rapid = this.rapidUntil > 0 ? 1.8 : 1;
    this.fireCd -= dt * this.fireMul * rapid;
    if (intent.fire && this.fireCd <= 0) {
      this.fireCd = this.def.fireRate;
      this.def.fire(g, this);
    }

    // continuous beam pilots
    if (this.def.beam && this.beamHot > 0) g.applyBeam(this);

    // ── ability
    if (intent.ability && this.abilityReady) {
      this.def.activate(g, this);
      const dur = this.def.ability.duration;
      if (dur > 0) this.abilityUntil = dur;
      else this.abilityCd = this.def.ability.cooldown * this.cooldownMul;
      g.onAbilityUsed(this);
    }

    // ── drones (marcelo)
    for (const d of this.drones) {
      d.x = damp(d.x, this.x + d.side * 52, 7, dt);
      d.y = damp(d.y, this.y + 14 + Math.sin(this.t * 3 + d.side) * 6, 7, dt);
      d.cd -= dt;
      if (d.cd <= 0) {
        d.cd = 0.28;
        g.spawnPlayerBullet({
          x: d.x, y: d.y - 8, vx: 0, vy: -700,
          dmg: 0.6 * this.damageMul, r: 3.4, pierce: this.pierce,
          color: '#7cf5ff', owner: this.index,
        });
      }
    }

    // ── orbitals
    if (this.orbits > 0) {
      this.orbitAngle += dt * 2.6;
      g.applyOrbits(this);
    }
  }

  damageMultiplierNow() {
    return this.damageMul * (this.doubleUntil > 0 ? 2 : 1);
  }

  hurt(amount, g) {
    if (!this.alive || this.invuln > 0) return false;
    if (this.shielded) {
      this.shieldUntil = 0;
      this.bulwark = 0;
      this.invuln = 0.9 + this.invulnBonus;
      ring(this.x, this.y, '#00f5ff', 20, 120, 0.4, 5);
      sfx('shield');
      text(this.x, this.y - 34, 'ESCUDO!', '#00f5ff', { size: 15 });
      return false;
    }
    this.hp -= amount;
    this.invuln = 1.4 + this.invulnBonus;
    shake(0.45);
    sfx('damage');
    spark(this.x, this.y, '#ff006e', 22, { speed: 230 });
    g.onPlayerHurt(this, amount);

    if (this.hp <= 0) {
      this.alive = false;
      this.drones = [];
      this.abilityUntil = 0;
      this.respawnIn = 1.6;
      burst(this.x, this.y, this.accent, 2.2);
      shake(0.8);
      sfx('bigExplode');
      g.onPlayerDown(this);
    }
    return true;
  }

  draw(ctx) {
    if (!this.alive) return;
    // blink while invulnerable — the shield ring below still draws
    const blinking = this.invuln > 0 && Math.floor(this.t * 16) % 2 === 0;
    if (!blinking) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const c = this.color;
      ctx.fillStyle = c;
      ctx.shadowColor = c;
      ctx.shadowBlur = 14;
      this.def.draw(ctx, c, this.t);
      ctx.restore();
    }

    if (this.shielded) {
      ctx.save();
      const a = 0.5 + Math.sin(this.t * 8) * 0.16;
      ctx.globalAlpha = a;
      ctx.strokeStyle = this.bulwark > 0 ? '#ff5722' : '#00f5ff';
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 34, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    for (const d of this.drones) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(this.t * 3);
      ctx.fillStyle = '#7cf5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }

    if (this.orbits > 0) {
      for (let i = 0; i < this.orbits; i++) {
        const a = this.orbitAngle + (i / this.orbits) * TAU;
        const ox = this.x + Math.cos(a) * 62;
        const oy = this.y + Math.sin(a) * 62;
        ctx.save();
        ctx.fillStyle = '#00f5ff';
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(ox, oy, 8, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

// ── Enemy ─────────────────────────────────────────────────────

export class Enemy {
  constructor(type, x, y, g, mods = {}) {
    const def = ENEMIES[type] || ENEMIES.grunt;
    this.def = def;
    this.type = type;
    this.x = x;
    this.y = y;
    this.r = def.r;
    this.maxHp = Math.max(1, Math.round(def.hp * (mods.hp ?? 1)));
    this.hp = this.maxHp;
    this.speed = 95 * (def.speedMul ?? 1) * (mods.speed ?? 1);
    this.t = 0;
    this.seed = rng.range(0, 10);
    this.fireCd = rng.range(0.6, 2);
    this.burstCd = 0;
    this.burst = 0;
    this.spin = rng.range(0, TAU);
    this.flash = 0;
    this.slow = 0;
    this.scoreMul = mods.score ?? 1;
    this.coinMul = mods.coins ?? 1;
    this.alive = true;
  }

  update(dt, g) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.def.ai(this, dt, g);
    this.x = clamp(this.x, g.bounds.left - 60, g.bounds.right + 60);
  }

  hurt(dmg, g, crit = false) {
    this.hp -= dmg;
    this.flash = 1;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    if (crit) text(this.x, this.y - this.r, 'CRIT', '#ffd60a', { size: 13, life: 0.5 });
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    this.def.draw(ctx, this, this.t);
    ctx.restore();

    if (this.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash * 0.75;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 1.05, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    if (this.hp < this.maxHp) {
      const w = this.r * 2;
      const pct = clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(this.x - w / 2, this.y - this.r - 11, w, 4);
      ctx.fillStyle = pct > 0.5 ? '#39ff14' : pct > 0.25 ? '#ffd60a' : '#ff006e';
      ctx.fillRect(this.x - w / 2, this.y - this.r - 11, w * pct, 4);
    }
  }
}

// ── Boss ──────────────────────────────────────────────────────

export class Boss {
  constructor(def, g, hpMul = 1) {
    this.def = def;
    this.x = g.bounds.cx;
    this.y = g.bounds.top - 140;
    this.r = def.r;
    this.maxHp = Math.round(def.hp * hpMul);
    this.hp = this.maxHp;
    this.t = 0;
    this.entering = 1;
    this.attackIndex = 0;
    this.attackCd = 2.2;
    this.rage = false;
    this.flash = 0;
    this.alive = true;
    this.spiral = 0;
  }

  update(dt, g) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);

    if (this.entering > 0) {
      this.entering = Math.max(0, this.entering - dt);
      this.y = damp(this.y, g.bounds.top + 150, 3, dt);
      return;
    }

    this.def.move(this, dt, g);
    this.x = clamp(this.x, g.bounds.left + this.r * 0.6, g.bounds.right - this.r * 0.6);
    this.y = clamp(this.y, g.bounds.top + 60, g.bounds.top + g.bounds.height * 0.42);

    if (!this.rage && this.hp / this.maxHp < 0.35) {
      this.rage = true;
      this.def.onRage?.(g, this);
      ring(this.x, this.y, '#ff006e', 20, 260, 0.6, 6);
      shake(0.4);
      sfx('bossWarn');
      g.announce('ENFURECIDO', '#ff006e');
    }

    // gravity well (STELLAR VOID)
    if (this.def.pull) g.applyPull(this.x, this.y, this.def.pull * (this.rage ? 1.5 : 1), dt);

    this.attackCd -= dt;
    if (this.attackCd <= 0) {
      const attacks = this.def.attacks;
      attacks[this.attackIndex % attacks.length](g, this);
      this.attackIndex++;
      this.attackCd = this.def.cadence * (this.rage ? 0.62 : 1) * rng.range(0.9, 1.1);
    }
  }

  hurt(dmg) {
    this.hp -= dmg;
    this.flash = 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    this.def.draw(ctx, this, this.t);
    ctx.restore();
    if (this.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash * 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ── Telegraphed vertical laser ────────────────────────────────

export class Laser {
  constructor({ x, width, warn, duration, color, follow }) {
    this.x = x;
    this.width = width;
    this.warn = warn;
    this.duration = duration;
    this.color = color;
    this.follow = follow || null;
    this.t = 0;
    this.dead = false;
    this.hitCd = 0;
  }

  get active() {
    return this.t >= this.warn && this.t < this.warn + this.duration;
  }

  update(dt) {
    this.t += dt;
    this.hitCd -= dt;
    if (this.follow && this.t < this.warn) this.x = this.follow.x;
    if (this.t >= this.warn + this.duration) this.dead = true;
  }

  draw(ctx, bounds) {
    ctx.save();
    if (!this.active) {
      const p = this.t / this.warn;
      ctx.globalAlpha = 0.25 + Math.sin(p * 30) * 0.15;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - 2, bounds.top, 4, bounds.height);
      ctx.globalAlpha = 0.1;
      ctx.fillRect(this.x - this.width / 2, bounds.top, this.width, bounds.height);
    } else {
      const p = 1 - (this.t - this.warn) / this.duration;
      const w = this.width * (0.6 + p * 0.4);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(this.x - w / 2, bounds.top, w, bounds.height);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.x - w / 6, bounds.top, w / 3, bounds.height);
    }
    ctx.restore();
  }
}
