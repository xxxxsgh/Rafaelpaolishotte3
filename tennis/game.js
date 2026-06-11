/* =========================================================
   TÊNIS STAR ⭐ — jogo de tênis arcade mobile
   Inspirado nos clássicos de tênis de fliperama: personagens
   com estilos diferentes, golpes especiais e partidas rápidas.
   Canvas puro, zero dependências.
   ========================================================= */
(() => {
'use strict';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ---------- utilidades ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];

// ---------- áudio (sintetizado, sem assets) ----------
let AC = null;
function audioOn() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
}
function tone(f, d, type = 'square', g = 0.1, slide = 0, delay = 0) {
  if (!AC) return;
  const t0 = AC.currentTime + delay;
  const o = AC.createOscillator(), v = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t0 + d);
  v.gain.setValueAtTime(g, t0);
  v.gain.exponentialRampToValueAtTime(0.001, t0 + d);
  o.connect(v).connect(AC.destination);
  o.start(t0); o.stop(t0 + d + 0.02);
}
function noiseBurst(d, g = 0.15, fq = 1400, delay = 0) {
  if (!AC) return;
  const t0 = AC.currentTime + delay;
  const n = Math.round(AC.sampleRate * d);
  const buf = AC.createBuffer(1, n, AC.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = AC.createBufferSource(); src.buffer = buf;
  const fl = AC.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = fq;
  const v = AC.createGain(); v.gain.value = g;
  src.connect(fl).connect(v).connect(AC.destination);
  src.start(t0);
}
const sfx = {
  ui()      { tone(700, 0.06, 'square', 0.07); tone(1050, 0.08, 'square', 0.06, 0, 0.05); },
  hit(pw)   { noiseBurst(0.05, 0.12, 2200); tone(pw ? 200 : 300, 0.09, 'triangle', 0.16, pw ? 500 : 220); if (navigator.vibrate) navigator.vibrate(pw ? 35 : 12); },
  bounce()  { tone(170, 0.07, 'sine', 0.12, -60); },
  net()     { noiseBurst(0.12, 0.18, 700); tone(120, 0.18, 'sawtooth', 0.08, -50); },
  point(win){ const base = win ? [523, 659, 784, 1047] : [392, 330, 262];
              base.forEach((f, i) => tone(f, 0.12, 'square', 0.09, 0, i * 0.09));
              if (win) noiseBurst(0.5, 0.07, 900, 0.1); },
  game()    { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.15, 'square', 0.1, 0, i * 0.1));
              noiseBurst(0.8, 0.1, 1000, 0.2); },
  power()   { tone(220, 0.3, 'sawtooth', 0.12, 660); noiseBurst(0.25, 0.15, 2600); if (navigator.vibrate) navigator.vibrate([20, 30, 40]); },
};

// ---------- quadra e projeção pseudo-3D ----------
// Unidades de quadra: x ∈ [-5.5, 5.5] (linhas laterais), y ∈ [-12, 12]
// (linhas de fundo), rede em y = 0. z = altura.
const CT = { hw: 5.5, hl: 12, net: 1.35, svc: 6.4 };
const GRAV = 21;
const CAMY = -34;

let PJ = {};
function calcProj() {
  const syN = 1 / (-CT.hl - 1 - CAMY), syF = 1 / (CT.hl + 1 - CAMY);
  const yBot = 0.90 * H, yTop = 0.32 * H;
  const C = (yBot - yTop) / (syN - syF);
  PJ = {
    C,
    hor: yBot - C * syN,
    xu: (0.46 * Math.min(W, H * 0.62) / CT.hw) / syN,
  };
}
function proj(x, y, z = 0) {
  const s = 1 / (y - CAMY);
  return { x: W / 2 + x * PJ.xu * s, y: PJ.hor + PJ.C * s - (z || 0) * PJ.xu * s * 0.9, s, u: PJ.xu * s };
}

// ---------- personagens ----------
const CHARS = [
  { name: 'RAFA',   tag: 'Equilibrado', body: '#e53935', cap: '#b71c1c', skin: '#ffcc80',
    speed: 9.0, power: 1.0, reach: 2.0, desc: 'Bom em tudo!' },
  { name: 'LUMA',   tag: 'Velocista',   body: '#43a047', cap: '#1b5e20', skin: '#ffe0b2',
    speed: 11.5, power: 0.88, reach: 1.9, desc: 'Corre como o vento!' },
  { name: 'BRUTUS', tag: 'Potência',    body: '#5c6bc0', cap: '#283593', skin: '#d7a37c',
    speed: 7.2, power: 1.22, reach: 2.2, desc: 'Bolada de trator!' },
  { name: 'ZIZI',   tag: 'Malandra',    body: '#ab47bc', cap: '#6a1b9a', skin: '#ffcc80',
    speed: 9.5, power: 0.95, reach: 2.1, desc: 'Rainha do efeito!' },
];
const DIFFS = [
  { name: 'FÁCIL',   sub: 'pra aquecer',       speed: 5.6, err: 1.9, iq: 0, powerCh: 0.00, react: 0.50 },
  { name: 'MÉDIO',   sub: 'rali de verdade',   speed: 7.8, err: 1.0, iq: 1, powerCh: 0.04, react: 0.32 },
  { name: 'DIFÍCIL', sub: 'modo campeão 🏆',   speed: 10.2, err: 0.45, iq: 2, powerCh: 0.10, react: 0.20 },
];
const GAMES_TO_WIN = 3;

// tipos de golpe: spd = velocidade da bola, ty = profundidade alvo [min,max]
const SHOTS = {
  flat:  { spd: 19, ty: [8.2, 11.2], clear: 0.45, col: '#fff'    },
  top:   { spd: 23, ty: [8.8, 11.4], clear: 0.32, col: '#ff7043' },
  lob:   { spd: 9.5, ty: [9.4, 11.6], clear: 3.0, col: '#ffd54f' },
  drop:  { spd: 12.5, ty: [2.0, 4.2], clear: 0.30, col: '#81c784' },
  power: { spd: 31, ty: [9.0, 11.0], clear: 0.25, col: '#ffeb3b' },
  serve: { spd: 21, ty: [2.6, 5.9], clear: 0.5,  col: '#fff'    },
};

// ---------- estado global ----------
let scene = 'title';      // title | select | diff | play | end
let selChar = 0;
let lastSetup = null;
let M = null;             // partida atual
let uiZones = [];
let titleT = 0;

function newMatch(charIdx, diffIdx) {
  lastSetup = { charIdx, diffIdx };
  const pC = CHARS[charIdx];
  let aIdx = (Math.random() * CHARS.length) | 0;
  if (aIdx === charIdx) aIdx = (aIdx + 1 + ((Math.random() * 3) | 0)) % CHARS.length;
  M = {
    pChar: pC, aChar: CHARS[aIdx], diff: DIFFS[diffIdx],
    player: { x: 0, y: -11, vx: 0, vy: 0, swing: 0, who: 'P' },
    ai:     { x: 0, y: 11,  vx: 0, vy: 0, swing: 0, who: 'A' },
    ball: { x: 0, y: -11, z: 1.2, vx: 0, vy: 0, vz: 0, live: false,
            lastHit: null, bounces: 0, spin: 'flat', trail: [],
            aiErr: 0, aiMoveErr: 0, aiPlan: null, flightT: 0 },
    rallyHits: 0,
    pts: { P: 0, A: 0 }, games: { P: 0, A: 0 },
    server: Math.random() < 0.5 ? 'P' : 'A',
    phase: 'serve', phaseT: 0,
    banner: null,                      // {text, sub, t}
    meter: 0, armed: null, armedT: 0,
    shake: 0, parts: [], paused: false,
    hint: 2,                           // dicas nos 2 primeiros saques
    winner: null, pointN: 0,
  };
  startPoint();
}

// ---------- fluxo de pontos ----------
function startPoint() {
  const side = M.pointN % 2 === 0 ? 1 : -1;
  const sv = M.server;
  const b = M.ball;
  if (sv === 'P') {
    M.player.x = 1.7 * side; M.player.y = -CT.hl - 0.8;
    M.ai.x = -1.3 * side;    M.ai.y = CT.hl - 1.2;
  } else {
    M.ai.x = -1.7 * side;    M.ai.y = CT.hl + 0.8;
    M.player.x = 1.3 * side; M.player.y = -CT.hl + 1.2;
  }
  M.player.vx = M.player.vy = M.ai.vx = M.ai.vy = 0;
  const srv = sv === 'P' ? M.player : M.ai;
  b.x = srv.x; b.y = srv.y; b.z = 1.2;
  b.vx = b.vy = b.vz = 0;
  b.live = false; b.bounces = 0; b.lastHit = null; b.trail.length = 0;
  M.rallyHits = 0;
  M.phase = 'serve'; M.phaseT = sv === 'A' ? 1.2 : 0;
  M.armed = null;
}

function doServe(who) {
  const b = M.ball;
  const me = who === 'P' ? M.player : M.ai;
  const ch = who === 'P' ? M.pChar : M.aChar;
  const opp = who === 'P' ? 1 : -1;          // sinal do lado do oponente
  b.x = me.x; b.y = me.y; b.z = 2.8;
  // alvo na caixa de saque diagonal do lado oposto
  const targetX = clamp(-Math.sign(me.x || 1) * rnd(1.0, 4.3), -4.6, 4.6);
  const targetY = opp * rnd(SHOTS.serve.ty[0], SHOTS.serve.ty[1]);
  launchBall(who, targetX, targetY, SHOTS.serve.spd * (0.92 + ch.power * 0.1), SHOTS.serve.clear);
  b.live = true;
  b.spin = 'flat';
  me.swing = 0.3;
  sfx.hit(false);
  M.phase = 'rally';
  if (M.hint > 0) M.hint--;
}

// calcula velocidades para a bola sair da posição atual e cair em (tx, ty),
// garantindo que passe sobre a rede
function launchBall(who, tx, ty, spd, minClear) {
  const b = M.ball;
  const dist = Math.hypot(tx - b.x, ty - b.y);
  let T = Math.max(0.42, dist / spd);
  for (let i = 0; i < 10; i++) {
    const vx = (tx - b.x) / T, vy = (ty - b.y) / T;
    const vz = (0.5 * GRAV * T * T - b.z) / T;
    // altura ao cruzar a rede (y = 0)
    let ok = true;
    if ((b.y < 0) !== (ty < 0)) {
      const tN = -b.y / vy;
      const zN = b.z + vz * tN - 0.5 * GRAV * tN * tN;
      ok = zN > CT.net + minClear;
    }
    if (ok) { b.vx = vx; b.vy = vy; b.vz = vz; break; }
    T *= 1.09;
    if (i === 9) { b.vx = vx; b.vy = vy; b.vz = vz; }
  }
  b.lastHit = who; b.bounces = 0; b.flightT = 0;
}

function doHit(who, type) {
  const me = who === 'P' ? M.player : M.ai;
  const ch = who === 'P' ? M.pChar : M.aChar;
  const b = M.ball;
  const opp = who === 'P' ? 1 : -1;
  const spec = SHOTS[type];
  let tx, ty;
  if (who === 'P') {
    // mira: direção do movimento do jogador no momento da batida
    const aim = clamp(me.vx / Math.max(1, ch.speed), -1, 1);
    tx = clamp(aim * 4.4 + rnd(-0.6, 0.6), -4.6, 4.6);
    // erro cresce se bater esticado (longe do corpo)
    const stretch = Math.hypot(b.x - me.x, b.y - me.y) / ch.reach;
    tx += rnd(-1, 1) * stretch * stretch * 1.6;
    ty = opp * rnd(spec.ty[0], spec.ty[1]);
  } else {
    const plan = b.aiPlan || { tx: rnd(-3.5, 3.5), type };
    tx = clamp(plan.tx + b.aiErr, -5.9, 5.9);
    ty = opp * clamp(rnd(spec.ty[0], spec.ty[1]) + b.aiErr * 0.6, 1.5, CT.hl + 1.6);
  }
  // fadiga de rali: depois de 8 batidas a mira dos dois degrada,
  // garantindo que todo ponto uma hora acaba (estilo arcade)
  M.rallyHits++;
  const fat = Math.max(0, M.rallyHits - 8) * 0.45;
  if (fat > 0) {
    tx += rnd(-fat, fat);
    ty += opp * rnd(-fat * 0.4, fat);
  }
  const pw = type === 'power';
  launchBall(who, tx, ty, spec.spd * (0.9 + ch.power * 0.14), spec.clear);
  b.spin = type;
  me.swing = 0.32;
  sfx.hit(pw);
  if (pw) {
    sfx.power(); M.shake = 0.5;
    burst(b.x, b.y, b.z, 26, ['#ffeb3b', '#ff7043', '#fff176', '#fff']);
  } else {
    burst(b.x, b.y, b.z, 6, ['#fff', '#cfd8dc']);
  }
  if (who === 'P') {
    M.meter = pw ? 0 : Math.min(100, M.meter + 13);
    M.armed = null;
  }
}

function canHit(who) {
  const b = M.ball;
  if (!b.live || b.lastHit === who) return false;
  const me = who === 'P' ? M.player : M.ai;
  const ch = who === 'P' ? M.pChar : M.aChar;
  const onSide = who === 'P' ? b.y < 1.4 : b.y > -1.4;
  if (!onSide || b.z > 3.6) return false;
  return Math.hypot(b.x - me.x, b.y - me.y) < ch.reach;
}

function endPoint(winner, reason) {
  if (M.phase !== 'rally') return;
  M.phase = 'point';
  M.phaseT = 1.7;
  M.ball.live = false;
  M.pointN++;
  M.pts[winner]++;
  const w = M.pts[winner], l = M.pts[winner === 'P' ? 'A' : 'P'];
  let txt = reason, sub = scoreLabel();
  let isGame = false;
  if (w >= 4 && w - l >= 2) {
    M.games[winner]++;
    M.pts.P = M.pts.A = 0;
    M.server = M.server === 'P' ? 'A' : 'P';
    isGame = true;
    if (M.games[winner] >= GAMES_TO_WIN) {
      M.winner = winner;
      txt = winner === 'P' ? '🏆 CAMPEÃO! 🏆' : 'FIM DE JOGO';
      sub = winner === 'P' ? `${M.pChar.name} venceu ${M.games.P} × ${M.games.A}!` : `${M.aChar.name} levou essa…`;
      M.phaseT = 2.6;
    } else {
      txt = 'GAME ' + (winner === 'P' ? M.pChar.name + '!' : M.aChar.name);
      sub = `games ${M.games.P} × ${M.games.A}`;
    }
    sfx.game();
  } else {
    sfx.point(winner === 'P');
  }
  M.banner = { text: txt, sub, t: 0, good: winner === 'P', big: isGame };
  if (winner === 'P') burst(0, -6, 2, 30, ['#ffd54f', '#4fc3f7', '#aed581', '#f06292']);
}

function scoreLabel() {
  const p = M.pts.P, a = M.pts.A;
  if (p >= 3 && a >= 3) {
    if (p === a) return '40 – 40';
    return p > a ? 'VANTAGEM ' + M.pChar.name : 'VANTAGEM ' + M.aChar.name;
  }
  const L = ['0', '15', '30', '40'];
  return L[Math.min(p, 3)] + ' – ' + L[Math.min(a, 3)];
}

// ---------- partículas ----------
function burst(x, y, z, n, cols) {
  for (let i = 0; i < n; i++) {
    M.parts.push({
      x, y, z: z + rnd(0, 0.5),
      vx: rnd(-6, 6), vy: rnd(-4, 4), vz: rnd(2, 9),
      t: rnd(0.4, 0.9), col: pick(cols), r: rnd(2, 5), star: Math.random() < 0.3,
    });
  }
}

// ---------- entrada ----------
const input = {
  stick: { id: null, ax: 0, ay: 0, dx: 0, dy: 0 },
  keys: {},
};
let playBtns = [];   // recalculado por frame: {x,y,r,key,label,col,on}

function btnAt(px, py) {
  for (const b of playBtns) {
    if (Math.hypot(px - b.x, py - b.y) < b.r + 12) return b;
  }
  return null;
}

cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  audioOn();
  const px = e.clientX, py = e.clientY;

  // zonas de UI (menus / botões de tela)
  for (const z of uiZones) {
    if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) {
      sfx.ui(); z.cb(); return;
    }
  }
  if (scene !== 'play' || !M || M.paused) return;

  const b = btnAt(px, py);
  if (b) {
    if (b.key === 'power') {
      if (M.meter >= 100) { M.armed = 'power'; M.armedT = 1.6; sfx.power(); }
    } else {
      M.armed = b.key; M.armedT = 1.0;
      tone(520, 0.05, 'square', 0.06);
    }
    if (M.phase === 'serve' && M.server === 'P' && M.phaseT <= 0) doServe('P');
    return;
  }
  // saque com toque (e já engata o analógico para correr em seguida)
  if (M.phase === 'serve' && M.server === 'P' && M.phaseT <= 0) doServe('P');
  // analógico virtual
  if (input.stick.id === null) {
    input.stick.id = e.pointerId;
    input.stick.ax = px; input.stick.ay = py;
    input.stick.dx = 0; input.stick.dy = 0;
  }
}, { passive: false });

cv.addEventListener('pointermove', e => {
  if (e.pointerId === input.stick.id) {
    const m = 46;
    input.stick.dx = clamp((e.clientX - input.stick.ax) / m, -1, 1);
    input.stick.dy = clamp((e.clientY - input.stick.ay) / m, -1, 1);
    // âncora acompanha o dedo (analógico flutuante)
    if (Math.hypot(e.clientX - input.stick.ax, e.clientY - input.stick.ay) > m) {
      input.stick.ax = e.clientX - input.stick.dx * m;
      input.stick.ay = e.clientY - input.stick.dy * m;
    }
  }
});
function stickEnd(e) {
  if (e.pointerId === input.stick.id) {
    input.stick.id = null; input.stick.dx = 0; input.stick.dy = 0;
  }
}
cv.addEventListener('pointerup', stickEnd);
cv.addEventListener('pointercancel', stickEnd);

window.addEventListener('keydown', e => {
  input.keys[e.key.toLowerCase()] = true;
  audioOn();
  if (scene === 'play' && M && !M.paused) {
    const k = e.key.toLowerCase();
    if (k === 'z') { M.armed = 'top'; M.armedT = 1; }
    if (k === 'x') { M.armed = 'lob'; M.armedT = 1; }
    if (k === 'c') { M.armed = 'drop'; M.armedT = 1; }
    if (k === 'v' && M.meter >= 100) { M.armed = 'power'; M.armedT = 1.6; }
    if (k === ' ' && M.phase === 'serve' && M.server === 'P' && M.phaseT <= 0) doServe('P');
  }
});
window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });

// ---------- atualização ----------
function update(dt) {
  titleT += dt;
  if (scene !== 'play' || !M || M.paused) return;

  M.shake = Math.max(0, M.shake - dt * 2);
  if (M.banner) { M.banner.t += dt; }
  if (M.armedT > 0) { M.armedT -= dt; if (M.armedT <= 0) M.armed = null; }

  // partículas
  for (let i = M.parts.length - 1; i >= 0; i--) {
    const p = M.parts[i];
    p.t -= dt;
    if (p.t <= 0) { M.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= GRAV * 0.7 * dt;
    if (p.z < 0) { p.z = 0; p.vz *= -0.4; }
  }

  if (M.phase === 'serve' && M.phaseT > 0) {
    M.phaseT -= dt;
    if (M.phaseT <= 0 && M.server === 'A') doServe('A');
  }
  if (M.phase === 'point') {
    M.phaseT -= dt;
    if (M.phaseT <= 0) {
      if (M.winner) { scene = 'end'; }
      else { M.banner = null; startPoint(); }
    }
  }

  updatePlayer(dt);
  updateAI(dt);
  if (M.ball.live) updateBall(dt);

  M.player.swing = Math.max(0, M.player.swing - dt);
  M.ai.swing = Math.max(0, M.ai.swing - dt);
}

function updatePlayer(dt) {
  const p = M.player, ch = M.pChar;
  let ix = input.stick.dx, iy = input.stick.dy;
  if (input.keys['arrowleft'] || input.keys['a']) ix = -1;
  if (input.keys['arrowright'] || input.keys['d']) ix = 1;
  if (input.keys['arrowup'] || input.keys['w']) iy = -1;
  if (input.keys['arrowdown'] || input.keys['s']) iy = 1;
  const mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; }
  const lock = M.phase === 'serve' && M.server === 'P';
  p.vx = lock ? 0 : ix * ch.speed;
  p.vy = lock ? 0 : -iy * ch.speed * 0.85;   // tela: cima = fundo da quadra → y diminui? não: cima = rede
  p.x = clamp(p.x + p.vx * dt, -CT.hw - 1.6, CT.hw + 1.6);
  p.y = clamp(p.y + p.vy * dt, -CT.hl - 2.2, -0.9);

  if (M.phase === 'rally' && canHit('P')) {
    let type = M.armed || 'flat';
    if (type === 'power' && M.meter < 100) type = 'flat';
    doHit('P', type);
  }
}

function updateAI(dt) {
  if (M.phase !== 'rally') return;   // posições do saque vêm de startPoint()
  const a = M.ai, b = M.ball, d = M.diff, ch = M.aChar;
  let tx = 0, ty = CT.hl - 1.5;
  // tempo de reação: a IA só "lê" a bola um instante após a batida
  if (b.live && b.lastHit !== 'A' && b.vy > 0.5 && b.flightT > d.react) {
    // intercepta: onde a bola estará ao chegar na profundidade da IA
    const t = (a.y - b.y) / b.vy;
    tx = b.x + b.vx * Math.max(0, t) + (b.aiMoveErr || 0);
    // golpe curto (drop/curta): avança
    const landY = b.y + b.vy * ((b.vz + Math.sqrt(b.vz * b.vz + 2 * GRAV * b.z)) / GRAV);
    ty = clamp(landY - 0.5, 1.2, CT.hl + 1.5);
    if (d.iq >= 1) ty = clamp(ty, 2, CT.hl + 1.5);
  }
  const dx = tx - a.x, dy = ty - a.y;
  const dist = Math.hypot(dx, dy);
  const sp = d.speed * (0.85 + ch.speed / 30);
  if (dist > 0.15) {
    a.vx = dx / dist * sp; a.vy = dy / dist * sp;
    a.x += a.vx * dt; a.y += a.vy * dt;
  } else { a.vx = a.vy = 0; }
  a.x = clamp(a.x, -CT.hw - 1.6, CT.hw + 1.6);
  a.y = clamp(a.y, 0.9, CT.hl + 2.2);

  if (M.phase === 'rally' && canHit('A')) {
    let type = 'flat';
    const plan = b.aiPlan || {};
    if (plan.type) type = plan.type;
    if (Math.random() < d.powerCh) type = 'power';
    doHit('A', type);
  }
}

function updateBall(dt) {
  const b = M.ball;
  const prevY = b.y;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  b.vz -= GRAV * dt;
  b.flightT += dt;

  b.trail.push({ x: b.x, y: b.y, z: b.z, pw: b.spin === 'power' });
  if (b.trail.length > 14) b.trail.shift();

  // quando o jogador rebate, a IA "decide" o plano dela para a próxima bola
  if (b.lastHit === 'P' && !b.aiPlan) {
    const d = M.diff;
    b.aiErr = rnd(-d.err, d.err) * 2.2;
    b.aiMoveErr = rnd(-d.err, d.err) * 1.6;   // erro de leitura: às vezes nem alcança
    let tx, type = Math.random() < 0.65 ? 'flat' : 'top';
    if (d.iq >= 1) {
      tx = M.player.x > 0 ? -rnd(1.2, 4.2) : rnd(1.2, 4.2);     // longe do jogador
      if (M.player.y > -5 && Math.random() < 0.55) type = 'lob'; // jogador na rede
      if (d.iq >= 2 && M.player.y < -10.5 && Math.random() < 0.4) type = 'drop';
    } else {
      tx = rnd(-3.8, 3.8);
    }
    b.aiPlan = { tx, type };
  }
  if (b.lastHit === 'A') b.aiPlan = null;

  // rede
  if ((prevY < 0) !== (b.y < 0)) {
    const t = -prevY / (b.y - prevY);
    const zN = b.z - b.vz * dt * (1 - t) + 0.5 * GRAV * (dt * (1 - t)) ** 2; // aprox
    if (zN < CT.net) {
      sfx.net();
      b.vx *= 0.1; b.vy = (prevY < 0 ? -1 : 1) * 1.2; b.vz = Math.min(b.vz, 1);
      endPoint(b.lastHit === 'P' ? 'A' : 'P', 'NA REDE!');
      return;
    }
  }

  // quique
  if (b.z <= 0 && b.vz < 0) {
    b.z = 0; b.vz = -b.vz * 0.6; b.vx *= 0.78; b.vy *= 0.78;
    b.bounces++;
    sfx.bounce();
    burst(b.x, b.y, 0.1, 3, ['#fff59d', '#fff']);
    if (b.bounces === 1) {
      const inX = Math.abs(b.x) <= CT.hw + 0.15;
      const inY = Math.abs(b.y) <= CT.hl + 0.15 && (b.lastHit === 'P' ? b.y > 0 : b.y < 0);
      if (!(inX && inY)) {
        endPoint(b.lastHit === 'P' ? 'A' : 'P', 'FORA!');
      }
    } else if (b.bounces >= 2) {
      endPoint(b.lastHit, 'PONTO!');
    }
  }
  // segurança: bola fugiu do mundo
  if (Math.abs(b.y) > CT.hl + 9 || Math.abs(b.x) > CT.hw + 9) {
    endPoint(b.lastHit === 'P' ? 'A' : 'P', 'FORA!');
  }
}

// ---------- desenho ----------
function draw() {
  ctx.clearRect(0, 0, W, H);
  calcProj();

  if (scene === 'title') { drawTitle(); return; }
  if (scene === 'select') { drawSelect(); return; }
  if (scene === 'diff') { drawDiff(); return; }

  // play / end
  ctx.save();
  if (M && M.shake > 0) {
    ctx.translate(rnd(-1, 1) * M.shake * 10, rnd(-1, 1) * M.shake * 10);
  }
  drawWorld();
  ctx.restore();
  drawHUD();
  if (scene === 'end') drawEnd();
  else if (M && M.paused) drawPause();
}

function drawBG() {
  // céu
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  g.addColorStop(0, '#42b9f5'); g.addColorStop(1, '#bfe9ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.45);
  // sol
  ctx.fillStyle = '#fff176';
  ctx.beginPath(); ctx.arc(W * 0.82, H * 0.09, 26, 0, TAU); ctx.fill();
  // colinas
  ctx.fillStyle = '#7ed07e';
  ctx.beginPath();
  ctx.ellipse(W * 0.2, H * 0.30, W * 0.45, H * 0.07, 0, 0, TAU);
  ctx.ellipse(W * 0.85, H * 0.31, W * 0.5, H * 0.08, 0, 0, TAU);
  ctx.fill();
  // arquibancada
  ctx.fillStyle = '#37474f';
  ctx.fillRect(0, H * 0.30, W, H * 0.06);
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 26; i++) {
      const cx = (i + 0.5 + r * 0.5) / 26 * W;
      const cy = H * (0.315 + r * 0.025) + Math.sin(titleT * 3 + i * 1.7 + r) * 1.5;
      ctx.fillStyle = ['#ef9a9a', '#90caf9', '#fff59d', '#a5d6a7', '#ce93d8'][(i + r * 3) % 5];
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fill();
    }
  }
  // bandeirinhas
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = ['#ff5252', '#ffd740', '#40c4ff', '#69f0ae'][i % 4];
    const bx = i / 12 * W + W / 24;
    ctx.beginPath();
    ctx.moveTo(bx - 8, H * 0.285); ctx.lineTo(bx + 8, H * 0.285); ctx.lineTo(bx, H * 0.305);
    ctx.fill();
  }
  // chão fora da quadra
  ctx.fillStyle = '#cf9051';
  ctx.fillRect(0, H * 0.36, W, H * 0.64);
}

function quad(x1, y1, x2, y2, x3, y3, x4, y4) {
  const a = proj(x1, y1), b = proj(x2, y2), c = proj(x3, y3), d = proj(x4, y4);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
  ctx.closePath();
}
function lineCt(x1, y1, x2, y2, w = 2.5) {
  const a = proj(x1, y1), b = proj(x2, y2);
  ctx.lineWidth = w; ctx.beginPath();
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function drawCourt() {
  // grama externa
  quad(-CT.hw - 3.2, -CT.hl - 4, CT.hw + 3.2, -CT.hl - 4, CT.hw + 3.2, CT.hl + 4, -CT.hw - 3.2, CT.hl + 4);
  ctx.fillStyle = '#3f9e46'; ctx.fill();
  // quadra com listras de grama
  const bands = 8;
  for (let i = 0; i < bands; i++) {
    const y1 = -CT.hl + (i / bands) * CT.hl * 2;
    const y2 = -CT.hl + ((i + 1) / bands) * CT.hl * 2;
    quad(-CT.hw, y1, CT.hw, y1, CT.hw, y2, -CT.hw, y2);
    ctx.fillStyle = i % 2 ? '#5cb85c' : '#54ad53';
    ctx.fill();
  }
  // linhas
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  lineCt(-CT.hw, -CT.hl, CT.hw, -CT.hl, 3);
  lineCt(-CT.hw, CT.hl, CT.hw, CT.hl, 3);
  lineCt(-CT.hw, -CT.hl, -CT.hw, CT.hl, 3);
  lineCt(CT.hw, -CT.hl, CT.hw, CT.hl, 3);
  lineCt(-CT.hw, -CT.svc, CT.hw, -CT.svc, 2);
  lineCt(-CT.hw, CT.svc, CT.hw, CT.svc, 2);
  lineCt(0, -CT.svc, 0, CT.svc, 2);
}

function drawNet() {
  const l = proj(-CT.hw - 0.6, 0, 0), r = proj(CT.hw + 0.6, 0, 0);
  const lt = proj(-CT.hw - 0.6, 0, CT.net), rt = proj(CT.hw + 0.6, 0, CT.net);
  // malha
  ctx.fillStyle = 'rgba(240,245,250,0.35)';
  ctx.beginPath();
  ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.lineTo(rt.x, rt.y); ctx.lineTo(lt.x, lt.y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 14; i++) {
    const x = lerp(-CT.hw - 0.6, CT.hw + 0.6, i / 14);
    const a = proj(x, 0, 0), b = proj(x, 0, CT.net);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // faixa superior
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(lt.x, lt.y); ctx.lineTo(rt.x, rt.y); ctx.stroke();
  // postes
  for (const px of [-CT.hw - 0.6, CT.hw + 0.6]) {
    const a = proj(px, 0, 0), b = proj(px, 0, CT.net + 0.15);
    ctx.strokeStyle = '#455a64'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
}

function drawChar(me, ch, facing) {
  const p = proj(me.x, me.y, 0);
  const u = p.u;                      // pixels por unidade nessa profundidade
  const hgt = 2.5 * u;
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, u * 0.9, u * 0.3, 0, 0, TAU); ctx.fill();
  const bob = Math.abs(Math.sin((me.x + me.y) * 2)) * (Math.hypot(me.vx, me.vy) > 0.5 ? u * 0.07 : 0);
  const by = p.y - bob;
  // corpo
  ctx.fillStyle = ch.body;
  ctx.beginPath();
  ctx.ellipse(p.x, by - hgt * 0.38, u * 0.62, hgt * 0.34, 0, 0, TAU);
  ctx.fill();
  // pés
  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.ellipse(p.x - u * 0.3, by - u * 0.06, u * 0.26, u * 0.14, 0, 0, TAU);
  ctx.ellipse(p.x + u * 0.3, by - u * 0.06, u * 0.26, u * 0.14, 0, 0, TAU);
  ctx.fill();
  // cabeça
  const hy = by - hgt * 0.78;
  ctx.fillStyle = ch.skin;
  ctx.beginPath(); ctx.arc(p.x, hy, u * 0.5, 0, TAU); ctx.fill();
  // boné
  ctx.fillStyle = ch.cap;
  ctx.beginPath(); ctx.arc(p.x, hy - u * 0.12, u * 0.5, Math.PI, TAU); ctx.fill();
  ctx.fillRect(p.x - u * 0.5, hy - u * 0.16, u, u * 0.1);
  // aba do boné (na direção que encara)
  ctx.beginPath();
  ctx.ellipse(p.x, hy - u * 0.1 + facing * u * 0.04, u * 0.42, u * 0.14, 0, facing > 0 ? 0 : Math.PI, facing > 0 ? Math.PI : TAU);
  ctx.fill();
  // olhos
  ctx.fillStyle = '#263238';
  const ey = hy + u * 0.05 + facing * u * 0.04;
  ctx.beginPath();
  ctx.arc(p.x - u * 0.17, ey, u * 0.06, 0, TAU);
  ctx.arc(p.x + u * 0.17, ey, u * 0.06, 0, TAU);
  ctx.fill();
  // raquete (gira na batida)
  const sw = me.swing > 0 ? (0.32 - me.swing) / 0.32 : 1;
  const ang = me.swing > 0 ? lerp(-2.0, 0.9, sw) : -0.5;
  const rx = p.x + Math.cos(ang) * u * 1.0;
  const ry = by - hgt * 0.45 + Math.sin(ang) * u * 0.9 * -facing;
  ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = Math.max(2, u * 0.12);
  ctx.beginPath();
  ctx.moveTo(p.x + (rx - p.x) * 0.3, by - hgt * 0.45 + (ry - (by - hgt * 0.45)) * 0.3);
  ctx.lineTo(rx, ry); ctx.stroke();
  ctx.fillStyle = '#eceff1'; ctx.strokeStyle = '#b71c1c'; ctx.lineWidth = Math.max(1.5, u * 0.07);
  ctx.beginPath(); ctx.arc(rx, ry, u * 0.32, 0, TAU); ctx.fill(); ctx.stroke();
}

function drawBall() {
  const b = M.ball;
  // rastro
  for (let i = 0; i < b.trail.length; i++) {
    const t = b.trail[i];
    const tp = proj(t.x, t.y, t.z);
    const a = i / b.trail.length;
    ctx.fillStyle = t.pw
      ? `hsla(${(i * 30 + titleT * 200) % 360},100%,60%,${a * 0.6})`
      : `rgba(255,241,118,${a * 0.35})`;
    ctx.beginPath(); ctx.arc(tp.x, tp.y, tp.u * 0.22 * a + 1, 0, TAU); ctx.fill();
  }
  // sombra
  const sh = proj(b.x, b.y, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(sh.x, sh.y, sh.u * 0.3, sh.u * 0.11, 0, 0, TAU);
  ctx.fill();
  // bola
  const p = proj(b.x, b.y, b.z);
  const r = Math.max(3, p.u * 0.26);
  if (b.spin === 'power' && b.live) {
    ctx.fillStyle = `hsla(${(titleT * 400) % 360},100%,65%,0.5)`;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.8, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#cddc39';
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f5f8e0'; ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.beginPath(); ctx.arc(p.x - r * 0.25, p.y, r * 0.85, -0.9, 0.9); ctx.stroke();
}

function drawParts() {
  for (const pt of M.parts) {
    const p = proj(pt.x, pt.y, pt.z);
    ctx.fillStyle = pt.col;
    ctx.globalAlpha = clamp(pt.t * 2, 0, 1);
    if (pt.star) {
      drawStar(p.x, p.y, pt.r + 1, pt.col);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, pt.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
function drawStar(x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = i / 10 * TAU - Math.PI / 2;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function drawWorld() {
  drawBG();
  drawCourt();
  // ordem de pintura: fundo → frente
  drawChar(M.ai, M.aChar, 1);
  if (M.ball.y > 0.2) drawBall();
  drawNet();
  if (M.ball.y <= 0.2) drawBall();
  drawChar(M.player, M.pChar, -1);
  drawParts();
}

// ---------- HUD ----------
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function txt(s, x, y, size, col = '#fff', align = 'center', weight = 900, stroke = true) {
  ctx.font = `${weight} ${size}px 'Arial Black', Arial, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20,40,30,0.85)';
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
}

function drawHUD() {
  if (!M) return;
  uiZones = [];
  // placar
  const bw = Math.min(W - 16, 420), bx = (W - bw) / 2, by = 8, bh = 46;
  ctx.fillStyle = 'rgba(15,40,25,0.75)';
  roundRect(bx, by, bw, bh, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  txt(M.pChar.name, bx + bw * 0.16, by + 15, 13, M.pChar.body, 'center', 900, false);
  txt(M.aChar.name, bx + bw * 0.84, by + 15, 13, M.aChar.body, 'center', 900, false);
  // bolinhas de games
  for (let s = 0; s < 2; s++) {
    const who = s === 0 ? 'P' : 'A';
    const cx0 = bx + bw * (s === 0 ? 0.16 : 0.84) - (GAMES_TO_WIN - 1) * 7;
    for (let i = 0; i < GAMES_TO_WIN; i++) {
      ctx.beginPath(); ctx.arc(cx0 + i * 14, by + 33, 5, 0, TAU);
      ctx.fillStyle = i < M.games[who] ? '#ffd740' : 'rgba(255,255,255,0.2)';
      ctx.fill();
    }
  }
  txt(scoreLabel(), bx + bw / 2, by + bh / 2, 17, '#fff', 'center', 900, false);
  // indicador de saque
  const sx = bx + bw * (M.server === 'P' ? 0.30 : 0.70);
  ctx.fillStyle = '#cddc39';
  ctx.beginPath(); ctx.arc(sx, by + bh / 2, 4, 0, TAU); ctx.fill();

  // botão pausa
  const pz = { x: W - 44, y: by + bh + 8, w: 36, h: 36 };
  ctx.fillStyle = 'rgba(15,40,25,0.6)';
  roundRect(pz.x, pz.y, pz.w, pz.h, 9); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(pz.x + 11, pz.y + 10, 5, 16);
  ctx.fillRect(pz.x + 21, pz.y + 10, 5, 16);
  uiZones.push({ ...pz, cb: () => { if (scene === 'play') M.paused = !M.paused; } });

  if (scene !== 'play' || M.paused) return;

  // botões de golpe
  playBtns = [];
  const defs = [
    { key: 'top', label: 'TOP', col: '#ff5252' },
    { key: 'lob', label: 'LOB', col: '#ffca28' },
    { key: 'drop', label: 'CURTA', col: '#66bb6a' },
  ];
  const br = Math.min(34, W * 0.085);
  defs.forEach((d, i) => {
    const b = { x: W - br - 14, y: H - (br * 2 + 18) * (i + 1) + br - 6, r: br, ...d };
    playBtns.push(b);
    const on = M.armed === d.key;
    ctx.globalAlpha = on ? 1 : 0.82;
    ctx.fillStyle = on ? '#fff' : d.col;
    ctx.beginPath(); ctx.arc(b.x, b.y, br, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3; ctx.stroke();
    txt(d.label, b.x, b.y, br * 0.42, on ? d.col : '#fff', 'center', 900, false);
    ctx.globalAlpha = 1;
  });
  // botão especial
  if (M.meter >= 100) {
    const b = { x: W - br - 14, y: H - (br * 2 + 18) * 4 + br - 6, r: br + 4, key: 'power', label: '★' };
    playBtns.push(b);
    const pulse = 1 + Math.sin(titleT * 8) * 0.08;
    ctx.fillStyle = `hsl(${(titleT * 120) % 360},95%,60%)`;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * pulse, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    drawStar(b.x, b.y, b.r * 0.55, '#fff');
  }
  // medidor de especial
  const mw = Math.min(W * 0.4, 170);
  ctx.fillStyle = 'rgba(15,40,25,0.6)';
  roundRect(12, H - 30, mw, 18, 9); ctx.fill();
  const fillW = (mw - 6) * M.meter / 100;
  if (fillW > 2) {
    ctx.fillStyle = M.meter >= 100 ? `hsl(${(titleT * 120) % 360},95%,60%)` : '#ffd740';
    roundRect(15, H - 27, fillW, 12, 6); ctx.fill();
  }
  drawStar(12, H - 21, 9, M.meter >= 100 ? '#fff' : '#ffd740');

  // dicas / saque
  if (M.phase === 'serve' && M.server === 'P' && M.phaseT <= 0) {
    const fl = Math.sin(titleT * 5) > -0.4;
    if (fl) txt('TOQUE PARA SACAR!', W / 2, H * 0.62, Math.min(26, W * 0.06), '#fff');
    if (M.hint > 0) {
      txt('Arraste para correr • botões dão efeito', W / 2, H * 0.68, Math.min(15, W * 0.038), '#e8f5e9');
      txt('Encha a estrela ★ para o GOLPE ESPECIAL!', W / 2, H * 0.72, Math.min(15, W * 0.038), '#fff59d');
    }
  }
  // alvo do analógico
  if (input.stick.id !== null) {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(input.stick.ax, input.stick.ay, 40, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(input.stick.ax + input.stick.dx * 36, input.stick.ay + input.stick.dy * 36, 16, 0, TAU);
    ctx.fill();
  }
  // banner
  if (M.banner) {
    const bn = M.banner;
    const k = Math.min(1, bn.t * 5);
    const sc = 0.6 + 0.4 * (1 - (1 - k) * (1 - k));
    ctx.save();
    ctx.translate(W / 2, H * 0.42); ctx.scale(sc, sc);
    txt(bn.text, 0, 0, Math.min(40, W * 0.1) * (bn.big ? 1.15 : 1), bn.good ? '#ffd740' : '#ff8a80');
    txt(bn.sub, 0, Math.min(40, W * 0.1), Math.min(20, W * 0.05), '#fff');
    ctx.restore();
  }
}

// ---------- telas ----------
function bigButton(label, sub, x, y, w, h, col, cb) {
  ctx.fillStyle = col;
  roundRect(x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 4; ctx.stroke();
  txt(label, x + w / 2, y + h * (sub ? 0.38 : 0.5), h * 0.3, '#fff', 'center', 900, false);
  if (sub) txt(sub, x + w / 2, y + h * 0.72, h * 0.18, 'rgba(255,255,255,0.85)', 'center', 700, false);
  uiZones.push({ x, y, w, h, cb });
}

function drawTitle() {
  uiZones = [];
  drawBG();
  drawCourt();
  drawNet();
  ctx.fillStyle = 'rgba(10,40,25,0.45)';
  ctx.fillRect(0, 0, W, H);
  const cy = H * 0.3;
  const bob = Math.sin(titleT * 2.2) * 8;
  txt('TÊNIS', W / 2, cy - 30 + bob * 0.3, Math.min(64, W * 0.17), '#ffd740');
  txt('STAR', W / 2, cy + 34 + bob * 0.3, Math.min(64, W * 0.17), '#4fc3f7');
  drawStar(W / 2 + Math.min(64, W * 0.17) * 1.6, cy + 30 + bob * 0.3, 16, '#fff176');
  // bola quicando
  const bz = Math.abs(Math.sin(titleT * 3)) * 60;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(W / 2, H * 0.62, 18 - bz * 0.1, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#cddc39';
  ctx.beginPath(); ctx.arc(W / 2, H * 0.62 - 14 - bz, 14, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f5f8e0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W / 2 - 4, H * 0.62 - 14 - bz, 11, -0.9, 0.9); ctx.stroke();

  if (Math.sin(titleT * 4) > -0.5) {
    txt('TOQUE PARA JOGAR', W / 2, H * 0.76, Math.min(24, W * 0.06), '#fff');
  }
  txt('um tênis arcade pra jogar com um dedo 🎾', W / 2, H * 0.84, Math.min(14, W * 0.036), '#c8e6c9');
  uiZones.push({ x: 0, y: 0, w: W, h: H, cb: () => { scene = 'select'; } });
}

function drawMiniChar(ch, x, y, sc) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x, y + sc * 0.95, sc * 0.7, sc * 0.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = ch.body;
  ctx.beginPath(); ctx.ellipse(x, y + sc * 0.35, sc * 0.55, sc * 0.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = ch.skin;
  ctx.beginPath(); ctx.arc(x, y - sc * 0.35, sc * 0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = ch.cap;
  ctx.beginPath(); ctx.arc(x, y - sc * 0.45, sc * 0.5, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = '#263238';
  ctx.beginPath();
  ctx.arc(x - sc * 0.17, y - sc * 0.28, sc * 0.07, 0, TAU);
  ctx.arc(x + sc * 0.17, y - sc * 0.28, sc * 0.07, 0, TAU);
  ctx.fill();
}

function drawSelect() {
  uiZones = [];
  drawBG();
  ctx.fillStyle = 'rgba(10,40,25,0.55)';
  ctx.fillRect(0, 0, W, H);
  txt('ESCOLHA SEU JOGADOR', W / 2, H * 0.08, Math.min(26, W * 0.06), '#ffd740');
  const cw = Math.min(W * 0.44, 210), chh = Math.min(H * 0.32, 230);
  const gx = (W - cw * 2) / 3, gy = H * 0.13;
  CHARS.forEach((c, i) => {
    const col = i % 2, row = (i / 2) | 0;
    const x = gx + col * (cw + gx), y = gy + row * (chh + 16);
    ctx.fillStyle = 'rgba(16,46,30,0.88)';
    roundRect(x, y, cw, chh, 14); ctx.fill();
    ctx.strokeStyle = c.body; ctx.lineWidth = 3; ctx.stroke();
    drawMiniChar(c, x + cw / 2, y + chh * 0.3, chh * 0.18);
    txt(c.name, x + cw / 2, y + chh * 0.58, chh * 0.1, c.body);
    txt(c.tag, x + cw / 2, y + chh * 0.68, chh * 0.07, '#fff', 'center', 700, false);
    // barras de status
    const stats = [['VEL', c.speed / 12], ['FOR', c.power / 1.3], ['ALC', c.reach / 2.3]];
    stats.forEach((s, j) => {
      const sy = y + chh * (0.76 + j * 0.07);
      txt(s[0], x + cw * 0.16, sy, chh * 0.05, '#c8e6c9', 'center', 700, false);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      roundRect(x + cw * 0.28, sy - 3, cw * 0.6, 7, 3); ctx.fill();
      ctx.fillStyle = c.body;
      roundRect(x + cw * 0.28, sy - 3, cw * 0.6 * clamp(s[1], 0.2, 1), 7, 3); ctx.fill();
    });
    uiZones.push({ x, y, w: cw, h: chh, cb: () => { selChar = i; scene = 'diff'; } });
  });
}

function drawDiff() {
  uiZones = [];
  drawBG();
  ctx.fillStyle = 'rgba(10,40,25,0.55)';
  ctx.fillRect(0, 0, W, H);
  const c = CHARS[selChar];
  drawMiniChar(c, W / 2, H * 0.16, Math.min(46, H * 0.07));
  txt(c.name + ' — ' + c.desc, W / 2, H * 0.27, Math.min(18, W * 0.045), c.body);
  txt('DIFICULDADE', W / 2, H * 0.35, Math.min(26, W * 0.06), '#ffd740');
  const bw = Math.min(W * 0.72, 320), bh = Math.min(H * 0.11, 76);
  const cols = ['#66bb6a', '#ffa726', '#ef5350'];
  DIFFS.forEach((d, i) => {
    bigButton(d.name, d.sub, (W - bw) / 2, H * 0.42 + i * (bh + 18), bw, bh, cols[i],
      () => { scene = 'play'; newMatch(selChar, i); });
  });
  bigButton('← VOLTAR', null, (W - bw) / 2, H * 0.42 + 3 * (bh + 18), bw, bh * 0.7, '#546e7a',
    () => { scene = 'select'; });
}

function drawEnd() {
  uiZones = [];
  ctx.fillStyle = 'rgba(10,30,20,0.7)';
  ctx.fillRect(0, 0, W, H);
  const win = M.winner === 'P';
  if (win) {
    for (let i = 0; i < 14; i++) {
      const a = titleT * 1.5 + i;
      drawStar(W / 2 + Math.cos(a) * (W * 0.35), H * 0.3 + Math.sin(a * 1.3) * (H * 0.15),
        6 + (i % 3) * 3, ['#ffd740', '#4fc3f7', '#f06292'][i % 3]);
    }
  }
  txt(win ? '🏆' : '😢', W / 2, H * 0.22, Math.min(70, W * 0.18), '#fff', 'center', 400, false);
  txt(win ? 'VOCÊ VENCEU!' : 'VOCÊ PERDEU…', W / 2, H * 0.35, Math.min(36, W * 0.09),
    win ? '#ffd740' : '#90a4ae');
  txt(`${M.pChar.name} ${M.games.P} × ${M.games.A} ${M.aChar.name}`, W / 2, H * 0.43,
    Math.min(22, W * 0.055), '#fff');
  const bw = Math.min(W * 0.7, 300), bh = Math.min(H * 0.1, 70);
  bigButton('REVANCHE!', null, (W - bw) / 2, H * 0.52, bw, bh, '#43a047',
    () => { scene = 'play'; newMatch(lastSetup.charIdx, lastSetup.diffIdx); });
  bigButton('MUDAR JOGADOR', null, (W - bw) / 2, H * 0.52 + bh + 16, bw, bh, '#5c6bc0',
    () => { scene = 'select'; M = null; });
}

function drawPause() {
  uiZones = [];
  ctx.fillStyle = 'rgba(10,30,20,0.7)';
  ctx.fillRect(0, 0, W, H);
  txt('PAUSADO', W / 2, H * 0.3, Math.min(36, W * 0.1), '#ffd740');
  const bw = Math.min(W * 0.7, 300), bh = Math.min(H * 0.1, 70);
  bigButton('CONTINUAR', null, (W - bw) / 2, H * 0.42, bw, bh, '#43a047',
    () => { M.paused = false; });
  bigButton('SAIR DA PARTIDA', null, (W - bw) / 2, H * 0.42 + bh + 16, bw, bh, '#ef5350',
    () => { M = null; scene = 'select'; });
}

// hook de inspeção (testes/console)
window.__TENNIS_DEBUG = () => ({ scene, M });

// ---------- loop ----------
let lastT = 0;
function frame(t) {
  const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
  lastT = t;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

})();
