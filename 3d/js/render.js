/* ═══════════════════════════════════════════════════════════════════
   RENDER — cena Three.js, modelos 3D, efeitos visuais
   ═══════════════════════════════════════════════════════════════════ */

const Render = {
  renderer: null, scene: null, camera: null,
  world: null,           // container de tudo que sofre shake
  starfield: null, rings: [], gridFloor: null, gridCeil: null,
  theme: PHASE_THEMES[0],
  shake: 0, flash: 0, flashColor: 0xffffff,
  camShakeX: 0, camShakeY: 0,
  _lowQuality: false,

  init() {
    const canvas = $('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x020817, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020817, 0.0075);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 600);
    this.camera.position.set(0, 5.5, 20);
    this.camera.lookAt(0, 1, -30);

    this.world = new THREE.Group();
    this.scene.add(this.world);

    // Luzes
    this.hemi = new THREE.HemisphereLight(0x88ccff, 0x220044, 0.75);
    this.scene.add(this.hemi);
    this.dir = new THREE.DirectionalLight(0xffffff, 1.1);
    this.dir.position.set(4, 12, 8);
    this.scene.add(this.dir);
    this.rimLight = new THREE.PointLight(0x00f5ff, 2.2, 90, 2);
    this.rimLight.position.set(0, 2, -40);
    this.scene.add(this.rimLight);
    this.playerLight = new THREE.PointLight(0x39ff14, 1.6, 30, 2);
    this.playerLight.position.set(0, 0, 2);
    this.scene.add(this.playerLight);

    this.buildNebula();
    this.buildStarfield();
    this.buildTunnel();
    FX.init();

    window.addEventListener('resize', () => this.resize());
    this.resize();
  },

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    // Em telas estreitas, afasta a câmera pra manter o campo inteiro visível
    const fov = w / h < 1 ? 78 : 62;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, Settings.quality === 'low' ? 1 : 2));
  },

  /* ─── Nebulosa de fundo (sem fog, atrás de tudo) ───────────────── */
  buildNebula() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) {
      const cx = rand(0, 256), cy = rand(0, 256), r = rand(24, 90);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      const a = rand(0.05, 0.22);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    this.nebula = new THREE.Mesh(
      new THREE.PlaneGeometry(1100, 700),
      new THREE.MeshBasicMaterial({
        map: tex, color: 0x7b2fff, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
    this.nebula.position.set(0, 4, -330);
    this.nebula.renderOrder = -10;
    this.scene.add(this.nebula);
  },

  /* ─── Fundo estelar ────────────────────────────────────────────── */
  buildStarfield() {
    const N = 1600;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rand(-90, 90);
      pos[i * 3 + 1] = rand(-45, 55);
      pos[i * 3 + 2] = rand(-320, 25);
      const b = rand(0.4, 1);
      col[i * 3] = b; col[i * 3 + 1] = b; col[i * 3 + 2] = b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.7, vertexColors: true, transparent: true, opacity: 0.9,
      map: FX.dotTexture(), blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.starfield = new THREE.Points(geo, mat);
    this.starfield.frustumCulled = false;
    this.scene.add(this.starfield);
  },

  /* ─── Corredor: 4 paredes de grid + anéis de velocidade ────────── */
  buildTunnel() {
    // anéis: molduras retangulares que dão sensação de velocidade
    const ringGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, -1, 0),
      new THREE.Vector3(1, 1, 0), new THREE.Vector3(-1, 1, 0),
    ]);
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.LineBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.3 });
      const ring = new THREE.LineLoop(ringGeo, mat);
      ring.scale.set(26, 15, 1);
      ring.position.set(0, 1.5, -280 + i * 20);
      this.world.add(ring);
      this.rings.push(ring);
    }

    const wall = (color, opacity) => {
      const g = new THREE.GridHelper(320, 40, color, color);
      g.material.transparent = true;
      g.material.opacity = opacity;
      g.material.depthWrite = false;
      this.world.add(g);
      return g;
    };
    this.gridFloor = wall(0x00f5ff, 0.20);
    this.gridFloor.position.set(0, -11, -120);

    this.gridCeil = wall(0x7b2fff, 0.11);
    this.gridCeil.position.set(0, 14, -120);

    this.gridLeft = wall(0x00f5ff, 0.10);
    this.gridLeft.rotation.z = Math.PI / 2;
    this.gridLeft.position.set(-26, 1.5, -120);

    this.gridRight = wall(0x00f5ff, 0.10);
    this.gridRight.rotation.z = Math.PI / 2;
    this.gridRight.position.set(26, 1.5, -120);

    this.walls = [this.gridFloor, this.gridCeil, this.gridLeft, this.gridRight];
  },

  setTheme(idx) {
    const t = PHASE_THEMES[(idx - 1 + PHASE_THEMES.length) % PHASE_THEMES.length] || PHASE_THEMES[0];
    this.theme = t;
    this.scene.fog.color.setHex(t.fog);
    this.renderer.setClearColor(t.fog, 1);
    this.rings.forEach(r => r.material.color.setHex(t.grid));
    this.gridFloor.material.color.setHex(t.grid);
    this.gridLeft.material.color.setHex(t.grid);
    this.gridRight.material.color.setHex(t.grid);
    this.gridCeil.material.color.setHex(t.accent);
    this.rimLight.color.setHex(t.grid);
    this.starfield.material.color.setHex(t.star);
    this.nebula.material.color.setHex(t.accent);
  },

  /* ─── Update por frame ─────────────────────────────────────────── */
  update(dt, speedBoost) {
    const scroll = (26 + speedBoost) * dt;
    // estrelas
    const p = this.starfield.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let z = p.getZ(i) + scroll;
      if (z > 25) { z -= 345; p.setX(i, rand(-90, 90)); p.setY(i, rand(-45, 55)); }
      p.setZ(i, z);
    }
    p.needsUpdate = true;
    // anéis
    this.rings.forEach(r => {
      r.position.z += scroll;
      if (r.position.z > 22) r.position.z -= 280;
      r.material.opacity = 0.42 * clamp(1 - Math.abs(r.position.z + 80) / 220, 0.04, 1);
    });
    // paredes rolando (grid de 8 unidades → repete a cada 8)
    this.walls.forEach(w => {
      w.position.z += scroll;
      if (w.position.z > -112) w.position.z -= 8;
    });

    // shake
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.4);
      const m = this.shake * this.shake * 1.6;
      this.camShakeX = rand(-m, m);
      this.camShakeY = rand(-m, m);
    } else { this.camShakeX = this.camShakeY = 0; }

    // flash
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 3.2);
      const el = $('screenFlash');
      el.style.opacity = this.flash * 0.55;
      el.style.background = '#' + this.flashColor.toString(16).padStart(6, '0');
    } else {
      $('screenFlash').style.opacity = 0;
    }
  },

  followPlayer(px, py) {
    const cx = px * 0.28 + this.camShakeX;
    const cy = 5.2 + py * 0.34 + this.camShakeY;
    this.camera.position.x += (cx - this.camera.position.x) * 0.12;
    this.camera.position.y += (cy - this.camera.position.y) * 0.12;
    this.camera.position.z = 20;
    this.camera.lookAt(px * 0.45, py * 0.55 + 0.5, -32);
    this.playerLight.position.set(px, py, 2);
  },

  addShake(v) { this.shake = Math.min(1.6, this.shake + v); },
  addFlash(v, color = 0xffffff) { this.flash = Math.min(1, this.flash + v); this.flashColor = color; },

  render() { this.renderer.render(this.scene, this.camera); },
};

/* ═══════════════════════════════════════════════════════════════════
   MODELOS 3D
   ═══════════════════════════════════════════════════════════════════ */
const Models = {
  _dotTex: null,

  mat(color, emissive, emissiveIntensity = 0.6, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color, emissive: emissive ?? color, emissiveIntensity,
      metalness: 0.55, roughness: 0.35, ...opts,
    });
  },
  glow(color, opacity = 0.85) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  },

  /** Halo aditivo (sprite) usado como "brilho" barato em volta das peças. */
  halo(color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: FX.glowTexture(), color, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.scale.set(size, size, 1);
    return s;
  },

  /* ─── Nave do jogador ────────────────────────────────────────── */
  playerShip(character, colorHex) {
    const g = new THREE.Group();
    const body = this.mat(colorHex, colorHex, 0.35);
    const dark = this.mat(0x1b2436, 0x101828, 0.2);
    const core = this.glow(0x00f5ff, 0.95);

    const addCore = (r, y, z, col) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), this.glow(col, 0.95));
      c.position.set(0, y, z); g.add(c);
      const h = this.halo(col, r * 7); h.position.copy(c.position); g.add(h);
      return c;
    };

    switch (character) {
      case 'marcelo': {
        const hull = new THREE.Mesh(new THREE.ConeGeometry(0.75, 3.1, 5), body);
        hull.rotation.x = -Math.PI / 2; g.add(hull);
        [-1, 1].forEach(s => {
          const w = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 1.1), body);
          w.position.set(s * 1.15, -0.05, 0.55); w.rotation.z = s * 0.22; g.add(w);
          const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.7), this.mat(0x00f5ff, 0x00f5ff, 1.4));
          tip.position.set(s * 1.8, 0.1, 0.7); g.add(tip);
        });
        addCore(0.3, 0.05, 0.25, 0x00f5ff);
        break;
      }
      case 'robos': {
        const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 2.6), body);
        g.add(hull);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.7), dark);
        head.position.set(0, 0.45, -1.1); g.add(head);
        [-1, 1].forEach(s => {
          const eye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.1), this.glow(0xff3333));
          eye.position.set(s * 0.25, 0.5, -1.46); g.add(eye);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 2.0), dark);
          arm.position.set(s * 1.05, -0.1, -0.2); g.add(arm);
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.9, 8), this.mat(0x777788));
          barrel.rotation.x = Math.PI / 2; barrel.position.set(s * 1.05, -0.1, -1.5); g.add(barrel);
        });
        break;
      }
      case 'felipe': {
        const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 2.2, 6, 12), body);
        hull.rotation.x = Math.PI / 2; g.add(hull);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 10), body);
        nose.rotation.x = -Math.PI / 2; nose.position.z = -1.75; g.add(nose);
        [-1, 1].forEach(s => {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.6), body);
          fin.position.set(s * 1.0, -0.15, 0.9); fin.rotation.z = s * -0.35; fin.rotation.y = s * 0.25; g.add(fin);
        });
        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), new THREE.MeshStandardMaterial({
          color: 0xc8f0ff, transparent: true, opacity: 0.45, emissive: 0x66ccff, emissiveIntensity: 0.6,
        }));
        cockpit.position.set(0, 0.28, -0.45); g.add(cockpit);
        break;
      }
      case 'takeshi': {
        const hull = new THREE.Mesh(new THREE.OctahedronGeometry(1.25, 0), body);
        hull.scale.set(0.85, 0.42, 1.7); g.add(hull);
        const blade = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), this.mat(0xffffff, 0xffffff, 0.4));
        blade.scale.set(0.5, 0.3, 1.5); blade.position.z = -0.2; g.add(blade);
        addCore(0.26, 0.02, -0.5, 0xff006e);
        break;
      }
      case 'deepseek': {
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 2.7, 8), body);
        hull.rotation.x = Math.PI / 2; g.add(hull);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.2, 10), this.mat(0x00f5ff, 0x00f5ff, 1.6));
        barrel.rotation.x = Math.PI / 2; barrel.position.z = -1.9; g.add(barrel);
        [-1, 1].forEach(s => {
          const cell = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 1.2), this.glow(0x00f5ff, 0.5));
          cell.position.set(s * 0.85, 0, 0.4); g.add(cell);
        });
        g.add(this.halo(0x00f5ff, 4));
        break;
      }
      case 'omega': {
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.75, 14), body);
        hull.rotation.x = Math.PI / 2; g.add(hull);
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12), this.glow(0xffffff, 0.6));
        inner.rotation.x = Math.PI / 2; g.add(inner);
        const guns = new THREE.Group();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const gun = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 1.3), dark);
          gun.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, -0.65);
          guns.add(gun);
        }
        g.add(guns); g.userData.spin = guns;
        break;
      }
      case 'phantom': {
        const m = new THREE.MeshStandardMaterial({
          color: colorHex, emissive: colorHex, emissiveIntensity: 0.9,
          transparent: true, opacity: 0.55, metalness: 0.2, roughness: 0.4,
        });
        const hull = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.0, 4), m);
        hull.rotation.x = -Math.PI / 2; hull.rotation.z = Math.PI / 4; g.add(hull);
        [-1, 1].forEach(s => {
          const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.8), m);
          w.position.set(s * 0.95, 0, 0.7); w.rotation.z = s * -0.4; g.add(w);
        });
        g.add(this.halo(colorHex, 4.5));
        break;
      }
      case 'titan': {
        const hull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.25, 2.8), body);
        g.add(hull);
        [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.3, 1.1), dark);
          plate.position.set(sx * 0.55, 0.72, sz * 0.65); g.add(plate);
        }));
        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.55, 1.0), dark);
        shoulder.position.set(0, -0.1, 0.9); g.add(shoulder);
        addCore(0.42, 0.1, -0.6, 0xff8800);
        break;
      }
      default: {
        const hull = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.8, 6), body);
        hull.rotation.x = -Math.PI / 2; g.add(hull);
      }
    }

    // Motores (sempre)
    const engines = [];
    const ePos = character === 'titan' ? [[-0.8, -0.2], [0.8, -0.2]] : character === 'omega' ? [[0, 0]] : [[-0.45, -0.1], [0.45, -0.1]];
    ePos.forEach(([ex, ey]) => {
      const e = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 8), this.glow(0x00f5ff, 0.9));
      e.rotation.x = Math.PI / 2;
      e.position.set(ex, ey, 1.6);
      g.add(e); engines.push(e);
    });
    g.userData.engines = engines;
    g.userData.core = core;
    return g;
  },

  /* ─── Drone aliado (habilidade do Marcelo) ───────────────────── */
  drone(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.95), this.mat(0x7a8fa8, 0x334455, 0.3));
    g.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), this.glow(color));
    eye.position.z = -0.55; g.add(eye);
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 6), this.mat(color, color, 1.2));
      c.rotation.x = Math.PI / 2; c.position.set(s * 0.4, 0.1, -0.7); g.add(c);
    });
    g.add(this.halo(color, 2.4));
    return g;
  },

  /* ─── Inimigos ───────────────────────────────────────────────── */
  enemy(type) {
    const cfg = ENEMY_CFG[type];
    const g = new THREE.Group();
    const body = this.mat(cfg.color, cfg.glow, 0.5);
    const glowM = this.glow(cfg.glow, 0.9);

    switch (type) {
      case 'ufo': {
        const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.55, 0.35, 16), body);
        g.add(saucer);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.mat(0xdd55dd, 0xff66ff, 0.8));
        dome.position.y = 0.15; g.add(dome);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), this.glow(i % 2 ? 0xffff00 : 0x00ffff));
          l.position.set(Math.cos(a) * 1.05, -0.12, Math.sin(a) * 1.05); g.add(l);
        }
        break;
      }
      case 'tank': {
        const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 1.9), body);
        g.add(hull);
        const turret = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 1.1), this.mat(0x4a3010, 0x6b4020, 0.3));
        turret.position.y = 0.75; g.add(turret);
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 1.5, 8), this.mat(0x666666));
        cannon.rotation.x = Math.PI / 2; cannon.position.set(0, 0.75, 1.0); g.add(cannon);
        [-1, 1].forEach(s => {
          const tr = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 2.1), this.mat(0x222222, 0x111111, 0.1));
          tr.position.set(s * 1.25, -0.3, 0); g.add(tr);
        });
        break;
      }
      case 'fast': {
        const dart = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.0, 4), body);
        dart.rotation.x = Math.PI / 2; g.add(dart);
        [-1, 1].forEach(s => {
          const w = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 0.5), body);
          w.position.set(s * 0.7, 0, -0.5); w.rotation.z = s * 0.3; g.add(w);
        });
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), glowM);
        eye.position.z = 0.45; g.add(eye);
        break;
      }
      case 'spinner': {
        const blades = new THREE.Group();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 1.7), body);
          b.position.set(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8);
          b.rotation.y = -a; blades.add(b);
        }
        g.add(blades); g.userData.spin = blades;
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), this.glow(0xcc00ff));
        g.add(c);
        const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), this.glow(0xffff00));
        g.add(c2);
        g.add(this.halo(cfg.glow, 4));
        break;
      }
      case 'diver': {
        const body2 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 3), body);
        body2.rotation.x = Math.PI / 2; g.add(body2);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), this.glow(0x88aaff));
        eye.position.z = 0.35; g.add(eye);
        g.add(this.halo(cfg.glow, 3.2));
        break;
      }
      case 'bomber': {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), body);
        g.add(b);
        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6), this.mat(0xffd700, 0xffaa00, 0.8));
        fuse.position.set(0.35, 0.85, 0); fuse.rotation.z = -0.4; g.add(fuse);
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), this.glow(0xffffff));
        spark.position.set(0.55, 1.2, 0); g.add(spark);
        g.userData.spark = spark;
        g.add(this.halo(0xff4400, 4.5));
        break;
      }
      case 'unique': {
        const star = new THREE.Group();
        for (let i = 0; i < 4; i++) {
          const spike = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), this.mat(0xffd700, 0xffcc00, 1.2));
          spike.scale.set(1, 1, 3.2);
          spike.rotation.y = (i / 4) * Math.PI * 2;
          star.add(spike);
        }
        g.add(star); g.userData.spin = star;
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), this.glow(0xff8c00));
        g.add(c);
        g.add(this.halo(0xffd700, 6));
        break;
      }
      default: { // basic
        const hull = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), body);
        hull.scale.set(1.15, 0.72, 1); g.add(hull);
        [-1, 1].forEach(s => {
          const w = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.9), body);
          w.position.set(s * 1.0, -0.1, 0.15); g.add(w);
        });
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), glowM);
        eye.position.z = 0.55; g.add(eye);
        break;
      }
    }
    return g;
  },

  /* ─── Bosses ─────────────────────────────────────────────────── */
  boss(kind, color, accent, size) {
    const g = new THREE.Group();
    const body = this.mat(color, color, 0.35);
    const acc = this.mat(accent, accent, 1.1);
    const glowA = this.glow(accent, 0.85);
    const s = size;

    switch (kind) {
      case 'guardian': {
        const core = new THREE.Mesh(new THREE.BoxGeometry(s * 1.6, s * 1.1, s * 0.9), body);
        g.add(core);
        [-1, 1].forEach(d => {
          const pod = new THREE.Mesh(new THREE.SphereGeometry(s * 0.42, 14, 12), acc);
          pod.position.set(d * s * 1.05, 0, s * 0.2); g.add(pod);
        });
        const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.3, 16, 12), glowA);
        eye.position.z = s * 0.55; g.add(eye);
        break;
      }
      case 'cannon': {
        const core = new THREE.Mesh(new THREE.SphereGeometry(s * 0.9, 18, 14), body);
        g.add(core);
        [-1, 1].forEach(d => {
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.22, s * 0.3, s * 1.7, 12), acc);
          barrel.rotation.x = Math.PI / 2;
          barrel.position.set(d * s * 0.55, -s * 0.1, s * 0.9); g.add(barrel);
        });
        break;
      }
      case 'vortex': {
        const core = new THREE.Mesh(new THREE.BoxGeometry(s * 1.5, s * 1.5, s * 0.7), body);
        g.add(core);
        const spin = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const r = new THREE.Mesh(new THREE.TorusGeometry(s * (0.72 + i * 0.2), s * 0.06, 8, 32), acc);
          r.rotation.x = i * 0.5; spin.add(r);
        }
        g.add(spin); g.userData.spin = spin;
        break;
      }
      case 'tank': {
        const hull = new THREE.Mesh(new THREE.BoxGeometry(s * 2.0, s * 0.9, s * 1.4), body);
        g.add(hull);
        const turret = new THREE.Mesh(new THREE.BoxGeometry(s * 1.1, s * 0.65, s * 1.0), acc);
        turret.position.y = s * 0.7; g.add(turret);
        [-1, 0, 1].forEach(d => {
          const c = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.12, s * 0.15, s * 1.5, 8), this.mat(0x666666));
          c.rotation.x = Math.PI / 2; c.position.set(d * s * 0.35, s * 0.7, s * 0.9); g.add(c);
        });
        break;
      }
      case 'world': {
        const planet = new THREE.Mesh(new THREE.SphereGeometry(s, 24, 18), body);
        g.add(planet); g.userData.spin = planet;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(s * 1.22, s * 0.08, 8, 40), acc);
        ring.rotation.x = Math.PI / 2.3; g.add(ring);
        const maw = new THREE.Mesh(new THREE.SphereGeometry(s * 0.4, 14, 12), glowA);
        maw.position.z = s * 0.85; g.add(maw);
        break;
      }
      case 'inferno': {
        const core = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), body);
        g.add(core);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const flame = new THREE.Mesh(new THREE.ConeGeometry(s * 0.28, s * 1.1, 8), glowA);
          flame.position.set(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95, s * 0.3);
          flame.rotation.x = Math.PI / 2; g.add(flame);
        }
        g.add(this.halo(accent, s * 6));
        break;
      }
      case 'glacier': {
        const main = new THREE.Mesh(new THREE.ConeGeometry(s * 1.2, s * 2.0, 6), body);
        g.add(main);
        for (let i = 0; i < 5; i++) {
          const shard = new THREE.Mesh(new THREE.ConeGeometry(s * 0.3, s * 1.1, 5), acc);
          shard.position.set(rand(-s, s), rand(-s * 0.6, s * 0.6), rand(0, s * 0.6));
          shard.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
          g.add(shard);
        }
        break;
      }
      case 'cyber': {
        const hull = new THREE.Mesh(new THREE.BoxGeometry(s * 1.9, s * 1.5, s * 0.9), body);
        g.add(hull);
        const grid = new THREE.Mesh(new THREE.BoxGeometry(s * 1.1, s * 0.85, s * 0.3), acc);
        grid.position.z = s * 0.5; g.add(grid);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.25, 14, 12), this.glow(0xff3333));
        eye.position.z = s * 0.75; g.add(eye);
        [-1, 1].forEach(d => {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(s * 0.35, s * 1.8, s * 0.35), acc);
          arm.position.set(d * s * 1.05, 0, 0); g.add(arm);
        });
        break;
      }
      case 'void': {
        const hole = new THREE.Mesh(new THREE.SphereGeometry(s * 0.95, 22, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        g.add(hole);
        const spin = new THREE.Group();
        for (let i = 0; i < 4; i++) {
          const r = new THREE.Mesh(new THREE.TorusGeometry(s * (0.95 + i * 0.13), s * 0.045, 8, 42), acc);
          r.rotation.set(rand(0, 3), rand(0, 3), 0); spin.add(r);
        }
        g.add(spin); g.userData.spin = spin;
        g.add(this.halo(accent, s * 7));
        break;
      }
      case 'rafa': {
        const head = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), this.mat(0xffd60a, 0xff9900, 0.7));
        g.add(head); g.userData.spin = head;
        const crown = new THREE.Mesh(new THREE.TorusGeometry(s * 1.05, s * 0.1, 10, 40), this.mat(0xff006e, 0xff006e, 1.4));
        crown.rotation.x = Math.PI / 2; crown.position.y = s * 0.55; g.add(crown);
        [-1, 1].forEach(d => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.18, 12, 10), this.glow(0xff006e));
          eye.position.set(d * s * 0.35, s * 0.15, s * 0.85); g.add(eye);
          const wing = new THREE.Mesh(new THREE.BoxGeometry(s * 1.5, s * 0.1, s * 0.9), this.mat(0xff006e, 0xff006e, 0.9));
          wing.position.set(d * s * 1.25, 0, -s * 0.3); wing.rotation.z = d * 0.4; g.add(wing);
        });
        g.add(this.halo(0xffd60a, s * 8));
        break;
      }
      case 'amalgam': {
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.9, 0), body);
        g.add(core);
        const chunks = new THREE.Group();
        const palette = [0x6600bb, 0x8b0000, 0x0066ff, 0x2d7a2d, 0xff6600, 0x4fc3f7, 0x39ff14];
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const c = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.5, s * 0.5), this.mat(palette[i % palette.length], palette[i % palette.length], 0.9));
          c.position.set(Math.cos(a) * s * 1.0, Math.sin(a) * s * 1.0, Math.sin(i) * s * 0.4);
          c.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
          chunks.add(c);
        }
        g.add(chunks); g.userData.spin = chunks;
        g.add(this.halo(accent, s * 7));
        break;
      }
      case 'genesis': {
        const core = new THREE.Mesh(new THREE.SphereGeometry(s * 0.75, 24, 18), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        g.add(core);
        const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 1.05, 1), new THREE.MeshStandardMaterial({
          color: 0x222222, emissive: 0xffffff, emissiveIntensity: 0.25,
          wireframe: true, transparent: true, opacity: 0.9,
        }));
        g.add(shell); g.userData.spin = shell;
        for (let i = 0; i < 3; i++) {
          const r = new THREE.Mesh(new THREE.TorusGeometry(s * (0.9 + i * 0.12), s * 0.045, 8, 48), this.mat(0xffffff, 0xffffff, 2));
          r.rotation.set(i * 1.1, i * 0.7, 0); g.add(r);
        }
        g.add(this.halo(0xffffff, s * 9));
        break;
      }
      default: {
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), body);
        g.add(core);
      }
    }
    return g;
  },

  /* ─── Projéteis / itens ──────────────────────────────────────── */
  playerBullet(color) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.7, 4, 8), this.glow(color, 1));
    b.rotation.x = Math.PI / 2; g.add(b);
    const h = this.halo(color, 1.5); g.add(h);
    return g;
  },
  enemyBullet(color) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), this.glow(color, 1));
    g.add(b);
    g.add(this.halo(color, 1.6));
    return g;
  },
  powerUp(type) {
    const cfg = POWERUP_CFG[type];
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), new THREE.MeshStandardMaterial({
      color: cfg.color, emissive: cfg.color, emissiveIntensity: 1.3,
      transparent: true, opacity: 0.75, metalness: 0.3, roughness: 0.2,
    }));
    g.add(shell);
    const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.92, 0), new THREE.MeshBasicMaterial({
      color: cfg.color, wireframe: true, transparent: true, opacity: 0.6,
    }));
    g.add(cage); g.userData.spin = cage;
    g.add(this.halo(cfg.color, 4));
    return g;
  },
  xpOrb() {
    const g = new THREE.Group();
    const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), this.glow(0x39ff14, 1));
    g.add(o);
    g.add(this.halo(0x39ff14, 1.8));
    return g;
  },
  laserBeam(color) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 200, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    g.rotation.x = Math.PI / 2;
    return g;
  },
  /** Mira: dois anéis alinhados à linha de tiro, dando profundidade à pontaria. */
  reticle(color) {
    const g = new THREE.Group();
    const circle = (r, z, op) => {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
      }
      const l = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: op }));
      g.add(l);
      return l;
    };
    circle(0.55, -14, 0.4);
    circle(1.1, -34, 0.28);
    return g;
  },

  shieldSphere(color) {
    return new THREE.Mesh(new THREE.SphereGeometry(1.9, 20, 14), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.22, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
  },
};

/* ═══════════════════════════════════════════════════════════════════
   FX — partículas, textos flutuantes, trilhas
   ═══════════════════════════════════════════════════════════════════ */
const FX = {
  MAX: 2400,
  points: null, pos: null, col: null, sz: null,
  parts: [], head: 0,
  texts: [], texCache: new Map(),
  _dotTex: null, _glowTex: null,

  dotTexture() {
    if (this._dotTex) return this._dotTex;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    this._dotTex = new THREE.CanvasTexture(c);
    return this._dotTex;
  },
  glowTexture() {
    if (this._glowTex) return this._glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    this._glowTex = new THREE.CanvasTexture(c);
    return this._glowTex;
  },

  init() {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.MAX * 3);
    this.col = new Float32Array(this.MAX * 3);
    this.sz = new Float32Array(this.MAX);
    for (let i = 0; i < this.MAX; i++) {
      this.pos[i * 3 + 1] = 9999;
      this.parts.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, drag: 0.94 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sz, 1));
    const mat = new THREE.PointsMaterial({
      size: 1, vertexColors: true, map: this.dotTexture(),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    Render.world.add(this.points);
  },

  spawn(x, y, z, color, count = 22, spread = 8, life = 0.85, size = 0.55) {
    if (Settings.quality === 'low') count = Math.max(4, Math.floor(count * 0.4));
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const idx = this.head; this.head = (this.head + 1) % this.MAX;
      const p = this.parts[idx];
      p.x = x; p.y = y; p.z = z;
      const a = Math.random() * Math.PI * 2, b = Math.acos(rand(-1, 1)), s = rand(0.2, 1) * spread;
      p.vx = Math.sin(b) * Math.cos(a) * s;
      p.vy = Math.sin(b) * Math.sin(a) * s;
      p.vz = Math.cos(b) * s;
      p.life = p.max = life * rand(0.7, 1.25);
      p.size = size * rand(0.6, 1.5);
      p.drag = 0.93;
      this.col[idx * 3] = c.r; this.col[idx * 3 + 1] = c.g; this.col[idx * 3 + 2] = c.b;
    }
  },

  trail(x, y, z, color, size = 0.35) {
    if (Settings.quality === 'low' && Math.random() < 0.6) return;
    const idx = this.head; this.head = (this.head + 1) % this.MAX;
    const p = this.parts[idx];
    const c = new THREE.Color(color);
    p.x = x + rand(-0.15, 0.15); p.y = y + rand(-0.15, 0.15); p.z = z;
    p.vx = rand(-0.4, 0.4); p.vy = rand(-0.4, 0.4); p.vz = rand(6, 12);
    p.life = p.max = 0.42; p.size = size; p.drag = 0.9;
    this.col[idx * 3] = c.r; this.col[idx * 3 + 1] = c.g; this.col[idx * 3 + 2] = c.b;
  },

  update(dt) {
    for (let i = 0; i < this.MAX; i++) {
      const p = this.parts[i];
      if (p.life <= 0) { this.pos[i * 3 + 1] = 9999; this.sz[i] = 0; continue; }
      p.life -= dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const k = Math.max(0, p.life / p.max);
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.sz[i] = p.size * k;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.updateTexts(dt);
  },

  /* ─── Texto flutuante 3D ───────────────────────────────────────── */
  textTexture(text, color) {
    const key = text + '|' + color;
    if (this.texCache.has(key)) return this.texCache.get(key);
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    x.font = 'bold 40px Orbitron, monospace';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = color; x.shadowBlur = 16;
    x.fillStyle = color;
    x.fillText(text, 128, 34);
    x.fillStyle = '#ffffff'; x.shadowBlur = 4; x.globalAlpha = 0.35;
    x.fillText(text, 128, 34);
    const tex = new THREE.CanvasTexture(c);
    if (this.texCache.size > 120) {
      const first = this.texCache.keys().next().value;
      this.texCache.get(first)?.dispose?.();
      this.texCache.delete(first);
    }
    this.texCache.set(key, tex);
    return tex;
  },

  floatText(x, y, z, text, color = '#ffd60a', scale = 1) {
    if (this.texts.length > 40) return;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.textTexture(text, color), transparent: true, depthWrite: false, depthTest: false,
    }));
    spr.position.set(x, y, z);
    spr.scale.set(4.2 * scale, 1.05 * scale, 1);
    Render.world.add(spr);
    this.texts.push({ spr, life: 1.1, max: 1.1, vy: 4.5 });
  },

  updateTexts(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.spr.position.y += t.vy * dt;
      t.spr.position.z += 14 * dt;
      t.spr.material.opacity = clamp(t.life / t.max, 0, 1);
      if (t.life <= 0) {
        Render.world.remove(t.spr);
        t.spr.material.dispose();
        this.texts.splice(i, 1);
      }
    }
  },

  clearTexts() {
    this.texts.forEach(t => { Render.world.remove(t.spr); t.spr.material.dispose(); });
    this.texts.length = 0;
  },

  explosion(x, y, z, color = 0xff6600, count = 26, big = false) {
    this.spawn(x, y, z, color, count, big ? 16 : 9, big ? 1.3 : 0.85, big ? 0.9 : 0.55);
    playSound('explosion');
    Render.addShake(big ? 0.55 : 0.22);
  },
};
