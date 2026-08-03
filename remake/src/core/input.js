// ──────────────────────────────────────────────────────────────
// input.js — keyboard, gamepad and touch collapsed into one
// per-player intent object: { mx, my, fire, ability, ... }
// ──────────────────────────────────────────────────────────────

import { clamp } from './math.js';

const keys = new Set();
/** Keys that were pressed since the last consume() — for one-shot actions. */
const pressed = new Set();

export const pointer = {
  active: false,
  id: -1,
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  tapAbility: false,
};

export const state = {
  usingTouch: false,
  usingGamepad: false,
  paused: false,
};

const P1 = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  fire: ['Space', 'KeyJ'],
  ability: ['ShiftLeft', 'ShiftRight', 'KeyK', 'KeyE'],
};

const P2 = {
  left: ['KeyF'],
  right: ['KeyH'],
  up: ['KeyT'],
  down: ['KeyG'],
  fire: ['Numpad0', 'Period'],
  ability: ['NumpadDecimal', 'Slash'],
};

const SCHEMES = [P1, P2];

// Codes the game owns — never let them scroll or activate the page.
const SWALLOW = new Set([
  ...P1.left, ...P1.right, ...P1.up, ...P1.down, ...P1.fire, ...P1.ability,
  ...P2.fire, ...P2.ability,
  'Escape', 'KeyP', 'Enter',
]);

export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    if (e.repeat) {
      if (SWALLOW.has(e.code)) e.preventDefault();
      return;
    }
    keys.add(e.code);
    pressed.add(e.code);
    state.usingTouch = false;
    if (SWALLOW.has(e.code)) e.preventDefault();
  });

  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    pointer.active = false;
  });

  // ─ Touch / mouse drag: the ship follows the finger with an offset,
  //   so it is never hidden underneath it.
  const onDown = (e) => {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    if (pointer.active && e.changedTouches && pointer.id !== t.identifier) return;
    pointer.active = true;
    pointer.id = t.identifier ?? -1;
    pointer.x = t.clientX;
    pointer.y = t.clientY;
    pointer.dx = 0;
    pointer.dy = 0;
    if (e.changedTouches) state.usingTouch = true;
  };
  const onMove = (e) => {
    if (!pointer.active) return;
    const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
    const t = e.changedTouches ? list.find((c) => c.identifier === pointer.id) : e;
    if (!t) return;
    pointer.dx += t.clientX - pointer.x;
    pointer.dy += t.clientY - pointer.y;
    pointer.x = t.clientX;
    pointer.y = t.clientY;
    if (e.cancelable) e.preventDefault();
  };
  const onUp = (e) => {
    const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
    if (e.changedTouches && !list.some((c) => c.identifier === pointer.id)) return;
    pointer.active = false;
    pointer.id = -1;
  };

  canvas.addEventListener('touchstart', onDown, { passive: true });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp, { passive: true });
  canvas.addEventListener('touchcancel', onUp, { passive: true });
  canvas.addEventListener('mousedown', onDown);
  addEventListener('mousemove', onMove);
  addEventListener('mouseup', onUp);
}

/** True once per physical key press. */
export function justPressed(...codes) {
  return codes.some((c) => pressed.has(c));
}

export function isDown(...codes) {
  return codes.some((c) => keys.has(c));
}

/** Called at the end of every frame. */
export function endFrame() {
  pressed.clear();
  pointer.dx = 0;
  pointer.dy = 0;
  pointer.tapAbility = false;
}

function readGamepad(index) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads[index];
  if (!pad) return null;
  const dead = (v) => (Math.abs(v) < 0.22 ? 0 : v);
  let mx = dead(pad.axes[0] || 0);
  let my = dead(pad.axes[1] || 0);
  // D-pad (standard mapping) as a fallback for sticks.
  if (pad.buttons[14]?.pressed) mx -= 1;
  if (pad.buttons[15]?.pressed) mx += 1;
  if (pad.buttons[12]?.pressed) my -= 1;
  if (pad.buttons[13]?.pressed) my += 1;
  const fire = pad.buttons[0]?.pressed || pad.buttons[7]?.pressed;
  const ability = pad.buttons[1]?.pressed || pad.buttons[5]?.pressed || pad.buttons[2]?.pressed;
  const pause = pad.buttons[9]?.pressed;
  if (mx || my || fire || ability) state.usingGamepad = true;
  return { mx: clamp(mx, -1, 1), my: clamp(my, -1, 1), fire, ability, pause };
}

const padPause = [false, false];

/**
 * Build the intent for player `i`.
 * `touchOwner` is the player index allowed to use the touch drag (always 0).
 */
export function readIntent(i, { autofire = false, touchScale = 1 } = {}) {
  const k = SCHEMES[i] || SCHEMES[0];
  let mx = 0;
  let my = 0;
  let fire = false;
  let ability = false;

  if (isDown(...k.left)) mx -= 1;
  if (isDown(...k.right)) mx += 1;
  if (isDown(...k.up)) my -= 1;
  if (isDown(...k.down)) my += 1;
  if (isDown(...k.fire)) fire = true;
  if (justPressed(...k.ability)) ability = true;

  const pad = readGamepad(i);
  if (pad) {
    if (pad.mx) mx += pad.mx;
    if (pad.my) my += pad.my;
    if (pad.fire) fire = true;
    if (pad.ability && !padPause[i]) ability = true;
    padPause[i] = pad.ability;
  }

  // Normalise so diagonals aren't faster.
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }

  let dragX = 0;
  let dragY = 0;
  if (i === 0 && pointer.active) {
    dragX = pointer.dx * touchScale;
    dragY = pointer.dy * touchScale;
    fire = true;
  }
  if (autofire) fire = true;

  return { mx, my, fire, ability, dragX, dragY };
}

export function anyStart() {
  return justPressed('Enter', 'Space', 'NumpadEnter');
}
