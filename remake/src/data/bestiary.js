// ──────────────────────────────────────────────────────────────
// bestiary.js — enemy archetypes: stats, behaviour, silhouette
// Each `ai(e, dt, g)` runs at the fixed simulation step.
// ──────────────────────────────────────────────────────────────

import { TAU, rng, angleTo, clamp } from '../core/math.js';

/** Aimed shot at the nearest living player. */
function aimed(g, e, speed = 260, spread = 0, count = 1, color = '#ff4d6d') {
  const target = g.nearestPlayer(e.x, e.y);
  const base = target ? angleTo(e.x, e.y, target.x, target.y) : Math.PI / 2;
  for (let i = 0; i < count; i++) {
    const a = base + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0);
    g.spawnEnemyBullet({ x: e.x, y: e.y + e.r * 0.5, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6, color });
  }
}

function radial(g, e, count, speed, offset = 0, color = '#c084fc') {
  for (let i = 0; i < count; i++) {
    const a = offset + (i / count) * TAU;
    g.spawnEnemyBullet({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6, color });
  }
}

/** Every archetype drifts in from off-screen to `entryY` before acting. */
function descend(e, dt, speed) {
  e.y += speed * dt;
}

export const ENEMIES = {
  grunt: {
    name: 'DRONE',
    hp: 3,
    r: 17,
    score: 10,
    coins: 4,
    xp: 3,
    color: '#ff4d4d',
    ai(e, dt, g) {
      descend(e, dt, e.speed);
      e.x += Math.sin(e.t * 1.6 + e.seed) * 28 * dt;
      e.fireCd -= dt;
      if (e.fireCd <= 0 && e.y > 0 && e.y < g.bounds.bottom - 120) {
        e.fireCd = rng.range(1.6, 3.2);
        aimed(g, e, 250);
      }
    },
    draw(ctx, e, t) {
      ctx.fillStyle = '#cc2222';
      ctx.shadowColor = '#ff5555';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(16, -8);
      ctx.lineTo(18, 12);
      ctx.lineTo(8, 17);
      ctx.lineTo(-8, 17);
      ctx.lineTo(-18, 12);
      ctx.lineTo(-16, -8);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,120,120,0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff8080';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, TAU);
      ctx.fill();
    },
  },

  arrow: {
    name: 'LANCE',
    hp: 2,
    r: 14,
    score: 18,
    coins: 6,
    xp: 4,
    color: '#00d0ff',
    speedMul: 2.6,
    ai(e, dt, g) {
      // Locks onto a lane on the way in, then commits.
      if (!e.locked) {
        const target = g.nearestPlayer(e.x, e.y);
        if (target && e.y > -20) {
          e.locked = true;
          e.vx = clamp((target.x - e.x) * 0.9, -220, 220);
        }
      }
      e.x += (e.vx || 0) * dt;
      descend(e, dt, e.speed);
    },
    draw(ctx, e, t) {
      ctx.fillStyle = '#0099cc';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(-13, -10);
      ctx.lineTo(-5, -6);
      ctx.lineTo(0, -18);
      ctx.lineTo(5, -6);
      ctx.lineTo(13, -10);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,245,255,0.6)';
      ctx.beginPath();
      ctx.arc(0, 2, 4, 0, TAU);
      ctx.fill();
    },
  },

  saucer: {
    name: 'SAUCER',
    hp: 5,
    r: 22,
    score: 25,
    coins: 8,
    xp: 5,
    color: '#ff2fd0',
    ai(e, dt, g) {
      e.y += e.speed * 0.55 * dt;
      e.x += Math.sin(e.t * 2.2 + e.seed) * 110 * dt;
      e.fireCd -= dt;
      if (e.fireCd <= 0 && e.y > 30) {
        e.fireCd = rng.range(1.4, 2.4);
        aimed(g, e, 250, 0.6, 3, '#ff2fd0');
      }
    },
    draw(ctx, e, t) {
      ctx.fillStyle = '#a800a8';
      ctx.shadowColor = '#ff2fd0';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.ellipse(0, 4, 24, 9, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#dd55dd';
      ctx.beginPath();
      ctx.ellipse(0, -1, 12, 11, 0, Math.PI, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      for (let i = -2; i <= 2; i++) {
        ctx.fillStyle = (i + t * 4) % 2 < 1 ? '#ffe066' : '#00f5ff';
        ctx.beginPath();
        ctx.arc(i * 8, 8, 2.4, 0, TAU);
        ctx.fill();
      }
    },
  },

  tank: {
    name: 'BASTION',
    hp: 18,
    r: 28,
    score: 45,
    coins: 16,
    xp: 12,
    color: '#8bc34a',
    speedMul: 0.45,
    ai(e, dt, g) {
      descend(e, dt, e.speed);
      e.fireCd -= dt;
      if (e.fireCd <= 0 && e.y > 20) {
        e.fireCd = 2.6;
        e.burst = 3;
      }
      if (e.burst > 0) {
        e.burstCd -= dt;
        if (e.burstCd <= 0) {
          e.burstCd = 0.16;
          e.burst--;
          aimed(g, e, 300, 0.25, 2, '#c5e1a5');
        }
      }
    },
    draw(ctx, e, t) {
      ctx.fillStyle = '#3e5c22';
      ctx.shadowColor = '#8bc34a';
      ctx.shadowBlur = 10;
      ctx.fillRect(-26, -16, 52, 34);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#5b8a2f';
      ctx.fillRect(-21, -11, 42, 22);
      ctx.fillStyle = '#2b3f18';
      ctx.fillRect(-11, -26, 22, 14);
      ctx.fillStyle = '#777';
      ctx.fillRect(-4, -34, 8, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(-26, 10, 52, 5);
    },
  },

  spinner: {
    name: 'ROTOR',
    hp: 8,
    r: 23,
    score: 35,
    coins: 12,
    xp: 8,
    color: '#a855f7',
    speedMul: 0.7,
    ai(e, dt, g) {
      descend(e, dt, e.speed);
      e.spin += dt * 3.4;
      e.fireCd -= dt;
      if (e.fireCd <= 0 && e.y > 10) {
        e.fireCd = 1.5;
        radial(g, e, 6, 190, e.spin);
      }
    },
    draw(ctx, e, t) {
      ctx.rotate(e.spin);
      ctx.fillStyle = '#6d28d9';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 16;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 23, a, a + 0.44);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, TAU);
      ctx.fill();
    },
  },

  diver: {
    name: 'STRIKER',
    hp: 6,
    r: 18,
    score: 30,
    coins: 10,
    xp: 7,
    color: '#4361ee',
    ai(e, dt, g) {
      if (!e.diving) {
        e.y += e.speed * 0.8 * dt;
        e.hover = (e.hover || 0) + dt;
        if (e.y > 130 && e.hover > 0.7) {
          e.diving = true;
          const target = g.nearestPlayer(e.x, e.y);
          e.dive = target ? angleTo(e.x, e.y, target.x, target.y) : Math.PI / 2;
          e.angle = e.dive;
        }
      } else {
        const s = e.speed * 2.6;
        e.x += Math.cos(e.dive) * s * dt;
        e.y += Math.sin(e.dive) * s * dt;
      }
    },
    draw(ctx, e, t) {
      ctx.rotate((e.diving ? e.dive : Math.PI / 2) - Math.PI / 2);
      ctx.fillStyle = '#1a3ac9';
      ctx.shadowColor = '#4361ee';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(-15, 15);
      ctx.lineTo(0, 8);
      ctx.lineTo(15, 15);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(140,170,255,0.65)';
      ctx.beginPath();
      ctx.arc(0, -5, 5, 0, TAU);
      ctx.fill();
    },
  },

  bomber: {
    name: 'DETONATOR',
    hp: 9,
    r: 21,
    score: 40,
    coins: 18,
    xp: 10,
    color: '#ff8c00',
    explodes: { radius: 110, damage: 1 },
    ai(e, dt, g) {
      descend(e, dt, e.speed * 1.1);
      e.x += Math.sin(e.t * 3 + e.seed) * 40 * dt;
    },
    draw(ctx, e, t) {
      const pulse = 1 + Math.sin(t * 9) * 0.07;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#e65100';
      ctx.shadowColor = '#ff8c00';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffd60a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, -13);
      ctx.quadraticCurveTo(22, -28, 15, -36);
      ctx.stroke();
      if (Math.sin(t * 18) > 0) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(15, -36, 4, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.arc(-6, -5, 4, 0, TAU);
      ctx.arc(6, -5, 4, 0, TAU);
      ctx.fill();
    },
  },

  elite: {
    name: 'PARAGON',
    hp: 40,
    r: 30,
    score: 120,
    coins: 45,
    xp: 30,
    color: '#ffd60a',
    speedMul: 0.5,
    alwaysDrops: true,
    ai(e, dt, g) {
      e.y += e.speed * 0.5 * dt;
      if (e.y > 180) e.y = 180 + Math.sin(e.t * 1.1) * 32;
      e.x += Math.cos(e.t * 0.9 + e.seed) * 90 * dt;
      e.spin += dt * 1.4;
      e.fireCd -= dt;
      if (e.fireCd <= 0) {
        e.fireCd = 1.5;
        aimed(g, e, 280, 1.0, 5, '#ffd60a');
        radial(g, e, 8, 150, e.spin, '#ffb703');
      }
    },
    draw(ctx, e, t) {
      ctx.rotate(e.spin);
      ctx.fillStyle = '#ffd60a';
      ctx.shadowColor = '#ffb703';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const r = i % 2 === 0 ? 30 : 15;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff8c00';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, TAU);
      ctx.fill();
    },
  },
};

export const ENEMY_IDS = Object.keys(ENEMIES);

/** Which archetypes are legal at a given campaign phase (1-based). */
export function poolForPhase(phase) {
  const pool = ['grunt'];
  if (phase >= 2) pool.push('arrow');
  if (phase >= 2) pool.push('saucer');
  if (phase >= 3) pool.push('tank');
  if (phase >= 4) pool.push('diver');
  if (phase >= 5) pool.push('spinner');
  if (phase >= 6) pool.push('bomber');
  return pool;
}
