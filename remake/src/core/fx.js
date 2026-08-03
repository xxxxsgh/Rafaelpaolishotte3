// ──────────────────────────────────────────────────────────────
// fx.js — particles, floating text, trauma shake, hitstop, flash
// ──────────────────────────────────────────────────────────────

import { rng, TAU, clamp } from './math.js';
import { profile } from './storage.js';

const MAX_PARTICLES = [180, 520, 1100];

export const fx = {
  particles: [],
  texts: [],
  rings: [],
  trauma: 0,
  shakeX: 0,
  shakeY: 0,
  flash: 0,
  flashColor: '#ffffff',
  vignette: 0,
  hitstop: 0,
  slowmo: 0,
};

const budget = () => MAX_PARTICLES[clamp(profile.settings.particles | 0, 0, 2)];
const quality = () => [0.45, 1, 1.6][clamp(profile.settings.particles | 0, 0, 2)];

/**
 * Canvas `shadowBlur` is re-rasterised on every fill and is by far the most
 * expensive thing a 2D context can do — with hundreds of particles and
 * bullets on screen it dominates the frame. Instead we bake one soft radial
 * sprite per colour and blit it additively, which looks the same and costs
 * a texture copy. The cache is tiny: entities only use a handful of colours.
 */
const SPRITE = 64;
const spriteCache = new Map();

export function glowSprite(color) {
  let c = spriteCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = SPRITE;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, SPRITE, SPRITE);
  // Punch a radial alpha falloff through the flat colour.
  const grd = g.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.28, 'rgba(255,255,255,0.7)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = grd;
  g.fillRect(0, 0, SPRITE, SPRITE);
  spriteCache.set(color, c);
  return c;
}

export function resetFx() {
  fx.particles.length = 0;
  fx.texts.length = 0;
  fx.rings.length = 0;
  fx.trauma = 0;
  fx.flash = 0;
  fx.vignette = 0;
  fx.hitstop = 0;
  fx.slowmo = 0;
}

/** Trauma accumulates and decays quadratically — smoother than raw offsets. */
export function shake(amount) {
  fx.trauma = clamp(fx.trauma + amount * profile.settings.shake, 0, 1);
}

export function hitstop(seconds) {
  fx.hitstop = Math.max(fx.hitstop, seconds);
}

export function slowmo(seconds) {
  fx.slowmo = Math.max(fx.slowmo, seconds);
}

export function flash(color = '#ffffff', strength = 0.6) {
  fx.flash = Math.max(fx.flash, strength);
  fx.flashColor = color;
}

export function spark(x, y, color, count = 8, opts = {}) {
  const {
    speed = 180,
    spread = TAU,
    dir = 0,
    life = 0.5,
    size = 2.6,
    gravity = 0,
    drag = 2.6,
    glow = true,
  } = opts;
  const n = Math.round(count * quality());
  const cap = budget();
  for (let i = 0; i < n; i++) {
    if (fx.particles.length >= cap) fx.particles.shift();
    const a = dir + rng.range(-spread / 2, spread / 2);
    const s = speed * rng.range(0.35, 1.15);
    fx.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * rng.range(0.6, 1.25),
      max: life,
      size: size * rng.range(0.6, 1.4),
      color,
      gravity,
      drag,
      glow,
    });
  }
}

export function burst(x, y, color, scale = 1) {
  spark(x, y, color, 16 * scale, { speed: 190 * scale, life: 0.55, size: 3 * scale });
  spark(x, y, '#ffffff', 6 * scale, { speed: 240 * scale, life: 0.24, size: 2 });
  ring(x, y, color, 8, 60 * scale, 0.34);
}

export function ring(x, y, color, from, to, life = 0.4, width = 3) {
  fx.rings.push({ x, y, color, r: from, to, life, max: life, width });
}

export function smoke(x, y, color = 'rgba(120,140,180,0.5)', count = 4) {
  spark(x, y, color, count, { speed: 30, life: 1.1, size: 8, drag: 1.4, glow: false });
}

export function text(x, y, str, color = '#fff', opts = {}) {
  const { size = 16, life = 0.9, vy = -46, bold = true, wobble = 0 } = opts;
  fx.texts.push({
    x, y, str, color, size, life, max: life,
    vy, vx: wobble ? rng.range(-wobble, wobble) : 0, bold,
  });
}

export function updateFx(dt) {
  // Particles
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      fx.particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    const d = Math.exp(-p.drag * dt);
    p.vx *= d;
    p.vy *= d;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  // Rings
  for (let i = fx.rings.length - 1; i >= 0; i--) {
    const r = fx.rings[i];
    r.life -= dt;
    if (r.life <= 0) {
      fx.rings.splice(i, 1);
      continue;
    }
    const t = 1 - r.life / r.max;
    r.r = r.r + (r.to - r.r) * Math.min(1, dt * 9 + t * 0.02);
  }

  // Floating text
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i];
    t.life -= dt;
    if (t.life <= 0) {
      fx.texts.splice(i, 1);
      continue;
    }
    t.y += t.vy * dt;
    t.x += t.vx * dt;
    t.vy *= Math.exp(-1.6 * dt);
  }

  // Shake
  fx.trauma = Math.max(0, fx.trauma - dt * 1.5);
  const s = fx.trauma * fx.trauma * 18;
  fx.shakeX = rng.range(-s, s);
  fx.shakeY = rng.range(-s, s);

  fx.flash = Math.max(0, fx.flash - dt * 3.2);
  fx.vignette = Math.max(0, fx.vignette - dt * 1.6);
}

export function drawParticles(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of fx.particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a;
    const s = p.size * (0.4 + a * 0.6);
    ctx.fillStyle = p.color;
    if (p.glow) {
      // soft halo + hard core, so sparks stay crisp instead of turning to bokeh
      const r = s * 1.7;
      ctx.globalAlpha = a * 0.75;
      ctx.drawImage(glowSprite(p.color), p.x - r, p.y - r, r * 2, r * 2);
      ctx.globalAlpha = a;
    }
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const r of fx.rings) {
    const a = clamp(r.life / r.max, 0, 1);
    ctx.globalAlpha = a * 0.85;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.width * a;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTexts(ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of fx.texts) {
    const a = clamp(t.life / t.max, 0, 1);
    const pop = t.life > t.max - 0.09 ? 1.35 : 1;
    ctx.globalAlpha = a;
    ctx.font = `${t.bold ? '700 ' : ''}${Math.round(t.size * pop)}px Orbitron, ui-monospace, monospace`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeText(t.str, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.str, t.x, t.y);
  }
  ctx.restore();
}
