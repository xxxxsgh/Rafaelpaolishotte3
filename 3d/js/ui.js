// ═══════════════════════════════════════════════════════════════════
// UI — menus, HUD, cartas de level-up e telas de fim de jogo
// ═══════════════════════════════════════════════════════════════════
import { CHARACTERS, CHARACTER_IDS, SKINS, DIFFICULTY, ACHIEVEMENTS, xpForLevel } from './config.js';
import { Save } from './save.js';
import { Audio } from './audio.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.overlay = $('overlay');
    this.hud = $('hud');
    this.current = null;
    this.screens = {
      main: $('screen-main'), char: $('screen-char'), diff: $('screen-diff'),
      ach: $('screen-ach'), settings: $('screen-settings'), pause: $('screen-pause'),
      levelup: $('screen-levelup'), over: $('screen-over'),
    };
    this.bannerTimer = null;
    this.bind();
  }

  // ─────────────────────────────────────────────────────────────
  bind() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      Audio.play('ui');
      this.action(btn.dataset.act, btn);
    });

    const s = Save.data.settings;
    const vol = $('set-vol'), sfx = $('set-sfx'), mus = $('set-music'),
      bloom = $('set-bloom'), qual = $('set-quality'), fps = $('set-fps');
    vol.value = s.volume; sfx.checked = s.sound; mus.checked = s.music;
    bloom.checked = s.bloom; qual.value = s.quality; fps.checked = !!s.fps;

    vol.oninput = () => { s.volume = +vol.value; Audio.setVolume(s.volume); Save.save(); };
    sfx.onchange = () => { s.sound = sfx.checked; Audio.enabled = s.sound; Save.save(); };
    mus.onchange = () => {
      s.music = mus.checked; Audio.musicEnabled = s.music; Save.save();
      if (!s.music) Audio.stopMusic(); else if (this.game.running) Audio.startMusic(this.game.phase % 3);
    };
    bloom.onchange = () => { s.bloom = bloom.checked; this.game.world.setBloom(s.bloom); Save.save(); };
    qual.onchange = () => { s.quality = qual.value; this.game.world.setQuality(s.quality); Save.save(); };
    fps.onchange = () => { s.fps = fps.checked; $('fps').classList.toggle('hidden', !s.fps); Save.save(); };
  }

  action(act) {
    const g = this.game;
    switch (act) {
      case 'campaign': case 'infinite': case 'survivor':
        g.pendingMode = act;
        this.show('char');
        this.renderChars();
        this.renderSkins();
        break;
      case 'hangar': this.show('char'); this.renderChars(); this.renderSkins(); break;
      case 'achievements': this.show('ach'); this.renderAch(); break;
      case 'settings': this.show('settings'); break;
      case 'to-diff':
        if (!g.pendingMode) g.pendingMode = 'campaign';
        this.show('diff'); this.renderDiff();
        break;
      case 'back': this.show('main'); this.refreshCoins(); break;
      case 'back-char': this.show('char'); this.renderChars(); this.renderSkins(); break;
      case 'resume': g.togglePause(false); break;
      case 'restart': g.restart(); break;
      case 'quit': g.quitToMenu(); break;
      case 'reset':
        if (confirm('Apagar todo o progresso (moedas, naves, skins e conquistas)?')) {
          Save.reset(); location.reload();
        }
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────
  show(name) {
    this.overlay.classList.remove('hidden');
    for (const k in this.screens) this.screens[k].classList.toggle('hidden', k !== name);
    this.current = name;
    if (name === 'main') this.refreshCoins();
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
    this.current = null;
  }

  showHUD(on) { this.hud.classList.toggle('hidden', !on); }

  refreshCoins() { $('main-coins').textContent = Save.data.coins; }

  // ─────────────────────────────────────────────────────────────
  renderChars() {
    const list = $('char-list');
    list.innerHTML = '';
    for (const id of CHARACTER_IDS) {
      const c = CHARACTERS[id];
      const owned = Save.has('characters', id);
      const sel = Save.data.equippedChar === id;
      const el = document.createElement('div');
      el.className = 'card' + (sel ? ' sel' : '') + (owned ? '' : ' locked');
      el.innerHTML = `
        <h3>${c.label}</h3>
        <div class="role">${c.title}</div>
        <p><b>${c.ability}</b> — ${c.abilityDesc}</p>
        <div class="stats"><span>VEL ${c.speed}</span><span>DANO ×${c.dmg}</span><span>CAD ${c.cooldown}ms</span></div>
        ${owned ? (sel ? '<div class="price">EQUIPADA</div>' : '') : `<div class="price">🔒 ${c.price} ⬤</div>`}`;
      el.onclick = () => {
        if (owned) {
          Save.data.equippedChar = id; Save.save(); Audio.play('ui');
          this.game.previewCharacter(id);
        } else if (Save.spend(c.price)) {
          Save.unlock('characters', id);
          Save.data.equippedChar = id; Save.save();
          Audio.play('powerup');
          this.toast(`${c.label} DESBLOQUEADA!`);
          this.game.previewCharacter(id);
        } else {
          Audio.play('warn');
          this.toast('MOEDAS INSUFICIENTES');
        }
        this.renderChars();
        this.refreshCoins();
      };
      list.appendChild(el);
    }
  }

  renderSkins() {
    const list = $('skin-list');
    list.innerHTML = '';
    for (const s of SKINS) {
      const owned = Save.has('skins', s.id);
      const sel = Save.data.equippedSkin === s.id;
      const el = document.createElement('div');
      el.className = 'chip' + (sel ? ' sel' : '');
      const color = s.color === 'animated' ? '#ff00ff' : '#' + s.color.toString(16).padStart(6, '0');
      el.innerHTML = `<span class="dot" style="background:${color};color:${color}"></span>${s.name}` +
        (owned ? '' : `<span class="cost">${s.price} ⬤</span>`);
      el.onclick = () => {
        if (owned) {
          Save.data.equippedSkin = s.id; Save.save();
          this.game.previewCharacter(Save.data.equippedChar);
        } else if (Save.spend(s.price)) {
          Save.unlock('skins', s.id);
          Save.data.equippedSkin = s.id; Save.save();
          Audio.play('powerup');
          this.toast(`SKIN ${s.name.toUpperCase()} ADQUIRIDA!`);
          this.game.previewCharacter(Save.data.equippedChar);
        } else {
          Audio.play('warn');
          this.toast('MOEDAS INSUFICIENTES');
        }
        this.renderSkins();
        this.refreshCoins();
      };
      list.appendChild(el);
    }
  }

  renderDiff() {
    const list = $('diff-list');
    list.innerHTML = '';
    for (const [id, d] of Object.entries(DIFFICULTY)) {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<h3>${d.label}</h3><p>${d.desc}</p>
        <div class="stats"><span>INIMIGOS ×${d.mult}</span><span>MOEDAS ×${d.coin}</span></div>`;
      el.onclick = () => this.game.start(this.game.pendingMode || 'campaign', id);
      list.appendChild(el);
    }
  }

  renderAch() {
    const list = $('ach-list');
    list.innerHTML = '';
    const st = Save.data.stats;
    for (const a of ACHIEVEMENTS) {
      const done = Save.data.achievements.includes(a.id);
      const cur = Math.min(st[a.stat] || 0, a.goal);
      const el = document.createElement('div');
      el.className = 'ach' + (done ? ' done' : '');
      el.innerHTML = `<div class="ic">${a.icon}</div>
        <div style="flex:1">
          <h4>${a.name} ${done ? '✔' : ''}</h4>
          <p>${a.desc} · <b style="color:var(--gold)">+${a.reward} ⬤</b></p>
          <div class="track"><i style="width:${(cur / a.goal) * 100}%"></i></div>
        </div>`;
      list.appendChild(el);
    }
  }

  // ─────────────────────────────────────────────────────────────
  updateHUD(g) {
    const p = g.player;
    if (!p) return;
    const now = performance.now();

    let hearts = '';
    const shown = Math.min(6, Math.max(3, p.lives));
    for (let i = 0; i < shown; i++) hearts += `<i class="${i < p.lives ? '' : 'off'}">◆</i>`;
    if (p.lives > 6) hearts += `<i>+${p.lives - 6}</i>`;
    $('hud-lives').innerHTML = hearts;
    $('hud-score').textContent = g.score.toLocaleString('pt-BR');
    $('hud-coins').textContent = g.runCoins;
    $('hud-combo').textContent = '×' + g.combo;

    if (g.mode === 'campaign') {
      $('hud-mode-label').textContent = 'FASE';
      $('hud-mode').textContent = `${g.phase + 1}/12`;
    } else if (g.mode === 'infinite') {
      $('hud-mode-label').textContent = 'ONDA';
      $('hud-mode').textContent = g.wave;
    } else {
      $('hud-mode-label').textContent = 'TEMPO';
      const t = Math.floor(g.elapsed);
      $('hud-mode').textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    }

    $('hud-level').textContent = 'LV ' + g.level;
    $('hud-xp').style.width = ((g.xp / xpForLevel(g.level)) * 100).toFixed(1) + '%';

    const ready = now >= p.abilityReadyAt;
    const ab = $('hud-ability');
    ab.classList.toggle('ready', ready);
    $('hud-ability-name').textContent = p.cfg.ability.toUpperCase();
    const k = ready ? 0 : (p.abilityReadyAt - now) / p.abilityCd;
    $('hud-ability-fill').style.width = (k * 100).toFixed(0) + '%';

    // buffs ativos
    const buffs = [];
    if (now < p.shieldUntil) buffs.push(['⛨', 'ESCUDO', (p.shieldUntil - now) / 1000]);
    if (now < p.doubleUntil) buffs.push(['✦', 'DANO ×2', (p.doubleUntil - now) / 1000]);
    if (p.abilityActive) buffs.push(['⚡', p.cfg.ability.toUpperCase(), (p.abilityUntil - now) / 1000]);
    if (p.weaponLevel > 0) buffs.push(['🔫', 'ARMA LV' + p.weaponLevel, null]);
    $('hud-buffs').innerHTML = buffs.map(([i, n, t]) =>
      `<div class="buff"><b>${i}</b> ${n}${t !== null ? ` <span style="opacity:.6">${t.toFixed(1)}s</span>` : ''}</div>`).join('');

    // info de onda
    if (g.boss) $('hud-wave').textContent = '';
    else if (g.mode === 'campaign') $('hud-wave').textContent = `INIMIGOS ${g.killsThisPhase}/${g.phaseQuota}`;
    else if (g.mode === 'infinite') $('hud-wave').textContent = `RESTAM ${g.enemies.length + g.spawnQueue}`;
    else $('hud-wave').textContent = `ABATES ${g.kills}`;
  }

  setBossBar(show, name = '', sub = '', frac = 1) {
    const bar = $('boss-bar');
    bar.classList.toggle('hidden', !show);
    if (show) {
      $('boss-name').textContent = name;
      $('boss-sub').textContent = sub;
      $('boss-fill').style.width = Math.max(0, frac * 100) + '%';
    }
  }

  banner(title, sub = '', dur = 2200) {
    const b = $('banner');
    $('banner-title').textContent = title;
    $('banner-sub').textContent = sub;
    b.classList.remove('hidden');
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.add('hidden'), dur);
  }

  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 2600);
    setTimeout(() => t.remove(), 3100);
  }

  flash(color = '#ff004c') {
    const f = $('flash');
    f.style.background = color;
    f.style.opacity = '0.42';
    setTimeout(() => { f.style.opacity = '0'; }, 60);
  }

  // ─────────────────────────────────────────────────────────────
  showLevelUp(choices, onPick) {
    $('lvl-num').textContent = this.game.level;
    const grid = $('lvl-cards');
    grid.innerHTML = '';
    for (const up of choices) {
      const lv = this.game.upgradeLevels[up.id] || 0;
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<div class="icon">${up.icon}</div><h3>${up.name}</h3>
        <p>${up.desc}</p>
        <div class="stats"><span>NÍVEL ${lv}/${up.max}</span></div>`;
      el.onclick = () => { Audio.play('powerup'); onPick(up); };
      grid.appendChild(el);
    }
    this.show('levelup');
  }

  showPause(g) {
    $('pause-stats').innerHTML = this.statsHTML(g);
    this.show('pause');
  }

  showGameOver(g, victory) {
    $('over-title').textContent = victory ? 'VITÓRIA TOTAL' : 'MISSÃO FALHOU';
    $('over-title').className = 'head ' + (victory ? 'lvl-head' : 'danger-text');
    $('over-stats').innerHTML = this.statsHTML(g, true);
    this.show('over');
  }

  statsHTML(g, full = false) {
    const mins = Math.floor(g.elapsed / 60), secs = Math.floor(g.elapsed % 60);
    const rows = [
      ['PONTOS', g.score.toLocaleString('pt-BR')],
      ['ABATES', g.kills],
      ['MOEDAS', g.runCoins],
      ['NÍVEL', g.level],
      ['TEMPO', `${mins}:${String(secs).padStart(2, '0')}`],
    ];
    if (g.mode === 'campaign') rows.push(['FASE', `${g.phase + 1}/12`]);
    if (g.mode === 'infinite') rows.push(['ONDA', g.wave]);
    if (full) {
      rows.push(['MAIOR COMBO', '×' + g.maxCombo]);
      rows.push(['CHEFES', g.bossesKilled]);
      rows.push(['RECORDE', (Save.data.highscores[g.mode] || 0).toLocaleString('pt-BR')]);
    }
    return rows.map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
  }
}
