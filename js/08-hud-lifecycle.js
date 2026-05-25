// ═══════════════════════════════════════════════════════════════════
// SECTION 15 – HUD UPDATE (IMPROVEMENT 11: animated heart lives)
// ═══════════════════════════════════════════════════════════════════
function updateHUD() {
  document.getElementById('hudCoins').textContent=State.coins;
  document.getElementById('menuCoins').textContent=State.coins;
}

function setHUDVisible(v) {
  document.getElementById('hud').classList.toggle('visible',v);
  document.getElementById('bottomHud').classList.toggle('visible',v);
  document.getElementById('fabShop').style.display=v&&!State.twoPlayer?'block':'none';
  document.getElementById('fabAch').style.display=v&&!State.twoPlayer?'block':'none';
  const craftFab = document.getElementById('fabCraft');
  if (craftFab) craftFab.style.display = v&&!State.twoPlayer&&(State.unlockedSkills.ut4||0)>=1?'block':'none';
  document.getElementById('hud2').classList.toggle('visible',v&&State.twoPlayer);
  document.getElementById('coinDisplay').style.display=v&&!State.twoPlayer?'flex':'none';
  const syH = document.getElementById('synergyHud');
  if (syH) syH.style.display = v&&State.activeSynergies.length>0?'block':'none';
  const matH = document.getElementById('matHud');
  if (matH) matH.style.display = v&&(State.unlockedSkills.ut4||0)>=1?'block':'none';
  setTouchHUDVisible(v);
}

function updateScoreDisplay() {
  const p=State.players[0];
  if(!p) return;
  // Phase 2.4: cache HUD writes, only touch DOM when values actually change
  const cache = updateScoreDisplay._c = updateScoreDisplay._c || {};
  const score = State.scores[0];
  if(cache.score !== score) { document.getElementById('hudScore').textContent=score.toLocaleString(); cache.score=score; }
  const lvlLabel=State.infiniteMode?'WAVE':State.survivorMode?'LVL':'PHASE';
  const lvlVal=State.infiniteMode?State.wave:State.survivorMode?State.level:State.gameLevel;
  if(cache.lvlLabel !== lvlLabel) { document.getElementById('hudLevelLabel').textContent=lvlLabel; cache.lvlLabel=lvlLabel; }
  if(cache.lvlVal !== lvlVal)     { document.getElementById('hudLevel').textContent=lvlVal; cache.lvlVal=lvlVal; }
  // Lives bar with hearts — rebuild only when lives count changes
  if(cache.lives !== p.lives) {
    cache.lives = p.lives;
    const lb=document.getElementById('livesBar'); lb.innerHTML='';
    for(let i=0;i<5;i++) {
      const span=document.createElement('span'); span.className='life-icon'+(i>=p.lives?' lost':'');
      span.textContent='♥'; lb.appendChild(span);
    }
  }
  // Ability status
  const hasCooldown=p.character==='marcelo'||p.character==='felipe';
  document.getElementById('abilitySep').style.display=hasCooldown?'block':'none';
  document.getElementById('abilityHud').style.display=hasCooldown?'block':'none';
  if(hasCooldown) {
    const ready=!p.abilityActive&&Date.now()>p.abilityCooldown;
    const el=document.getElementById('abilityStatus');
    el.textContent=ready?'READY':'RECHARGING';
    el.style.color=ready?'#39ff14':'#ff006e';
  }
  // P2 — same caching
  if(State.twoPlayer&&State.players[1]) {
    const p2=State.players[1];
    const cache2 = updateScoreDisplay._c2 = updateScoreDisplay._c2 || {};
    const s2 = State.scores[1];
    if(cache2.score !== s2) { document.getElementById('hud2Score').textContent=s2.toLocaleString(); cache2.score=s2; }
    if(cache2.lives !== p2.lives) {
      cache2.lives = p2.lives;
      const lb2=document.getElementById('livesBar2'); lb2.innerHTML='';
      for(let i=0;i<5;i++) {
        const span=document.createElement('span'); span.className='life-icon'+(i>=p2.lives?' lost':'');
        span.textContent='♥'; span.style.color='#ff0'; lb2.appendChild(span);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 16 – SURVIVOR UI
// ═══════════════════════════════════════════════════════════════════
function buildSurvivorAbilityBar() {
  const wrap=document.getElementById('survivorAbilitiesHud'); wrap.innerHTML='';
  State.survivorAbilities.forEach((ab,i)=>{
    const slot=document.createElement('div'); slot.className='power-slot';
    slot.innerHTML=`<div class="power-label">${ab.icon} [${i+1}]</div><div class="power-btn" id="sab${i}" onclick="useSurvivorAbility(${i})">${ab.icon}<div class="power-cd" id="sabcd${i}" style="height:0"></div><div class="power-key">${i+1}</div></div>`;
    wrap.appendChild(slot);
  });
}
function updateSurvivorAbilityBar() {
  State.survivorAbilities.forEach((ab,i)=>{
    const btn=document.getElementById(`sab${i}`);
    const cd=document.getElementById(`sabcd${i}`);
    if(!btn||!cd) return;
    btn.classList.remove('ready','maxed');
    if(ab.level>=ab.maxLevel) btn.classList.add('maxed');
    else if(ab.cooldown<=0&&ab.level>0) btn.classList.add('ready');
    cd.style.height=(ab.cooldown/ab.maxCooldown*100)+'%';
  });
}
function useSurvivorAbility(idx) {
  if(State.paused||!State.running) return;
  const ab=State.survivorAbilities[idx];
  if(!ab||ab.cooldown>0||ab.level<=0) return;
  switch(ab.name) {
    case 'Defense': State.shieldActive=true; State.shieldEndTime=Date.now()+ab.level*2000; break;
    case 'Special': if(State.players[0]) State.players[0].activateAbility(); break;
  }
  ab.cooldown=ab.maxCooldown;
  updateSurvivorAbilityBar();
  playSound('abilitySound');
}
function addXP(amount) {
  State.xp+=amount*State.xpMultiplier;
  document.getElementById('xpFill').style.width=Math.min(100,(State.xp/State.xpToNextLevel)*100)+'%';
  if(State.xp>=State.xpToNextLevel) levelUp();
}
function levelUp() {
  State.xp-=State.xpToNextLevel; State.level++;
  State.xpToNextLevel=Math.floor(100*Math.pow(1.2,State.level-1));
  document.getElementById('xpLevelLabel').textContent='LVL '+State.level;
  playSound('levelUpSound');
  // IMPROVEMENT 12: wave announce
  showWaveAnnounce('LEVEL UP!','#39ff14');
  showUpgradeScreen();
}
function showUpgradeScreen() {
  State.paused=true;
  let options=[];
  if(State.openWorldMode||State.survivorMode) {
    // Use run upgrade pool for open world and survivor
    const available=RUN_UPGRADES_POOL.filter(u=>(State.runUpgrades[u.id]||0)<u.maxLevel);
    if(available.length===0) {
      // Fallback: basic bonuses
      options=[{id:'_life',name:'HULL REPAIR',icon:'❤️',desc:'Adds 1 life',type:'life'},{id:'_magnet',name:'XP MAGNET',icon:'🧲',desc:'+80px XP attraction',type:'magnet'},{id:'_xpmult',name:'SCHOLAR',icon:'📚',desc:'+30% XP gain',type:'xpMult'}];
    } else {
      options=[...available].sort(()=>Math.random()-0.5).slice(0,3);
    }
  } else {
    const nonMaxed=State.survivorAbilities.filter(a=>a.level<a.maxLevel);
    options=nonMaxed.length===0?[{id:'_life',name:'Extra Life',icon:'❤️',desc:'Adds 1 life',type:'life'},{id:'_magnet',name:'Magnet',icon:'🧲',desc:'+50px XP attraction',type:'magnet'},{id:'_xpmult',name:'XP Boost',icon:'📚',desc:'+25% XP gain',type:'xpMult'}]:
      [...nonMaxed].sort(()=>Math.random()-0.5).slice(0,3);
  }
  const wrap=document.getElementById('upgradeOptions'); wrap.innerHTML='';
  options.forEach((up,i)=>{
    const div=document.createElement('div'); div.className='up-card';
    const curLv=(State.runUpgrades[up.id]||0);
    const maxLv=up.maxLevel||5;
    div.innerHTML=`<h3>${up.icon||''} ${up.name}${up.id&&!up.id.startsWith('_')&&curLv>0?` LV${curLv}→${curLv+1}`:''}</h3><p>${up.desc}</p>`;
    div.onclick=()=>selectUpgrade(options,i); wrap.appendChild(div);
  });
  document.getElementById('upgradeScreen').classList.add('open');
}
function selectUpgrade(options,idx) {
  const up=options[idx];
  if(up.type==='life') { if(State.players[0]) State.players[0].lives=Math.min(State.players[0].lives+1,5); }
  else if(up.type==='magnet') { State.magnetRadius+=(State.openWorldMode?80:50); }
  else if(up.type==='xpMult') { State.xpMultiplier+=(State.openWorldMode?0.30:0.25); }
  else if(up.apply) {
    // RUN_UPGRADES_POOL entry
    State.runUpgrades[up.id]=(State.runUpgrades[up.id]||0)+1;
    if(State.players[0]) up.apply(State.players[0]);
  } else {
    const ab=State.survivorAbilities.find(a=>a.name===up.name);
    if(ab){ab.level++;ab.maxCooldown=Math.max(1000,ab.maxCooldown-ab.level*200);if(ab.level>State.stats.maxUpgradeLevel){State.stats.maxUpgradeLevel=ab.level;checkAchievements();}}
  }
  document.getElementById('upgradeScreen').classList.remove('open');
  State.paused=false; updateSurvivorAbilityBar(); gameLoop();
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 17 – INFINITE ABILITIES
// ═══════════════════════════════════════════════════════════════════
function useAbility(name) {
  if(State.infiniteCooldowns[name]>0||!State.infiniteMode) return;
  playSound('abilitySound');
  switch(name) {
    case 'nuke':
      State.enemies.forEach(e=>{triggerExplosion(e.x+e.width/2,e.y+e.height/2,'#ff3333',30);State.scores[0]+=10;State.stats.enemiesKilled++;});
      State.enemies=[];
      showWaveAnnounce('NUKE!','#ff3333');
      break;
    case 'heal':
      State.players.forEach(p=>{p.lives=5;});
      triggerExplosion(State.players[0].x+25,State.players[0].y+25,'#ff69b4',50);
      showWaveAnnounce('FULL HEAL','#ff69b4');
      break;
    case 'shield':
      State.players.forEach(p=>{p.permanentShield=true;});
      triggerExplosion(State.players[0].x+25,State.players[0].y+25,'#00f5ff',50);
      showWaveAnnounce('SHIELD UP','#00f5ff');
      break;
  }
  State.infiniteCooldowns[name]=INFINITE_COOLDOWNS[name];
  updateInfiniteAbilityBar();
}
function updateInfiniteAbilityBar() {
  const btns={nuke:'pbNuke',heal:'pbHeal',shield:'pbShield'};
  const cds={nuke:'cdNuke',heal:'cdHeal',shield:'cdShield'};
  Object.keys(btns).forEach(k=>{
    const cd=State.infiniteCooldowns[k]||0, max=INFINITE_COOLDOWNS[k];
    const btn=document.getElementById(btns[k]);
    if(btn) { btn.classList.toggle('ready',cd<=0); }
    const cdEl=document.getElementById(cds[k]);
    if(cdEl) cdEl.style.height=(cd/max*100)+'%';
  });
}

// ─ IMPROVEMENT 12: Wave announce
function showWaveAnnounce(text,color='#00f5ff') {
  const el=document.getElementById('waveAnnounce');
  el.textContent=text; el.style.color=color;
  el.style.textShadow=`0 0 30px ${color}`;
  el.style.opacity='1'; el.style.transition='none';
  setTimeout(()=>{ el.style.transition='opacity 0.8s'; el.style.opacity='0'; }, 1200);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 18 – BOSS INTRO
// ═══════════════════════════════════════════════════════════════════
function showBossIntro(level) {
  const data=BOSSES_DATA[level-1]; if(!data) return;
  if(hasSeenBoss(level)) return;                 // Phase 4: skip after first win
  const el=document.getElementById('bossIntroEl');
  document.getElementById('bossIntroName').textContent=data.name;
  document.getElementById('bossIntroSub').textContent=data.subtitle;
  el.style.display='block'; el.style.animation='none';
  void el.offsetWidth;
  el.style.animation='bossIn 3s ease-out forwards';
  setTimeout(()=>{el.style.display='none';},3000);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 19 – PHASE LOADING
// ═══════════════════════════════════════════════════════════════════
function showPhaseLoading(nextLevel) {
  State.running=false; document.getElementById('bossBarWrap').classList.remove('visible');
  document.getElementById('nextPhase').textContent=nextLevel;
  const screen=document.getElementById('phaseLoading'), bar=document.getElementById('loadingProgress2');
  screen.classList.add('active'); bar.style.width='0%';
  let prog=0;
  const iv=setInterval(()=>{
    prog+=2; bar.style.width=prog+'%';
    if(prog>=100) {
      clearInterval(iv); screen.classList.remove('active');
      State.running=true; State.bossSpawned=false;
      if(State.gameLevel%2===0) State.players.forEach(p=>{if(p.lives<5)p.lives++;});
      gameLoop();
    }
  },30);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 20 – GAME LIFECYCLE
// ═══════════════════════════════════════════════════════════════════
function startGame() {
  hideAllOverlays();
  CANVAS.style.display='block';
  State.running=true; State.paused=false; State._dying=false;
  State.enemies=[]; State.boss=null; State.powerUps=[]; State.explosions=[]; State.xpOrbs=[]; State.scheduledEvents=[];
  State.floatingTexts=[]; State.scores=[0,0];
  State.gameLevel=1; State.wave=1; State.bossSpawned=false; State.uniqueSpawned=false;
  State.lastEnemySpawn=Date.now(); State.gameStartTime=Date.now();
  resetRunStats();                                  // Phase 4: per-run stat tracking
  transition(GameStates.PLAYING);                   // Phase 3: state machine
  State.powerUpActive=false; State.shieldActive=false;
  State.stats.phaseDamageTaken=0; State.stats.currentCombo=0; State.stats.lastKillTime=0;
  State.screenShake=0; State.trauma=0;
  State.doubleDamage=false; State.phoenixUsed=false;
  State._dailyCoinMult=1; State._dailyNoShield=false; State._dailyFastBoss=false; State._dailyScoreMult=1;
  // Reset run-specific equipment state
  State.runEquipment={ weapon:null, armor:null, accessory:null, relic:null };
  State.activeSynergies=[];
  State.materialInventory={};
  State.collectedItems=[];
  State.runUpgrades={};
  State.onlineBossKillCount=0;
  const count=State.twoPlayer?2:1;
  State.players=[];
  for(let i=0;i<count;i++) State.players.push(new Player(State.selectedChar[i],i));
  State.players.forEach(p=>applySkillBonuses(p));
  State.players.forEach(p=>applyEquipment(p));
  if(State.players[0]) checkSynergies(State.players[0]);
  // Track new chars
  const newChars=['omega','phantom','titan'];
  if(State.selectedChar.some(c=>newChars.includes(c))) State.stats.newCharPlayed=true;

  if(State.survivorMode) {
    State.xp=0; State.xpToNextLevel=100; State.level=1;
    State.survivorStartTime=Date.now(); State.survivorElapsed=0;
    State.magnetRadius=0; State.xpMultiplier=1;
    State.survivorAbilities=freshSurvivorAbilities();
    document.getElementById('survivorAbilitiesHud').style.display='flex';
    document.getElementById('xpBarWrap').style.display='block';
    document.getElementById('xpLevelLabel').textContent='LVL 1';
    buildSurvivorAbilityBar();
  } else {
    document.getElementById('survivorAbilitiesHud').style.display='none';
    document.getElementById('xpBarWrap').style.display='none';
  }
  if(State.infiniteMode) {
    document.getElementById('infiniteAbilitiesHud').style.display='flex';
    State.infiniteCooldowns={nuke:0,heal:0,shield:0};
    updateInfiniteAbilityBar();
  } else {
    document.getElementById('infiniteAbilitiesHud').style.display='none';
  }

  setHUDVisible(true); updateHUD(); initStars();
  // IMPROVEMENT 13: wave announce on start
  showWaveAnnounce(State.infiniteMode?'WAVE 1 BEGIN!':State.survivorMode?'SURVIVOR START!':'PHASE 1 BEGIN!','#00f5ff');
  gameLoop();
}

function gameOver() {
  State.running=false;
  transition(GameStates.GAME_OVER);                // Phase 3
  document.getElementById('bossBarWrap').classList.remove('visible');
  document.getElementById('finalScore').textContent='SCORE: '+State.scores[0].toLocaleString();
  const p2el=document.getElementById('finalScoreP2');
  if(State.twoPlayer){p2el.style.display='block';p2el.textContent='P2: '+State.scores[1].toLocaleString();}else p2el.style.display='none';
  const stEl=document.getElementById('survivorTimeEl');
  if(State.survivorMode){stEl.style.display='block';stEl.textContent='TIME: '+formatTime(State.survivorElapsed);}else stEl.style.display='none';
  // Phase 4: full run-stats breakdown
  renderRunStatsPanel();
  const isNew = saveHighScore(getCurrentHSMode(), State.scores[0]);
  const badge = document.getElementById('newHsBadge');
  badge.style.display = isNew ? 'block' : 'none';
  const pName = getPlayerName();
  if (pName) submitScore(getCurrentHSMode(), State.scores[0], pName);
  checkDailyComplete(State.scores[0]);
  if (_onlineMode) endOnlineSession();
  setHUDVisible(false); navigateMenu('gameOver');
}

// Phase 4: populate game-over stats breakdown
function renderRunStatsPanel(){
  const el = document.getElementById('runStatsPanel'); if(!el) return;
  const r = State.runStats || {};
  const dur = Math.max(0, Math.floor((Date.now() - (r.startedAt||Date.now()))/1000));
  const mm = Math.floor(dur/60), ss = String(dur%60).padStart(2,'0');
  const accPct = r.shotsFired ? Math.round(100*r.shotsHit/r.shotsFired) : 0;
  const killsTotal = Object.values(r.kills||{}).reduce((a,b)=>a+b,0);
  const killsBreakdown = Object.entries(r.kills||{})
    .sort((a,b)=>b[1]-a[1])
    .map(([t,n]) => `<span style="color:#9ad">${t}</span>: ${n}`).join(' · ') || 'none';
  el.innerHTML = `
    <div class="rs-row"><span>TIME</span><span>${mm}:${ss}</span></div>
    <div class="rs-row"><span>KILLS</span><span>${killsTotal}</span></div>
    <div class="rs-row"><span>BOSSES</span><span>${r.bossesKilled||0}</span></div>
    <div class="rs-row"><span>BEST COMBO</span><span>×${r.bestCombo||0}</span></div>
    <div class="rs-row"><span>ACCURACY</span><span>${accPct}% (${r.shotsHit||0}/${r.shotsFired||0})</span></div>
    <div class="rs-row"><span>DAMAGE TAKEN</span><span>${r.damageTaken||0}</span></div>
    <div class="rs-row" style="opacity:.7;font-size:10px;margin-top:6px;"><span>BY TYPE</span><span style="text-align:right">${killsBreakdown}</span></div>
  `;
}

function finalEnding() {
  State.running=false;
  document.getElementById('bossBarWrap').classList.remove('visible');
  document.getElementById('finalEndingScore').textContent='SCORE: '+State.scores[0].toLocaleString();
  const p2el=document.getElementById('finalEndingScoreP2');
  if(State.twoPlayer){p2el.style.display='block';p2el.textContent='P2: '+State.scores[1].toLocaleString();State.stats.multiplayerWins++;checkAchievements();}else p2el.style.display='none';
  const isNew = saveHighScore(getCurrentHSMode(), State.scores[0]);
  const badgeVic = document.getElementById('newHsBadgeVic');
  badgeVic.style.display = isNew ? 'block' : 'none';
  const pName2 = getPlayerName();
  if (pName2) submitScore(getCurrentHSMode(), State.scores[0], pName2);
  checkDailyComplete(State.scores[0]);
  if (_onlineMode) endOnlineSession();
  setHUDVisible(false); navigateMenu('finalEnding');
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 21 – ENEMY SPAWNING
// ═══════════════════════════════════════════════════════════════════
function getEnemyPool() {
  if(State.infiniteMode||State.survivorMode) {
    const pool=['basic','ufo','tank','fast','spinner','diver'];
    if(State.wave>=8||State.survivorElapsed>=120) pool.push('bomber');
    return pool;
  }
  const pool=['basic','ufo'];
  if(State.gameLevel>=2) pool.push('tank');
  if(State.gameLevel>=3) pool.push('fast');
  if(State.gameLevel>=5) pool.push('bomber');
  if(State.gameLevel>=6) pool.push('spinner');
  if(State.gameLevel>=7) pool.push('diver');
  return pool;
}
// ─── Phase 1.1: scheduled-events queue (replaces setTimeout in game loop) ───
function scheduleEvent(delayMs, fn) {
  State.scheduledEvents.push({ time: performance.now() + delayMs, fn, done:false });
}
function processScheduledEvents() {
  const q = State.scheduledEvents;
  if(!q.length) return;
  const now = performance.now();
  for(let i=0;i<q.length;i++){
    const ev = q[i];
    if(!ev.done && now >= ev.time){ ev.done = true; try{ ev.fn(); }catch(e){ console.error(e); } }
  }
  if(q.some(e=>e.done)) State.scheduledEvents = q.filter(e=>!e.done);
}

// ─── Phase 1.1: hitstop / slow-motion / screen flash ───
function triggerHitstop(ms) {
  State.hitstopUntil = Math.max(State.hitstopUntil, performance.now() + ms);
}
function triggerSlowmo(scale, durationMs) {
  State.slowmoScale = scale;
  State.slowmoUntil = performance.now() + durationMs;
}
// Phase 1.2: trauma-based screen shake (shake = trauma², decays linearly)
function addTrauma(amount) {
  State.trauma = Math.min(1, State.trauma + amount);
}
function flashScreen(ms) {
  if(SETTINGS_EXTENDED.flashEffectsEnabled === false) return;
  const f = document.getElementById('warpFlash');
  if(!f) return;
  f.style.background = '#fff';
  f.style.transition = 'opacity 0.04s';
  f.style.display = 'block';
  f.style.opacity = '0.9';
  setTimeout(() => {
    f.style.transition = 'opacity 0.2s';
    f.style.opacity = '0';
    setTimeout(() => { f.style.display = 'none'; }, 240);
  }, ms || 100);
}

// ═══════════════════════════════════════════════════════════════════
// Phase 3 — Single-file architecture (centralized config, state machine,
// input abstraction, save versioning, online robustness)
// ═══════════════════════════════════════════════════════════════════
const CONFIG = {
  COMBO:   { timeoutMs: 2500, asymptoteN: 11, maxMultiplier: 5 },
  CRIT:    { rate: 0.08, multiplier: 2 },
  HITSTOP: { boss: 200, heavy: 55 },
  SHAKE:   { playerHit:0.6, heavyKill:0.35, bossHit:0.4, bossDeath:1.0,
             nuke:0.7, warp:0.5, generic:0.15, traumaDecayPerTick:0.025,
             pxPerTrauma:16 },
  HAPTIC:  { playerHit:100, heavyKill:[30,20,30],
             bossHit:[30,20,30], bossDeath:[60,30,60,30,80] },
  CAPS:    { explosions:24, floatingTexts:36, particlePoolLow:200 },
  ADAPTIVE:{ lowFps:45, veryLowFps:30, sustainSec:2 },
  ONLINE:  { syncRateMs:50, pingIntervalMs:2000,
             reconnectBackoffMs:[1000,2000,4000,8000] },
};

const GameStates = Object.freeze({
  BOOT:'boot', MENU:'menu', LOADING:'loading',
  PLAYING:'playing', PAUSED:'paused', GAME_OVER:'over', VICTORY:'win'
});
State._fsm = GameStates.BOOT;
function transition(to) {
  if(!Object.values(GameStates).includes(to)) { console.warn('Invalid state:', to); return; }
  State._fsm = to;
}

// Input abstraction (additive — existing handlers still drive gameplay)
const Input = {
  _keys:{}, _touch:{}, _gp:{},
  _norm(k){ return (k||'').toLowerCase(); },
  isPressed(action){
    const k = this._keys;
    if(action==='shoot')    return !!(k[' ']||k['arrowup']||k['w']||this._touch.fire||this._gp.shoot);
    if(action==='ability')  return !!(k['a']||this._touch.ability||this._gp.ability);
    if(action==='pause')    return !!(k['p']||k['escape']);
    if(action==='left')     return !!(k['arrowleft']||k['a']||this._touch.left);
    if(action==='right')    return !!(k['arrowright']||k['d']||this._touch.right);
    return false;
  },
  getAxis(name){
    if(name==='horizontal'){
      let v=0;
      if(this.isPressed('left'))  v -= 1;
      if(this.isPressed('right')) v += 1;
      return v;
    }
    return 0;
  },
};
window.addEventListener('keydown', e => { Input._keys[Input._norm(e.key)] = true; });
window.addEventListener('keyup',   e => { Input._keys[Input._norm(e.key)] = false; });

// Save versioning + export/import
const SAVE_VERSION = 3;
function _migrateSave(d){
  if(!d) return d;
  d.version = d.version || 1;
  while(d.version < SAVE_VERSION) {
    if(d.version === 1) { d.unlockedSkills = d.unlockedSkills || {}; }
    if(d.version === 2) { d.runStatsHistory = d.runStatsHistory || []; }
    d.version++;
  }
  return d;
}
window.exportSave = function exportSave(){
  try {
    const data = JSON.parse(localStorage.getItem('rafaPaoliV2')||'{}');
    data.version = SAVE_VERSION;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rafa-paoli-save-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  } catch(e){ alert('Export failed: '+e.message); }
};
window.importSave = function importSave(){
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='application/json';
  inp.onchange = e => {
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = _migrateSave(JSON.parse(ev.target.result));
        localStorage.setItem('rafaPaoliV2', JSON.stringify(d));
        alert('Save importado. A página vai recarregar.');
        location.reload();
      } catch(err){ alert('Save inválido: ' + err.message); }
    };
    r.readAsText(f);
  };
  inp.click();
};

// ═══════════════════════════════════════════════════════════════════
// Phase 4 — Polish & content (run stats, daily seed, options toggles)
// ═══════════════════════════════════════════════════════════════════
State.runStats = { startedAt:0, kills:{}, shotsFired:0, shotsHit:0, damageTaken:0, bossesKilled:0, bestCombo:0 };
function resetRunStats(){
  State.runStats = { startedAt: Date.now(), kills:{}, shotsFired:0, shotsHit:0, damageTaken:0, bossesKilled:0, bestCombo:0 };
}
function trackKill(type){
  State.runStats.kills[type] = (State.runStats.kills[type]||0) + 1;
}

function applyAccessibilityClasses(){
  document.body.classList.toggle('colorblind', !!SETTINGS_EXTENDED.colorblindMode);
  document.body.classList.toggle('high-contrast', !!SETTINGS_EXTENDED.highContrast);
}
SETTINGS_EXTENDED.highContrast = SETTINGS_EXTENDED.highContrast || false;
window.toggleColorblind = function(){
  SETTINGS_EXTENDED.colorblindMode = !SETTINGS_EXTENDED.colorblindMode;
  applyAccessibilityClasses(); SETTINGS_EXTENDED.save();
};
window.toggleHighContrast = function(){
  SETTINGS_EXTENDED.highContrast = !SETTINGS_EXTENDED.highContrast;
  applyAccessibilityClasses(); SETTINGS_EXTENDED.save();
};

// Independent SFX / Music volume sliders
SETTINGS_EXTENDED.sfxVolume   = (typeof SETTINGS_EXTENDED.sfxVolume   === 'number') ? SETTINGS_EXTENDED.sfxVolume   : 1.0;
SETTINGS_EXTENDED.musicVolume = (typeof SETTINGS_EXTENDED.musicVolume === 'number') ? SETTINGS_EXTENDED.musicVolume : 1.0;
function applySfxVolume(){
  if(typeof SOUND_SYSTEM !== 'undefined' && SOUND_SYSTEM.setVolume){
    SOUND_SYSTEM.setVolume(masterVolume * SETTINGS_EXTENDED.sfxVolume);
  }
}
function applyMusicVolume(){
  if(typeof SOUND_SYSTEM !== 'undefined' && SOUND_SYSTEM.ambientGain){
    try { SOUND_SYSTEM.ambientGain.gain.value = 0.04 * SETTINGS_EXTENDED.musicVolume; } catch(e){}
  }
}

// Skip boss intro after first kill of that boss
function hasSeenBoss(level){
  try { return !!JSON.parse(localStorage.getItem('rp_seenBoss')||'{}')[level]; } catch(e){ return false; }
}
function markBossSeen(level){
  try {
    const m = JSON.parse(localStorage.getItem('rp_seenBoss')||'{}');
    m[level]=1; localStorage.setItem('rp_seenBoss', JSON.stringify(m));
  } catch(e){}
}

// Confirmation before quitting an active run
window.confirmBackToMenu = function(){
  if(State.running && !State._dying){
    if(!confirm('Voltar pro menu? O progresso da partida será perdido.')) return;
  }
  backToMenu();
};

// ─── Phase 1.3-1.8: game-feel helpers ───
const FEEL = { spawnWarnings:[], mkCount:0, mkLast:0 };

function nearestPlayer(x,y) {
  let best=null,bd=1e9;
  for(const p of State.players){ if(!p||p.lives<=0) continue;
    const d=Math.hypot((p.x+p.width/2)-x,(p.y+p.height/2)-y);
    if(d<bd){ bd=d; best=p; }
  }
  return best;
}
function comboMultiplier(combo){
  if(combo<2) return 1;
  return 1 + 4*(1 - Math.exp(-(combo-1)/11));   // -> 5x asymptote
}
function haptic(pattern){
  if(SETTINGS_EXTENDED.hapticsEnabled === false) return;
  if(navigator.vibrate) { try{ navigator.vibrate(pattern); }catch(e){} }
}
// 1.3 spawn warnings
function addSpawnWarning(x, at){ FEEL.spawnWarnings.push({x, at}); }
function drawSpawnWarnings(){
  const now=performance.now();
  FEEL.spawnWarnings = FEEL.spawnWarnings.filter(w=>w.at>now);
  for(const w of FEEL.spawnWarnings){
    if(w.at-now > 600) continue;
    if(Math.sin(now/70) <= 0) continue;             // blink
    CTX.fillStyle='rgba(255,40,40,0.92)';
    CTX.strokeStyle='rgba(255,210,210,0.95)'; CTX.lineWidth=1.5;
    CTX.beginPath();
    CTX.moveTo(w.x,20); CTX.lineTo(w.x-9,3); CTX.lineTo(w.x+9,3); CTX.closePath();
    CTX.fill(); CTX.stroke();
  }
}
// 1.4 enemy hit flash overlay
function drawHitFlash(e){
  if(!e || !e._hitFlash || e._hitFlash<=0) return;
  e._hitFlash--;
  CTX.save();
  CTX.globalCompositeOperation='lighter';
  CTX.globalAlpha=0.55;
  CTX.fillStyle='#ffffff';
  CTX.fillRect(e.x-2, e.y-2, e.width+4, e.height+4);
  CTX.restore();
}
// 1.4 central enemy-damage application (crit + flash + knockback + number)
function hitEnemy(e, dmg){
  const crit = Math.random() < CONFIG.CRIT.rate;
  const real = dmg * (crit ? CONFIG.CRIT.multiplier : 1);
  e.health -= real;
  e._hitFlash = 2;
  e.y -= 3;                                          // knockback along bullet axis
  const ft = new FloatingText(e.x+e.width/2, e.y, (crit?'CRIT ':'') + (Math.round(real*10)/10), crit?'#ffe000':'#ffffff');
  ft.size = crit ? 20 : 13;
  State.floatingTexts.push(ft);
  if(crit){
    playSound('crit');
    State.explosions.push(new Explosion(e.x+e.width/2, e.y+e.height/2, '#ffe000', 8));
  }
  return crit;
}
// 1.4 near-miss detection (enemy bullet barely misses player)
function checkNearMiss(b, p){
  if(!b || !p || b._nm) return;
  const bw=b.width||4, bh=b.height||4;
  const bx=b.x+bw/2, by=b.y+bh/2;
  const px=p.x+p.width/2, py=p.y+p.height/2;
  const d=Math.hypot(bx-px, by-py);
  if(d < p.width/2 + 14 && d > p.width/2 + 1){
    b._nm = true;
    State.scores[p.index] = (State.scores[p.index]||0) + 50;
    const ft = new FloatingText(px, py-22, 'CLOSE! +50', '#ffffff');
    ft.size=12; State.floatingTexts.push(ft);
    p._nearFlash = performance.now();
  }
}
// 1.5 player FX wrapper: recoil + muzzle flash + near-miss flash + i-frame aura
function drawPlayer(p){
  const r = p._recoil || 0;
  if(r>0){ CTX.save(); CTX.translate(0, r); }
  p.draw();
  if(r>0){ CTX.restore(); p._recoil = Math.max(0, r-0.5); }
  // muzzle flash
  if(p._muzzle && performance.now()-p._muzzle < 80){
    const cx = p.x + p.width/2;
    const pvpFlip = State.pvpMode && p.index===1;
    const my = pvpFlip ? p.y + p.height : p.y;
    const a = 1 - (performance.now()-p._muzzle)/80;
    CTX.save(); CTX.globalCompositeOperation='lighter';
    CTX.globalAlpha = a;
    CTX.fillStyle = '#fff7c0';
    CTX.shadowColor = '#ffea00'; CTX.shadowBlur = 14;
    CTX.beginPath(); CTX.arc(cx, my, 8*a + 4, 0, Math.PI*2); CTX.fill();
    CTX.restore();
  }
  // near-miss white flash
  if(p._nearFlash && performance.now()-p._nearFlash < 120){
    CTX.save(); CTX.globalCompositeOperation='lighter';
    CTX.globalAlpha = 0.5 * (1 - (performance.now()-p._nearFlash)/120);
    CTX.fillStyle = '#ffffff';
    CTX.fillRect(p.x-3, p.y-3, p.width+6, p.height+6);
    CTX.restore();
  }
}
// 1.6 multi-kill announce
function announceMultiKill(text, color){
  showWaveAnnounce(text, color);
}
// 1.5 death sequence (slowmo + fragment burst then game over)
function startDeathSequence(){
  if(State._dying) return;
  State._dying = true;
  triggerSlowmo(0.3, 1300);
  triggerHitstop(140);
  addTrauma(0.85);
  const p = State.players.find(p=>p);
  if(p){
    for(let i=0;i<4;i++) scheduleEvent(i*110, () => triggerExplosion(
      p.x + p.width/2 + rand(-22,22),
      p.y + p.height/2 + rand(-22,22),
      i===0?'#ffffff':'#ff8800', 28));
  }
  setTimeout(() => { State._dying = false; gameOver(); }, 1500);
}

function spawnEnemy() {
  const now=Date.now();
  let interval;
  if(State.infiniteMode) interval=Math.max(100,500-State.wave*10);
  else if(State.survivorMode) interval=Math.max(100,500-State.survivorElapsed/10);
  else interval=Math.max(300,1000-State.gameLevel*50);
  if(now-State.lastEnemySpawn<interval) return;
  State.lastEnemySpawn=now;
  const pool=getEnemyPool();
  let count=1;
  if(State.infiniteMode) count=Math.min(Math.floor(State.wave/3)+1,5);
  if(State.survivorMode) count=Math.min(Math.floor(State.survivorElapsed/30)+1,5);
  const surMult=State.survivorMode?(DIFFICULTY_CFG[State.survivorDifficulty]?.multiplier??1):1;
  for(let i=0;i<count;i++) {
    const spawnX = Math.random()*(CANVAS.width-50);
    addSpawnWarning(spawnX+25, performance.now()+i*200+500);
    scheduleEvent(i*200+500,()=>{
      const type=pool[Math.floor(Math.random()*pool.length)];
      const enemy=createEnemy(type);
      enemy.x = Math.min(spawnX, CANVAS.width-enemy.width);
      if(State.infiniteMode&&type==='tank') enemy.health=Math.min(3+Math.floor(State.wave/5),10);
      if(State.infiniteMode&&type==='fast') enemy.speed=5+Math.random()+State.wave*0.1;
      if(State.survivorMode) {
        enemy.speed*=surMult; enemy.maxHealth=enemy.health;
        if(type==='tank'){enemy.health=Math.max(1,Math.floor(3*surMult));enemy.maxHealth=enemy.health;}
        if(type==='spinner'){enemy.health=Math.max(1,Math.floor(2*surMult));enemy.maxHealth=enemy.health;enemy.shootInterval=Math.max(500,enemy.shootInterval/surMult);}
      }
      State.enemies.push(enemy);
    });
  }
}

