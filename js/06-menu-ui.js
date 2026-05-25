// ═══════════════════════════════════════════════════════════════════
// SECTION 13 – PERSISTENCE (coins/skins/achievements)
// ═══════════════════════════════════════════════════════════════════
function addCoins(amount) {
  const final=Math.floor(amount*getDifficultyMult());
  State.coins+=final; State.stats.totalCoinsEarned+=final;
  updateHUD(); checkAchievements(); saveGameData();
}

// Phase 2.3: debounce + idle-defer save so localStorage writes never block a frame
function saveGameData() {
  if(saveGameData._queued) return;
  saveGameData._queued = true;
  const body = () => {
    saveGameData._queued = false;
    try { localStorage.setItem('rafaPaoliV2',JSON.stringify({coins:State.coins,unlockedSkins:State.unlockedSkins,equippedSkin:State.equippedSkin,achievements:State.achievements,difficulty:State.difficulty,stats:State.stats,unlockedSkills:State.unlockedSkills,unlockedChars:State.unlockedChars})); } catch(e){}
  };
  if(window.requestIdleCallback) requestIdleCallback(body, { timeout:1500 });
  else setTimeout(body, 50);
}
function loadGameData() {
  try { const d=JSON.parse(localStorage.getItem('rafaPaoliV2')||'null'); if(!d) return; State.coins=d.coins||0; State.unlockedSkins=d.unlockedSkins||['default']; State.equippedSkin=d.equippedSkin||'default'; State.achievements=d.achievements||[]; State.difficulty=d.difficulty||'normal'; if(d.stats) Object.assign(State.stats,d.stats); if(d.unlockedSkills) State.unlockedSkills=d.unlockedSkills; if(d.unlockedChars) State.unlockedChars=d.unlockedChars; } catch(e){}
}

function checkAchievements() {
  ACHIEVEMENTS_DATA.forEach(ach=>{
    if(State.achievements.includes(ach.id)) return;
    const {cur,max}=ach.progress(State.stats);
    if(cur>=max) { State.achievements.push(ach.id); addCoins(ach.reward); showAchievementToast(ach); saveGameData(); }
  });
}

function showAchievementToast(ach) {
  const t=document.getElementById('achToast');
  document.getElementById('achToastTitle').textContent=ach.name;
  document.getElementById('achToastDesc').textContent=ach.desc+` (+${ach.reward} coins)`;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3200);
}

function showShop() {
  const c=document.getElementById('shopItems'); c.innerHTML='';
  SKINS_DATA.forEach(skin=>{
    const owned=State.unlockedSkins.includes(skin.id);
    const equipped=State.equippedSkin===skin.id;
    const div=document.createElement('div'); div.className='skin-row';
    div.innerHTML=`<div class="skin-swatch" style="background:${skin.color}"></div><div class="skin-info"><strong>${skin.name}</strong><small>${skin.desc}</small></div><span class="skin-price">${skin.price||'FREE'}</span>${owned?`<button class="skin-btn ${equipped?'equipped':''}" ${equipped?'disabled':''} onclick="equipSkin('${skin.id}')">${equipped?'EQUIPPED':'EQUIP'}</button>`:`<button class="skin-btn" ${State.coins>=skin.price?'':'disabled'} onclick="buySkin('${skin.id}')">BUY</button>`}`;
    c.appendChild(div);
  });
  openModal('shopModal');
}

function buySkin(id) {
  const skin=SKINS_DATA.find(s=>s.id===id);
  if(!skin||State.coins<skin.price) return;
  State.coins-=skin.price; State.unlockedSkins.push(id);
  updateHUD(); showShop(); saveGameData();
}
function equipSkin(id) {
  if(!State.unlockedSkins.includes(id)) return;
  State.equippedSkin=id; State.players.forEach(p=>{p.skin=id;});
  showShop(); saveGameData();
}

function showAchievements() {
  const c=document.getElementById('achList'); c.innerHTML='';
  ACHIEVEMENTS_DATA.forEach(ach=>{
    const unlocked=State.achievements.includes(ach.id);
    const {cur,max}=ach.progress(State.stats);
    const pct=Math.min(cur/max*100,100);
    const div=document.createElement('div'); div.className='ach-row'+(unlocked?'':' locked');
    div.innerHTML=`<div class="ach-icon">${ach.icon}</div><div class="ach-body"><h3>${ach.name}</h3><p>${ach.desc}</p><div class="ach-prog"><div class="ach-prog-fill" style="width:${pct}%"></div></div><div class="ach-status" style="color:${unlocked?'#39ff14':'#ff006e'}">${unlocked?'✔ UNLOCKED':'LOCKED'} — ${ach.reward} COINS</div></div>`;
    c.appendChild(div);
  });
  openModal('achModal');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ═══════════════════════════════════════════════════════════════════
// SECTION 14 – MENU NAVIGATION
// ═══════════════════════════════════════════════════════════════════
const ALL_OVERLAYS=['gameModeSelect','difficultyScreen','characterSelect','survivorModeScreen','pauseScreen','gameOver','finalEnding','instructionsScreen','settingsPanel','skillTreePanel','bossRushScreen','statsScreen','onlineScreen','equipScreen','pvpOver','rpgPanel','economyPanel','missionBoard','shipCustomPanel','achGallery','challengeScreen','mpSimPanel','navPanel','bossEncounterOverlay','narrativeOverlay'];

function hideAllOverlays() {
  document.getElementById('titleScreen').style.display='none';
  ALL_OVERLAYS.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove('active'); });
}

function navigateMenu(target) {
  hideAllOverlays();
  if(target==='main') {
    // Reset open world mode flag when returning to main menu (not during active game)
    if(!State.running) State.openWorldMode=false;
    document.getElementById('titleScreen').style.display='flex';
    document.getElementById('menuCoins').textContent=State.coins;
    updateTitleStats();
    updateTitleHighScores();
  } else {
    const el=document.getElementById(target);
    if(el) el.classList.add('active');
  }
}

function buildDifficultyOptions(containerId,onSelect) {
  const wrap=document.getElementById(containerId); wrap.innerHTML='';
  Object.entries(DIFFICULTY_CFG).forEach(([key,cfg])=>{
    const div=document.createElement('div'); div.className='opt-card'+(State.difficulty===key?' selected':'');
    div.innerHTML=`<div class="opt-title">${cfg.label}</div><div class="opt-desc">${cfg.desc}</div><span class="opt-badge">×${cfg.multiplier}</span>`;
    div.onclick=()=>{ wrap.querySelectorAll('.opt-card').forEach(c=>c.classList.remove('selected')); div.classList.add('selected'); onSelect(key); };
    wrap.appendChild(div);
  });
}

function buildCharacterOptions(containerId,playerIndex) {
  const wrap=document.getElementById(containerId); wrap.innerHTML='';
  CHARACTER_IDS.forEach(id=>{
    const cfg=CHARACTER_CFG[id];
    const unlocked=State.unlockedChars.includes(id);
    const div=document.createElement('div'); div.className='opt-card'+(State.selectedChar[playerIndex]===id?' selected':'')+(unlocked?'':' locked');
    if(unlocked) {
      div.innerHTML=`<div class="opt-title">${cfg.label}</div><div class="opt-desc">${cfg.ability}</div>`;
      div.onclick=()=>{ wrap.querySelectorAll('.opt-card').forEach(c=>c.classList.remove('selected')); div.classList.add('selected'); State.selectedChar[playerIndex]=id; };
    } else {
      div.innerHTML=`<div class="opt-title" style="color:rgba(255,255,255,0.4)">${cfg.label}</div><div class="opt-desc">${cfg.ability}</div><button style="margin-top:6px;font-size:9px;padding:5px 10px;width:auto;border-color:#ffd60a;color:#ffd60a;" onclick="buyCharacter('${id}','${containerId}',${playerIndex})">BUY — ${cfg.price} COINS</button>`;
    }
    wrap.appendChild(div);
  });
}

function buyCharacter(id, containerId, playerIndex) {
  const cfg=CHARACTER_CFG[id];
  if(!cfg||State.unlockedChars.includes(id)) return;
  if(State.coins<cfg.price) { showWaveAnnounce('NOT ENOUGH COINS','#ff006e'); return; }
  State.coins-=cfg.price;
  State.unlockedChars.push(id);
  updateHUD(); saveGameData();
  buildCharacterOptions(containerId, playerIndex);
  showWaveAnnounce(cfg.label.split('—')[0].trim()+' UNLOCKED!','#ffd60a');
}

function buildSurvivorDiffOptions() {
  const wrap=document.getElementById('survivorDiffOptions'); wrap.innerHTML='';
  ['easy','normal','hard'].forEach(key=>{
    const cfg=DIFFICULTY_CFG[key];
    const div=document.createElement('div'); div.className='opt-card'+(State.survivorDifficulty===key?' selected':'');
    div.innerHTML=`<div class="opt-title">${cfg.label}</div><div class="opt-desc">${cfg.desc}</div>`;
    div.onclick=()=>{ wrap.querySelectorAll('.opt-card').forEach(c=>c.classList.remove('selected')); div.classList.add('selected'); State.survivorDifficulty=key; };
    wrap.appendChild(div);
  });
}

function showGameModeSelect() { navigateMenu('gameModeSelect'); }
function selectGameMode(mode) {
  State.pvpMode=(mode==='pvp');
  State.twoPlayer=(mode==='multi'||mode==='pvp');
  if(State.pvpMode) {
    State.selectedChar=['marcelo','marcelo'];
    showCharacterSelect();
  } else if(State.twoPlayer) {
    showCharacterSelect();
  } else {
    navigateMenu('difficultyScreen'); buildDifficultyOptions('difficultyOptions',setDifficulty);
  }
}
function setDifficulty(key) { State.difficulty=key; saveGameData(); showCharacterSelect(); }
function showCharacterSelect() {
  hideAllOverlays(); buildCharacterOptions('characterOptionsP1',0);
  const p2=document.getElementById('characterOptionsP2');
  if(State.twoPlayer) { p2.style.display='block'; buildCharacterOptions('characterOptionsP2',1); } else p2.style.display='none';
  document.getElementById('characterSelect').classList.add('active');
}
function startGameWithSelectedCharacter() {
  if(State.openWorldMode) { startOpenWorldMode(); return; }
  State.selectedChar.forEach(c=>{ if(!State.stats.charactersUsed.includes(c)) State.stats.charactersUsed.push(c); });
  State.stats.charactersPlayed=State.stats.charactersUsed.length;
  const newChars2=['omega','phantom','titan'];
  if(State.selectedChar.some(c=>newChars2.includes(c))) State.stats.newCharPlayed=true;
  saveGameData(); checkAchievements();
  // Show equipment select if player has ut5 (Scholar) or just one weapon slot
  showEquipScreen(startGame);
}
function showInfiniteMode() { State.infiniteMode=true; navigateMenu('difficultyScreen'); buildDifficultyOptions('difficultyOptions',key=>{setDifficulty(key);}); }
function showSurvivorMode() { buildSurvivorDiffOptions(); navigateMenu('survivorModeScreen'); }
function startSurvivorMode() { State.survivorMode=true; startGame(); }
function showInstructions() { hideAllOverlays(); document.getElementById('instructionsScreen').classList.add('active'); }
function hideInstructions() { navigateMenu('main'); }
function pauseGame() { if(!State.running) return; State.paused=true; navigateMenu('pauseScreen'); }
function resumeGame() { State.paused=false; hideAllOverlays(); gameLoop(); }
function backToMenu() {
  State.running=false; State.infiniteMode=false; State.survivorMode=false; State.twoPlayer=false; State.pvpMode=false; State.openWorldMode=false; State.bossRushMode=false;
  if(_onlineMode) endOnlineSession();
  hideAllOverlays(); setHUDVisible(false);
  document.getElementById('bossBarWrap').classList.remove('visible');
  const syH=document.getElementById('synergyHud'); if(syH) syH.style.display='none';
  const matH=document.getElementById('matHud'); if(matH) matH.style.display='none';
  updateTitleHighScores();
  navigateMenu('main');
}
function restartGame() {
  if(State.openWorldMode) { startOpenWorldMode(); return; }
  State.infiniteMode=false; State.survivorMode=false; State.twoPlayer=false; State.pvpMode=false; State.bossRushMode=false;
  if(_onlineMode) endOnlineSession(); startGame();
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 14B – SKILL TREE
// ═══════════════════════════════════════════════════════════════════
function showSkillTree() {
  buildSkillTree();
  navigateMenu('skillTreePanel');
}

function buildSkillTree() {
  const branches=['firepower','defense','utility','special'];
  const branchEl=document.getElementById('skillBranchesEl')||document.getElementById('skillBranches');
  if(!branchEl) return;
  branchEl.innerHTML='';
  branches.forEach(branch=>{
    const col=document.createElement('div'); col.className='skill-col skill-col-'+branch;
    const title=document.createElement('div'); title.className='skill-col-title';
    title.textContent={firepower:'FIREPOWER',defense:'DEFENSE',utility:'UTILITY',special:'SPECIAL'}[branch];
    col.appendChild(title);
    SKILL_TREE[branch].forEach(skill=>{
      const level=State.unlockedSkills[skill.id]||0;
      const maxed=level>=skill.maxLevel;
      const canAfford=State.coins>=skill.cost&&!maxed;
      const card=document.createElement('div'); card.className='skill-card'+(maxed?' maxed':'');
      card.innerHTML=`<div style="font-weight:700;font-size:12px;margin-bottom:3px;">${skill.name}</div><div style="font-size:10px;opacity:0.7;margin-bottom:5px;">${skill.desc}</div><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:10px;color:#ffd60a">${level}/${skill.maxLevel}</span><button onclick="buySkill('${skill.id}')" style="font-size:9px;padding:3px 8px;margin:0;width:auto;" ${canAfford?'':'disabled'}>${maxed?'MAXED':'BUY '+skill.cost+'c'}</button></div>`;
      col.appendChild(card);
    });
    branchEl.appendChild(col);
  });
  const stCoinsEl=document.getElementById('stCoins')||document.getElementById('skillCoins');
  if(stCoinsEl) stCoinsEl.textContent=State.coins;
}

function buySkill(id) {
  let skill=null;
  Object.values(SKILL_TREE).forEach(arr=>arr.forEach(s=>{if(s.id===id)skill=s;}));
  if(!skill) return;
  const level=State.unlockedSkills[id]||0;
  if(level>=skill.maxLevel||State.coins<skill.cost) return;
  State.coins-=skill.cost;
  State.unlockedSkills[id]=(level+1);
  State.stats.skillsUnlocked=Object.values(State.unlockedSkills).reduce((a,b)=>a+b,0);
  saveGameData(); checkAchievements(); buildSkillTree();
}

function applySkillBonuses(player) {
  const sk=State.unlockedSkills;
  // Extra bullet (fp1)
  if(sk.fp1) { const orig=player.shoot.bind(player); player._baseShoot=orig; player.shoot=function(){orig();if(sk.fp1>=1){const cx=this.x+this.width/2;const pvpFlip=State.pvpMode&&this.index===1;const dir=pvpFlip?1:-1;const sy=pvpFlip?this.y+this.height:this.y;this.bullets.push(new PlayerBullet(cx-12,sy,this.bulletColor,-0.2,this.damageMultiplier,dir));this.bullets.push(new PlayerBullet(cx+12,sy,this.bulletColor,0.2,this.damageMultiplier,dir));}}; }
  // Damage boost (fp2)
  if(sk.fp2) player.damageMultiplier*=(1+0.25*(sk.fp2||0));
  // Rapid fire (fp3)
  if(sk.fp3) { player.shootCooldown=Math.max(50,player.shootCooldown*(1-0.15*(sk.fp3||0))); player.baseCooldown=player.shootCooldown; }
  // Piercing shot (fp4)
  if(sk.fp4) player._piercingShots=sk.fp4;
  // Sniper mode (fp7)
  if(sk.fp7) { player.damageMultiplier*=2.0; player.shootCooldown=Math.min(player.shootCooldown*1.3, 800); player.baseCooldown=player.shootCooldown; }
  // Crits (fp10)
  if(sk.fp10) player._critChance=(sk.fp10||0)*0.05;
  // Extra life (df1)
  if(sk.df1) player.lives+=sk.df1;
  // Shield boost (df3)
  if(sk.df3) player.shieldDurationMult=(1+0.5*(sk.df3||0));
  // Deflector (df7)
  if(sk.df7) player._deflectChance=(sk.df7||0)*0.20;
  // Haste (ut6)
  if(sk.ut6) player.speed+=sk.ut6;
  // Coin magnet (ut1)
  if(sk.ut1) State.magnetRadius=Math.max(State.magnetRadius,75*(sk.ut1||0));
  // XP boost (ut2)
  if(sk.ut2) State.xpMultiplier=1+0.2*(sk.ut2||0);
  // Quick cooldown (sp1)
  if(sk.sp1) { player.abilityCooldownMult=(1-0.15*(sk.sp1||0)); }
  // Overclock (sp8) - ability lasts 25% longer
  if(sk.sp8) player._overclockMult=1+0.25*(sk.sp8||0);
}

function applyEquipment(player) {
  const eq = State.runEquipment;
  Object.values(eq).forEach(item => {
    if (!item) return;
    const mult = RARITY[item.rarity]?.multiplier || 1;
    const val = item.value * mult;
    switch(item.effect) {
      case 'dmg':       player.damageMultiplier *= (1 + val); break;
      case 'fire':      player.shootCooldown = Math.max(50, player.shootCooldown * (1 - val)); player.baseCooldown = player.shootCooldown; break;
      case 'speed':     player.speed += Math.floor(val); break;
      case 'maxhp':     player.lives += Math.floor(val); break;
      case 'deflect':   player._deflectChance = Math.min(0.8, (player._deflectChance||0) + val); break;
      case 'magnet':    State.magnetRadius = Math.max(State.magnetRadius, val); break;
      case 'xp':        State.xpMultiplier = Math.max(State.xpMultiplier, 1 + val); break;
      case 'reduction': player._dmgReduction = Math.min(0.7, (player._dmgReduction||0) + val); break;
      case 'all':       player.damageMultiplier *= (1 + val); player.speed += 1; break;
      case 'boss_dmg':  player._bossDmgMult = (player._bossDmgMult||1) * (1 + val); break;
      case 'pierce':    player._piercingShots = Math.max(player._piercingShots||0, 1); break;
    }
  });
}

function checkSynergies(player) {
  State.activeSynergies = [];
  const equippedIds = Object.values(State.runEquipment).filter(Boolean).map(i => i.id);
  ITEM_SYNERGIES.forEach(syn => {
    const hasSynergy = syn.items.every(id => equippedIds.includes(id));
    const hasSp4 = (State.unlockedSkills.sp4||0) >= 1;
    if (hasSynergy && hasSp4) {
      State.activeSynergies.push(syn);
      try { syn.effect(player); } catch(e) {}
    }
  });
  updateSynergyHud();
}

function updateSynergyHud() {
  const el = document.getElementById('synergyHud');
  if (!el) return;
  if (State.activeSynergies.length === 0 || !State.running) { el.style.display='none'; return; }
  el.style.display = 'block';
  el.innerHTML = State.activeSynergies.map(s =>
    `<div class="synergy-badge">✦ ${s.name}</div>`
  ).join('');
}

function updateMatHud() {
  const el = document.getElementById('matHud');
  if (!el) return;
  const mats = State.materialInventory;
  const total = Object.values(mats).reduce((a,b)=>a+b,0);
  if (total === 0 || !State.running || !(State.unlockedSkills.ut4||0)) { el.style.display='none'; return; }
  el.style.display = 'block';
  el.innerHTML = Object.entries(mats)
    .filter(([,v])=>v>0)
    .map(([k,v])=>`${k.replace('_',' ').toUpperCase()} ×${v}`)
    .join(' &nbsp;|&nbsp; ');
}

// ─ Equipment Selection Screen ─
let _equipPendingSlots = [];
let _equipCallback = null;

function showEquipScreen(callback) {
  _equipCallback = callback;
  const slots = ['weapon','armor','accessory','relic'];
  _equipPendingSlots = slots.filter(s => !State.runEquipment[s]);
  _nextEquipSlot();
}

function _nextEquipSlot() {
  if (_equipPendingSlots.length === 0) {
    if (_equipCallback) _equipCallback();
    return;
  }
  const slot = _equipPendingSlots.shift();
  _showEquipOptionsForSlot(slot);
}

function _showEquipOptionsForSlot(slot) {
  const pool = EQUIPMENT_DATA.filter(e => e.slot === slot);
  const rarities = ['common','uncommon','rare'];
  const bonusCount = Math.min(1 + Math.floor((State.unlockedSkills.ut5||0)), 2);
  const count = 2 + bonusCount;
  const picked = [];
  const shuffled = pool.sort(()=>Math.random()-0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const base = shuffled[i];
    const rarityIdx = Math.floor(Math.random() * rarities.length);
    const rarity = rarities[rarityIdx];
    const mult = RARITY[rarity].multiplier;
    picked.push({ ...base, rarity, value: base.value * mult, displayValue: Math.round(base.value * mult * 100) / 100 });
  }

  const slotEl = document.getElementById('equipSlotLabel');
  if (slotEl) slotEl.textContent = 'SLOT: ' + slot.toUpperCase();

  const wrap = document.getElementById('equipOptions');
  if (!wrap) return;
  wrap.innerHTML = '';
  picked.forEach(item => {
    const r = RARITY[item.rarity];
    const div = document.createElement('div');
    div.className = 'equip-card';
    div.style.borderLeftColor = r.color;
    div.innerHTML = `
      <div class="equip-name" style="color:${r.color}">${item.name} <span class="rarity-badge" style="color:${r.color}">${r.label}</span></div>
      <div class="equip-slot">${item.slot}</div>
      <div class="equip-desc">${item.desc}</div>
    `;
    div.onclick = () => { State.runEquipment[slot] = item; hideAllOverlays(); _nextEquipSlot(); };
    wrap.appendChild(div);
  });
  hideAllOverlays();
  document.getElementById('equipScreen').classList.add('active');
}

function skipEquip() {
  _equipPendingSlots = [];
  if (_equipCallback) { _equipCallback(); }
}

// ─ Crafting Functions ─
function showCrafting() {
  const matEl = document.getElementById('craftMatDisplay');
  if (matEl) {
    const mats = State.materialInventory;
    const total = Object.values(mats).reduce((a,b)=>a+b,0);
    matEl.textContent = total ? Object.entries(mats).filter(([,v])=>v>0).map(([k,v])=>`${k.replace(/_/g,' ')}: ${v}`).join('  ') : 'NONE';
  }
  const recEl = document.getElementById('craftingRecipes');
  if (!recEl) { openModal('craftingModal'); return; }
  recEl.innerHTML = '';
  CRAFTING_RECIPES.forEach(recipe => {
    const canCraft = Object.entries(recipe.ingredients).every(([mat, qty]) => (State.materialInventory[mat]||0) >= qty);
    const r = RARITY[recipe.result.rarity];
    const row = document.createElement('div');
    row.className = 'craft-row';
    row.style.opacity = canCraft ? '1' : '0.45';
    row.innerHTML = `
      <div class="craft-info">
        <div class="craft-name" style="color:${r.color}">${recipe.name}</div>
        <div class="craft-ing">${Object.entries(recipe.ingredients).map(([m,q])=>`${m.replace(/_/g,' ')} ×${q}`).join('  ')}</div>
      </div>
      <button class="craft-btn" style="border-color:${r.color};color:${r.color};" ${canCraft?'':'disabled'} onclick="craftItem('${recipe.id}')">CRAFT</button>
    `;
    recEl.appendChild(row);
  });
  openModal('craftingModal');
}

function craftItem(recipeId) {
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;
  const canCraft = Object.entries(recipe.ingredients).every(([mat, qty]) => (State.materialInventory[mat]||0) >= qty);
  if (!canCraft) return;
  Object.entries(recipe.ingredients).forEach(([mat, qty]) => { State.materialInventory[mat] -= qty; });
  const base = EQUIPMENT_DATA.find(e => e.id === recipe.result.itemId);
  if (!base) return;
  const rarity = recipe.result.rarity;
  const mult = RARITY[rarity].multiplier;
  const item = { ...base, rarity, value: base.value * mult };
  const slot = item.slot;
  State.runEquipment[slot] = item;
  showWaveAnnounce(`CRAFTED: ${item.name.toUpperCase()}!`, RARITY[rarity].color);
  showCrafting();
  updateMatHud();
  // Re-apply equipment to players
  if (State.running) State.players.forEach(p => applyEquipment(p));
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 14C – BOSS RUSH MODE
// ═══════════════════════════════════════════════════════════════════
function showBossRush() {
  navigateMenu('bossRushScreen');
  const el=document.getElementById('bossRushStatus');
  if(el) el.textContent='';
}

function startBossRush() {
  State.bossRushMode=true; State.bossRushIndex=0; State.bossRushStartTime=Date.now();
  State.infiniteMode=false; State.survivorMode=false; State.twoPlayer=false;
  startGame();
  // Override: spawn first boss immediately
  setTimeout(()=>{
    if(State.bossRushMode&&State.running){
      State.enemies=[]; State.bossSpawned=true;
      State.boss=new Boss(1); playSound('levelUpSound');
      showWaveAnnounce('BOSS RUSH: BOSS 1!','#ff6600');
    }
  },500);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 14D – STATS SCREEN
// ═══════════════════════════════════════════════════════════════════
function showStats() {
  const s=State.stats;
  const el=document.getElementById('statsContent');
  if(!el) return;
  const fmt=(v,u='')=>v!==undefined?v+(u?` ${u}`:''):'0';
  const rows=[
    ['Total Kills',s.enemiesKilled||0],
    ['Bosses Defeated',s.bossesDefeated||0],
    ['Total Coins Earned',s.totalCoinsEarned||0],
    ['Best Campaign Phase',s.maxPhase||0],
    ['Best Infinite Wave',s.maxInfiniteWave||0],
    ['Longest Survival',formatTime(s.maxSurvivorTime||0)],
    ['Power-ups Collected',s.powerupsCollected||0],
    ['Best Combo',s.maxCombo||0],
    ['Bombers Killed',s.bombersKilled||0],
    ['Double Damage Collected',s.ddCollected||0],
    ['Skills Unlocked',s.skillsUnlocked||0],
    ['Boss Rush Completed',s.bossRushDone?'YES':'NO'],
    ['Characters Tried',s.charactersPlayed||0],
    ['Most Used Char',s.charactersUsed&&s.charactersUsed.length?(s.charactersUsed[s.charactersUsed.length-1]||'—'):'—'],
  ];
  el.innerHTML=rows.map(([label,val])=>`<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-val">${val}</span></div>`).join('');
  navigateMenu('statsScreen');
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 14E – CHARACTER PREVIEW
// ═══════════════════════════════════════════════════════════════════
let _previewCharIdx=0;
let _previewAnim=0;

function cyclePreviewChar(dir) {
  _previewCharIdx=(_previewCharIdx+dir+CHARACTER_IDS.length)%CHARACTER_IDS.length;
  const id=CHARACTER_IDS[_previewCharIdx];
  const cfg=CHARACTER_CFG[id];
  const nameEl=document.getElementById('previewCharName');
  const abilEl=document.getElementById('previewCharAbility');
  if(nameEl) nameEl.textContent=id.toUpperCase();
  if(abilEl) abilEl.textContent=cfg?cfg.ability:'';
}

function drawPreviewChar() {
  const canvas=document.getElementById('charPreviewCanvas');
  if(!canvas||!document.getElementById('titleScreen')||document.getElementById('titleScreen').style.display==='none') return;
  const ctx=canvas.getContext('2d');
  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);
  _previewAnim+=0.04;

  const id=CHARACTER_IDS[_previewCharIdx];
  const skinColor=`hsl(${_previewAnim*30%360},90%,65%)`;
  ctx.shadowColor=skinColor; ctx.shadowBlur=18;
  ctx.fillStyle=skinColor;

  const cx=w/2, top=h*0.22, bot=h*0.72;
  // Draw based on character
  switch(id) {
    case 'omega': {
      ctx.beginPath(); ctx.arc(cx,h/2,32,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(cx,h/2,16,0,Math.PI*2); ctx.fill();
      for(let i=0;i<4;i++){const a=_previewAnim+i*Math.PI/2; ctx.fillStyle=skinColor; ctx.fillRect(cx+Math.cos(a)*28-4,h/2+Math.sin(a)*28-12,8,14);}
      break;
    }
    case 'phantom': {
      ctx.globalAlpha=0.5+0.3*Math.sin(_previewAnim*2);
      ctx.beginPath(); ctx.moveTo(cx,top); ctx.lineTo(cx-24,h*0.58); ctx.lineTo(cx-14,bot); ctx.lineTo(cx,bot-10); ctx.lineTo(cx+14,bot); ctx.lineTo(cx+24,h*0.58); ctx.closePath(); ctx.fill();
      ctx.globalAlpha=1; break;
    }
    case 'titan': {
      ctx.fillRect(cx-28,top+8,56,bot-top-8);
      ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillRect(cx-24,top+12,22,10); ctx.fillRect(cx+2,top+12,22,10);
      ctx.fillRect(cx-24,top+28,22,10); ctx.fillRect(cx+2,top+28,22,10);
      ctx.fillStyle=skinColor; ctx.shadowBlur=20; ctx.beginPath(); ctx.arc(cx,h/2,12,0,Math.PI*2); ctx.fill();
      break;
    }
    case 'takeshi': {
      ctx.beginPath(); ctx.moveTo(cx,top); ctx.lineTo(cx+30,h*0.58); ctx.lineTo(cx,bot); ctx.lineTo(cx-30,h*0.58); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(255,0,110,0.8)'; ctx.beginPath(); ctx.arc(cx,h*0.46,8,0,Math.PI*2); ctx.fill();
      break;
    }
    case 'deepseek': {
      ctx.beginPath(); ctx.moveTo(cx,top); ctx.lineTo(cx-10,top+18); ctx.lineTo(cx-24,bot); ctx.lineTo(cx,bot-8); ctx.lineTo(cx+24,bot); ctx.lineTo(cx+10,top+18); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#00f5ff'; ctx.fillRect(cx-5,top-8,10,22);
      break;
    }
    case 'felipe': {
      ctx.beginPath(); ctx.moveTo(cx,top); ctx.bezierCurveTo(cx+28,top+20,cx+30,bot-16,cx,bot); ctx.bezierCurveTo(cx-30,bot-16,cx-28,top+20,cx,top); ctx.fill();
      ctx.fillStyle='rgba(200,240,255,0.4)'; ctx.beginPath(); ctx.ellipse(cx,top+24,8,12,0,0,Math.PI*2); ctx.fill();
      break;
    }
    case 'robos': {
      ctx.fillRect(cx-24,top+8,48,bot-top-8);
      ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillRect(cx-14,top,28,14);
      ctx.fillStyle='#ff3333'; ctx.beginPath(); ctx.arc(cx-10,top+8,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+10,top+8,4,0,Math.PI*2); ctx.fill();
      break;
    }
    default: { // marcelo
      ctx.beginPath(); ctx.moveTo(cx,top); ctx.lineTo(cx-18,h*0.56); ctx.lineTo(cx-26,bot); ctx.lineTo(cx,bot-12); ctx.lineTo(cx+26,bot); ctx.lineTo(cx+18,h*0.56); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#00f5ff'; ctx.shadowColor='#00f5ff'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(cx,h*0.48,8,0,Math.PI*2); ctx.fill();
      break;
    }
  }
  ctx.shadowBlur=0;
  // Floating name
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.font='bold 13px Orbitron, monospace';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText(id.toUpperCase(),cx,h-8);
}

function runPreviewLoop() {
  drawPreviewChar();
  requestAnimationFrame(runPreviewLoop);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 14F – MINI RADAR
// ═══════════════════════════════════════════════════════════════════
function drawMiniRadar() {
  const canvas=document.getElementById('miniRadar');
  if(!canvas) return;
  canvas.classList.add('visible');
  const ctx=canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  // Background
  ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.strokeStyle='#00f5ff'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(W/2,H/2,W/2-1,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // Grid circles
  ctx.strokeStyle='rgba(0,245,255,0.15)'; ctx.lineWidth=1;
  [0.3,0.6,0.9].forEach(r=>{ctx.beginPath();ctx.arc(W/2,H/2,(W/2-1)*r,0,Math.PI*2);ctx.stroke();});
  // Scale factor
  const sx=(W/2-4)/CANVAS.width, sy=(H/2-4)/CANVAS.height;
  // Player (green center)
  if(State.players[0]){
    const px=State.players[0].x+State.players[0].width/2, py=State.players[0].y+State.players[0].height/2;
    ctx.fillStyle='#39ff14'; ctx.shadowColor='#39ff14'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(W/2,H/2,4,0,Math.PI*2); ctx.fill();
  }
  // Enemies (red)
  ctx.fillStyle='#ff3333'; ctx.shadowColor='#ff3333'; ctx.shadowBlur=4;
  State.enemies.forEach(e=>{
    const rx=W/2+(e.x+e.width/2-CANVAS.width/2)*sx*2;
    const ry=H/2+(e.y+e.height/2-CANVAS.height/2)*sy*2;
    ctx.beginPath(); ctx.arc(clamp(rx,2,W-2),clamp(ry,2,H-2),2,0,Math.PI*2); ctx.fill();
  });
  // Boss (orange)
  if(State.boss){
    ctx.fillStyle='#ff8800'; ctx.shadowColor='#ff8800'; ctx.shadowBlur=8;
    const bx=W/2+(State.boss.x+State.boss.width/2-CANVAS.width/2)*sx*2;
    const by=H/2+(State.boss.y+State.boss.height/2-CANVAS.height/2)*sy*2;
    ctx.beginPath(); ctx.arc(clamp(bx,3,W-3),clamp(by,3,H-3),5,0,Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur=0;
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 14G – TITLE STATS & MISC
// ═══════════════════════════════════════════════════════════════════
function updateTitleStats() {
  const killEl=document.getElementById('tsKills');
  const bossEl=document.getElementById('tsBosses');
  if(killEl) killEl.textContent=State.stats.enemiesKilled||0;
  if(bossEl) bossEl.textContent=State.stats.bossesDefeated||0;
  document.getElementById('menuCoins').textContent=State.coins;
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 14G2 – DAILY CHALLENGE
// ═══════════════════════════════════════════════════════════════════
function getDailyKey() {
  const d = new Date();
  return `daily_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}

function getDailySeed() {
  const d = new Date();
  return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const DAILY_MODIFIERS = [
  { label:'SPEED DEMON', desc:'Enemies move 2× faster', apply:()=>{ /* applied in enemy speed */ } },
  { label:'COIN RUSH',   desc:'Triple coin rewards today', apply:()=>{ State._dailyCoinMult=3; } },
  { label:'NO SHIELD',   desc:'Shield power-ups disabled', apply:()=>{ State._dailyNoShield=true; } },
  { label:'HARD CORE',   desc:'Start with 1 life only', apply:()=>{ State.players.forEach(p=>p.lives=1); } },
  { label:'DOUBLE XP',   desc:'Double XP gain', apply:()=>{ State.xpMultiplier*=2; } },
  { label:'RAPID BOSSES',desc:'Bosses appear 2× faster', apply:()=>{ State._dailyFastBoss=true; } },
  { label:'GOLDEN RUN',  desc:'+50% score multiplier', apply:()=>{ State._dailyScoreMult=1.5; } },
];

function startDailyChallenge() {
  const key = getDailyKey();
  const seed = getDailySeed();
  const modIdx = Math.floor(seededRandom(seed) * DAILY_MODIFIERS.length);
  const mod = DAILY_MODIFIERS[modIdx];
  const diffIdx = Math.floor(seededRandom(seed+1) * 3);
  const diffs = ['normal','hard','extreme'];
  const charIdx = Math.floor(seededRandom(seed+2) * CHARACTER_IDS.length);

  // Reset daily state flags
  State._dailyCoinMult=1; State._dailyNoShield=false; State._dailyFastBoss=false; State._dailyScoreMult=1;

  State.difficulty = diffs[diffIdx];
  State.selectedChar[0] = CHARACTER_IDS[charIdx];
  State.infiniteMode=false; State.survivorMode=false; State.twoPlayer=false;
  State.pvpMode=false;

  const done = localStorage.getItem(key);
  const doneMsg = done ? ` (COMPLETED — BEST: ${parseInt(done).toLocaleString()})` : '';

  const confirm = window.confirm(
    `DAILY CHALLENGE\n\n` +
    `CHARACTER: ${CHARACTER_IDS[charIdx].toUpperCase()}\n` +
    `DIFFICULTY: ${diffs[diffIdx].toUpperCase()}\n` +
    `MODIFIER: ${mod.label} — ${mod.desc}\n\n` +
    `${doneMsg ? '⚠ ' + doneMsg + '\n\n' : ''}Start?`
  );
  if (!confirm) return;

  State._dailyMode = true;
  State._dailyModifier = mod;
  showEquipScreen(() => {
    startGame();
    // Apply modifier after game starts
    setTimeout(() => {
      try { mod.apply(); } catch(e){}
      showWaveAnnounce(`${mod.label}!`, '#ffd60a');
    }, 500);
  });
}

function checkDailyComplete(score) {
  if(!State._dailyMode) return;
  const key = getDailyKey();
  const prev = parseInt(localStorage.getItem(key)||'0');
  if(score > prev) {
    localStorage.setItem(key, score);
    showWaveAnnounce('DAILY BEST!', '#ffd60a');
    addCoins(200); // Daily completion bonus
  }
  State._dailyMode=false;
}

