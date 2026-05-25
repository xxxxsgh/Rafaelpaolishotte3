// ═══════════════════════════════════════════════════════════════════
// SECTION 3 – UTILITIES
// ═══════════════════════════════════════════════════════════════════
function detectCollision(a,b) {
  return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
}
function clamp(v,mn,mx) { return v<mn?mn:v>mx?mx:v; }
function pad2(n) { return n.toString().padStart(2,'0'); }
function formatTime(s) { return pad2(Math.floor(s/60))+':'+pad2(s%60); }
function getDifficultyMult() { return DIFFICULTY_CFG[State.difficulty]?.multiplier??1; }
function rand(a,b) { return a+Math.random()*(b-a); }

// ═══════════════════════════════════════════════════════════════════
// SECTION 3B – HIGH SCORE SYSTEM
// ═══════════════════════════════════════════════════════════════════
const HS_KEY = 'rpshooter_hs2';

function loadHighScores() {
  try { return JSON.parse(localStorage.getItem(HS_KEY)) || {campaign:0,infinite:0,survivor:0}; }
  catch(e) { return {campaign:0,infinite:0,survivor:0}; }
}

function saveHighScore(mode, score) {
  const hs = loadHighScores();
  if (score > (hs[mode]||0)) {
    hs[mode] = score;
    try { localStorage.setItem(HS_KEY, JSON.stringify(hs)); } catch(e) {}
    return true; // new record
  }
  return false;
}

function getCurrentHSMode() {
  if (State.infiniteMode) return 'infinite';
  if (State.survivorMode) return 'survivor';
  return 'campaign';
}

function renderHSList(containerId) {
  const hs = loadHighScores();
  const el = document.getElementById(containerId);
  if (!el) return;
  const modes = [{k:'campaign',label:'CAMPAIGN'},{k:'infinite',label:'INFINITE'},{k:'survivor',label:'SURVIVOR'}];
  el.innerHTML = modes.map(m=>`<div class="hs-row"><span class="hs-mode">${m.label}</span><span class="hs-score">${(hs[m.k]||0).toLocaleString()}</span></div>`).join('');
}

function updateTitleHighScores() {
  const hs = loadHighScores();
  const any = Object.values(hs).some(v=>v>0);
  const wrap = document.getElementById('titleHighScores');
  if (!wrap) return;
  wrap.style.display = any ? 'block' : 'none';
  renderHSList('titleHsContent');
}

function confirmResetScores() {
  if (confirm('Reset all high scores?')) {
    try { localStorage.removeItem(HS_KEY); } catch(e) {}
    renderHSList('settingsHsList');
    updateTitleHighScores();
  }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 3C – SETTINGS
// ═══════════════════════════════════════════════════════════════════
let fxHighQuality = true;

function showSettings() {
  hideAllOverlays();
  renderHSList('settingsHsList');
  const s = document.getElementById('settingsPanel');
  s.classList.add('active');
  document.getElementById('volSlider').value = Math.round(masterVolume * 100);
  document.getElementById('volDisplay').textContent = Math.round(masterVolume * 100) + '%';
  document.getElementById('soundToggle').textContent = soundEnabled ? 'ON' : 'OFF';
  document.getElementById('soundToggle').classList.toggle('off', !soundEnabled);
  document.getElementById('fxToggle').textContent = fxHighQuality ? 'HIGH' : 'LOW';
  document.getElementById('fxToggle').classList.toggle('off', !fxHighQuality);
  const ni = document.getElementById('playerNameInput');
  if (ni) ni.value = getPlayerName();
}

function hideSettings() {
  document.getElementById('settingsPanel').classList.remove('active');
  navigateMenu('main');
}

function setVolume(v) {
  masterVolume = Math.max(0, Math.min(1, v));
  document.getElementById('volDisplay').textContent = Math.round(masterVolume * 100) + '%';
  try { localStorage.setItem('rpshooter_vol', masterVolume); } catch(e) {}
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('soundToggle');
  btn.textContent = soundEnabled ? 'ON' : 'OFF';
  btn.classList.toggle('off', !soundEnabled);
  try { localStorage.setItem('rpshooter_sfx', soundEnabled ? '1' : '0'); } catch(e) {}
}

function toggleFX() {
  fxHighQuality = !fxHighQuality;
  const btn = document.getElementById('fxToggle');
  btn.textContent = fxHighQuality ? 'HIGH' : 'LOW';
  btn.classList.toggle('off', !fxHighQuality);
}

function loadSettings() {
  try {
    const vol = parseFloat(localStorage.getItem('rpshooter_vol'));
    if (!isNaN(vol)) masterVolume = clamp(vol, 0, 1);
    const sfx = localStorage.getItem('rpshooter_sfx');
    if (sfx !== null) soundEnabled = sfx === '1';
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 3D – TOUCH CONTROLS
// ═══════════════════════════════════════════════════════════════════
const _touchState = { left:false, right:false, fire:false, ability:false };
let _fireInterval = null;

function isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }

function initTouchControls() {
  if (!isTouchDevice()) return;
  const tc = document.getElementById('touchControls');

  function bindBtn(id, key, onDown, onUp) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', e => { e.preventDefault(); btn.classList.add('pressed'); onDown && onDown(); }, {passive:false});
    btn.addEventListener('touchend',   e => { e.preventDefault(); btn.classList.remove('pressed'); onUp && onUp(); }, {passive:false});
    btn.addEventListener('touchcancel',e => { e.preventDefault(); btn.classList.remove('pressed'); onUp && onUp(); }, {passive:false});
  }

  bindBtn('tcLeft',
    null,
    () => { _touchState.left=true; const p=State.players[0]; if(p) p.isMovingLeft=true; },
    () => { _touchState.left=false; const p=State.players[0]; if(p) p.isMovingLeft=false; }
  );
  bindBtn('tcRight',
    null,
    () => { _touchState.right=true; const p=State.players[0]; if(p) p.isMovingRight=true; },
    () => { _touchState.right=false; const p=State.players[0]; if(p) p.isMovingRight=false; }
  );
  bindBtn('tcFire',
    null,
    () => {
      _touchState.fire=true;
      const p=State.players[0];
      if(p&&State.running&&!State.paused) p.shoot();
      _fireInterval = setInterval(()=>{ const p2=State.players[0]; if(p2&&State.running&&!State.paused) p2.shoot(); }, 120);
    },
    () => { _touchState.fire=false; clearInterval(_fireInterval); _fireInterval=null; }
  );
  bindBtn('tcAbility',
    null,
    () => { const p=State.players[0]; if(p&&State.running&&!State.paused){ State.survivorMode?useSurvivorAbility(0):p.activateAbility(); } },
    () => {}
  );
}

function setTouchHUDVisible(v) {
  if (!isTouchDevice()) return;
  const tc = document.getElementById('touchControls');
  if (tc) tc.classList.toggle('visible', v);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 3E – GLOBAL LEADERBOARD
// ═══════════════════════════════════════════════════════════════════
let _cachedLeaderboards = {};
let _playerName = '';

function getPlayerName() {
  if (!_playerName) _playerName = localStorage.getItem('rpshooter_name') || '';
  return _playerName;
}

function savePlayerName(name) {
  _playerName = name;
  try { localStorage.setItem('rpshooter_name', name); } catch(e) {}
  // Update input field value if settings open
  const el = document.getElementById('playerNameInput');
  if (el && el.value !== name) el.value = name;
}

async function fetchLeaderboard(mode) {
  const binId = LEADERBOARD_CONFIG.binIds[mode];
  if (!binId) return [];
  if (_cachedLeaderboards[mode] && Date.now() - _cachedLeaderboards[mode].ts < 30000) {
    return _cachedLeaderboards[mode].data;
  }
  try {
    const resp = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': LEADERBOARD_CONFIG.apiKey }
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    const data = json.record?.entries || [];
    _cachedLeaderboards[mode] = { data, ts: Date.now() };
    return data;
  } catch(e) { return []; }
}

async function submitScore(mode, score, playerName) {
  const binId = LEADERBOARD_CONFIG.binIds[mode];
  if (!binId || !score || !playerName || binId.length < 5) return;
  try {
    const current = await fetchLeaderboard(mode);
    const newEntry = {
      name: playerName.toUpperCase().substring(0, 12),
      score,
      char: State.selectedChar[0],
      date: new Date().toISOString().split('T')[0],
    };
    const updated = [...current, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_CONFIG.maxEntries);
    await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': LEADERBOARD_CONFIG.apiKey },
      body: JSON.stringify({ entries: updated }),
    });
    _cachedLeaderboards[mode] = { data: updated, ts: Date.now() };
  } catch(e) { console.warn('Score submit failed', e); }
}

async function showLeaderboard(mode) {
  mode = mode || 'campaign';
  const el = document.getElementById('lbList');
  if (el) el.innerHTML = '<div style="text-align:center;opacity:0.5;padding:20px;font-family:\'Orbitron\',monospace;font-size:10px;">LOADING...</div>';
  openModal('leaderboardModal');
  const entries = await fetchLeaderboard(mode);
  if (!el) return;
  if (!entries || entries.length === 0) {
    el.innerHTML = '<div style="text-align:center;opacity:0.5;padding:20px;font-family:\'Orbitron\',monospace;font-size:10px;">NO SCORES YET — BE THE FIRST!</div>';
    return;
  }
  el.innerHTML = entries.map((e, i) => {
    const rankColor = i===0?'#ffd60a':i===1?'#aaa':i===2?'#cd7f32':'rgba(255,255,255,0.3)';
    return `<div class="lb-entry">
      <span class="lb-rank" style="color:${rankColor}">#${i+1}</span>
      <span class="lb-name">${e.name||'???'}</span>
      <span class="lb-char">${e.char||''}</span>
      <span class="lb-score">${(e.score||0).toLocaleString()}</span>
    </div>`;
  }).join('');
}

