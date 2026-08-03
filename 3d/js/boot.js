/* ═══════════════════════════════════════════════════════════════════
   BOOT — inicialização
   ═══════════════════════════════════════════════════════════════════ */
(function boot() {
  if (typeof THREE === 'undefined') {
    document.body.innerHTML =
      '<div style="padding:40px;font-family:monospace;color:#ff006e">' +
      'Falha ao carregar <b>vendor/three.min.js</b>.<br>Sirva a pasta por HTTP: ' +
      '<code>python3 -m http.server 8080</code></div>';
    return;
  }

  Settings.load();
  loadGameData();

  try {
    Render.init();
  } catch (e) {
    document.body.innerHTML =
      '<div style="padding:40px;font-family:monospace;color:#ff006e">WebGL indisponível neste navegador.<br>' +
      String(e) + '</div>';
    return;
  }

  Input.init();

  if (Input.isTouchDevice()) $('touch').classList.add('on');

  UI.navigate('mainMenu');
  UI.updateCoins();

  // Pausa automática ao trocar de aba
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && State.running && !State.paused) Game.pause();
  });

  // Destrava o áudio na primeira interação (política de autoplay)
  const unlock = () => { Audio3D.ctx(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  Game._lastFrame = performance.now();
  Game.loop();
})();
