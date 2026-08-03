// ═══════════════════════════════════════════════════════════════════
// WORLD — cena, câmera, pós-processamento, estrelas, grid e nebulosas
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { THEMES, FIELD } from './config.js';

function gridTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.globalAlpha = 0.9;
  g.beginPath();
  g.moveTo(0, 1); g.lineTo(256, 1);
  g.moveTo(1, 0); g.lineTo(1, 256);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function nebulaTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020817, 0.0042);

    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 900);
    this.camera.position.set(0, 5.6, 22);
    this.camera.lookAt(0, 0.8, -16);
    this.camBase = new THREE.Vector3(0, 5.6, 22);
    this.camTarget = new THREE.Vector3(0, 0.8, -16);

    // ─ luzes ─
    this.scene.add(new THREE.AmbientLight(0x334455, 1.2));
    this.keyLight = new THREE.DirectionalLight(0x88bbff, 1.9);
    this.keyLight.position.set(6, 14, 12);
    this.scene.add(this.keyLight);
    this.rimLight = new THREE.DirectionalLight(0xff3399, 1.0);
    this.rimLight.position.set(-10, -6, -14);
    this.scene.add(this.rimLight);
    this.playerLight = new THREE.PointLight(0x00f5ff, 9, 26, 2);
    this.playerLight.position.set(0, 0, 2);
    this.scene.add(this.playerLight);

    // ─ estrelas ─
    this.starCount = 2000;
    const sg = new THREE.BufferGeometry();
    this.starPos = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);
    for (let i = 0; i < this.starCount; i++) {
      this.starPos[i * 3] = (Math.random() - 0.5) * 320;
      this.starPos[i * 3 + 1] = (Math.random() - 0.5) * 200;
      this.starPos[i * 3 + 2] = -Math.random() * 620 + 40;
      sizes[i] = Math.random() * 1.6 + 0.4;
    }
    sg.setAttribute('position', new THREE.BufferAttribute(this.starPos, 3));
    sg.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.starMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xffffff) } },
      vertexShader: `
        attribute float size;
        varying float vFade;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFade = clamp(1.0 - (-mv.z) / 700.0, 0.05, 1.0);
          gl_PointSize = size * (260.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vFade;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          float a = smoothstep(0.5, 0.1, length(d)) * vFade;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // ─ grid chão/teto ─
    this.gridTex = gridTexture('#ffffff');
    this.gridTex.repeat.set(28, 90);
    this.gridMat = new THREE.MeshBasicMaterial({
      map: this.gridTex, transparent: true, opacity: 0.30,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const planeGeo = new THREE.PlaneGeometry(340, 900);
    this.floor = new THREE.Mesh(planeGeo, this.gridMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, -24, -380);
    this.scene.add(this.floor);
    this.ceil = new THREE.Mesh(planeGeo, this.gridMat);
    this.ceil.rotation.x = Math.PI / 2;
    this.ceil.position.set(0, 28, -380);
    this.scene.add(this.ceil);

    // ─ nebulosas distantes ─
    const nebTex = nebulaTexture();
    this.nebulas = [];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: nebTex, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      m.position.set((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 160, -120 - Math.random() * 520);
      const s = 90 + Math.random() * 190;
      m.scale.set(s, s, 1);
      this.scene.add(m);
      this.nebulas.push(m);
    }

    // ─ limites do campo (moldura sutil) ─
    const frameGeo = new THREE.BoxGeometry(FIELD.x * 2 + 4, FIELD.y * 2 + 4, 1);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(frameGeo),
      new THREE.LineBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.05 })
    );
    edges.position.z = -2;
    this.frame = edges;
    this.scene.add(edges);

    // ─ pós-processamento (bloom) ─
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.34, 0.62);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.bloomEnabled = true;

    this.scrollSpeed = 1;
    this.time = 0;
    this.setTheme(0);

    addEventListener('resize', () => this.resize());
  }

  setTheme(i) {
    const t = THEMES[i % THEMES.length];
    this.theme = t;
    this.scene.fog.color.set(t.fog);
    this.renderer.setClearColor(t.fog, 1);
    this.starMat.uniforms.uColor.value.set(t.star);
    this.gridMat.color.set(t.grid);
    this.keyLight.color.set(t.light);
    this.frame.material.color.set(t.grid);
    for (const n of this.nebulas) n.material.color.set(t.nebula);
    return t;
  }

  setQuality(q) {
    if (q === 'low') {
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
      this.setBloom(false);
    } else if (q === 'medium') {
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
      this.setBloom(true);
      this.bloom.strength = 0.38;
    } else {
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.setBloom(true);
      this.bloom.strength = 0.5;
    }
    this.resize();
  }

  setBloom(on) {
    this.bloomEnabled = on;
    this.bloom.enabled = on;
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  update(dt, focus, shake) {
    this.time += dt;
    const scroll = this.scrollSpeed;

    // estrelas correndo em direção à câmera
    const sp = this.starPos;
    const adv = 62 * scroll * dt;
    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3 + 2;
      sp[i3] += adv;
      if (sp[i3] > 45) {
        sp[i3] = -620 + Math.random() * 40;
        sp[i3 - 2] = (Math.random() - 0.5) * 320;
        sp[i3 - 1] = (Math.random() - 0.5) * 200;
      }
    }
    this.stars.geometry.attributes.position.needsUpdate = true;

    // grid rolando
    this.gridTex.offset.y -= dt * 0.42 * scroll;

    // nebulosas
    for (const n of this.nebulas) {
      n.position.z += 9 * scroll * dt;
      if (n.position.z > 60) {
        n.position.z = -640;
        n.position.x = (Math.random() - 0.5) * 300;
        n.position.y = (Math.random() - 0.5) * 160;
      }
      n.lookAt(this.camera.position);
    }

    // câmera segue de leve o jogador + trepidação
    if (focus) {
      this.camBase.x += (focus.x * 0.28 - this.camBase.x) * Math.min(1, dt * 4);
      this.camBase.y += (5.6 + focus.y * 0.22 - this.camBase.y) * Math.min(1, dt * 4);
      this.camTarget.x += (focus.x * 0.55 - this.camTarget.x) * Math.min(1, dt * 4);
      this.camTarget.y += (focus.y * 0.4 - this.camTarget.y) * Math.min(1, dt * 4);
      this.playerLight.position.set(focus.x, focus.y, 3);
    }
    const sx = shake ? (Math.random() - 0.5) * shake * 2.4 : 0;
    const sy = shake ? (Math.random() - 0.5) * shake * 2.4 : 0;
    this.camera.position.set(this.camBase.x + sx, this.camBase.y + sy, this.camBase.z);
    this.camera.lookAt(this.camTarget.x + sx * 0.4, this.camTarget.y + sy * 0.4, this.camTarget.z);
  }

  /** Empurra a câmera para trás durante lutas de chefe. */
  setCamPullback(k) {
    this.camBase.z = 22 + k;
  }

  render() {
    if (this.bloomEnabled) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
