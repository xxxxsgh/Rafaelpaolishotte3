// ═══════════════════════════════════════════════════════════════════
// MAIN — bootstrap do remake 3D
// ═══════════════════════════════════════════════════════════════════
import { Game } from './game.js';
import { Save } from './save.js';
import { Audio } from './audio.js';

function boot() {
  Save.load();

  const s = Save.data.settings;
  Audio.volume = s.volume;
  Audio.enabled = s.sound;
  Audio.musicEnabled = s.music;

  const canvas = document.getElementById('gl');
  const game = new Game(canvas);
  window.game = game;               // útil para depuração no console

  game.world.setQuality(s.quality);
  game.world.setBloom(s.bloom);
  document.getElementById('fps').classList.toggle('hidden', !s.fps);

  game.showMenu();
  game.tick();

  document.getElementById('loading').classList.add('hidden');

  // o navegador só libera áudio depois de uma interação
  const unlock = () => { Audio.resume(); if (Save.data.settings.music) Audio.startMusic(0); };
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
