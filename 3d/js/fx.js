// ═══════════════════════════════════════════════════════════════════
// FX — partículas, explosões, ondas de choque e texto flutuante
// Tudo em pools de objetos: nada é alocado durante o gameplay.
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';

const MAX_PARTICLES = 2600;

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.shake = 0;
    this.shakeDecay = 3.2;

    // ─ sistema de partículas (um único Points) ─
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX_PARTICLES * 3);
    this.col = new Float32Array(MAX_PARTICLES * 3);
    this.siz = new Float32Array(MAX_PARTICLES);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.siz, 1));
    geo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (320.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          float a = smoothstep(0.5, 0.06, length(d));
          if (a < 0.02) discard;
          gl_FragColor = vec4(vColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.parts = new Array(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.parts[i] = { alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, size: 1, r: 1, g: 1, b: 1, drag: 0.94 };
    }
    this.head = 0;
    this.tmpColor = new THREE.Color();

    // ─ pool de ondas de choque ─
    this.rings = [];
    this.ringGeo = new THREE.RingGeometry(0.85, 1, 40);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      m.visible = false;
      scene.add(m);
      this.rings.push({ mesh: m, alive: false, t: 0, dur: 1, from: 1, to: 10 });
    }

    // ─ pool de textos flutuantes ─
    this.texts = [];
    this.textCache = new Map();
    for (let i = 0; i < 22; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
      sp.visible = false;
      sp.renderOrder = 999;
      scene.add(sp);
      this.texts.push({ sprite: sp, alive: false, t: 0, dur: 1, vy: 4 });
    }
  }

  // ─────────────────────────────────────────────────────────────
  _spawn(x, y, z, vx, vy, vz, color, size, life, drag = 0.94) {
    const p = this.parts[this.head];
    this.head = (this.head + 1) % MAX_PARTICLES;
    this.tmpColor.set(color);
    p.alive = true;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.r = this.tmpColor.r; p.g = this.tmpColor.g; p.b = this.tmpColor.b;
    p.size = size; p.life = life; p.maxLife = life; p.drag = drag;
    return p;
  }

  explosion(x, y, z, color = 0xff6600, scale = 1, count = 26) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(2 * Math.random() - 1);
      const sp = (6 + Math.random() * 22) * scale;
      this._spawn(
        x, y, z,
        Math.sin(b) * Math.cos(a) * sp, Math.sin(b) * Math.sin(a) * sp, Math.cos(b) * sp,
        Math.random() < 0.35 ? 0xffffff : color,
        (0.5 + Math.random() * 1.1) * scale,
        0.5 + Math.random() * 0.6
      );
    }
    this.ring(x, y, z, color, 1.2 * scale, 9 * scale, 0.45);
  }

  bigExplosion(x, y, z, color = 0xff6600, scale = 2.2) {
    this.explosion(x, y, z, color, scale, 70);
    this.ring(x, y, z, 0xffffff, 1, 26 * scale * 0.5, 0.8);
    this.ring(x, y, z, color, 1, 40 * scale * 0.5, 1.2);
  }

  sparks(x, y, z, color = 0xffffff, count = 7, scale = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (4 + Math.random() * 10) * scale;
      this._spawn(x, y, z, Math.cos(a) * sp, Math.sin(a) * sp, (Math.random() - 0.5) * sp,
        color, 0.3 + Math.random() * 0.4, 0.18 + Math.random() * 0.2);
    }
  }

  trail(x, y, z, color = 0x00f5ff, size = 0.55, spread = 0.25) {
    this._spawn(
      x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, z,
      (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4, 10 + Math.random() * 8,
      color, size * (0.6 + Math.random() * 0.6), 0.16 + Math.random() * 0.12, 0.9
    );
  }

  ring(x, y, z, color = 0xffffff, from = 1, to = 10, dur = 0.5) {
    const r = this.rings.find((r) => !r.alive);
    if (!r) return;
    r.alive = true; r.t = 0; r.dur = dur; r.from = from; r.to = to;
    r.mesh.visible = true;
    r.mesh.position.set(x, y, z);
    r.mesh.material.color.set(color);
    r.mesh.material.opacity = 0.6;
    r.mesh.scale.setScalar(from);
    r.mesh.lookAt(0, 0, 40);
  }

  text(str, x, y, z, color = '#ffffff', size = 1.6, dur = 0.9) {
    const t = this.texts.find((t) => !t.alive);
    if (!t) return;
    const key = str + color;
    let tex = this.textCache.get(key);
    if (!tex) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 96;
      const g = c.getContext('2d');
      g.font = 'bold 58px Orbitron, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = color;
      g.shadowBlur = 22;
      g.fillStyle = color;
      g.fillText(str, 128, 48);
      g.fillText(str, 128, 48);
      tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      if (this.textCache.size > 120) {
        const [k, old] = this.textCache.entries().next().value;
        old.dispose();
        this.textCache.delete(k);
      }
      this.textCache.set(key, tex);
    }
    t.sprite.material.map = tex;
    t.sprite.material.needsUpdate = true;
    t.sprite.material.opacity = 1;
    t.sprite.position.set(x, y, z);
    t.sprite.scale.set(size * 2.6, size, 1);
    t.sprite.visible = true;
    t.alive = true; t.t = 0; t.dur = dur;
  }

  addShake(amount) {
    this.shake = Math.min(2.2, this.shake + amount);
  }

  update(dt) {
    // partículas
    const pos = this.pos, col = this.col, siz = this.siz;
    let n = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.parts[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const k = p.life / p.maxLife;
      const i3 = n * 3;
      pos[i3] = p.x; pos[i3 + 1] = p.y; pos[i3 + 2] = p.z;
      col[i3] = p.r * k; col[i3 + 1] = p.g * k; col[i3 + 2] = p.b * k;
      siz[n] = p.size * (0.35 + k * 0.65);
      n++;
    }
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.size.needsUpdate = true;

    // anéis
    for (const r of this.rings) {
      if (!r.alive) continue;
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) { r.alive = false; r.mesh.visible = false; continue; }
      r.mesh.scale.setScalar(r.from + (r.to - r.from) * k);
      r.mesh.material.opacity = 0.6 * (1 - k) * (1 - k);
    }

    // textos
    for (const t of this.texts) {
      if (!t.alive) continue;
      t.t += dt;
      const k = t.t / t.dur;
      if (k >= 1) { t.alive = false; t.sprite.visible = false; continue; }
      t.sprite.position.y += t.vy * dt;
      t.sprite.material.opacity = 1 - k * k;
    }

    // screen shake
    if (this.shake > 0) this.shake = Math.max(0, this.shake - this.shakeDecay * dt);
  }

  clear() {
    for (const p of this.parts) p.alive = false;
    for (const r of this.rings) { r.alive = false; r.mesh.visible = false; }
    for (const t of this.texts) { t.alive = false; t.sprite.visible = false; }
    this.shake = 0;
    this.points.geometry.setDrawRange(0, 0);
  }
}
