// ──────────────────────────────────────────────────────────────
// ui.js — every DOM concern lives here. The game never touches
// the document; it calls the hooks this module installs.
// ──────────────────────────────────────────────────────────────

import { profile, save, spendCoins, resetProfile, recordBest } from '../core/storage.js';
import { PILOTS, PILOT_BY_ID, SKINS, SKIN_BY_ID } from '../data/pilots.js';
import { DIFFICULTIES, MODES, ACHIEVEMENTS, achievementProgress, UPGRADE_BY_ID } from '../data/progression.js';
import { sfx, applyVolumes, unlockAudio } from '../core/audio.js';
import { formatNum, formatTime, clamp } from '../core/math.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const choice = {
  mode: 'campaign',
  difficulty: 'pilot',
  pilot: profile.lastPilot || 'marcelo',
  coop: false,
};

let onLaunch = null;
let onResume = null;
let onQuit = null;
let onRetry = null;
let currentScreen = 'title';
let previousScreen = 'title';
let hangarTab = 'pilots';
let hangarSel = null;

// ── screens ───────────────────────────────────────────────────

export function showScreen(name) {
  if (name !== 'settings') previousScreen = currentScreen;
  currentScreen = name;
  for (const el of $$('.screen')) el.classList.toggle('on', el.dataset.screen === name);
  if (name === 'briefing') renderBriefing();
  if (name === 'hangar') renderHangar();
  if (name === 'achievements') renderAchievements();
  if (name === 'stats') renderStats();
  if (name === 'settings') renderSettings();
  refreshWallets();
}

export function hideScreens() {
  currentScreen = null;
  for (const el of $$('.screen')) el.classList.remove('on');
}

function refreshWallets() {
  for (const id of ['walletTitle', 'walletBriefing', 'walletHangar']) {
    const el = document.getElementById(id);
    if (el) el.textContent = `◈ ${formatNum(profile.coins)}`;
  }
}

// ── briefing ──────────────────────────────────────────────────

function renderBriefing() {
  const modeBox = $('#modeChips');
  modeBox.innerHTML = '';
  for (const m of Object.values(MODES)) {
    const el = document.createElement('div');
    el.className = 'chip' + (choice.mode === m.id ? ' sel' : '');
    el.innerHTML = `${m.label}<small>${m.desc}</small>`;
    el.onclick = () => {
      choice.mode = m.id;
      sfx('ui');
      renderBriefing();
    };
    modeBox.appendChild(el);
  }

  const diffBox = $('#diffChips');
  diffBox.innerHTML = '';
  for (const d of Object.values(DIFFICULTIES)) {
    const el = document.createElement('div');
    el.className = 'chip' + (choice.difficulty === d.id ? ' sel' : '');
    el.innerHTML = `${d.label}<small>×${d.reward} créditos</small>`;
    el.title = d.desc;
    el.onclick = () => {
      choice.difficulty = d.id;
      sfx('ui');
      renderBriefing();
    };
    diffBox.appendChild(el);
  }

  const grid = $('#pilotGrid');
  grid.innerHTML = '';
  for (const p of PILOTS) {
    const owned = profile.pilots.includes(p.id);
    const el = document.createElement('div');
    el.className = 'card' + (choice.pilot === p.id ? ' sel' : '') + (owned ? '' : ' locked');
    el.innerHTML = `
      <div class="dot" style="background:${p.accent}; box-shadow:0 0 10px ${p.accent}"></div>
      <div class="nm">${p.name}</div>
      <div class="tg">${p.tag}</div>
      ${owned ? '' : `<div class="pr">🔒 ◈ ${p.price}</div>`}`;
    el.onclick = () => {
      if (!owned) {
        sfx('denied');
        showPilotDetail(p, false);
        return;
      }
      choice.pilot = p.id;
      profile.lastPilot = p.id;
      save();
      sfx('ui');
      renderBriefing();
    };
    grid.appendChild(el);
  }

  showPilotDetail(PILOT_BY_ID[choice.pilot], true);
  $('#coopChk').checked = choice.coop;
}

function showPilotDetail(p, owned) {
  if (!p) return;
  $('#pilotDetail').innerHTML = `
    <b>${p.name} — ${p.tag}</b><br>${p.desc}<br>
    <span style="color:var(--gold)">${p.ability.name}</span> — ${p.ability.desc}
    ${owned ? '' : '<br><span style="color:var(--pink)">Bloqueado. Compre no Hangar.</span>'}`;
}

// ── hangar ────────────────────────────────────────────────────

function renderHangar() {
  for (const t of $$('.tab')) t.classList.toggle('sel', t.dataset.tab === hangarTab);
  const body = $('#hangarBody');
  body.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid';
  body.appendChild(grid);

  if (hangarTab === 'pilots') {
    if (!hangarSel || !PILOT_BY_ID[hangarSel]) hangarSel = PILOTS[0].id;
    for (const p of PILOTS) {
      const owned = profile.pilots.includes(p.id);
      const el = document.createElement('div');
      el.className = 'card' + (hangarSel === p.id ? ' sel' : '') + (owned ? '' : ' locked');
      el.innerHTML = `
        <div class="dot" style="background:${p.accent}; box-shadow:0 0 10px ${p.accent}"></div>
        <div class="nm">${p.name}</div>
        <div class="tg">${p.tag}</div>
        <div class="pr">${owned ? '✔ ADQUIRIDO' : `◈ ${p.price}`}</div>`;
      el.onclick = () => {
        hangarSel = p.id;
        sfx('ui');
        renderHangar();
      };
      grid.appendChild(el);
    }
    const p = PILOT_BY_ID[hangarSel];
    const owned = profile.pilots.includes(p.id);
    $('#hangarDetail').innerHTML = `<b>${p.name} — ${p.tag}</b><br>${p.desc}<br>
      <span style="color:var(--gold)">${p.ability.name}</span> — ${p.ability.desc}<br>
      <span style="color:var(--muted)">Casco ${p.hp} · Velocidade ${Math.round(p.speed)} · Cadência ${p.fireRate.toFixed(2)}s</span>`;
    const btn = $('#hangarAction');
    btn.disabled = owned;
    btn.textContent = owned ? 'Já é seu' : `Comprar por ◈ ${p.price}`;
    btn.onclick = () => {
      if (owned) return;
      if (spendCoins(p.price)) {
        profile.pilots.push(p.id);
        choice.pilot = p.id;
        profile.lastPilot = p.id;
        save();
        sfx('buy');
        toast('PILOTO LIBERADO', p.name);
        renderHangar();
        refreshWallets();
      } else {
        sfx('denied');
        toast('CRÉDITOS INSUFICIENTES', `Faltam ◈ ${p.price - profile.coins}`);
      }
    };
  } else {
    if (!hangarSel || !SKIN_BY_ID[hangarSel]) hangarSel = profile.equippedSkin;
    for (const s of SKINS) {
      const owned = profile.skins.includes(s.id);
      const el = document.createElement('div');
      el.className = 'card' + (hangarSel === s.id ? ' sel' : '') + (owned ? '' : ' locked');
      const sw = s.color === 'rainbow'
        ? 'linear-gradient(90deg,#ff006e,#ffd60a,#39ff14,#00f5ff,#7b2fff)'
        : s.color;
      el.innerHTML = `
        <div class="swatch" style="background:${sw}"></div>
        <div class="nm">${s.name}</div>
        <div class="pr">${profile.equippedSkin === s.id ? '✔ EQUIPADA' : owned ? 'ADQUIRIDA' : `◈ ${s.price}`}</div>`;
      el.onclick = () => {
        hangarSel = s.id;
        sfx('ui');
        renderHangar();
      };
      grid.appendChild(el);
    }
    const s = SKIN_BY_ID[hangarSel];
    const owned = profile.skins.includes(s.id);
    $('#hangarDetail').innerHTML = `<b>${s.name}</b><br>${s.desc}`;
    const btn = $('#hangarAction');
    btn.disabled = false;
    btn.textContent = owned
      ? profile.equippedSkin === s.id ? 'Equipada' : 'Equipar'
      : `Comprar por ◈ ${s.price}`;
    btn.onclick = () => {
      if (owned) {
        profile.equippedSkin = s.id;
        save();
        sfx('ui');
        renderHangar();
      } else if (spendCoins(s.price)) {
        profile.skins.push(s.id);
        profile.equippedSkin = s.id;
        save();
        sfx('buy');
        toast('PINTURA LIBERADA', s.name);
        renderHangar();
        refreshWallets();
      } else {
        sfx('denied');
        toast('CRÉDITOS INSUFICIENTES', `Faltam ◈ ${s.price - profile.coins}`);
      }
    };
  }
}

// ── achievements / stats / settings ───────────────────────────

function renderAchievements() {
  const list = $('#achList');
  list.innerHTML = '';
  let done = 0;
  for (const a of ACHIEVEMENTS) {
    const pr = achievementProgress(profile, a);
    if (pr.done) done++;
    const el = document.createElement('div');
    el.className = 'ach' + (pr.done ? ' done' : '');
    el.innerHTML = `
      <div class="ico">${pr.done ? a.icon : '🔒'}</div>
      <div class="body">
        <div class="nm">${a.name}</div>
        <div class="ds">${a.desc}</div>
        <div class="bar"><i style="width:${Math.round(pr.pct * 100)}%"></i></div>
      </div>
      <div class="rw">◈${a.reward}</div>`;
    list.appendChild(el);
  }
  $('#achCount').textContent = `${done} / ${ACHIEVEMENTS.length} desbloqueadas`;
}

function renderStats() {
  const s = profile.stats;
  const rows = [
    ['Runs jogadas', formatNum(s.runs)],
    ['Inimigos destruídos', formatNum(s.kills)],
    ['Chefes derrotados', formatNum(s.bosses)],
    ['Campanhas concluídas', formatNum(s.campaignClears)],
    ['Créditos acumulados', `◈ ${formatNum(s.coinsEarned)}`],
    ['Melhor combo', `×${s.bestCombo}`],
    ['Níveis ganhos', formatNum(s.levelsGained)],
    ['Fases perfeitas', formatNum(s.perfectPhases)],
    ['Power-ups coletados', formatNum(s.powerupsTaken)],
    ['Fase máxima', formatNum(s.phaseReached)],
    ['Melhor onda (Infinito)', formatNum(profile.bestWave || 0)],
    ['Pilotos usados', `${s.pilotsUsed.length} / ${PILOTS.length}`],
    ['Tempo de voo', formatTime(s.playSeconds)],
    ['—', ''],
    ['Recorde · Campanha', formatNum(profile.best.campaign)],
    ['Recorde · Infinito', formatNum(profile.best.endless)],
    ['Recorde · Boss Rush', formatNum(profile.best.bossrush)],
    ['Recorde · Diário', formatNum(profile.best.daily)],
  ];
  $('#statList').innerHTML = rows
    .map(([k, v]) => (k === '—' ? '<div style="height:10px"></div>' : `<div class="stat"><span>${k}</span><span>${v}</span></div>`))
    .join('');
}

function renderSettings() {
  const s = profile.settings;
  const bind = (id, valId, key, scale = 100) => {
    const el = document.getElementById(id);
    const val = document.getElementById(valId);
    el.value = Math.round(s[key] * scale);
    val.textContent = el.value;
    el.oninput = () => {
      s[key] = Number(el.value) / scale;
      val.textContent = el.value;
      applyVolumes();
      save();
    };
  };
  bind('setMaster', 'valMaster', 'master');
  bind('setSfx', 'valSfx', 'sfx');
  bind('setMusic', 'valMusic', 'music');
  bind('setShake', 'valShake', 'shake');

  for (const c of $$('#partChips .chip')) {
    c.classList.toggle('sel', Number(c.dataset.part) === s.particles);
    c.onclick = () => {
      s.particles = Number(c.dataset.part);
      save();
      sfx('ui');
      renderSettings();
    };
  }

  const af = $('#setAutofire');
  af.checked = s.autofire;
  af.onchange = () => {
    s.autofire = af.checked;
    save();
  };
  const fpsChk = $('#setFps');
  fpsChk.checked = s.showFps;
  fpsChk.onchange = () => {
    s.showFps = fpsChk.checked;
    $('#fps').classList.toggle('on', s.showFps);
    save();
  };
}

// ── HUD ───────────────────────────────────────────────────────

const hud = {};

export function bindHud() {
  hud.root = $('#hud');
  hud.lives = $('#lives');
  hud.extra = $('#extraLives');
  hud.phase = $('#phaseLbl');
  hud.score = $('#score');
  hud.coins = $('#coins');
  hud.combo = $('#combo');
  hud.bossBar = $('#bossBar');
  hud.bossName = $('#bossName');
  hud.bossFill = $('#bossFill');
  hud.lvl = $('#lvlLbl');
  hud.xpLbl = $('#xpLbl');
  hud.xpFill = $('#xpFill');
  hud.buffs = $('#buffs');
  hud.ability = $('#abilityBtn');
  hud.abilityFill = $('.fill', hud.ability);
  hud.abilityLbl = $('#abilityLbl');
  hud.announce = $('#announce');
}

export function setHudVisible(on) {
  hud.root.classList.toggle('on', on);
}

export function updateHud(g) {
  const p = g.players[0];
  if (!p) return;
  const run = g.run;

  // Past ~10 hull points the pip row would run off screen, so it collapses.
  const shown = Math.min(p.maxHp, 10);
  let pips = '';
  for (let i = 0; i < shown; i++) pips += `<div class="pip${i < p.hp ? '' : ' off'}"></div>`;
  if (p.maxHp > shown) pips += `<span style="font-size:11px;color:var(--muted);margin-left:4px">${p.hp}/${p.maxHp}</span>`;
  hud.lives.innerHTML = pips;
  hud.extra.textContent = p.lives > 0 ? `RESPAWNS ×${p.lives}` : 'ÚLTIMA VIDA';

  hud.score.textContent = formatNum(run.score);
  hud.coins.textContent = `◈ ${formatNum(run.coins)}`;

  const label =
    g.mode === 'endless' ? `ONDA ${run.wave}`
      : g.mode === 'bossrush' ? `CHEFE ${run.phase} / 10`
        : `FASE ${run.phase} · ONDA ${Math.max(1, run.wave)}`;
  hud.phase.textContent = label;

  hud.lvl.textContent = `NÍVEL ${run.level}`;
  hud.xpLbl.textContent = `${Math.floor(run.xp)} / ${run.xpNext}`;
  hud.xpFill.style.width = `${clamp((run.xp / run.xpNext) * 100, 0, 100)}%`;

  const buffs = [];
  if (p.rapidUntil > 0) buffs.push(['RAPID', '#00f5ff', p.rapidUntil]);
  if (p.doubleUntil > 0) buffs.push(['×2 DANO', '#ffd60a', p.doubleUntil]);
  if (p.shieldUntil > 0) buffs.push(['ESCUDO', '#39ff14', p.shieldUntil]);
  if (p.magnetUntil > 0) buffs.push(['ÍMÃ', '#b388ff', p.magnetUntil]);
  hud.buffs.innerHTML = buffs
    .map(([n, c, t]) => `<span class="buff" style="color:${c}">${n} ${t.toFixed(0)}s</span>`)
    .join('');

  const ready = p.abilityReady;
  hud.ability.classList.toggle('cool', !ready);
  const cdMax = p.def.ability.cooldown * p.cooldownMul;
  const pct = ready ? 1 : p.abilityUntil > 0 ? 1 : 1 - p.abilityCd / cdMax;
  hud.abilityFill.style.height = `${clamp(pct * 100, 0, 100)}%`;
  hud.abilityLbl.textContent = ready ? p.def.ability.name.split(' ')[0] : `${Math.ceil(p.abilityCd)}s`;
}

export function setCombo(n, mult) {
  hud.combo.classList.toggle('on', n >= 3);
  hud.combo.textContent = `COMBO ×${n} · ${mult.toFixed(2)}×`;
}

export function showBoss(def, boss) {
  hud.bossBar.classList.add('on');
  hud.bossName.textContent = `${def.name} — ${def.subtitle}`;
  hud.bossFill.style.width = '100%';
  announce(def.name, def.color);
}

export function updateBossBar(boss) {
  if (!boss) return;
  hud.bossFill.style.width = `${clamp((boss.hp / boss.maxHp) * 100, 0, 100)}%`;
}

export function hideBoss() {
  hud.bossBar.classList.remove('on');
}

let announceTimer = 0;
export function announce(str, color = '#00f5ff') {
  const el = hud.announce;
  el.textContent = str;
  el.style.color = color;
  el.style.textShadow = `0 0 30px ${color}`;
  el.classList.remove('go');
  void el.offsetWidth; // restart the animation
  el.classList.add('go');
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => el.classList.remove('go'), 1700);
}

export function toast(title, desc) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="t">${title}</div><div class="d">${desc}</div>`;
  box.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .4s, transform .4s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(28px)';
    setTimeout(() => el.remove(), 420);
  }, 3200);
}

// ── level-up ──────────────────────────────────────────────────

export function showLevelUp(choices, level, pick) {
  const box = $('#cards');
  $('#lvlTitle').textContent = `NÍVEL ${level}`;
  box.innerHTML = '';
  for (const u of choices) {
    const el = document.createElement('div');
    el.className = 'upg';
    el.style.borderColor = u.color;
    el.innerHTML = `
      <div class="ic">${u.icon}</div>
      <div class="nm" style="color:${u.color}">${u.name}</div>
      <div class="ds">${u.desc}</div>
      <div class="lv" id="lv_${u.id}"></div>`;
    el.onclick = () => {
      $('#levelup').classList.remove('on');
      pick(u.id);
    };
    box.appendChild(el);
  }
  $('#levelup').classList.add('on');
  return box;
}

export function annotateLevels(run) {
  for (const el of $$('#cards .lv')) {
    const id = el.id.slice(3);
    const u = UPGRADE_BY_ID[id];
    const have = run.upgrades[id] || 0;
    el.textContent = `${have} / ${u.max}`;
  }
}

export function hideLevelUp() {
  $('#levelup').classList.remove('on');
}

// ── result ────────────────────────────────────────────────────

export function showResult(sum) {
  $('#resultTitle').textContent = sum.won ? 'Vitória' : 'Fim de jogo';
  $('#resultTitle').style.color = sum.won ? 'var(--gold)' : 'var(--pink)';
  $('#resultSub').textContent = sum.won
    ? sum.mode === 'campaign' ? 'Rafa Paoli foi derrotado.' : 'Sequência concluída.'
    : 'Sua nave foi destruída.';

  const isBest = recordBest(sum.mode, sum.score);
  $('#newBest').style.display = isBest ? 'inline-block' : 'none';

  const rows = [
    ['Pontuação', formatNum(sum.score)],
    ['Créditos ganhos', `◈ ${formatNum(sum.coins)}`],
    ['Inimigos destruídos', formatNum(sum.kills)],
    ['Chefes derrotados', formatNum(sum.bosses)],
    ['Nível alcançado', formatNum(sum.level)],
    [sum.mode === 'endless' ? 'Onda' : 'Fase', formatNum(sum.mode === 'endless' ? sum.wave : sum.phase)],
    ['Melhor combo', `×${sum.bestCombo}`],
    ['Tempo', formatTime(sum.time)],
    ['Recorde do modo', formatNum(profile.best[sum.mode] || 0)],
  ];
  const upg = Object.entries(sum.upgrades)
    .map(([id, lv]) => `${UPGRADE_BY_ID[id]?.icon || ''} ${UPGRADE_BY_ID[id]?.name || id} ×${lv}`)
    .join(' · ');

  $('#resultBody').innerHTML =
    rows.map(([k, v]) => `<div class="stat"><span>${k}</span><span>${v}</span></div>`).join('') +
    (upg ? `<div class="hint"><b style="color:var(--cyan)">BUILD:</b> ${upg}</div>` : '');

  showScreen('result');
}

export function showPause(g) {
  const upg = Object.entries(g.run.upgrades)
    .map(([id, lv]) => `${UPGRADE_BY_ID[id]?.icon || ''} ${UPGRADE_BY_ID[id]?.name || id} ×${lv}`)
    .join(' · ');
  $('#pauseSub').textContent =
    `${MODES[g.mode]?.label || g.mode} · ${DIFFICULTIES[g.difficulty.id].label} · ${formatNum(g.run.score)} pts`;
  $('#pauseUpgrades').innerHTML = upg ? `<b style="color:var(--cyan)">BUILD:</b> ${upg}` : 'Sem aprimoramentos ainda.';
  showScreen('pause');
}

// ── wiring ────────────────────────────────────────────────────

export function initUi(handlers) {
  onLaunch = handlers.launch;
  onResume = handlers.resume;
  onQuit = handlers.quit;
  onRetry = handlers.retry;

  bindHud();

  const acts = {
    goTitle: () => {
      sfx('uiBack');
      showScreen('title');
    },
    goBriefing: () => {
      unlockAudio();
      sfx('ui');
      showScreen('briefing');
    },
    goHangar: () => {
      sfx('ui');
      showScreen('hangar');
    },
    goAchievements: () => {
      sfx('ui');
      showScreen('achievements');
    },
    goStats: () => {
      sfx('ui');
      showScreen('stats');
    },
    goSettings: () => {
      sfx('ui');
      showScreen('settings');
    },
    launch: () => {
      unlockAudio();
      choice.coop = $('#coopChk').checked;
      onLaunch?.(choice);
    },
    resume: () => onResume?.(),
    quit: () => onQuit?.(),
    retry: () => onRetry?.(),
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const fn = acts[btn.dataset.act];
    if (fn) fn();
  });

  // "Voltar" from settings returns to wherever you opened it from
  $('#settingsBack').onclick = () => {
    sfx('uiBack');
    showScreen(previousScreen === 'pause' ? 'pause' : 'title');
  };

  for (const t of $$('.tab')) {
    t.onclick = () => {
      hangarTab = t.dataset.tab;
      hangarSel = null;
      sfx('ui');
      renderHangar();
    };
  }

  $('#wipeBtn').onclick = () => {
    if (!confirm('Apagar TODO o progresso salvo? Isso não pode ser desfeito.')) return;
    resetProfile();
    sfx('denied');
    showScreen('title');
    refreshWallets();
  };

  $('#coopChk').onchange = (e) => {
    choice.coop = e.target.checked;
  };

  $('#pauseBtn').onclick = () => handlers.togglePause?.();
  $('#abilityBtn').onclick = () => handlers.ability?.();

  document.getElementById('fps').classList.toggle('on', profile.settings.showFps);
  refreshWallets();
}

export { refreshWallets };
