// ═══════════════════════════════════════════════════════════════════
// SECTION 14H – ONLINE MULTIPLAYER (PeerJS WebRTC)
// ═══════════════════════════════════════════════════════════════════
let _peer = null;
let _conn = null;
let _isHost = false;
let _onlineMode = false;
const _SYNC_RATE = 50;
let _lastSync = 0;

function showOnlineScreen() {
  navigateMenu('onlineScreen');
  initPeer();
}

function initPeer() {
  if (_peer) { try { _peer.destroy(); } catch(e) {} _peer = null; }
  const code = Math.random().toString(36).substr(2, 6).toUpperCase();
  _peer = new Peer(code, { host:'0.peerjs.com', port:443, path:'/', secure:true, debug:0 });

  _peer.on('open', id => {
    const el = document.getElementById('myPeerCode');
    if (el) el.textContent = id;
    setOnlineStatus('READY — WAITING FOR PLAYER 2...');
    _isHost = true;
  });

  _peer.on('connection', conn => {
    _conn = conn;
    setupPeerConnection(conn);
    setOnlineStatus('PLAYER 2 CONNECTED! STARTING...');
    _onlineMode = true;
    State.twoPlayer = true;
    // Give connection time to stabilize, then send game config to client
    setTimeout(() => {
      if(_conn && _conn.open) {
        _conn.send({
          type:'gameStart',
          chars: State.selectedChar,
          difficulty: State.difficulty,
          pvp: State.pvpMode,
        });
      }
      startOnlineGame();
    }, 800);
  });

  _peer.on('error', err => {
    setOnlineStatus('ERROR: ' + err.type + ' — RETRYING...');
    setTimeout(initPeer, 3000);
  });
}

function joinPeerGame() {
  const inp = document.getElementById('joinCodeInput');
  if (!inp) return;
  const code = inp.value.trim().toUpperCase();
  if (!code || code.length < 4) { setOnlineStatus('ENTER A VALID CODE'); return; }
  _lastJoinCode = code;                         // Phase 3.7 for reconnect

  if (!_peer) {
    _peer = new Peer(undefined, { host:'0.peerjs.com', port:443, path:'/', secure:true, debug:0 });
    _peer.on('open', id => { const el=document.getElementById('myPeerCode'); if(el) el.textContent=id; });
  }

  setOnlineStatus('CONNECTING TO ' + code + '...');
  _conn = _peer.connect(code, { reliable:true });
  _isHost = false;
  _onlineMode = true;
  State.twoPlayer = true;
  setupPeerConnection(_conn);
}

// Phase 3.7: online robustness — reconnect with exponential backoff + ping HUD
let _lastJoinCode = null;
let _reconnectAttempt = 0;
let _pingMs = 0;
let _lastPingSentAt = 0;
let _pingTimer = null;
function _showPingHud(visible){
  let el = document.getElementById('pingHud');
  if(!el && visible){
    el = document.createElement('div'); el.id='pingHud';
    el.style.cssText = 'position:fixed;left:8px;bottom:8px;font:11px Orbitron,monospace;color:#9ad;background:rgba(0,0,0,0.5);padding:3px 8px;border-radius:4px;pointer-events:none;z-index:120;';
    document.body.appendChild(el);
  }
  if(el) el.style.display = visible ? 'block' : 'none';
}
function _startPingLoop(){
  if(_pingTimer) clearInterval(_pingTimer);
  _pingTimer = setInterval(() => {
    if(_conn && _conn.open) {
      _lastPingSentAt = performance.now();
      try { _conn.send({ type:'ping', t:_lastPingSentAt }); } catch(e){}
    }
    const el = document.getElementById('pingHud');
    if(el) el.textContent = _onlineMode ? ('PING ' + Math.round(_pingMs) + 'ms') : '';
  }, CONFIG.ONLINE.pingIntervalMs);
}
function _stopPingLoop(){ if(_pingTimer){ clearInterval(_pingTimer); _pingTimer=null; } _showPingHud(false); }
function _tryReconnect(){
  if(_isHost || !_lastJoinCode) return;
  const backoffs = CONFIG.ONLINE.reconnectBackoffMs;
  if(_reconnectAttempt >= backoffs.length){
    setOnlineStatus('UNABLE TO RECONNECT'); _reconnectAttempt = 0; return;
  }
  const delay = backoffs[_reconnectAttempt++];
  setOnlineStatus('RECONNECTING IN '+(delay/1000)+'s... (attempt '+_reconnectAttempt+')');
  setTimeout(() => {
    if(_peer) { try{ _peer.destroy(); }catch(e){} _peer=null; }
    const inp = document.getElementById('joinCodeInput');
    if(inp){ inp.value = _lastJoinCode; joinPeerGame(); }
  }, delay);
}

function setupPeerConnection(conn) {
  conn.on('open', () => {
    if (!_isHost) setOnlineStatus('CONNECTED! HOST IS STARTING GAME...');
    _reconnectAttempt = 0;
    _showPingHud(true);
    _startPingLoop();
  });
  conn.on('data', data => {
    // Phase 3.7: ping/pong
    if(data && data.type === 'ping') { try { conn.send({type:'pong', t:data.t}); } catch(e){} return; }
    if(data && data.type === 'pong') { _pingMs = performance.now() - data.t; return; }
    handleNetworkData(data);
  });
  conn.on('close', () => {
    setOnlineStatus('CONNECTION LOST');
    _onlineMode = false;
    _stopPingLoop();
    if (State.running) {
      showWaveAnnounce('PLAYER 2 DISCONNECTED', '#ff006e');
      State.twoPlayer = false;
    }
    _tryReconnect();
  });
  conn.on('error', err => setOnlineStatus('ERROR: ' + (err.message||'')));
}

function startOnlineGame() {
  State.twoPlayer = true;
  if (!State.selectedChar[1]) State.selectedChar[1] = 'marcelo';
  startGame();
}

function buildHostSnapshot() {
  return {
    type:'snapshot',
    boss: State.boss ? { hp:State.boss.health, maxHp:State.boss.maxHealth } : null,
    score: State.scores[0],
    wave: State.wave,
    p1x: State.players[0] ? State.players[0].x : 0,
  };
}

function buildClientInput() {
  const p2 = State.players[1];
  if (!p2) return null;
  return { type:'input', x:p2.x, left:p2.isMovingLeft, right:p2.isMovingRight, score:State.scores[1], lives:p2.lives };
}

function sendNetworkUpdate() {
  if (!_conn || !_conn.open || !State.running || !_onlineMode) return;
  const now = Date.now();
  if (now - _lastSync < _SYNC_RATE) return;
  _lastSync = now;
  if (_isHost) { _conn.send(buildHostSnapshot()); }
  else { const inp = buildClientInput(); if (inp) _conn.send(inp); }
}

function handleNetworkData(data) {
  if (!data) return;
  if (data.type === 'snapshot' && !_isHost) {
    if (State.players[0] && data.p1x !== undefined) State.players[0].x = data.p1x;
    State.scores[0] = data.score || 0;
    if (data.boss && State.boss) State.boss.health = data.boss.hp;
    if (!data.boss && State.boss) { handleBossDefeat(); State.boss = null; }
  }
  if (data.type === 'input' && _isHost) {
    if (State.players[1] && data.x !== undefined) {
      State.players[1].x = data.x;
      State.players[1].isMovingLeft = data.left;
      State.players[1].isMovingRight = data.right;
    }
    State.scores[1] = data.score || 0;
    if (State.players[1] && data.lives !== undefined) State.players[1].lives = data.lives;
  }
  if (data.type === 'shoot') {
    const pIdx = _isHost ? 1 : 0;
    const p = State.players[pIdx];
    if (p) p.shoot();
  }
  if (data.type === 'gameStart' && !_isHost) {
    State.selectedChar[0] = data.chars?.[0] || 'marcelo';
    State.selectedChar[1] = data.chars?.[1] || 'marcelo';
    State.difficulty = data.difficulty || 'normal';
    State.pvpMode = !!data.pvp;
    State.twoPlayer = true;
    startOnlineGame();
  }

  if (data.type === 'pvphit') {
    const p = State.players[data.target];
    if(p) {
      handlePlayerDamage(p);
      const attackerIdx = 1 - data.target;
      if(data.score !== undefined) State.scores[attackerIdx] = data.score;
    }
  }
}

function sendOnlineShoot() {
  if (_conn && _conn.open && _onlineMode) _conn.send({ type:'shoot' });
}

function setOnlineStatus(msg) {
  const el = document.getElementById('onlineStatus');
  if (el) el.textContent = msg;
}

function copyRoomCode() {
  const code = document.getElementById('myPeerCode')?.textContent;
  if (!code) return;
  navigator.clipboard?.writeText(code).then(() => setOnlineStatus('CODE COPIED!'));
}

function endOnlineSession() {
  if (_conn) { try { _conn.close(); } catch(e) {} _conn = null; }
  if (_peer) { try { _peer.destroy(); } catch(e) {} _peer = null; }
  _onlineMode = false;
}

