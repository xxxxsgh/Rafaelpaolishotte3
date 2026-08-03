// ──────────────────────────────────────────────────────────────
// bosses.js — ten hand-authored bosses.
//
// A boss is a movement function plus a cycling list of attacks.
// `b.rage` is true below 35% HP: cadence tightens and patterns thicken.
// ──────────────────────────────────────────────────────────────

import { TAU, angleTo, clamp, rng } from '../core/math.js';
import { shake, ring, spark, flash } from '../core/fx.js';
import { sfx } from '../core/audio.js';

const P = Math.PI;

function shot(g, b, x, y, angle, speed, color = '#ff4d6d', r = 7) {
  g.spawnEnemyBullet({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, color });
}

function aim(g, b, x, y) {
  const t = g.nearestPlayer(x, y);
  return t ? angleTo(x, y, t.x, t.y) : P / 2;
}

function fan(g, b, count, spread, speed, color, angle = null) {
  const base = angle ?? aim(g, b, b.x, b.y + b.r * 0.6);
  for (let i = 0; i < count; i++) {
    const a = base + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0);
    shot(g, b, b.x, b.y + b.r * 0.6, a, speed, color);
  }
}

function radial(g, b, count, speed, offset, color, r = 7) {
  for (let i = 0; i < count; i++) shot(g, b, b.x, b.y, offset + (i / count) * TAU, speed, color, r);
}

// ── shared movement helpers ───────────────────────────────────

const sweep = (amp, rate) => (b, dt, g) => {
  b.x = g.bounds.cx + Math.sin(b.t * rate) * amp;
  b.y = g.bounds.top + 140 + Math.sin(b.t * rate * 0.6) * 26;
};

export const BOSSES = [
  // ── 1 ─────────────────────────────────────────────────────────
  {
    id: 'guardian',
    name: 'THE GUARDIAN',
    subtitle: 'STAR WATCHER',
    hp: 190,
    r: 62,
    color: '#7b2fff',
    coins: 120,
    score: 1200,
    cadence: 1.5,
    move: sweep(150, 0.75),
    attacks: [
      (g, b) => fan(g, b, b.rage ? 5 : 3, 0.5, 300, '#b388ff'),
      (g, b) => {
        for (const ox of [-1, 0, 1]) shot(g, b, b.x + ox * 42, b.y + 40, P / 2, 260, '#b388ff');
      },
      (g, b) => radial(g, b, b.rage ? 14 : 10, 200, b.t, '#7b2fff'),
    ],
    draw(ctx, b, t) {
      const pulse = 8 + Math.sin(t * 3) * 3;
      ctx.fillStyle = '#4c1d95';
      ctx.shadowColor = '#7b2fff';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.roundRect(-62, -50, 124, 100, pulse);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#7b2fff';
      ctx.fillRect(-48, -34, 96, 20);
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.arc(0, 8, 20 + Math.sin(t * 4) * 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(0, 8, 9, 0, TAU);
      ctx.fill();
    },
  },

  // ── 2 ─────────────────────────────────────────────────────────
  {
    id: 'twin',
    name: 'TWIN CANNON',
    subtitle: 'MASTER OF BURSTS',
    hp: 280,
    r: 66,
    color: '#ff3b3b',
    coins: 160,
    score: 1800,
    cadence: 1.35,
    move: (b, dt, g) => {
      b.x = g.bounds.cx + Math.sin(b.t * 1.15) * 175;
      b.y = g.bounds.top + 145 + Math.cos(b.t * 0.8) * 34;
    },
    attacks: [
      (g, b) => {
        for (const ox of [-40, 40]) {
          const a = aim(g, b, b.x + ox, b.y + 30);
          for (let i = 0; i < (b.rage ? 5 : 3); i++) shot(g, b, b.x + ox, b.y + 30, a + (i - 1) * 0.22, 330, '#ff6b6b');
        }
      },
      (g, b) => g.queue(0.0, () => fan(g, b, 9, 1.5, 260, '#ff3b3b')),
      (g, b) => {
        for (let k = 0; k < 3; k++) g.queue(k * 0.18, () => fan(g, b, b.rage ? 4 : 2, 0.4, 380, '#ffb3b3'));
      },
    ],
    draw(ctx, b, t) {
      ctx.fillStyle = '#7f1d1d';
      ctx.shadowColor = '#ff3b3b';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#b91c1c';
      for (const ox of [-40, 40]) {
        ctx.beginPath();
        ctx.arc(ox, 6, 22, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ff8a8a';
      for (const ox of [-40, 40]) {
        ctx.fillRect(ox - 7, 20, 14, 26 + Math.sin(t * 6) * 3);
      }
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(0, -12, 16, 0, TAU);
      ctx.fill();
    },
  },

  // ── 3 ─────────────────────────────────────────────────────────
  {
    id: 'vortex',
    name: 'THE VORTEX',
    subtitle: 'DIMENSIONAL DEVOURER',
    hp: 340,
    r: 60,
    color: '#0088ff',
    coins: 200,
    score: 2400,
    cadence: 1.6,
    move(b, dt, g) {
      b.blink = (b.blink || 0) - dt;
      if (b.blink <= 0) {
        b.blink = b.rage ? 1.8 : 2.8;
        spark(b.x, b.y, '#0088ff', 26, { speed: 260 });
        b.x = rng.range(g.bounds.left + 90, g.bounds.right - 90);
        b.y = g.bounds.top + rng.range(110, 200);
        ring(b.x, b.y, '#0088ff', 4, 120, 0.4);
        sfx('hit');
      }
      b.y += Math.sin(b.t * 2) * 18 * dt;
    },
    attacks: [
      (g, b) => radial(g, b, b.rage ? 20 : 14, 190, b.t * 2, '#4cc9f0'),
      (g, b) => {
        for (let k = 0; k < 4; k++) g.queue(k * 0.12, () => radial(g, b, 8, 230, b.t * 3 + k * 0.4, '#0088ff'));
      },
      (g, b) => fan(g, b, 7, 1.1, 300, '#90e0ef'),
    ],
    draw(ctx, b, t) {
      ctx.fillStyle = '#03045e';
      ctx.shadowColor = '#0088ff';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(76,201,240,${0.7 - i * 0.14})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 48 - i * 11, t * (2 + i) , t * (2 + i) + 2.2);
        ctx.stroke();
      }
      ctx.fillStyle = '#caf0f8';
      ctx.beginPath();
      ctx.arc(0, 0, 12 + Math.sin(t * 7) * 3, 0, TAU);
      ctx.fill();
    },
  },

  // ── 4 ─────────────────────────────────────────────────────────
  {
    id: 'bastion',
    name: 'ARMORED TITAN',
    subtitle: 'LIVING FORTRESS',
    hp: 480,
    r: 74,
    color: '#8bc34a',
    coins: 260,
    score: 3200,
    cadence: 1.7,
    move: (b, dt, g) => {
      b.x = g.bounds.cx + Math.sin(b.t * 0.5) * 190;
      b.y = g.bounds.top + 130;
    },
    attacks: [
      (g, b) => {
        for (let i = 0; i < 3; i++) g.queue(i * 0.22, () => fan(g, b, 3, 0.35, 340, '#c5e1a5'));
      },
      (g, b) => {
        const lanes = b.rage ? 4 : 3;
        for (let i = 0; i < lanes; i++) {
          g.spawnLaser({ x: g.bounds.left + ((i + 0.5) / lanes) * g.bounds.width + rng.range(-30, 30), width: 34, warn: 1.0, duration: 0.6, color: '#aeea00' });
        }
      },
      (g, b) => radial(g, b, b.rage ? 18 : 12, 170, b.t, '#8bc34a', 8),
    ],
    draw(ctx, b, t) {
      ctx.fillStyle = '#33691e';
      ctx.shadowColor = '#8bc34a';
      ctx.shadowBlur = 22;
      ctx.fillRect(-72, -48, 144, 96);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#558b2f';
      ctx.fillRect(-60, -36, 120, 72);
      ctx.fillStyle = '#1b3d0e';
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * 26 - 9, -60, 18, 16);
      ctx.fillStyle = '#aeea00';
      ctx.shadowColor = '#aeea00';
      ctx.shadowBlur = 16;
      ctx.fillRect(-40, -6, 80, 12);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-72, 36, 144, 12);
    },
  },

  // ── 5 ─────────────────────────────────────────────────────────
  {
    id: 'devourer',
    name: 'WORLD DEVOURER',
    subtitle: 'THE END OF ALL',
    hp: 620,
    r: 78,
    color: '#ff6d00',
    coins: 340,
    score: 4200,
    cadence: 0.55,
    move: (b, dt, g) => {
      b.x += Math.sin(b.t * 0.7) * 120 * dt;
      b.y = g.bounds.top + 165 + Math.sin(b.t * 1.6) * 26;
      b.x = clamp(b.x, g.bounds.left + b.r, g.bounds.right - b.r);
    },
    attacks: [
      (g, b) => {
        // continuous spiral — fired every cadence tick
        b.spiral = (b.spiral || 0) + 0.42;
        const arms = b.rage ? 5 : 3;
        for (let i = 0; i < arms; i++) shot(g, b, b.x, b.y, b.spiral + (i / arms) * TAU, 240, '#ff9e00', 8);
      },
    ],
    draw(ctx, b, t) {
      const grd = ctx.createRadialGradient(0, 0, 8, 0, 0, 76);
      grd.addColorStop(0, '#fff3b0');
      grd.addColorStop(0.5, '#ff6d00');
      grd.addColorStop(1, '#601700');
      ctx.fillStyle = grd;
      ctx.shadowColor = '#ff6d00';
      ctx.shadowBlur = 34;
      ctx.beginPath();
      ctx.arc(0, 0, 74, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,60,0,0.65)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, 16, t * 1.6, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 46, t * 1.1, 0, TAU);
      ctx.fill();
    },
  },

  // ── 6 ─────────────────────────────────────────────────────────
  {
    id: 'inferno',
    name: 'THE INFERNO',
    subtitle: 'ETERNAL FLAME',
    hp: 740,
    r: 70,
    color: '#ff2200',
    coins: 400,
    score: 5000,
    cadence: 1.25,
    move: (b, dt, g) => {
      b.x = g.bounds.cx + Math.sin(b.t * 1.9) * 200;
      b.y = g.bounds.top + 140 + Math.sin(b.t * 0.9) * 30;
    },
    attacks: [
      (g, b) => {
        const n = b.rage ? 9 : 6;
        for (let i = 0; i < n; i++) {
          const a = P / 2 + rng.range(-0.9, 0.9);
          shot(g, b, b.x, b.y + 30, a, rng.range(220, 380), '#ff4500', 9);
        }
      },
      (g, b) => {
        // wall of flame with one safe gap
        const gap = rng.int(0, 8);
        for (let i = 0; i <= 8; i++) {
          if (i === gap || (!b.rage && i === gap + 1)) continue;
          const x = g.bounds.left + (i / 8) * g.bounds.width;
          shot(g, b, x, g.bounds.top + 60, P / 2, 210, '#ff7b00', 8);
        }
      },
      (g, b) => fan(g, b, b.rage ? 11 : 7, 1.7, 290, '#ffb703'),
    ],
    draw(ctx, b, t) {
      ctx.fillStyle = '#7f1d00';
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        const r = 66 + Math.sin(t * 7 + i) * 9;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff6d00';
      ctx.beginPath();
      ctx.arc(0, 0, 36 + Math.sin(t * 5) * 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.fill();
    },
  },

  // ── 7 ─────────────────────────────────────────────────────────
  {
    id: 'glacier',
    name: 'GIANT GLACIER',
    subtitle: 'THE ICE AGE',
    hp: 860,
    r: 76,
    color: '#4fc3f7',
    coins: 460,
    score: 5800,
    cadence: 1.4,
    move: (b, dt, g) => {
      b.y = g.bounds.top + 150 + Math.sin(b.t * 0.8) * 46;
      b.x += Math.cos(b.t * 0.6) * 90 * dt;
      b.x = clamp(b.x, g.bounds.left + b.r, g.bounds.right - b.r);
    },
    attacks: [
      (g, b) => {
        // shards rain from the ceiling
        const n = b.rage ? 12 : 8;
        for (let i = 0; i < n; i++) {
          const x = rng.range(g.bounds.left + 20, g.bounds.right - 20);
          g.queue(i * 0.06, () => shot(g, b, x, g.bounds.top + 20, P / 2 + rng.range(-0.14, 0.14), 300, '#00bfff', 6));
        }
      },
      (g, b) => {
        for (let k = 0; k < 3; k++) g.queue(k * 0.2, () => radial(g, b, 12, 200, b.t + k * 0.26, '#caf0f8', 6));
      },
      (g, b) => {
        g.spawnLaser({ x: b.x, width: 60, warn: 0.8, duration: 0.9, color: '#4fc3f7', follow: b });
      },
    ],
    draw(ctx, b, t) {
      ctx.fillStyle = '#0a4a6e';
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.moveTo(0, -74);
      ctx.lineTo(64, 40);
      ctx.lineTo(30, 56);
      ctx.lineTo(-30, 56);
      ctx.lineTo(-64, 40);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(190,240,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.lineTo(30, 24);
      ctx.lineTo(-14, 34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0f7fa';
      ctx.beginPath();
      ctx.arc(0, 6, 14 + Math.sin(t * 4) * 2, 0, TAU);
      ctx.fill();
    },
  },

  // ── 8 ─────────────────────────────────────────────────────────
  {
    id: 'colossus',
    name: 'CYBER COLOSSUS',
    subtitle: 'DOMAIN OF THE MACHINE',
    hp: 1000,
    r: 80,
    color: '#39ff14',
    coins: 520,
    score: 6800,
    cadence: 1.5,
    move: (b, dt, g) => {
      b.x = g.bounds.cx + Math.sin(b.t * 0.35) * 120;
      b.y = g.bounds.top + 135;
    },
    attacks: [
      (g, b) => {
        const lanes = b.rage ? 5 : 3;
        const off = rng.range(0, 1);
        for (let i = 0; i < lanes; i++) {
          const x = g.bounds.left + (((i + off) % lanes) / lanes + 0.5 / lanes) * g.bounds.width;
          g.spawnLaser({ x, width: 40, warn: 0.9, duration: 0.7, color: '#39ff14' });
        }
      },
      (g, b) => {
        for (let k = 0; k < 5; k++) g.queue(k * 0.1, () => fan(g, b, 3, 0.5, 330, '#b9ff8a'));
      },
      (g, b) => {
        radial(g, b, b.rage ? 24 : 16, 180, b.t, '#39ff14', 6);
        g.summon('arrow', 2);
      },
    ],
    draw(ctx, b, t) {
      ctx.fillStyle = '#1b1b1b';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 24;
      ctx.fillRect(-78, -56, 156, 112);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(-64, -42, 128, 84);
      ctx.strokeStyle = 'rgba(57,255,20,0.55)';
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 20, -42);
        ctx.lineTo(i * 20, 42);
        ctx.stroke();
      }
      const scan = ((t * 60) % 84) - 42;
      ctx.fillStyle = 'rgba(57,255,20,0.28)';
      ctx.fillRect(-64, scan, 128, 6);
      ctx.fillStyle = '#ff2d55';
      ctx.shadowColor = '#ff2d55';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, TAU);
      ctx.fill();
    },
  },

  // ── 9 ─────────────────────────────────────────────────────────
  {
    id: 'void',
    name: 'STELLAR VOID',
    subtitle: 'POINT OF NO RETURN',
    hp: 1180,
    r: 72,
    color: '#6a00ff',
    coins: 620,
    score: 8000,
    cadence: 1.1,
    pull: 105,
    move: (b, dt, g) => {
      const tx = g.bounds.cx;
      const ty = g.bounds.top + 190;
      b.x += (tx - b.x) * 0.6 * dt;
      b.y += (ty - b.y) * 0.6 * dt;
      b.x += Math.sin(b.t * 1.4) * 80 * dt;
    },
    attacks: [
      (g, b) => {
        // slow dense orbs that the gravity well curves around
        const n = b.rage ? 18 : 12;
        for (let i = 0; i < n; i++) shot(g, b, b.x, b.y, (i / n) * TAU + b.t, 120, '#a06bff', 10);
      },
      (g, b) => {
        for (let k = 0; k < 3; k++) g.queue(k * 0.25, () => fan(g, b, 5, 0.8, 360, '#c77dff'));
      },
      (g, b) => {
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * TAU;
          g.queue(i * 0.02, () => shot(g, b, b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90, a, 210, '#6a00ff', 7));
        }
      },
    ],
    draw(ctx, b, t) {
      ctx.fillStyle = '#000';
      ctx.shadowColor = '#6a00ff';
      ctx.shadowBlur = 46;
      ctx.beginPath();
      ctx.arc(0, 0, 62, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(160,107,255,${0.75 - i * 0.2})`;
        ctx.lineWidth = 4 - i;
        ctx.beginPath();
        ctx.ellipse(0, 0, 74 + i * 12, 22 + i * 5, t * (0.7 + i * 0.3), 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(199,125,255,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(t * 3) * 4, 0, TAU);
      ctx.fill();
    },
  },

  // ── 10 ────────────────────────────────────────────────────────
  {
    id: 'rafa',
    name: 'RAFA PAOLI',
    subtitle: 'THE CREATOR',
    hp: 1800,
    r: 84,
    color: '#ffd60a',
    coins: 1500,
    score: 20000,
    cadence: 1.0,
    final: true,
    move: (b, dt, g) => {
      const target = g.nearestPlayer(b.x, b.y);
      const tx = target ? clamp(target.x, g.bounds.left + b.r, g.bounds.right - b.r) : g.bounds.cx;
      b.x += (tx - b.x) * (b.rage ? 1.3 : 0.7) * dt;
      b.y = g.bounds.top + 155 + Math.sin(b.t * 1.7) * 34;
    },
    attacks: [
      (g, b) => fan(g, b, b.rage ? 13 : 9, 1.8, 320, '#ffd60a'),
      (g, b) => {
        b.spiral = (b.spiral || 0) + 0.5;
        for (let i = 0; i < 4; i++) shot(g, b, b.x, b.y, b.spiral + (i / 4) * TAU, 260, '#ffb703', 8);
        for (let k = 1; k < 4; k++)
          g.queue(k * 0.1, () => {
            for (let i = 0; i < 4; i++) shot(g, b, b.x, b.y, b.spiral + k * 0.4 + (i / 4) * TAU, 260, '#ffb703', 8);
          });
      },
      (g, b) => {
        for (let i = 0; i < 4; i++) {
          const x = g.bounds.left + ((i + 0.5) / 4) * g.bounds.width;
          g.spawnLaser({ x, width: 42, warn: 0.85, duration: 0.6, color: '#ffd60a' });
        }
      },
      (g, b) => {
        g.summon('saucer', 2);
        g.summon('arrow', 2);
        radial(g, b, b.rage ? 22 : 16, 210, b.t, '#fff3b0', 7);
      },
    ],
    onRage(g, b) {
      flash('#ffd60a', 0.7);
      shake(0.6);
      sfx('bossWarn');
      g.announce('MODO FINAL', '#ffd60a');
    },
    draw(ctx, b, t) {
      const grd = ctx.createLinearGradient(-80, -80, 80, 80);
      grd.addColorStop(0, '#ffe066');
      grd.addColorStop(1, '#ff8c00');
      ctx.fillStyle = grd;
      ctx.shadowColor = '#ffd60a';
      ctx.shadowBlur = 38;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + t * 0.4;
        const r = i % 2 === 0 ? 82 : 44;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,8,23,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#00f5ff';
      ctx.font = '700 30px Orbitron, ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 18;
      ctx.fillText('RP', 0, 2);
      ctx.shadowBlur = 0;
    },
  },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
