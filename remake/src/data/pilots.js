// ──────────────────────────────────────────────────────────────
// pilots.js — the eight playable ships: stats, weapon, ability, art
// ──────────────────────────────────────────────────────────────

import { TAU, rng } from '../core/math.js';
import { spark, ring, shake, flash } from '../core/fx.js';
import { sfx } from '../core/audio.js';

const UP = -Math.PI / 2; // "forward" for the player is straight up

/** Shorthand: fire a bullet at an angle offset from straight up. */
function shot(g, p, { angle = 0, speed = 760, dmg = 1, size = 4, ox = 0, oy = 0, pierce = 0, kind = 'bolt', color }) {
  const a = UP + angle;
  g.spawnPlayerBullet({
    x: p.x + ox,
    y: p.y + oy,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    dmg: dmg * p.damageMul,
    r: size,
    pierce: pierce + p.pierce,
    kind,
    color: color || p.bulletColor,
    owner: p.index,
  });
}

export const PILOTS = [
  {
    id: 'marcelo',
    name: 'MARCELO',
    tag: 'AI MASTER',
    desc: 'Casco equilibrado com núcleo de IA de combate. Invoca dois drones autônomos.',
    price: 0,
    accent: '#00f5ff',
    speed: 330,
    fireRate: 0.17,
    damage: 1,
    hp: 3,
    ability: { name: 'DRONE SWARM', desc: '2 drones lutam ao seu lado · 10s', cooldown: 18, duration: 10 },
    fire(g, p) {
      shot(g, p, { oy: -18, dmg: 1 });
      if (p.spread > 0) {
        shot(g, p, { angle: -0.12 * p.spread, ox: -9, oy: -12, dmg: 0.8 });
        shot(g, p, { angle: 0.12 * p.spread, ox: 9, oy: -12, dmg: 0.8 });
      }
      sfx('shoot', { throttle: 40 });
    },
    activate(g, p) {
      p.drones = [
        { side: -1, x: p.x - 46, y: p.y + 10, cd: 0 },
        { side: 1, x: p.x + 46, y: p.y + 10, cd: 0 },
      ];
      ring(p.x, p.y, '#00f5ff', 10, 90, 0.5);
      sfx('ability');
    },
    onAbilityEnd(g, p) {
      p.drones = [];
    },
    draw(ctx, c, t) {
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(-13, 2);
      ctx.lineTo(-20, 20);
      ctx.lineTo(0, 12);
      ctx.lineTo(20, 20);
      ctx.lineTo(13, 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(-30, 22);
      ctx.lineTo(-16, 20);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(30, 22);
      ctx.lineTo(16, 20);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 5 + Math.sin(t * 6) * 0.8, 0, TAU);
      ctx.fill();
    },
  },

  {
    id: 'robos',
    name: 'ROBOS',
    tag: 'TECH SQUAD',
    desc: 'Arsenal ambulante. Três canhões paralelos e um overdrive que não para de atirar.',
    price: 300,
    accent: '#ff9d00',
    speed: 300,
    fireRate: 0.2,
    damage: 0.85,
    hp: 4,
    ability: { name: 'OVERDRIVE', desc: 'Cadência triplicada · 6s', cooldown: 20, duration: 6 },
    fire(g, p) {
      for (const ox of [-16, 0, 16]) shot(g, p, { ox, oy: -14, dmg: 0.85 });
      if (p.spread > 0) {
        shot(g, p, { angle: -0.22, ox: -20, oy: -6, dmg: 0.7 });
        shot(g, p, { angle: 0.22, ox: 20, oy: -6, dmg: 0.7 });
      }
      sfx('shoot', { throttle: 45 });
    },
    activate(g, p) {
      p.fireMul *= 3;
      ring(p.x, p.y, '#ff9d00', 10, 80, 0.4);
      sfx('ability');
    },
    onAbilityEnd(g, p) {
      p.fireMul /= 3;
    },
    draw(ctx, c, t) {
      ctx.fillRect(-18, -16, 36, 34);
      ctx.globalAlpha = 0.75;
      ctx.fillRect(-10, -24, 20, 10);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(-28, -8, 10, 24);
      ctx.fillRect(18, -8, 10, 24);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff3b3b';
      ctx.shadowColor = '#ff5555';
      ctx.shadowBlur = 10;
      ctx.fillRect(-9, -21, 6, 5);
      ctx.fillRect(3, -21, 6, 5);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-14, -6, 28, 6);
    },
  },

  {
    id: 'felipe',
    name: 'FELIPE',
    tag: 'THE SWIFT',
    desc: 'Nada em campo se move mais rápido. Armas leves, pilotagem absurda.',
    price: 400,
    accent: '#39ff14',
    speed: 470,
    fireRate: 0.115,
    damage: 0.75,
    hp: 3,
    ability: { name: 'TURBO', desc: '+70% de velocidade, cadência dobrada · 6s', cooldown: 14, duration: 6 },
    fire(g, p) {
      shot(g, p, { oy: -20, dmg: 0.75, speed: 880, size: 3.4 });
      if (p.spread > 0) shot(g, p, { angle: 0.1 * rng.sign(), ox: rng.range(-8, 8), oy: -14, dmg: 0.6, speed: 880 });
      sfx('shoot', { throttle: 30 });
    },
    activate(g, p) {
      p.speedMul *= 1.7;
      p.fireMul *= 2;
      ring(p.x, p.y, '#39ff14', 8, 100, 0.45);
      sfx('ability');
    },
    onAbilityEnd(g, p) {
      p.speedMul /= 1.7;
      p.fireMul /= 2;
    },
    draw(ctx, c, t) {
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.bezierCurveTo(16, -10, 18, 12, 0, 22);
      ctx.bezierCurveTo(-18, 12, -16, -10, 0, -28);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(-12, 4);
      ctx.lineTo(-28, 26);
      ctx.lineTo(-6, 18);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(12, 4);
      ctx.lineTo(28, 26);
      ctx.lineTo(6, 18);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(190,240,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(0, -8, 5, 9, 0, 0, TAU);
      ctx.fill();
    },
  },

  {
    id: 'takeshi',
    name: 'TAKESHI',
    tag: 'THE NINJA',
    desc: 'Leque de três lâminas, dano alto por tiro e uma tempestade de shuriken teleguiados.',
    price: 600,
    accent: '#ff006e',
    speed: 340,
    fireRate: 0.26,
    damage: 1.6,
    hp: 3,
    ability: { name: 'SHURIKEN STORM', desc: '14 lâminas teleguiadas', cooldown: 12, duration: 0 },
    fire(g, p) {
      for (const a of [-0.19, 0, 0.19]) shot(g, p, { angle: a, oy: -16, dmg: 1.6, kind: 'blade' });
      if (p.spread > 0) {
        shot(g, p, { angle: -0.4, oy: -8, dmg: 1.2, kind: 'blade' });
        shot(g, p, { angle: 0.4, oy: -8, dmg: 1.2, kind: 'blade' });
      }
      sfx('shoot', { throttle: 60 });
    },
    activate(g, p) {
      for (let i = 0; i < 14; i++) {
        const a = UP + (i / 13 - 0.5) * 1.5;
        g.spawnPlayerBullet({
          x: p.x,
          y: p.y - 10,
          vx: Math.cos(a) * 520,
          vy: Math.sin(a) * 520,
          dmg: 1.6 * p.damageMul,
          r: 7,
          kind: 'blade',
          homing: 5.5,
          life: 3,
          color: '#ff006e',
          owner: p.index,
        });
      }
      sfx('ability');
    },
    draw(ctx, c, t) {
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(22, 2);
      ctx.lineTo(0, 22);
      ctx.lineTo(-22, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff006e';
      ctx.shadowColor = '#ff006e';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, -4, 5, 0, TAU);
      ctx.fill();
    },
  },

  {
    id: 'deepseek',
    name: 'DEEPSEEK',
    tag: 'THE BEAM',
    desc: 'Sem balas — um feixe contínuo e perfurante que derrete tudo que toca.',
    price: 800,
    accent: '#7b2fff',
    speed: 300,
    fireRate: 0.1,
    damage: 1,
    hp: 3,
    beam: { dps: 13, width: 16 },
    ability: { name: 'OMEGA BEAM', desc: 'Feixe ×4 de largura, dano ×3 · 3s', cooldown: 16, duration: 3 },
    fire(g, p) {
      // The beam is continuous — firing just keeps it alive for another beat.
      p.beamHot = 0.12;
      sfx('laser', { throttle: 220 });
    },
    activate(g, p) {
      p.beamBoost = 1;
      flash('#7b2fff', 0.35);
      sfx('ability');
    },
    onAbilityEnd(g, p) {
      p.beamBoost = 0;
    },
    draw(ctx, c, t) {
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-9, -8);
      ctx.lineTo(-19, 20);
      ctx.lineTo(0, 13);
      ctx.lineTo(19, 20);
      ctx.lineTo(9, -8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillRect(-16, 0, 8, 16);
      ctx.fillRect(8, 0, 8, 16);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#c9a6ff';
      ctx.shadowColor = '#7b2fff';
      ctx.shadowBlur = 16;
      ctx.fillRect(-4, -30, 8, 20);
    },
  },

  {
    id: 'omega',
    name: 'OMEGA',
    tag: 'CHAINGUN',
    desc: 'Cospe uma parede de luz. Fraco no tiro, aterrorizante na rajada.',
    price: 500,
    accent: '#ffd60a',
    speed: 310,
    fireRate: 0.065,
    damage: 0.42,
    hp: 3,
    ability: { name: 'MISSILE BARRAGE', desc: '18 mísseis teleguiados', cooldown: 13, duration: 0 },
    fire(g, p) {
      const j = rng.range(-0.075, 0.075);
      shot(g, p, { angle: j, ox: rng.range(-11, 11), oy: -14, dmg: 0.42, size: 3, speed: 820 });
      if (p.spread > 0) shot(g, p, { angle: j + 0.28 * rng.sign(), oy: -10, dmg: 0.42, size: 3, speed: 820 });
      sfx('shoot', { throttle: 24 });
    },
    activate(g, p) {
      for (let i = 0; i < 18; i++) {
        const a = UP + (i / 17 - 0.5) * 2.4;
        g.spawnPlayerBullet({
          x: p.x,
          y: p.y - 6,
          vx: Math.cos(a) * 360,
          vy: Math.sin(a) * 360,
          dmg: 1.5 * p.damageMul,
          r: 6,
          kind: 'missile',
          homing: 4,
          life: 3.2,
          color: '#ffd60a',
          owner: p.index,
        });
      }
      sfx('ability');
      shake(0.2);
    },
    draw(ctx, c, t) {
      ctx.beginPath();
      ctx.arc(0, 0, 21, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.fill();
      ctx.fillStyle = c;
      for (let i = 0; i < 5; i++) {
        const a = t * 4 + (i * TAU) / 5;
        ctx.save();
        ctx.translate(Math.cos(a) * 19, Math.sin(a) * 19);
        ctx.rotate(a);
        ctx.fillRect(-3, -5, 6, 11);
        ctx.restore();
      }
    },
  },

  {
    id: 'phantom',
    name: 'PHANTOM',
    tag: 'THE GHOST',
    desc: 'Os tiros atravessam os cascos. Some do perigo e deixa uma onda de choque para trás.',
    price: 700,
    accent: '#b388ff',
    speed: 420,
    fireRate: 0.19,
    damage: 1.15,
    hp: 2,
    ability: { name: 'BLINK', desc: 'Teleporte · 2,5s invulnerável · onda de choque', cooldown: 10, duration: 2.5 },
    fire(g, p) {
      shot(g, p, { oy: -18, dmg: 1.15, size: 5, pierce: 2, kind: 'phase' });
      if (p.spread > 0) {
        shot(g, p, { angle: -0.16, oy: -12, dmg: 0.9, size: 4, pierce: 1, kind: 'phase' });
        shot(g, p, { angle: 0.16, oy: -12, dmg: 0.9, size: 4, pierce: 1, kind: 'phase' });
      }
      sfx('shoot', { throttle: 45 });
    },
    activate(g, p) {
      spark(p.x, p.y, '#b388ff', 26, { speed: 260, life: 0.5 });
      p.y = Math.max(g.bounds.top + 40, p.y - 190);
      p.invuln = Math.max(p.invuln, 2.5);
      ring(p.x, p.y, '#b388ff', 6, 190, 0.5, 5);
      g.shockwave(p.x, p.y, 150, 3 * p.damageMul);
      sfx('ability');
      shake(0.16);
    },
    draw(ctx, c, t) {
      ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.18;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(-16, -4);
      ctx.lineTo(-11, 20);
      ctx.lineTo(0, 13);
      ctx.lineTo(11, 20);
      ctx.lineTo(16, -4);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.35;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 20 + i * 7, 4 - i, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  },

  {
    id: 'titan',
    name: 'TITAN',
    tag: 'THE COLOSSUS',
    desc: 'Lento, enorme, e cada projétil acerta como um prédio caindo.',
    price: 1000,
    accent: '#ff5722',
    speed: 240,
    fireRate: 0.42,
    damage: 4.2,
    hp: 5,
    ability: { name: 'BULWARK', desc: '4s invulnerável + nova de repulsão', cooldown: 20, duration: 4 },
    fire(g, p) {
      shot(g, p, { oy: -18, dmg: 4.2, size: 11, speed: 620, kind: 'shell' });
      if (p.spread > 0) {
        shot(g, p, { angle: -0.3, oy: -6, dmg: 2, size: 7, speed: 620, kind: 'shell' });
        shot(g, p, { angle: 0.3, oy: -6, dmg: 2, size: 7, speed: 620, kind: 'shell' });
      }
      sfx('shootHeavy', { throttle: 90 });
      shake(0.035);
    },
    activate(g, p) {
      p.invuln = Math.max(p.invuln, 4);
      p.bulwark = 4;
      g.shockwave(p.x, p.y, 210, 5 * p.damageMul, 420);
      ring(p.x, p.y, '#ff5722', 10, 230, 0.6, 6);
      sfx('ability');
      shake(0.3);
    },
    onAbilityEnd(g, p) {
      p.bulwark = 0;
    },
    draw(ctx, c, t) {
      ctx.fillRect(-24, -20, 48, 40);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(-21, -17, 18, 10);
      ctx.fillRect(3, -17, 18, 10);
      ctx.fillRect(-21, 2, 18, 10);
      ctx.fillRect(3, 2, 18, 10);
      ctx.fillStyle = c;
      ctx.fillRect(-6, -30, 12, 12);
      ctx.shadowColor = c;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, -2, 7 + Math.sin(t * 5), 0, TAU);
      ctx.fill();
    },
  },
];

export const PILOT_BY_ID = Object.fromEntries(PILOTS.map((p) => [p.id, p]));

// ── Cosmetic hull colours ─────────────────────────────────────

export const SKINS = [
  { id: 'default', name: 'STOCK', price: 0, color: '#b9d4e6', desc: 'Pintura de fábrica.' },
  { id: 'ember', name: 'EMBER', price: 250, color: '#ff5722', desc: 'Vive superaquecida.' },
  { id: 'glacier', name: 'GLACIER', price: 250, color: '#4fc3f7', desc: 'Liga abaixo de zero.' },
  { id: 'venom', name: 'VENOM', price: 350, color: '#39ff14', desc: 'Revestimento corrosivo.' },
  { id: 'gold', name: 'AUREUS', price: 500, color: '#ffd60a', desc: 'Absurdamente cara.' },
  { id: 'shadow', name: 'SHADOW', price: 600, color: '#9b6bff', desc: 'Quase não está lá.' },
  { id: 'plasma', name: 'PLASMA', price: 700, color: '#00f5ff', desc: 'Luz de estrela contida.' },
  { id: 'void', name: 'VOID', price: 900, color: '#6a00ff', desc: 'Vinda do espaço entre as coisas.' },
  { id: 'prism', name: 'PRISM', price: 1400, color: 'rainbow', desc: 'Percorre o espectro inteiro.' },
];

export const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));

export function skinColor(id, t) {
  const s = SKIN_BY_ID[id] || SKINS[0];
  return s.color === 'rainbow' ? `hsl(${(t * 90) % 360},100%,62%)` : s.color;
}
