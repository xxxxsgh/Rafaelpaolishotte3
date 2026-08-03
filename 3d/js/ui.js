/* ═══════════════════════════════════════════════════════════════════
   UI — menus, HUD, painéis
   ═══════════════════════════════════════════════════════════════════ */

const ALL_OVERLAYS = ['modeScreen', 'difficultyScreen', 'charScreen', 'pauseScreen',
  'gameOverScreen', 'skillScreen', 'shopScreen', 'achScreen', 'statsScreen',
  'settingsScreen', 'helpScreen'];

const UI = {
  _pendingMode: 'campaign',
  _charIndex: 0,
  _previewMesh: null,
  _previewChar: null,
  _announceTimer: null,
  _settingsFrom: 'mainMenu',
  _skillTab: 'firepower',

  /* ═════════ Navegação ═════════ */
  closeOverlays() {
    ALL_OVERLAYS.forEach(id => $(id)?.classList.remove('active'));
    $('titleScreen').classList.add('hidden');
    this.clearPreview();
  },

  navigate(target) {
    this.closeOverlays();
    if (target === 'mainMenu') {
      $('titleScreen').classList.remove('hidden');
      this.updateCoins();
      return;
    }
    if (target === 'difficultyScreen') this.buildDifficulty();
    if (target === 'charScreen') this.buildCharacters();
    if (target === 'settingsScreen') this.syncSettings();
    $(target)?.classList.add('active');
  },

  openOverlay(id) { $(id)?.classList.add('active'); },
  openModal(id) { $(id)?.classList.add('open'); },
  closeModal(id) { $(id)?.classList.remove('open'); },

  enterGame() {
    this.closeOverlays();
    $('hud').classList.add('on');
    $('pauseBtn').classList.add('on');
    $('coinsTop').style.display = 'none';
    $('titleFoot').classList.add('hidden');
    $('xpWrap').classList.toggle('on', State.survivorMode);
    this.buildAbilityBar();
    this.updateHUD();
  },

  exitGame() {
    $('hud').classList.remove('on');
    $('pauseBtn').classList.remove('on');
    $('bossBarWrap').classList.remove('on');
    $('xpWrap').classList.remove('on');
    $('puWrap').classList.remove('on');
    $('abilityBar').classList.remove('on');
    $('coinsTop').style.display = '';
    $('titleFoot').classList.remove('hidden');
    $('comboEl').style.opacity = 0;
  },

  /* ═════════ Seleção de modo / dificuldade / personagem ═════════ */
  chooseMode(mode) {
    this._pendingMode = mode;
    this.navigate('difficultyScreen');
  },

  buildDifficulty() {
    const wrap = $('difficultyOptions');
    wrap.innerHTML = '';
    Object.entries(DIFFICULTY_CFG).forEach(([key, cfg]) => {
      const d = document.createElement('div');
      d.className = 'card' + (State.difficulty === key ? ' sel' : '');
      d.innerHTML = `<h3>${cfg.label}</h3><p>${cfg.desc}</p>
        <span class="price">×${cfg.multiplier} moedas</span>`;
      d.onclick = () => {
        State.difficulty = key;
        State.survivorDifficulty = key;
        saveGameData();
        this.navigate('charScreen');
      };
      wrap.appendChild(d);
    });
  },

  buildCharacters() {
    const wrap = $('charOptions');
    wrap.innerHTML = '';
    const slot = 0;
    CHARACTER_IDS.forEach(id => {
      const cfg = CHARACTER_CFG[id];
      const owned = State.unlockedChars.includes(id);
      const sel = State.selectedChar[slot] === id;
      const d = document.createElement('div');
      d.className = 'card' + (sel ? ' sel' : '') + (owned ? '' : ' locked');
      d.innerHTML = `<h3>${cfg.label.split(' — ')[0]}</h3>
        <p>${cfg.label.split(' — ')[1] || ''}</p>
        <p style="font-size:12px;opacity:.55;margin-top:5px">
          SPD ${cfg.speed} · CD ${cfg.shootCooldown}ms · DMG ×${cfg.dmgMult}</p>
        ${owned ? '' : `<span class="price">🔒 ${cfg.price} 💰</span>`}`;
      d.onclick = () => {
        if (!owned) {
          if (State.coins >= cfg.price) {
            State.coins -= cfg.price;
            State.unlockedChars.push(id);
            saveGameData();
            this.announce('DESBLOQUEADO: ' + id.toUpperCase(), '#ffd60a');
            playSound('powerup');
          } else {
            this.announce('MOEDAS INSUFICIENTES', '#ff006e');
            return this.buildCharacters();
          }
        }
        State.selectedChar[slot] = id;
        this.buildCharacters();
        this.showPreview(id);
      };
      wrap.appendChild(d);
    });
    const cur = CHARACTER_CFG[State.selectedChar[slot]];
    $('charAbility').textContent = cur ? cur.ability : '';
    $('charTitle').textContent = State.twoPlayer ? 'Piloto do Player 1' : 'Escolha o Piloto';
    this.showPreview(State.selectedChar[slot]);
  },

  showPreview(charId) {
    if (this._previewChar === charId && this._previewMesh) return;
    this.clearPreview();
    const skin = SKINS_DATA.find(s => s.id === State.equippedSkin) || SKINS_DATA[0];
    const color = skin.color === 'animated' ? 0xff00ff : parseInt(skin.color.slice(1), 16);
    const m = Models.playerShip(charId, color);
    m.position.set(0, 8.2, 3);
    m.scale.setScalar(2.1);
    Render.world.add(m);
    this._previewMesh = m;
    this._previewChar = charId;
  },

  clearPreview() {
    if (this._previewMesh) { Render.world.remove(this._previewMesh); this._previewMesh = null; this._previewChar = null; }
  },

  spinPreview(dt) {
    if (!this._previewMesh) return;
    this._previewMesh.rotation.y += dt * 0.9;
    this._previewMesh.position.y = 8.2 + Math.sin(performance.now() / 700) * 0.22;
  },

  confirmCharacter() {
    if (State.twoPlayer && !State.selectedChar[1]) State.selectedChar[1] = 'robos';
    if (State.twoPlayer && !State.unlockedChars.includes(State.selectedChar[1])) State.selectedChar[1] = 'marcelo';
    this.clearPreview();
    Game.start(this._pendingMode);
  },

  /* ═════════ HUD ═════════ */
  updateCoins() {
    $('coinsTop').textContent = '💰 ' + State.coins.toLocaleString('pt-BR');
    $('coinsEl').textContent = '💰 ' + State.coins.toLocaleString('pt-BR');
    const sc = $('skillCoins'); if (sc) sc.textContent = '💰 ' + State.coins.toLocaleString('pt-BR');
    const sh = $('shopCoins'); if (sh) sh.textContent = '💰 ' + State.coins.toLocaleString('pt-BR');
  },

  updateHUD() {
    const p = State.players[0];
    $('scoreEl').textContent = 'SCORE ' + State.scores[0].toLocaleString('pt-BR');
    $('lives').textContent = p ? '♥'.repeat(Math.max(0, p.lives)) + '♡'.repeat(Math.max(0, (p.maxLives || 5) - Math.max(0, p.lives))) : '';
    const p2El = $('scoreP2');
    if (State.twoPlayer && State.players[1]) {
      p2El.style.display = '';
      p2El.textContent = 'P2 ' + State.scores[1].toLocaleString('pt-BR') + '  ' + '♥'.repeat(Math.max(0, State.players[1].lives));
    } else p2El.style.display = 'none';

    this.updateCoins();

    const ph = $('phaseEl');
    if (State.bossRushMode) ph.textContent = 'BOSS ' + (State.bossRushIndex + 1) + '/12';
    else if (State.infiniteMode) ph.textContent = 'WAVE ' + State.wave;
    else if (State.survivorMode) ph.textContent = 'LVL ' + State.level;
    else ph.textContent = 'FASE ' + State.gameLevel;

    const tm = $('timerEl');
    if (State.survivorMode) { tm.style.display = ''; tm.textContent = formatTime(State.survivorElapsed); }
    else tm.style.display = 'none';

    // barra de power-up
    const t = now();
    const pu = $('puWrap');
    if (State.powerUpActive || State.shieldActive || State.doubleDamage) {
      pu.classList.add('on');
      let label, pct;
      if (State.powerUpActive) { label = 'RAPID FIRE'; pct = (State.powerUpEndTime - t) / 5000; }
      else if (State.shieldActive) { label = 'ESCUDO'; pct = (State.shieldEndTime - t) / 8000; }
      else { label = 'DOUBLE DAMAGE'; pct = (State.doubleDamageEnd - t) / 6000; }
      $('puLabel').textContent = label;
      $('puFill').style.width = clamp(pct * 100, 0, 100) + '%';
    } else pu.classList.remove('on');
  },

  updateXP() {
    $('xpFill').style.width = clamp((State.xp / State.xpToNextLevel) * 100, 0, 100) + '%';
    $('xpLabel').textContent = 'LVL ' + State.level;
  },

  updateCombo() {
    const c = State.stats.currentCombo;
    const el = $('comboEl');
    if (c >= 3) {
      el.textContent = 'COMBO ×' + c;
      el.style.opacity = 1;
      el.style.color = c > 8 ? '#ffd60a' : c > 5 ? '#ff006e' : '#00f5ff';
      clearTimeout(this._comboT);
      this._comboT = setTimeout(() => { el.style.opacity = 0; }, 1400);
    } else el.style.opacity = 0;
  },

  showBossBar(name) {
    $('bossBarWrap').classList.add('on');
    $('bossName').textContent = name;
    $('bossFill').style.width = '100%';
  },
  setBossBar(pct, enraged) {
    $('bossFill').style.width = clamp(pct * 100, 0, 100) + '%';
    $('bossFill').style.background = enraged
      ? 'linear-gradient(90deg,#ff006e,#ffd60a)' : 'linear-gradient(90deg,#ff006e,#ff8800)';
  },
  hideBossBar() { $('bossBarWrap').classList.remove('on'); },

  showBossIntro(data) {
    const el = $('bossIntro');
    $('biName').textContent = data.name;
    $('biSub').textContent = data.subtitle;
    el.style.display = 'block';
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'bossIn 3s ease-out forwards';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
    Render.addFlash(0.4, 0xff006e);
  },

  announce(text, color = '#00f5ff') {
    const el = $('announce');
    el.textContent = text;
    el.style.color = color;
    el.style.textShadow = `0 0 30px ${color}`;
    el.style.transition = 'none';
    el.style.opacity = '1';
    clearTimeout(this._announceTimer);
    this._announceTimer = setTimeout(() => {
      el.style.transition = 'opacity .8s';
      el.style.opacity = '0';
    }, 1100);
  },

  showAchievementToast(a) {
    const el = $('toast');
    $('toastTitle').textContent = a.icon + '  ' + a.name;
    $('toastDesc').textContent = a.desc + '  ·  +' + a.reward + ' 💰';
    el.classList.add('on');
    playSound('levelup');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('on'), 3800);
  },

  showPhaseLoading(nextLevel, onDone) {
    State.paused = true;
    const scr = $('phaseLoading'), bar = $('phaseFill');
    $('phaseTitle').textContent = 'FASE ' + nextLevel;
    scr.classList.add('on');
    bar.style.width = '0%';
    let prog = 0;
    const iv = setInterval(() => {
      prog += 3;
      bar.style.width = prog + '%';
      if (prog >= 100) {
        clearInterval(iv);
        scr.classList.remove('on');
        State.paused = false;
        State.bossSpawned = false;
        Game._lastFrame = performance.now();
        onDone?.();
      }
    }, 28);
  },

  /* ═════════ Barras de habilidade ═════════ */
  buildAbilityBar() {
    const bar = $('abilityBar');
    bar.innerHTML = '';
    if (State.infiniteMode) {
      [['nuke', '☢', '1'], ['heal', '❤', '2'], ['shield', '🛡', '3']].forEach(([k, icon, key]) => {
        const d = document.createElement('div');
        d.className = 'ab ready';
        d.id = 'ab_' + k;
        d.innerHTML = `<div>${icon}</div><div class="k">${key}</div><div class="cd" id="cd_${k}"></div>`;
        d.onclick = () => Game.useInfiniteAbility(k);
        bar.appendChild(d);
      });
      bar.classList.add('on');
      this.updateInfiniteBar();
    } else if (State.survivorMode) {
      State.survivorAbilities.forEach((a, i) => {
        const d = document.createElement('div');
        d.className = 'ab locked';
        d.id = 'ab_s' + i;
        d.innerHTML = `<div>${a.icon}</div><div class="k">${i + 1}</div><div class="cd" id="cd_s${i}"></div>`;
        d.onclick = () => Game.useSurvivorAbility(i);
        bar.appendChild(d);
      });
      bar.classList.add('on');
      this.updateSurvivorBar();
    } else {
      bar.classList.remove('on');
    }
  },

  updateInfiniteBar() {
    Object.keys(INFINITE_COOLDOWNS).forEach(k => {
      const cd = State.infiniteCooldowns[k] || 0;
      const el = $('ab_' + k), cdEl = $('cd_' + k);
      if (el) el.classList.toggle('ready', cd <= 0);
      if (cdEl) cdEl.style.height = (cd / INFINITE_COOLDOWNS[k]) * 100 + '%';
    });
  },

  updateSurvivorBar() {
    State.survivorAbilities.forEach((a, i) => {
      const el = $('ab_s' + i), cdEl = $('cd_s' + i);
      if (!el) return;
      el.classList.toggle('locked', a.level <= 0);
      el.classList.toggle('ready', a.level > 0 && a.cooldown <= 0);
      if (cdEl) cdEl.style.height = (a.cooldown / a.maxCooldown) * 100 + '%';
    });
  },

  /* ═════════ Tela de upgrade (Survivor) ═════════ */
  showUpgradeScreen() {
    State.paused = true;
    let options;
    const abilities = State.survivorAbilities.filter(a => a.level < a.maxLevel);
    const runUps = RUN_UPGRADES_POOL.filter(u => (State.runUpgrades[u.id] || 0) < u.maxLevel);
    const all = [...abilities.map(a => ({ ...a, _ability: true })), ...runUps];
    options = all.sort(() => Math.random() - 0.5).slice(0, 3);
    if (!options.length) options = [RUN_UPGRADES_POOL[0]];

    const wrap = $('upgradeOptions');
    wrap.innerHTML = '';
    options.forEach(up => {
      const lv = up._ability ? up.level : (State.runUpgrades[up.id] || 0);
      const max = up.maxLevel;
      const d = document.createElement('div');
      d.className = 'up-card';
      d.innerHTML = `<div class="ic">${up.icon || '✦'}</div>
        <h3>${up.name} <span style="opacity:.6">LV${lv}→${lv + 1}/${max}</span></h3>
        <p>${up.desc}</p>`;
      d.onclick = () => Game.selectUpgrade(up._ability ? { name: up.name } : up);
      wrap.appendChild(d);
    });
    this.openModal('upgradeScreen');
  },

  /* ═════════ Game over ═════════ */
  showGameOver(isNewRecord, victory) {
    this.exitGame();
    $('goTitle').textContent = victory ? '🏆 Vitória!' : 'Game Over';
    $('goTitle').style.color = victory ? 'var(--gold)' : 'var(--pink)';
    $('goSub').textContent = victory
      ? (State.bossRushMode ? 'Boss Rush completo — 12/12!' : 'Você derrotou o Genesis Omega!')
      : 'A nave foi destruída.';

    const rows = [
      ['Score', State.scores[0].toLocaleString('pt-BR')],
      ...(State.twoPlayer ? [['Score P2', State.scores[1].toLocaleString('pt-BR')]] : []),
      ['Inimigos destruídos', State.stats.enemiesKilled],
      ['Maior combo', State.stats.maxCombo],
      ...(State.survivorMode ? [['Tempo sobrevivido', formatTime(State.survivorElapsed)], ['Nível', State.level]] : []),
      ...(State.infiniteMode ? [['Wave alcançada', State.wave]] : []),
      ...(State.mode === 'campaign' ? [['Fase alcançada', State.gameLevel]] : []),
      ['Moedas totais', State.coins.toLocaleString('pt-BR')],
    ];
    $('goStats').innerHTML =
      (isNewRecord ? '<div class="sub" style="color:var(--gold)">★ NOVO RECORDE ★</div>' : '') +
      rows.map(([k, v]) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join('');
    this.openOverlay('gameOverScreen');
    $('coinsTop').style.display = '';
  },

  /* ═════════ Skill Tree ═════════ */
  openSkillTree() {
    this.navigate('skillScreen');
    const tabs = $('skillTabs');
    tabs.innerHTML = '';
    const names = { firepower: '🔥 Fogo', defense: '🛡 Defesa', utility: '🔧 Utilidade', special: '✨ Especial' };
    Object.keys(SKILL_TREE).forEach(branch => {
      const b = document.createElement('button');
      b.className = 'tab' + (this._skillTab === branch ? ' on' : '');
      b.textContent = names[branch];
      b.onclick = () => { this._skillTab = branch; this.openSkillTree(); };
      tabs.appendChild(b);
    });
    this.renderSkills();
    this.updateCoins();
  },

  renderSkills() {
    const list = $('skillList');
    list.innerHTML = '';
    SKILL_TREE[this._skillTab].forEach(sk => {
      const lv = State.unlockedSkills[sk.id] || 0;
      const maxed = lv >= sk.maxLevel;
      const cost = sk.cost * (lv + 1);
      const affordable = State.coins >= cost;
      const d = document.createElement('div');
      d.className = 'card' + (maxed ? ' sel' : affordable ? '' : ' locked');
      d.innerHTML = `<span class="lv">${lv}/${sk.maxLevel}</span>
        <h3>${sk.name}</h3><p>${sk.desc}</p>
        <span class="price">${maxed ? '✔ MÁXIMO' : cost + ' 💰'}</span>`;
      d.onclick = () => {
        if (maxed) return;
        if (State.coins < cost) { this.announce('MOEDAS INSUFICIENTES', '#ff006e'); return; }
        State.coins -= cost;
        State.unlockedSkills[sk.id] = lv + 1;
        State.stats.skillsUnlocked = Object.values(State.unlockedSkills).reduce((a, b) => a + b, 0);
        saveGameData();
        Game.checkAchievements();
        playSound('powerup');
        this.renderSkills();
        this.updateCoins();
      };
      list.appendChild(d);
    });
  },

  /* ═════════ Loja ═════════ */
  openShop() {
    this.navigate('shopScreen');
    const list = $('shopList');
    list.innerHTML = '';
    SKINS_DATA.forEach(sk => {
      const owned = State.unlockedSkins.includes(sk.id);
      const equipped = State.equippedSkin === sk.id;
      const d = document.createElement('div');
      d.className = 'card' + (equipped ? ' sel' : owned ? '' : ' locked');
      const bg = sk.color === 'animated'
        ? 'linear-gradient(90deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff)'
        : sk.color;
      d.innerHTML = `<div class="swatch" style="background:${bg}"></div>
        <h3>${sk.name}</h3><p>${sk.desc}</p>
        <span class="price">${equipped ? '✔ EQUIPADA' : owned ? 'CLIQUE P/ EQUIPAR' : sk.price + ' 💰'}</span>`;
      d.onclick = () => {
        if (!owned) {
          if (State.coins < sk.price) { this.announce('MOEDAS INSUFICIENTES', '#ff006e'); return; }
          State.coins -= sk.price;
          State.unlockedSkins.push(sk.id);
          playSound('powerup');
        }
        State.equippedSkin = sk.id;
        saveGameData();
        this.openShop();
      };
      list.appendChild(d);
    });
    this.updateCoins();
  },

  /* ═════════ Conquistas ═════════ */
  openAchievements() {
    this.navigate('achScreen');
    const list = $('achList');
    list.innerHTML = '';
    ACHIEVEMENTS_DATA.forEach(a => {
      const done = State.achievements.includes(a.id);
      const { cur, max } = a.progress(State.stats);
      const pct = clamp((cur / max) * 100, 0, 100);
      const d = document.createElement('div');
      d.className = 'card' + (done ? ' sel' : '');
      d.innerHTML = `<h3>${a.icon} ${a.name}</h3><p>${a.desc}</p>
        <div class="bar" style="margin-top:8px;height:6px"><i style="width:${pct}%"></i></div>
        <span class="price">${done ? '✔ +' + a.reward + ' 💰' : Math.min(cur, max) + ' / ' + max}</span>`;
      list.appendChild(d);
    });
    $('achProgress').textContent = State.achievements.length + ' / ' + ACHIEVEMENTS_DATA.length + ' desbloqueadas';
  },

  /* ═════════ Stats ═════════ */
  openStats() {
    this.navigate('statsScreen');
    const s = State.stats;
    const rows = [
      ['Partidas jogadas', s.gamesPlayed],
      ['Inimigos destruídos', s.enemiesKilled],
      ['Bosses derrotados', s.bossesDefeated],
      ['Bombers destruídos', s.bombersKilled],
      ['Moedas ganhas', s.totalCoinsEarned],
      ['Power-ups coletados', s.powerupsCollected],
      ['Maior combo', s.maxCombo],
      ['Fase máxima', s.maxPhase],
      ['Wave máxima (Infinite)', s.maxInfiniteWave],
      ['Melhor tempo (Survivor)', formatTime(s.maxSurvivorTime)],
      ['Fases perfeitas', s.perfectLevels],
      ['Personagens usados', s.charactersPlayed + ' / 8'],
      ['Skills desbloqueadas', s.skillsUnlocked || 0],
      ['Skins possuídas', State.unlockedSkins.length + ' / ' + SKINS_DATA.length],
    ];
    $('statsList').innerHTML = rows.map(([k, v]) =>
      `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join('');

    const hs = loadHighScores();
    const labels = { campaign: 'Campanha', infinite: 'Infinite', survivor: 'Survivor', bossrush: 'Boss Rush' };
    $('hsList').innerHTML = Object.keys(labels).map(mode => {
      const list = (hs[mode] || []).slice(0, 3);
      return `<div style="margin-top:10px"><b style="font-family:Orbitron;font-size:12px;color:var(--gold)">${labels[mode]}</b>` +
        (list.length
          ? list.map((v, i) => `<div class="hs-row"><span>#${i + 1}</span><span>${v.toLocaleString('pt-BR')}</span></div>`).join('')
          : '<div class="hs-row"><span>—</span><span>sem registros</span></div>') + '</div>';
    }).join('');
  },

  /* ═════════ Settings ═════════ */
  syncSettings() {
    $('setSound').checked = Audio3D.enabled;
    $('setVolume').value = Math.round(Audio3D.volume * 100);
    $('volLabel').textContent = Math.round(Audio3D.volume * 100) + '%';
    $('setQuality').checked = Settings.quality === 'high';
    $('setInvert').checked = Settings.invertY;
    $('setTouch').checked = $('touch').classList.contains('on');
  },
  setSound(v) { Audio3D.enabled = v; Settings.save(); },
  setVolume(v) { Audio3D.volume = v / 100; $('volLabel').textContent = v + '%'; Settings.save(); },
  setQuality(v) { Settings.quality = v ? 'high' : 'low'; Settings.save(); Render.resize(); },
  setTouch(v) { $('touch').classList.toggle('on', v); },
  backFromSettings() {
    if (State.running && State.paused) { this.closeOverlays(); this.openOverlay('pauseScreen'); }
    else this.navigate('mainMenu');
  },
  resetProgress() {
    if (!confirm('Apagar TODO o progresso (moedas, skills, skins, conquistas)?')) return;
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(HS_KEY); } catch (e) { /* noop */ }
    location.reload();
  },
};
