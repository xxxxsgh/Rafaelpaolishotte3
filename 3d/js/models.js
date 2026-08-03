// ═══════════════════════════════════════════════════════════════════
// MODELS — todas as malhas 3D são geradas por código (zero assets)
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';

// Cache de geometrias para não recriar a cada spawn
const geoCache = new Map();
function geo(key, factory) {
  if (!geoCache.has(key)) geoCache.set(key, factory());
  return geoCache.get(key);
}

/** Material "neon": base escura + emissivo forte (pega bem no bloom). */
export function neonMat(color, emissive = 0.9, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: emissive,
    metalness: opts.metalness ?? 0.65,
    roughness: opts.roughness ?? 0.28,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    flatShading: opts.flat ?? true,
  });
}

/** Wireframe brilhante usado como "linha de contorno" tecnológica. */
export function wireMat(color, opacity = 0.55) {
  return new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
}

/** Esfera aditiva usada como halo/brilho. */
export function glowMat(color, opacity = 0.18) {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
  });
}

function addGlow(parent, color, radius, opacity = 0.16) {
  const g = new THREE.Mesh(geo('glowSphere', () => new THREE.SphereGeometry(1, 16, 12)), glowMat(color, opacity));
  g.scale.setScalar(radius);
  parent.add(g);
  return g;
}

// ═══════════════════════════════════════════════════════════════════
// NAVES DO JOGADOR — 8 estilos, todas apontando para -Z
// ═══════════════════════════════════════════════════════════════════
export function buildShip(style, hullColor, accentColor) {
  const g = new THREE.Group();
  const hull = neonMat(hullColor, 0.22, { metalness: 0.8, roughness: 0.25 });
  const acc = neonMat(accentColor, 0.75);
  const dark = new THREE.MeshStandardMaterial({ color: 0x101820, metalness: 0.9, roughness: 0.4, flatShading: true });

  const cone = (r, h, seg = 4) => new THREE.ConeGeometry(r, h, seg);
  const nose = (r, h, seg = 4) => {
    const m = new THREE.Mesh(cone(r, h, seg), hull);
    m.rotation.x = -Math.PI / 2;
    return m;
  };

  switch (style) {
    case 'delta': {
      const body = nose(0.9, 3.2, 4); body.position.z = -0.6; g.add(body);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.18, 1.3), hull);
      wing.position.z = 0.5; g.add(wing);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 1.1), acc);
      fin.position.set(0, 0.5, 0.9); g.add(fin);
      for (const s of [-1, 1]) {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 1.5, 8), acc);
        pod.rotation.x = Math.PI / 2; pod.position.set(s * 1.7, 0, 0.9); g.add(pod);
      }
      break;
    }
    case 'wide': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 3.0), hull); g.add(body);
      const tip = nose(0.55, 1.4, 4); tip.position.z = -2.0; g.add(tip);
      for (const s of [-1, 1]) {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 2.4), hull);
        pod.position.set(s * 1.6, 0, 0.2); g.add(pod);
        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 6), acc);
        gun.rotation.x = Math.PI / 2; gun.position.set(s * 1.6, 0, -1.4); g.add(gun);
      }
      break;
    }
    case 'dart': {
      const body = nose(0.55, 4.4, 6); body.position.z = -0.7; g.add(body);
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.9), acc);
        wing.position.set(s * 1.1, 0, 0.9); wing.rotation.z = s * 0.25; g.add(wing);
      }
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.0, 8), dark);
      eng.rotation.x = Math.PI / 2; eng.position.z = 1.6; g.add(eng);
      break;
    }
    case 'shuriken': {
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), hull); g.add(core);
      const blades = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.55), acc);
        b.rotation.y = (i * Math.PI) / 4;
        blades.add(b);
      }
      blades.rotation.x = 0.1;
      g.add(blades);
      g.userData.spin = blades;
      break;
    }
    case 'prism': {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), hull); g.add(core);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.12, 8, 24), acc);
      ring.rotation.x = Math.PI / 2; g.add(ring);
      g.userData.spin = ring;
      const emit = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 1.8, 8), acc);
      emit.rotation.x = -Math.PI / 2; emit.position.z = -1.7; g.add(emit);
      addGlow(g, accentColor, 2.4, 0.18);
      break;
    }
    case 'gunship': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 3.4), hull); g.add(body);
      const cab = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), acc);
      cab.position.set(0, 0.45, -0.9); g.add(cab);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.2, 6), i % 2 ? acc : dark);
          bar.rotation.x = Math.PI / 2;
          bar.position.set(s * (1.1 + i * 0.28), -0.15, -1.3); g.add(bar);
        }
      }
      break;
    }
    case 'stealth': {
      const body = new THREE.Mesh(new THREE.TetrahedronGeometry(1.7, 0), hull);
      body.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      body.scale.set(1, 1.5, 0.55); g.add(body);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.1, 1.0), hull);
      wing.position.z = 0.7; wing.rotation.x = 0.15; g.add(wing);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), acc);
      core.position.z = -0.6; g.add(core);
      addGlow(g, accentColor, 2.0, 0.14);
      break;
    }
    case 'bulk':
    default: {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 3.6), hull); g.add(body);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.2), acc);
      tip.position.z = -2.1; g.add(tip);
      for (const s of [-1, 1]) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.9, 2.6), hull);
        plate.position.set(s * 1.5, 0, 0.2); g.add(plate);
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.1, 8), dark);
        eng.rotation.x = Math.PI / 2; eng.position.set(s * 0.8, 0, 2.0); g.add(eng);
      }
      break;
    }
  }

  g.userData.hullMat = hull;
  g.userData.accMat = acc;
  return g;
}

/** Drone aliado que orbita o jogador. */
export function buildDrone(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo('droneBody', () => new THREE.OctahedronGeometry(0.45, 0)), neonMat(color, 1.0));
  g.add(body);
  const ring = new THREE.Mesh(geo('droneRing', () => new THREE.TorusGeometry(0.7, 0.06, 6, 16)), neonMat(color, 1.6));
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  g.userData.spin = ring;
  addGlow(g, color, 1.1, 0.22);
  return g;
}

// ═══════════════════════════════════════════════════════════════════
// INIMIGOS
// ═══════════════════════════════════════════════════════════════════
export function buildEnemy(type, color) {
  const g = new THREE.Group();
  const mat = neonMat(color, 0.8);
  const glowC = color;

  switch (type) {
    case 'basic': {
      const m = new THREE.Mesh(geo('e_basic', () => new THREE.TetrahedronGeometry(1, 0)), mat);
      m.rotation.x = Math.PI / 2; g.add(m);
      break;
    }
    case 'ufo': {
      const body = new THREE.Mesh(geo('e_ufo', () => new THREE.SphereGeometry(0.9, 12, 8)), mat);
      body.scale.set(1, 0.45, 1); g.add(body);
      const dome = new THREE.Mesh(geo('e_ufodome', () => new THREE.SphereGeometry(0.45, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2)), neonMat(0xffffff, 1.2));
      dome.position.y = 0.25; g.add(dome);
      const ring = new THREE.Mesh(geo('e_ufoRing', () => new THREE.TorusGeometry(1.15, 0.14, 8, 20)), mat);
      ring.rotation.x = Math.PI / 2; g.add(ring);
      g.userData.spin = ring;
      break;
    }
    case 'tank': {
      const body = new THREE.Mesh(geo('e_tank', () => new THREE.BoxGeometry(1.8, 1.4, 2.0)), mat);
      g.add(body);
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(geo('e_tankArm', () => new THREE.BoxGeometry(0.5, 0.5, 2.4)), neonMat(0x555555, 0.2));
        arm.position.set(s * 1.2, 0, 0); g.add(arm);
        const gun = new THREE.Mesh(geo('e_tankGun', () => new THREE.CylinderGeometry(0.2, 0.2, 1.2, 6)), neonMat(color, 1.4));
        gun.rotation.x = Math.PI / 2; gun.position.set(s * 1.2, 0, 1.3); g.add(gun);
      }
      break;
    }
    case 'fast': {
      const m = new THREE.Mesh(geo('e_fast', () => new THREE.ConeGeometry(0.5, 2.2, 5)), mat);
      m.rotation.x = Math.PI / 2; g.add(m);
      for (const s of [-1, 1]) {
        const fin = new THREE.Mesh(geo('e_fastFin', () => new THREE.BoxGeometry(1.1, 0.09, 0.7)), neonMat(color, 1.6));
        fin.position.set(s * 0.6, 0, 0.7); fin.rotation.z = s * 0.35; g.add(fin);
      }
      addGlow(g, glowC, 1.3, 0.18);
      break;
    }
    case 'unique': {
      const m = new THREE.Mesh(geo('e_unique', () => new THREE.OctahedronGeometry(1.1, 0)), mat);
      g.add(m);
      const spikes = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Mesh(geo('e_spike', () => new THREE.ConeGeometry(0.16, 1.0, 4)), neonMat(0xffffff, 1.4));
        const a = (i / 6) * Math.PI * 2;
        s.position.set(Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0);
        s.rotation.z = -a + Math.PI / 2;
        spikes.add(s);
      }
      g.add(spikes);
      g.userData.spin = spikes;
      addGlow(g, glowC, 1.8, 0.2);
      break;
    }
    case 'spinner': {
      const core = new THREE.Mesh(geo('e_spinCore', () => new THREE.IcosahedronGeometry(0.7, 0)), mat);
      g.add(core);
      const r1 = new THREE.Mesh(geo('e_spinRing', () => new THREE.TorusGeometry(1.3, 0.1, 6, 20)), neonMat(color, 1.6));
      const r2 = r1.clone(); r2.rotation.y = Math.PI / 2;
      const holder = new THREE.Group(); holder.add(r1); holder.add(r2);
      g.add(holder);
      g.userData.spin = holder;
      break;
    }
    case 'diver': {
      const m = new THREE.Mesh(geo('e_diver', () => new THREE.DodecahedronGeometry(0.9, 0)), mat);
      g.add(m);
      const fin = new THREE.Mesh(geo('e_diverFin', () => new THREE.BoxGeometry(2.2, 0.08, 0.7)), neonMat(color, 1.5));
      g.add(fin);
      break;
    }
    case 'bomber':
    default: {
      const body = new THREE.Mesh(geo('e_bomber', () => new THREE.SphereGeometry(1.1, 12, 10)), mat);
      body.scale.set(1, 0.85, 1.2); g.add(body);
      for (const s of [-1, 1]) {
        const fin = new THREE.Mesh(geo('e_bomberFin', () => new THREE.BoxGeometry(0.12, 1.2, 1.0)), neonMat(color, 1.4));
        fin.position.set(s * 1.0, 0, 0.5); g.add(fin);
      }
      const bay = new THREE.Mesh(geo('e_bomberBay', () => new THREE.SphereGeometry(0.4, 8, 6)), neonMat(0xff3300, 1.8));
      bay.position.y = -0.8; g.add(bay);
      addGlow(g, 0xff3300, 1.8, 0.16);
      break;
    }
  }
  return g;
}

// ═══════════════════════════════════════════════════════════════════
// CHEFES — 12 silhuetas distintas
// ═══════════════════════════════════════════════════════════════════
export function buildBoss(style, color, accent) {
  const g = new THREE.Group();
  const body = neonMat(color, 0.55, { metalness: 0.8, roughness: 0.3 });
  const acc = neonMat(accent, 1.5);
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0f18, metalness: 0.95, roughness: 0.35, flatShading: true });
  const parts = { spin: [], pulse: [] };

  const ring = (r, t, seg, mat, rotX = Math.PI / 2) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, seg), mat);
    m.rotation.x = rotX;
    return m;
  };

  switch (style) {
    case 'guardian': {
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(3.4, 0), body); g.add(core);
      const r = ring(6, 0.4, 32, acc); g.add(r); parts.spin.push(r);
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.6, 2.6), body);
        wing.position.set(s * 5.5, 0, 0); g.add(wing);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), acc);
        eye.position.set(s * 5.5, 0, 1.4); g.add(eye); parts.pulse.push(eye);
      }
      break;
    }
    case 'cannon': {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 4.5), body); g.add(hull);
      for (const s of [-1, 1]) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 6, 10), dark);
        barrel.rotation.x = Math.PI / 2; barrel.position.set(s * 3.0, 0, 3.6); g.add(barrel);
        const muzzle = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 8, 18), acc);
        muzzle.position.set(s * 3.0, 0, 6.3); g.add(muzzle); parts.pulse.push(muzzle);
      }
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 2.0, 8), body);
      top.position.y = 2.4; g.add(top);
      break;
    }
    case 'vortex': {
      const core = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 14), acc); g.add(core); parts.pulse.push(core);
      for (let i = 0; i < 4; i++) {
        const r = ring(4.2 + i * 1.1, 0.28, 30, body, Math.PI / 2 + i * 0.4);
        r.rotation.z = i * 0.5;
        g.add(r); parts.spin.push(r);
      }
      addGlow(g, accent, 6.5, 0.22);
      break;
    }
    case 'tank': {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(10, 4.6, 6), body); g.add(hull);
      for (let i = 0; i < 3; i++) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.9, 1.2), dark);
        plate.position.set(0, 1.6 - i * 1.6, 3.1); g.add(plate);
      }
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.0, 2.4, 8), body);
      turret.position.y = 3.2; g.add(turret);
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 7, 8), acc);
      gun.rotation.x = Math.PI / 2; gun.position.set(0, 3.2, 4.2); g.add(gun); parts.pulse.push(gun);
      break;
    }
    case 'world': {
      const planet = new THREE.Mesh(new THREE.IcosahedronGeometry(5.2, 1), body); g.add(planet); parts.spin.push(planet);
      const r = ring(8.2, 0.5, 40, acc, Math.PI / 2.4); g.add(r); parts.spin.push(r);
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(2.0, 14, 12), neonMat(accent, 2.0));
      mouth.position.z = 4.2; g.add(mouth); parts.pulse.push(mouth);
      break;
    }
    case 'inferno': {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2, 0), neonMat(color, 1.6)); g.add(core); parts.pulse.push(core);
      for (let i = 0; i < 8; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.0, 5), acc);
        const a = (i / 8) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 4.6, Math.sin(a) * 4.6, 0);
        spike.rotation.z = -a + Math.PI / 2;
        g.add(spike); parts.spin.push(spike);
      }
      addGlow(g, color, 8, 0.25);
      break;
    }
    case 'glacier': {
      for (let i = 0; i < 9; i++) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(1.2 + Math.random(), 4 + Math.random() * 4, 5),
          neonMat(color, 0.9, { transparent: true, opacity: 0.85 }));
        shard.position.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4);
        shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        g.add(shard);
      }
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), acc); g.add(core); parts.pulse.push(core);
      break;
    }
    case 'cyber': {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 5), body); g.add(hull);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(8.6, 8.6, 5.4), wireMat(accent, 0.5)); g.add(frame);
      for (let i = 0; i < 4; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.5, 0.5), acc);
        bar.position.set(0, -3 + i * 2, 2.7); g.add(bar); parts.pulse.push(bar);
      }
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.6, 6), acc);
        turret.rotation.x = Math.PI / 2;
        turret.position.set(sx * 3.0, sy * 3.0, 3.0); g.add(turret); parts.pulse.push(turret);
      }
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 12), neonMat(accent, 2.2));
      eye.position.z = 2.6; g.add(eye); parts.pulse.push(eye);
      break;
    }
    case 'void': {
      const hole = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      g.add(hole);
      for (let i = 0; i < 3; i++) {
        const r = ring(5 + i * 1.6, 0.22, 40, neonMat(accent, 2.0), Math.PI / 2 + i * 0.7);
        g.add(r); parts.spin.push(r);
      }
      const halo = ring(4.2, 0.9, 44, neonMat(color, 2.2)); g.add(halo); parts.spin.push(halo);
      addGlow(g, color, 9, 0.2);
      break;
    }
    case 'rafa': {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 1), body); g.add(core);
      const crown = new THREE.Group();
      for (let i = 0; i < 10; i++) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 4), acc);
        const a = (i / 10) * Math.PI * 2;
        s.position.set(Math.cos(a) * 5.2, Math.sin(a) * 5.2, 0);
        s.rotation.z = -a + Math.PI / 2;
        crown.add(s);
      }
      g.add(crown); parts.spin.push(crown);
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 3.2), neonMat(accent, 1.0));
        wing.position.set(s * 7, 0, 1); wing.rotation.z = s * 0.2; g.add(wing);
      }
      const r = ring(9, 0.3, 44, neonMat(color, 1.8)); g.add(r); parts.spin.push(r);
      addGlow(g, color, 10, 0.18);
      break;
    }
    case 'amalgam': {
      for (let i = 0; i < 7; i++) {
        const blob = new THREE.Mesh(
          new THREE.DodecahedronGeometry(2.4 + Math.random() * 2.4, 0),
          neonMat(i % 2 ? color : accent, 0.9)
        );
        blob.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 11, (Math.random() - 0.5) * 6);
        g.add(blob); parts.spin.push(blob);
      }
      const core = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), neonMat(0xffffff, 2.0));
      g.add(core); parts.pulse.push(core);
      break;
    }
    case 'genesis':
    default: {
      const core = new THREE.Mesh(new THREE.SphereGeometry(3.0, 20, 16), neonMat(0xffe9a8, 1.1));
      g.add(core); parts.pulse.push(core);
      for (let i = 0; i < 5; i++) {
        const r = ring(4.5 + i * 1.5, 0.2, 48, neonMat(i % 2 ? accent : color, 1.8), Math.PI / 2 + i * 0.35);
        r.rotation.z = i * 0.4;
        g.add(r); parts.spin.push(r);
      }
      for (let i = 0; i < 6; i++) {
        const sat = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), neonMat(accent, 1.6));
        const a = (i / 6) * Math.PI * 2;
        sat.position.set(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 0);
        g.add(sat); parts.spin.push(sat);
      }
      addGlow(g, 0xffd60a, 11, 0.09);
      break;
    }
  }

  g.userData.parts = parts;
  return g;
}

// ═══════════════════════════════════════════════════════════════════
// PICKUPS
// ═══════════════════════════════════════════════════════════════════
export function buildPowerUp(color) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(geo('pu_core', () => new THREE.OctahedronGeometry(0.85, 0)), neonMat(color, 1.8));
  g.add(core);
  const cage = new THREE.Mesh(geo('pu_cage', () => new THREE.IcosahedronGeometry(1.35, 0)), wireMat(color, 0.7));
  g.add(cage);
  addGlow(g, color, 2.2, 0.30);
  g.userData.spin = cage;
  g.userData.core = core;
  return g;
}

export function buildOrb(color, size = 0.32) {
  const m = new THREE.Mesh(
    geo('orb', () => new THREE.IcosahedronGeometry(1, 0)),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
  );
  m.scale.setScalar(size);
  return m;
}

export function buildCoin() {
  const m = new THREE.Mesh(
    geo('coin', () => new THREE.CylinderGeometry(0.36, 0.36, 0.09, 12)),
    new THREE.MeshStandardMaterial({ color: 0xffd60a, emissive: 0xffd60a, emissiveIntensity: 1.1, metalness: 1, roughness: 0.2 })
  );
  m.rotation.x = Math.PI / 2;
  return m;
}

// ═══════════════════════════════════════════════════════════════════
// PROJÉTEIS
// ═══════════════════════════════════════════════════════════════════
export function buildBullet(color, big = false) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    geo(big ? 'blt_big' : 'blt', () => new THREE.CapsuleGeometry(big ? 0.32 : 0.16, big ? 1.2 : 0.7, 4, 8)),
    new THREE.MeshBasicMaterial({ color })
  );
  core.rotation.x = Math.PI / 2;
  g.add(core);
  const halo = new THREE.Mesh(
    geo('blt_halo', () => new THREE.SphereGeometry(1, 10, 8)),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  halo.scale.set(big ? 0.9 : 0.5, big ? 0.9 : 0.5, big ? 1.8 : 1.1);
  g.add(halo);
  return g;
}

export function buildEnemyBullet(color) {
  const m = new THREE.Mesh(
    geo('ebullet', () => new THREE.SphereGeometry(0.34, 10, 8)),
    new THREE.MeshBasicMaterial({ color })
  );
  const halo = new THREE.Mesh(
    geo('ebullet_halo', () => new THREE.SphereGeometry(0.7, 10, 8)),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  m.add(halo);
  return m;
}

export function buildLaser(color) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 1, 12, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  core.rotation.x = Math.PI / 2;
  outer.rotation.x = Math.PI / 2;
  g.add(core); g.add(outer);
  return g;
}

/** Bolha de escudo em volta do jogador. */
export function buildShield(color) {
  const g = new THREE.Group();
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 20, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(3.3, 1), wireMat(color, 0.35));
  g.add(inner); g.add(wire);
  g.userData.spin = wire;
  return g;
}
