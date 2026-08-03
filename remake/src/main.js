// ──────────────────────────────────────────────────────────────
// main.js — canvas sizing, the fixed-timestep loop, and the glue
// between input, the simulation and the UI.
// ──────────────────────────────────────────────────────────────

import { Game, FIELD_W, FIELD_H } from './game/game.js';
import { fx, updateFx } from './core/fx.js';
import { initInput, readIntent, justPressed, endFrame, state as inputState } from './core/input.js';
import { updateMusic, unlockAudio, applyVolumes, sfx } from './core/audio.js';
import { profile, save } from './core/storage.js';
import { checkAchievements, UPGRADES } from './data/progression.js';
import { Player } from './game/entities.js';
import { PILOTS } from './data/pilots.js';
import { ENEMIES } from './data/bestiary.js';
import * as UI from './ui/ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const frame = document.getElementById('frame');

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

let view = { scale: 1, cssW: FIELD_W, cssH: FIELD_H };
let appState = 'menu'; // menu · playing · paused · levelup · result
let abilityTap = false;

// ── canvas sizing ─────────────────────────────────────────────

function resize() {
  const pad = window.innerWidth < 700 ? 0 : 24;
  const availW = window.innerWidth - pad;
  const availH = window.innerHeight - pad;
  const scale = Math.min(availW / FIELD_W, availH / FIELD_H);
  const cssW = Math.round(FIELD_W * scale);
  const cssH = Math.round(FIELD_H * scale);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(FIELD_W * dpr);
  canvas.height = Math.round(FIELD_H * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  frame.style.width = `${cssW}px`;
  frame.style.height = `${cssH}px`;
  // The HUD is authored in field units and scaled to match the canvas.
  frame.style.setProperty('--k', String(scale));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;

  view = { scale, cssW, cssH };
}

addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));

// ── game instance ─────────────────────────────────────────────

const game = new Game({
  onHud: (g) => UI.updateHud(g),
  onCombo: (n, m) => UI.setCombo(n, m),
  onAnnounce: (s, c) => UI.announce(s, c),
  onBossStart: (def, boss) => UI.showBoss(def, boss),
  onBossEnd: () => UI.hideBoss(),
  onLevelUp: (choices, level) => {
    appState = 'levelup';
    UI.showLevelUp(choices, level, (id) => {
      game.chooseUpgrade(id);
    });
    UI.annotateLevels(game.run);
  },
  onLevelUpDone: () => {
    if (appState === 'levelup') appState = 'playing';
  },
  onGameOver: (sum) => endRun(sum),
  onVictory: (sum) => endRun(sum),
});

function endRun(sum) {
  appState = 'result';
  UI.setHudVisible(false);
  UI.hideBoss();
  UI.hideLevelUp();
  const unlocked = checkAchievements(profile);
  save();
  UI.showResult(sum);
  UI.refreshWallets();
  for (let i = 0; i < unlocked.length; i++) {
    setTimeout(() => {
      UI.toast(`CONQUISTA · ◈${unlocked[i].reward}`, `${unlocked[i].icon} ${unlocked[i].name}`);
      sfx('achievement');
    }, 400 + i * 700);
  }
}

// ── flow ──────────────────────────────────────────────────────

function launch(choice) {
  UI.hideScreens();
  UI.setHudVisible(true);
  UI.hideBoss();
  appState = 'playing';
  game.start({
    mode: choice.mode,
    difficulty: choice.difficulty,
    pilots: choice.coop ? [choice.pilot, choice.pilot] : [choice.pilot],
    skin: profile.equippedSkin,
    coop: choice.coop,
  });
  UI.updateHud(game);
}

function togglePause() {
  if (appState === 'playing') {
    appState = 'paused';
    game.paused = true;
    UI.showPause(game);
    sfx('uiBack');
  } else if (appState === 'paused') {
    resumeGame();
  }
}

function resumeGame() {
  UI.hideScreens();
  game.paused = false;
  appState = 'playing';
  sfx('ui');
}

function quitRun() {
  game.stop();
  game.paused = false;
  appState = 'menu';
  UI.setHudVisible(false);
  UI.hideBoss();
  game.commitRun();
  checkAchievements(profile);
  save();
  UI.showScreen('title');
}

UI.initUi({
  launch,
  resume: resumeGame,
  quit: quitRun,
  retry: () => launch(UI.choice),
  togglePause,
  ability: () => {
    abilityTap = true;
    unlockAudio();
  },
});

initInput(canvas);
resize();
UI.showScreen('title');
applyVolumes();

// ── main loop ─────────────────────────────────────────────────

let last = performance.now();
let acc = 0;
let fpsAcc = 0;
let fpsFrames = 0;
let achTimer = 0;
const fpsEl = document.getElementById('fps');

function loop(now) {
  requestAnimationFrame(loop);
  const raw = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;

  // ── global hotkeys
  if (justPressed('Escape', 'KeyP')) {
    if (appState === 'playing' || appState === 'paused') togglePause();
  }
  if (appState === 'result' && justPressed('Enter')) UI.showScreen('title');

  // ── time dilation
  let scale = 1;
  if (fx.hitstop > 0) {
    fx.hitstop -= raw;
    scale = 0;
  } else if (fx.slowmo > 0) {
    fx.slowmo -= raw;
    scale = 0.4;
  }

  if (appState === 'playing' && game.running) {
    const autofire = profile.settings.autofire || inputState.usingTouch;
    const touchScale = FIELD_H / Math.max(1, view.cssH);
    const intents = game.players.map((p, i) => {
      const it = readIntent(i, { autofire, touchScale });
      if (i === 0 && abilityTap) it.ability = true;
      return it;
    });
    abilityTap = false;

    acc += raw * scale * (game.run?.timeScale || 1);
    let guard = 0;
    while (acc >= STEP && guard++ < 6) {
      game.step(STEP, intents);
      acc -= STEP;
      // one-shot intents must not fire on every substep
      for (const it of intents) it.ability = false;
      for (const it of intents) {
        it.dragX = 0;
        it.dragY = 0;
      }
    }
    if (acc > STEP * 6) acc = 0;

    UI.updateBossBar(game.boss);

    achTimer += raw;
    if (achTimer > 3) {
      achTimer = 0;
      const got = checkAchievements(profile);
      for (const a of got) {
        UI.toast(`CONQUISTA · ◈${a.reward}`, `${a.icon} ${a.name}`);
        sfx('achievement');
      }
      if (got.length) {
        save();
        UI.refreshWallets();
      }
    }
  } else {
    abilityTap = false;
  }

  updateFx(raw);
  updateMusic(raw);
  game.render(ctx, 1);
  endFrame();

  // ── fps meter
  if (profile.settings.showFps) {
    fpsAcc += raw;
    fpsFrames++;
    if (fpsAcc >= 0.5) {
      fpsEl.textContent = `${Math.round(fpsFrames / fpsAcc)} FPS · ${fx.particles.length} p · ${game.enemies.length} e`;
      fpsAcc = 0;
      fpsFrames = 0;
    }
  }
}

requestAnimationFrame(loop);

// Debug handles — harmless in production, invaluable in the console
// and used by the automated smoke test.
Object.assign(window, {
  __game: game,
  __choice: UI.choice,
  __Player: Player,
  __pilots: PILOTS,
  __enemies: ENEMIES,
  __upgrades: UPGRADES,
});

// Pause automatically when the tab loses focus mid-run.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && appState === 'playing') togglePause();
});

// First interaction unlocks the audio context.
const kick = () => {
  unlockAudio();
  removeEventListener('pointerdown', kick);
  removeEventListener('keydown', kick);
};
addEventListener('pointerdown', kick);
addEventListener('keydown', kick);
