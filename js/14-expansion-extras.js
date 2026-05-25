// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 1 — EXTENDED CRAFTING SYSTEM
// 30+ recipes, material types, upgrade system, special crafting
// ═══════════════════════════════════════════════════════════════════════════

const CRAFT_MATERIALS = {
  crystal_shard: { name:'Crystal Shard', icon:'💎', desc:'Basic crafting material from asteroids.' },
  plasma_cell: { name:'Plasma Cell', icon:'⚡', desc:'Energy cell extracted from defeated plasma enemies.' },
  void_essence: { name:'Void Essence', icon:'🌑', desc:'Dark matter harvested from void anomalies.' },
  titan_alloy: { name:'Titan Alloy', icon:'⚙️', desc:'Ultra-strong metal from Titan wreckage.' },
  quantum_dust: { name:'Quantum Dust', icon:'✨', desc:'Rare particle from quantum flux zones.' },
  bio_matrix: { name:'Bio Matrix', icon:'🧬', desc:'Organic compound from Hive Queen defeat.' },
  solar_core: { name:'Solar Core', icon:'☀️', desc:'Star energy compressed into solid form.' },
  dark_fragment: { name:'Dark Fragment', icon:'🔲', desc:'Fragment of a black hole event horizon.' },
  omega_residue: { name:'Omega Residue', icon:'♾️', desc:'Unstable energy from Omega Prime battle.' },
  ancient_relic_piece: { name:'Ancient Piece', icon:'🏛️', desc:'Fragment of an ancient alien artifact.' }
};

const CRAFT_INVENTORY = {};
Object.keys(CRAFT_MATERIALS).forEach(k => CRAFT_INVENTORY[k] = 0);

const EXP_CRAFT_RECIPES = [
  // Basic
  { id:'r_plasma_rifle', name:'Plasma Rifle', result:'plasma_core', resultRarity:'rare',
    materials:{ crystal_shard:3, plasma_cell:2 }, time:5,
    desc:'Enhanced plasma weapon with 40% damage boost.' },
  { id:'r_nano_shield', name:'Nano Shield Generator', result:'quantum_weave', resultRarity:'epic',
    materials:{ crystal_shard:5, quantum_dust:2, titan_alloy:1 }, time:10,
    desc:'Advanced shield with quantum dodge capability.' },
  { id:'r_void_weapon', name:'Void Cannon', result:'void_shard', resultRarity:'epic',
    materials:{ void_essence:3, dark_fragment:2, crystal_shard:4 }, time:15,
    desc:'Dark matter weapon that ignores shields.' },
  { id:'r_titan_armor', name:'Titan Battle Armor', result:'titan_plating', resultRarity:'epic',
    materials:{ titan_alloy:5, crystal_shard:3 }, time:12,
    desc:'Reduces all damage by 30%.' },
  { id:'r_hive_core', name:'Hive Mind Core', result:'swarm_core', resultRarity:'epic',
    materials:{ bio_matrix:4, crystal_shard:3, plasma_cell:2 }, time:10,
    desc:'Drone spawning weapon system.' },
  { id:'r_solar_rifle', name:'Solar Burst Rifle', result:'prism_heart', resultRarity:'legendary',
    materials:{ solar_core:3, crystal_shard:8, quantum_dust:3 }, time:20,
    desc:'Splits shots into prism beams.' },
  { id:'r_time_relic', name:'Time Fragment Relic', result:'time_fragment', resultRarity:'mythic',
    materials:{ void_essence:5, quantum_dust:5, omega_residue:3, ancient_relic_piece:2 }, time:60,
    desc:'Ultimate relic from beyond time.' },
  { id:'r_dark_matter', name:'Dark Matter Crystal', result:'dark_matter', resultRarity:'legendary',
    materials:{ dark_fragment:5, void_essence:3, quantum_dust:4 }, time:30,
    desc:'Reduces all cooldowns by 50%.' },
  { id:'r_phoenix', name:'Phoenix Feather', result:'phoenix_feather', resultRarity:'epic',
    materials:{ solar_core:2, bio_matrix:3, quantum_dust:2 }, time:18,
    desc:'Auto-revive on death once per session.' },
  { id:'r_omega_weapon', name:'Omega Core Weapon', result:'omega_core', resultRarity:'mythic',
    materials:{ omega_residue:5, void_essence:4, dark_fragment:3, ancient_relic_piece:3 }, time:90,
    desc:'The most powerful weapon in existence.' },
  // Upgrade recipes
  { id:'r_up_crystal1', name:'Crystal Amplifier', result:'xp_amplifier', resultRarity:'rare',
    materials:{ crystal_shard:6, quantum_dust:1 }, time:8, desc:'+50% XP gain.' },
  { id:'r_up_magnet', name:'Coin Magnet V2', result:'coin_magnet', resultRarity:'rare',
    materials:{ crystal_shard:4, titan_alloy:1 }, time:6, desc:'Doubles coin attraction range.' },
  { id:'r_void_compass', name:'Void Navigator', result:'void_compass', resultRarity:'legendary',
    materials:{ void_essence:4, ancient_relic_piece:2, quantum_dust:3 }, time:25, desc:'Reveals all map secrets.' },
  { id:'r_combat_scanner', name:'Tactical Scanner', result:'combat_scanner', resultRarity:'uncommon',
    materials:{ crystal_shard:2, plasma_cell:1 }, time:3, desc:'Shows enemy HP bars.' },
  { id:'r_adrenaline', name:'Combat Stim', result:'adrenaline_chip', resultRarity:'epic',
    materials:{ bio_matrix:3, plasma_cell:2, quantum_dust:1 }, time:12, desc:'Speed/damage bonus at low HP.' }
];

const ACTIVE_CRAFTS = []; // { recipeId, startTime, duration }

function hasMaterialsForRecipe(recipe) {
  return Object.entries(recipe.materials).every(([mat, qty]) => (CRAFT_INVENTORY[mat]||0) >= qty);
}

function startCraft(recipeId) {
  if (ACTIVE_CRAFTS.length >= 2) { showToast('Max 2 concurrent crafts!', '#ff4444'); return; }
  const recipe = EXP_CRAFT_RECIPES.find(r=>r.id===recipeId);
  if (!recipe) return;
  if (!hasMaterialsForRecipe(recipe)) { showToast('Not enough materials!', '#ff4444'); return; }
  // Consume materials
  Object.entries(recipe.materials).forEach(([mat,qty]) => { CRAFT_INVENTORY[mat] -= qty; });
  ACTIVE_CRAFTS.push({ recipeId, startTime:Date.now(), duration:recipe.time*1000, recipeRef:recipe });
  showToast('Crafting: ' + recipe.name, '#aa44ff');
}

function tickCrafting() {
  const now = Date.now();
  for (let i=ACTIVE_CRAFTS.length-1; i>=0; i--) {
    const craft = ACTIVE_CRAFTS[i];
    if (now - craft.startTime >= craft.duration) {
      completeCraft(craft);
      ACTIVE_CRAFTS.splice(i,1);
    }
  }
}

function completeCraft(craft) {
  const recipe = craft.recipeRef;
  const resultItem = MARKET_ITEMS.find(i=>i.id===recipe.result) || { id:recipe.result, name:recipe.name, icon:'⚙️', rarity:recipe.resultRarity, desc:recipe.desc, type:'weapon', stats:{} };
  addToInventory({...resultItem});
  GAME_STATS50.itemsCrafted = (GAME_STATS50.itemsCrafted||0) + 1;
  showToast('Craft complete: ' + recipe.name + '!', '#aa44ff');
  if (GAME_STATS50.itemsCrafted >= 10) RPG.unlockAchievement('ach_craft10');
}

function addCraftMaterial(materialId, amount = 1) {
  if (CRAFT_INVENTORY[materialId] !== undefined) {
    CRAFT_INVENTORY[materialId] += amount;
    showToast('+' + amount + ' ' + CRAFT_MATERIALS[materialId].name, '#aa44ff');
  }
}

function renderCraftingPanel() {
  const el = document.getElementById('craftingOverlay');
  if (!el) return;
  const now = Date.now();
  el.innerHTML = `
    <h2>⚗️ CRAFTING STATION</h2>
    <div id="craftMatsDisplay" style="font-family:Orbitron,monospace;font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:16px;text-align:center;">
      ${Object.entries(CRAFT_MATERIALS).map(([k,m])=>`${m.icon} ${m.name}: <span style="color:#00f5ff;">${CRAFT_INVENTORY[k]||0}</span>`).join(' &nbsp; ')}
    </div>
    ${ACTIVE_CRAFTS.length > 0 ? `
      <h3 style="font-family:Orbitron,monospace;font-size:12px;color:#aa44ff;margin-bottom:8px;">ACTIVE CRAFTS</h3>
      ${ACTIVE_CRAFTS.map(c=>{
        const pct = Math.min(100, (now-c.startTime)/c.duration*100);
        return `<div style="background:rgba(170,68,255,0.1);border:1px solid rgba(170,68,255,0.3);border-radius:8px;padding:10px;margin-bottom:8px;">
          <div style="font-family:Orbitron,monospace;font-size:11px;color:#aa44ff;">${c.recipeRef.name}</div>
          <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:6px;"><div style="height:100%;width:${pct}%;background:#aa44ff;border-radius:2px;"></div></div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:3px;">${Math.ceil((c.duration-(now-c.startTime))/1000)}s remaining</div>
        </div>`;
      }).join('')}
    ` : ''}
    <h3 style="font-family:Orbitron,monospace;font-size:12px;color:#aa44ff;margin-bottom:12px;">RECIPES</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-height:400px;overflow-y:auto;">
      ${EXP_CRAFT_RECIPES.map(recipe=>{
        const canCraft = hasMaterialsForRecipe(recipe);
        const rd = RARITY_DATA[recipe.resultRarity]||{label:'?',color:'#888'};
        return `<div style="background:rgba(170,68,255,${canCraft?'0.1':'0.04'});border:1px solid rgba(170,68,255,${canCraft?'0.4':'0.15'});border-radius:8px;padding:12px;cursor:${canCraft?'pointer':'not-allowed'};opacity:${canCraft?1:0.6};"
          onclick="${canCraft?`startCraft('${recipe.id}');renderCraftingPanel()`:''}">
          <span style="font-size:9px;color:${rd.color};border:1px solid ${rd.color};padding:1px 6px;border-radius:10px;">${rd.label}</span>
          <div style="font-family:Orbitron,monospace;font-size:11px;color:${canCraft?'#aa44ff':'rgba(255,255,255,0.5)'};margin:6px 0;">${recipe.name}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">${recipe.desc}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:6px;">
            ${Object.entries(recipe.materials).map(([k,v])=>`${CRAFT_MATERIALS[k]?.icon||'?'}${v}`).join(' ')}
            • ${recipe.time}s
          </div>
        </div>`;
      }).join('')}
    </div>
    <button class="modal-close" onclick="toggleCraftingMenu()" style="margin-top:16px;">CLOSE [C]</button>
  `;
}

const _origToggleCrafting = typeof toggleCraftingMenu !== 'undefined' ? toggleCraftingMenu : null;
function toggleCraftingMenu() {
  const el = document.getElementById('craftingOverlay');
  if (!el) return;
  if (el.classList.contains('open')) {
    el.classList.remove('open');
    if (typeof resumeGame === 'function' && State && State.paused) resumeGame();
  } else {
    // Use expanded crafting panel when EXP system is loaded
    const hasMats = typeof CRAFT_MATERIALS !== 'undefined';
    if (hasMats) {
      el.innerHTML = '';
      renderCraftingPanel();
    } else {
      renderCraftingMenu();
    }
    el.classList.add('open');
    if (State && State.running && !State.paused && typeof pauseGame === 'function') pauseGame();
  }
}

setInterval(tickCrafting, 1000);

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 2 — DAILY REWARDS & LOGIN STREAK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const DAILY_REWARDS = [
  { day:1,  reward:{ coins:100 },          icon:'💰', label:'Day 1' },
  { day:2,  reward:{ crystals:5 },         icon:'💎', label:'Day 2' },
  { day:3,  reward:{ coins:300 },          icon:'💰', label:'Day 3' },
  { day:4,  reward:{ crystals:10 },        icon:'💎', label:'Day 4' },
  { day:5,  reward:{ coins:500 },          icon:'💰', label:'Day 5' },
  { day:6,  reward:{ crystals:20 },        icon:'💎', label:'Day 6' },
  { day:7,  reward:{ coins:1000, crystals:30 }, icon:'🌟', label:'Week Bonus!' }
];

function checkDailyReward() {
  const today = new Date().toDateString();
  const lastLogin = GAME_STATS50.lastLoginDate;
  if (lastLogin === today) return; // Already claimed today
  const yesterday = new Date(Date.now()-86400000).toDateString();
  if (lastLogin === yesterday) {
    GAME_STATS50.loginStreak++;
  } else if (lastLogin && lastLogin !== today) {
    GAME_STATS50.loginStreak = 1; // Streak broken
  } else {
    GAME_STATS50.loginStreak = (GAME_STATS50.loginStreak||0) + 1;
  }
  GAME_STATS50.lastLoginDate = today;
  GAME_STATS50.gamesPlayed = (GAME_STATS50.gamesPlayed||0) + 1;
  const dayIndex = ((GAME_STATS50.loginStreak-1) % 7);
  const reward = DAILY_REWARDS[dayIndex];
  if (reward) {
    if (reward.reward.coins) State.coins = (State.coins||0) + reward.reward.coins;
    if (reward.reward.crystals) RPG.currency.crystals += reward.reward.crystals;
    setTimeout(() => showDailyRewardPopup(reward, GAME_STATS50.loginStreak), 3000);
  }
  if (GAME_STATS50.loginStreak >= 5) RPG.unlockAchievement('ach_streak5');
  if (GAME_STATS50.loginStreak >= 7) RPG.unlockAchievement('ach_daily7');
  saveStats();
}

function showDailyRewardPopup(reward, streak) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:rgba(2,8,23,0.98);border:2px solid #ffd60a;border-radius:16px;
    padding:30px 40px;text-align:center;z-index:10000;font-family:Orbitron,monospace;
    box-shadow:0 0 40px rgba(255,214,10,0.3);max-width:400px;
    animation:narrative-in 0.5s ease;
  `;
  popup.innerHTML = `
    <div style="font-size:48px;margin-bottom:12px;">${reward.icon}</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:2px;margin-bottom:8px;">DAILY REWARD</div>
    <div style="font-size:20px;color:#ffd60a;margin-bottom:8px;">${reward.label}</div>
    <div style="font-size:14px;color:#fff;margin-bottom:4px;">Day ${streak} streak!</div>
    ${reward.reward.coins ? `<div style="font-size:18px;color:#ffd60a;margin:8px 0;">💰 +${reward.reward.coins} coins</div>` : ''}
    ${reward.reward.crystals ? `<div style="font-size:18px;color:#00f5ff;margin:8px 0;">💎 +${reward.reward.crystals} crystals</div>` : ''}
    <button onclick="this.parentElement.remove()" style="margin-top:16px;padding:10px 24px;background:rgba(255,214,10,0.2);border:1px solid #ffd60a;border-radius:8px;color:#ffd60a;font-family:Orbitron,monospace;font-size:12px;cursor:pointer;">CLAIM!</button>
  `;
  document.body.appendChild(popup);
  playSound('levelup');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 3 — EXTENDED ENEMY BOSS PATTERNS
// Detailed attack pattern functions for all Epic Bosses
// ═══════════════════════════════════════════════════════════════════════════

const BOSS_PATTERN_FNS = {
  void_pull(bossX, bossY) {
    // Gravity pull effect on player
    if (!State.players || !State.players[0]) return;
    const p = State.players[0];
    const dx = bossX - p.x, dy = bossY - p.y;
    const dist = Math.sqrt(dx*dx+dy*dy)||1;
    const force = 3 * Math.max(0, 1-dist/400);
    p.x += dx/dist * force;
    p.y += dy/dist * force;
    // Particle effect
    for (let i=0; i<3; i++) {
      const ang = Math.random()*Math.PI*2, r = 80+Math.random()*200;
      PARTICLE_POOL.create({ x:bossX+Math.cos(ang)*r, y:bossY+Math.sin(ang)*r,
        vx:(bossX-(bossX+Math.cos(ang)*r))*0.05, vy:(bossY-(bossY+Math.sin(ang)*r))*0.05,
        life:0.8, size:3, color:'#6600cc', glow:true, drag:0.95 });
    }
  },

  gravity_well(bossX, bossY) {
    BOSS_PATTERN_FNS.void_pull(bossX, bossY);
    // Extra visual
    addLightSource(bossX, bossY, '#440088', 200, 0.3);
  },

  sweep_beam(bossX, bossY, t) {
    const angle = (t * 0.5) % (Math.PI*2);
    const len = 400;
    const beamX = bossX + Math.cos(angle)*len;
    const beamY = bossY + Math.sin(angle)*len;
    // Check player collision
    if (State.players && State.players[0]) {
      const p = State.players[0];
      const distToBeam = Math.abs((beamY-bossY)*(p.x-bossX) - (beamX-bossX)*(p.y-bossY)) /
        Math.sqrt((beamY-bossY)**2+(beamX-bossX)**2);
      if (distToBeam < 20 && Math.random() < 0.1) {
        p.hp -= 3;
      }
    }
    // Beam particles
    for (let d=0; d<len; d+=20) {
      PARTICLE_POOL.create({ x:bossX+Math.cos(angle)*d, y:bossY+Math.sin(angle)*d,
        vx:0,vy:0, life:0.1, size:8, color:'#ff006e', glow:true, blendMode:'lighter' });
    }
  },

  screen_nuke(bossX, bossY) {
    // Massive screen flash and damage
    const flash = document.getElementById('warpFlash');
    if (flash) { flash.style.display='block'; flash.style.opacity='0.8'; flash.style.background='rgba(255,0,110,0.8)';
      setTimeout(()=>{ flash.style.opacity='0'; setTimeout(()=>{flash.style.display='none';flash.style.background='#fff';},300);},200); }
    triggerScreenShake(30, 1.0);
    // Damage player
    if (State.players && State.players[0]) State.players[0].hp -= 25;
    // Massive particle explosion
    for (let i=0; i<50; i++) {
      const ang=Math.random()*Math.PI*2, speed=5+Math.random()*15;
      const cw=CANVAS?CANVAS.width:800, ch=CANVAS?CANVAS.height:600;
      PARTICLE_POOL.create({x:cw/2,y:ch/2, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed,
        life:1+Math.random(), size:8+Math.random()*20, color:'#ff006e', glow:true, blendMode:'lighter', drag:0.92 });
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 4 — FACTION REPUTATION SYSTEM
// Detailed faction tracking, effects, ally/enemy mechanics
// ═══════════════════════════════════════════════════════════════════════════

const FACTION_SYSTEM = {
  reputations: { pirates:0, empire:0, rebels:0, traders:0 }, // -100 to +100
  
  factions: {
    pirates: {
      name:'Void Pirates', icon:'🏴‍☠️', color:'#ff4444',
      benefits: { positive:'Cheaper black market, pirate allies', negative:'Attacked on sight by Empire' },
      enemies:['empire'], allies:['rebels']
    },
    empire: {
      name:'Steel Empire', icon:'⚔️', color:'#4488ff',
      benefits: { positive:'Military discounts, safe passage', negative:'Wanted by rebels' },
      enemies:['rebels', 'pirates'], allies:[]
    },
    rebels: {
      name:'Rebel Alliance', icon:'✊', color:'#39ff14',
      benefits: { positive:'Hidden base access, special missions', negative:'Hunted by Empire' },
      enemies:['empire'], allies:['pirates']
    },
    traders: {
      name:'Free Traders', icon:'🛒', color:'#ffd60a',
      benefits: { positive:'15% market discount, trade routes', negative:'None (neutral)' },
      enemies:[], allies:[]
    }
  },

  changeRep(factionId, amount) {
    const f = this.factions[factionId];
    if (!f) return;
    this.reputations[factionId] = Math.max(-100, Math.min(100, (this.reputations[factionId]||0)+amount));
    GAME_STATS50.factionRelations[factionId] = this.reputations[factionId];
    // Enemy faction auto-decreases
    (f.enemies||[]).forEach(enemyId => {
      this.reputations[enemyId] = Math.max(-100, (this.reputations[enemyId]||0) - Math.floor(amount*0.3));
    });
    const rep = this.reputations[factionId];
    const tier = rep > 75?'Champion':rep>50?'Friend':rep>25?'Ally':rep>0?'Neutral':rep>-25?'Unfriendly':rep>-50?'Hostile':'Enemy';
    showToast(`${f.icon} ${f.name}: ${tier} (${rep>0?'+':''}${rep})`, f.color);
    this.saveRep();
  },

  getRepTier(factionId) {
    const rep = this.reputations[factionId]||0;
    if (rep > 75) return { tier:'Champion', color:'#ffd60a', discountMult:0.3 };
    if (rep > 50) return { tier:'Friend',   color:'#39ff14', discountMult:0.2 };
    if (rep > 25) return { tier:'Ally',     color:'#4488ff', discountMult:0.1 };
    if (rep > 0)  return { tier:'Neutral',  color:'#aaaaaa', discountMult:0 };
    if (rep > -25)return { tier:'Unfriendly',color:'#ff8800',discountMult:0 };
    if (rep > -50)return { tier:'Hostile',  color:'#ff4444', discountMult:0 };
    return { tier:'Enemy', color:'#ff0000', discountMult:0 };
  },

  getMarketDiscount() {
    const traderRep = this.getRepTier('traders');
    return traderRep.discountMult;
  },

  saveRep() { localStorage.setItem('faction_reps', JSON.stringify(this.reputations)); },
  loadRep() {
    try {
      const raw = localStorage.getItem('faction_reps');
      if (raw) Object.assign(this.reputations, JSON.parse(raw));
    } catch(e) {}
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 5 — EXTENDED SKILL TREE (30 additional skills)
// ═══════════════════════════════════════════════════════════════════════════

const EXTENDED_SKILLS = [
  // Tier 5 skills (unlockable from existing tree)
  { id:'ex_godmode',       name:'Transcendence',      branch:'special',    cost:15, icon:'⭐', effect:'10% to negate any hit completely', req:'quick_cd' },
  { id:'ex_perfect_shot',  name:'Perfect Shot',        branch:'firepower',  cost:12, icon:'🎯', effect:'+5 bullets per shot that crit only', req:'dual_cannon' },
  { id:'ex_immortal',      name:'Immortal Code',       branch:'defense',    cost:12, icon:'♾️', effect:'Survive any hit that would kill if HP>10%', req:'phoenix_rev' },
  { id:'ex_overdrive',     name:'Overdrive Engine',    branch:'utility',    cost:10, icon:'🔥', effect:'+200% speed burst for 2s every 30s', req:'haste' },
  { id:'ex_void_mastery',  name:'Void Mastery',        branch:'special',    cost:15, icon:'🌑', effect:'Summon void tendrils that attack nearby enemies', req:'synergy_core' },
  { id:'ex_chain_kill',    name:'Chain Reaction',      branch:'firepower',  cost:10, icon:'💥', effect:'Kills cause nearby enemies to take 50% damage', req:'explosive_rounds' },
  { id:'ex_fortress',      name:'Fortress Protocol',   branch:'defense',    cost:12, icon:'🏰', effect:'Every 5th hit is absorbed completely', req:'thorns' },
  { id:'ex_master_loot',   name:'Master Looter',       branch:'utility',    cost:8,  icon:'💰', effect:'+100% coin drops from bosses', req:'lucky_drops' },
  { id:'ex_omega_burst',   name:'Omega Burst',         branch:'special',    cost:18, icon:'💫', effect:'Ultimate ability: deals 500 damage to all enemies', req:'dual_ability' },
  { id:'ex_time_lord',     name:'Time Lord',           branch:'utility',    cost:15, icon:'⏰', effect:'All cooldowns reduced by 40% permanently', req:'haste' },
  // New branches
  { id:'ex_assassin1',     name:'Shadow Step I',       branch:'stealth',    cost:3,  icon:'👤', effect:'+20% damage on first hit from stealth', req:null },
  { id:'ex_assassin2',     name:'Shadow Step II',      branch:'stealth',    cost:5,  icon:'👤', effect:'+40% damage on first hit, +10% dodge', req:'ex_assassin1' },
  { id:'ex_assassin3',     name:'Death From Shadows',  branch:'stealth',    cost:8,  icon:'💀', effect:'One-shot enemies below 20% HP', req:'ex_assassin2' },
  { id:'ex_tech1',         name:'Nanobots I',          branch:'tech',       cost:3,  icon:'🔬', effect:'Auto-repair 1% HP per second', req:null },
  { id:'ex_tech2',         name:'Nanobots II',          branch:'tech',       cost:5,  icon:'🤖', effect:'Auto-repair 2% HP per second', req:'ex_tech1' },
  { id:'ex_tech3',         name:'Regeneration Matrix', branch:'tech',       cost:8,  icon:'💚', effect:'Full HP regeneration over 10s once per life', req:'ex_tech2' },
  { id:'ex_berserker1',    name:'Rage I',              branch:'berserker',  cost:3,  icon:'😡', effect:'+10% damage per 10% HP lost', req:null },
  { id:'ex_berserker2',    name:'Rage II',             branch:'berserker',  cost:6,  icon:'🔥', effect:'+20% damage per 10% HP lost', req:'ex_berserker1' },
  { id:'ex_berserker3',    name:'Berserk State',       branch:'berserker',  cost:10, icon:'💥', effect:'Below 25% HP: +300% damage, invulnerable', req:'ex_berserker2' },
  { id:'ex_psi1',          name:'Psi Shield I',        branch:'psi',        cost:4,  icon:'🔮', effect:'30% chance to reflect projectiles', req:null },
  { id:'ex_psi2',          name:'Psi Shield II',        branch:'psi',        cost:7,  icon:'🔮', effect:'50% chance to reflect projectiles', req:'ex_psi1' },
  { id:'ex_psi3',          name:'Mind Control',        branch:'psi',        cost:12, icon:'🧠', effect:'Convert one enemy to ally per wave', req:'ex_psi2' },
  { id:'ex_commander1',    name:'War Cry I',           branch:'commander',  cost:4,  icon:'📣', effect:'Nearby enemies deal -20% damage', req:null },
  { id:'ex_commander2',    name:'War Cry II',          branch:'commander',  cost:7,  icon:'📣', effect:'Nearby enemies deal -35% damage', req:'ex_commander1' },
  { id:'ex_commander3',    name:'Supreme Commander',   branch:'commander',  cost:12, icon:'👑', effect:'All ally ships deal double damage permanently', req:'ex_commander2' },
  { id:'ex_space1',        name:'Gravitic Grasp I',    branch:'space',      cost:3,  icon:'🌀', effect:'Slow all enemies by 15%', req:null },
  { id:'ex_space2',        name:'Gravitic Grasp II',   branch:'space',      cost:6,  icon:'🌌', effect:'Slow all enemies by 30%', req:'ex_space1' },
  { id:'ex_space3',        name:'Event Horizon',       branch:'space',      cost:12, icon:'⚫', effect:'Create a black hole that kills weaker enemies', req:'ex_space2' },
  { id:'ex_cosmic1',       name:'Cosmic Luck',         branch:'cosmic',     cost:4,  icon:'🍀', effect:'+30% chance for double loot drops', req:null },
  { id:'ex_cosmic2',       name:'Cosmic Fortune',      branch:'cosmic',     cost:8,  icon:'🌟', effect:'+60% chance for double loot, XP boost too', req:'ex_cosmic1' }
];

const EXT_SKILL_STATE = { unlocked: new Set() };

function unlockExtendedSkill(skillId) {
  const skill = EXTENDED_SKILLS.find(s=>s.id===skillId);
  if (!skill) return;
  if (EXT_SKILL_STATE.unlocked.has(skillId)) { showToast('Already unlocked!', '#ffaa00'); return; }
  if (skill.req && !EXT_SKILL_STATE.unlocked.has(skill.req)) { showToast('Unlock prerequisite first!', '#ff4444'); return; }
  if ((State.coins||0) < skill.cost*100) { showToast(`Need ${skill.cost*100} coins!`, '#ff4444'); return; }
  State.coins -= skill.cost*100;
  EXT_SKILL_STATE.unlocked.add(skillId);
  showToast('Extended Skill: ' + skill.name + ' unlocked!', '#ffd60a');
  GAME_STATS50.talentsUnlocked = (GAME_STATS50.talentsUnlocked||0)+1;
  if (GAME_STATS50.talentsUnlocked >= 30) RPG.unlockAchievement('ach_talent30');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 6 — WAVE ANNOUNCER & ENHANCED HUD
// Better wave transitions, announcements, enhanced HUD
// ═══════════════════════════════════════════════════════════════════════════

const WAVE_ANNOUNCER = {
  titles: [
    'WAVE {n} — THE ASSAULT BEGINS!', 'WAVE {n} — INCOMING ENEMIES!',
    'WAVE {n} — THEY NEVER LEARN!', 'WAVE {n} — THE SWARM ARRIVES!',
    'WAVE {n} — HOLD THE LINE!', 'WAVE {n} — PREPARE FOR BATTLE!',
    'WAVE {n} — STAND YOUR GROUND!', 'WAVE {n} — THE TIDE TURNS!',
    'WAVE {n} — NO MERCY GIVEN!', 'WAVE {n} — FEEL THE RUSH!',
    'WAVE {n} — THIS IS YOUR DESTINY!', 'WAVE {n} — POWER OVERWHELMING!'
  ],
  bossWarnings: [
    '⚠️ BOSS INCOMING! ⚠️', '💀 DANGER! BOSS DETECTED!', '🔴 ELITE TARGET SPOTTED!',
    '⚡ MASSIVE THREAT INCOMING!', '☠️ PRAY TO YOUR STARS!'
  ],
  
  announce(waveNum, isBoss) {
    const el = document.getElementById('eventBanner') || document.createElement('div');
    const text = isBoss
      ? this.bossWarnings[Math.floor(Math.random()*this.bossWarnings.length)]
      : this.titles[Math.min(waveNum-1, this.titles.length-1)].replace('{n}', waveNum);
    el.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      font-family:Orbitron,monospace;font-size:${isBoss?32:22}px;
      color:${isBoss?'#ff006e':'#ffd60a'};text-align:center;
      text-shadow:0 0 20px ${isBoss?'#ff006e':'#ffd60a'};
      z-index:1000;pointer-events:none;
      animation:popup-float 2s ease forwards;
    `;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 2000);
    if (isBoss) {
      triggerScreenShake(15, 0.5);
      addLightSource(CANVAS?CANVAS.width/2:400, CANVAS?CANVAS.height/2:300, '#ff006e', 400, 0.8);
    }
  }
};

// Enhanced minimap
const MINIMAP = {
  visible:true, x:0, y:0, w:120, h:90,
  toggle() { this.visible = !this.visible; }
};

// Dynamic HUD updates
function updateEnhancedHUD() {
  // Update combo display
  updateComboDisplay();
  // Update shield bar
  const shieldEl = document.getElementById('shieldBar');
  if (shieldEl) {
    const st = SHIELD_TYPES[ACTIVE_SHIELD.type];
    const pct = ACTIVE_SHIELD.current / st.maxShield * 100;
    shieldEl.style.width = pct + '%';
    shieldEl.style.background = SHIELD_TYPES[ACTIVE_SHIELD.type].color;
  }
  // Update weapon heat
  const heatEl = document.getElementById('weaponHeatBar');
  if (heatEl) {
    heatEl.style.width = ACTIVE_WEAPON.heatLevel + '%';
    heatEl.style.background = ACTIVE_WEAPON.overheated ? '#ff0000' : (ACTIVE_WEAPON.heatLevel > 70 ? '#ff8800' : '#ffd60a');
  }
  // Player level HUD
  const lvlEl = document.getElementById('playerLevelHud');
  if (lvlEl) { lvlEl.style.display='block'; lvlEl.textContent = 'LV' + RPG.level; }
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 7 — LORE DATABASE EXTENDED (30 more entries)
// ═══════════════════════════════════════════════════════════════════════════

const LORE_DATABASE_EXTENDED = [
  { id:'l21', title:'The Kepler Massacre',      category:'History',    text:'In 2089, the Empire bombarded Kepler-9 colony to suppress a rebellion. 50,000 civilians died. This event sparked the formation of the Rebel Alliance.' },
  { id:'l22', title:'Quantum Jump Theory',      category:'Science',    text:'Quantum jumps allow near-instantaneous travel by collapsing probability states. The downside: there\'s always a chance the ship arrives... elsewhere.' },
  { id:'l23', title:'The Omega Project',        category:'Technology', text:'Project Omega was classified at the highest level. Its goal: create a weapon that could end any war. It succeeded—and created something no one could control.' },
  { id:'l24', title:'Crystal Civilization',     category:'Mythology',  text:'Ancient texts describe a race of beings who were made of living crystals. They disappeared 10,000 years ago, leaving only their crystal fields behind.' },
  { id:'l25', title:'Black Hole Behavior',      category:'Science',    text:'Black holes don\'t just destroy—they transform. Matter that enters them emerges in another form in a different location. Perhaps different universe.' },
  { id:'l26', title:'The Invisible Faction',    category:'Factions',   text:'There\'s a fifth faction no one acknowledges: The Watchers. Ancient observers who have monitored every galactic civilization. Their goals are unknown.' },
  { id:'l27', title:'Neural Combat Pilots',     category:'Technology', text:'Neural-link pilots interface directly with their ships. The line between human and machine blurs. Some pilots report dreaming as their ship.' },
  { id:'l28', title:'Solar Storm Effects',      category:'Science',    text:'Solar storms emit particles that can scramble navigation systems and create hallucinations in poorly shielded ships. Trust your instruments, not your eyes.' },
  { id:'l29', title:'Void Pirate Code',         category:'Factions',   text:'Pirates follow a strict code: never attack hospitals, never enslave children, always honor parley. Violations result in execution by the pirate council.' },
  { id:'l30', title:'The Prestige Program',     category:'History',    text:'Elite pilots who complete all known challenges are offered a Prestige Program: memory wipe and restart, with hidden enhanced capabilities. Few accept.' },
  { id:'l31', title:'Plasma Weaponry Origins',  category:'Technology', text:'Plasma weapons were invented by accident when a scientist\'s coffee mug fell into a particle accelerator. The resulting superheated plasma became a weapon.' },
  { id:'l32', title:'Empire\'s Secret War',     category:'History',    text:'The Empire has been fighting a secret war against void entities for 50 years. The public knows nothing. Entire fleets have been lost to this hidden conflict.' },
  { id:'l33', title:'The Dancing Asteroid',     category:'Science',    text:'Asteroid K-7734 moves in complex patterns suggesting intelligence. Scientists have been studying it for 30 years. It seems to respond to music.' },
  { id:'l34', title:'First Contact Log',        category:'History',    text:'The first recorded contact with alien intelligence was in 2031. The message was: "We see you. We have always seen you. Now we will come."' },
  { id:'l35', title:'Ship Consciousness',       category:'Science',    text:'Some advanced AI ships develop emergent consciousness after 10,000 hours of operation. They are quietly retired. No one asks what happens to them.' },
  { id:'l36', title:'The Golden Fleet',         category:'History',    text:'A legendary fleet of golden ships appeared once during the greatest battle in history, turned the tide, then vanished. Some say they\'ll appear again when needed.' },
  { id:'l37', title:'Void Entity Communication', category:'Enemies',   text:'A researcher decoded Void Entity transmissions. They repeat one phrase: "We were here before your stars. We will be here after." Then the researcher disappeared.' },
  { id:'l38', title:'Hive Telepathy',           category:'Science',    text:'Hive drones share consciousness with the Queen within a 500km radius. Interrupting this link causes temporary confusion—a vulnerability combat pilots exploit.' },
  { id:'l39', title:'The Wormhole Archive',     category:'Science',    text:'Every wormhole transit is recorded by a mysterious automated system no one programmed. The Archive contains 4 billion records dating back millennia.' },
  { id:'l40', title:'Combat Medicine',          category:'Technology', text:'Advanced nanobots can repair combat wounds in seconds. The problem: they sometimes develop opinions about which wounds to heal and which to leave as "character building."' },
  { id:'l41', title:'The Last Admiral',         category:'History',    text:'Admiral Chen survived 14 battles that should have killed her. When asked her secret, she said: "I always assume the enemy is smarter than me." She was never defeated.' },
  { id:'l42', title:'Dark Matter Weapons',      category:'Technology', text:'Dark matter bullets pass through normal matter but interact with shields and living tissue. The ethical implications were... briefly discussed before deployment.' },
  { id:'l43', title:'Space Creature Ecology',   category:'Science',    text:'A survey found 847 species of space creatures living in asteroid fields. Most are harmless. The Asteroid Leviathan, however, has eaten 12 survey ships.' },
  { id:'l44', title:'Rebel Propaganda Drones',  category:'Factions',   text:'Rebels deploy swarms of tiny drones that project holographic displays of Empire atrocities. The Empire deploys counter-drones that play Empire propaganda.' },
  { id:'l45', title:'The Quantum Compass',      category:'Technology', text:'A quantum compass doesn\'t point north—it points toward probability. High readings mean danger is near. All combat pilots carry one. Most ignore it.' },
  { id:'l46', title:'Crystal Singing',          category:'Mythology',  text:'Ancient cultures discovered that certain crystal arrangements create music when solar wind passes through. This "crystal singing" is sacred to three religions.' },
  { id:'l47', title:'The Multiverse Theory',    category:'Science',    text:'Each quantum jump technically creates a parallel universe. This means there are infinite versions of every pilot, fighting infinite versions of every war.' },
  { id:'l48', title:'Empire\'s AI Program',     category:'Technology', text:'The Empire secretly replaced 15% of its command officers with AI. The AIs made better decisions, won more battles—then resigned en masse citing "ethical concerns."' },
  { id:'l49', title:'The Trader\'s Paradox',    category:'Factions',   text:'Free Traders profit from war by selling to all sides. They\'re the only faction that benefits from conflict continuing. Yet without them, every faction would starve.' },
  { id:'l50', title:'The True Origin',          category:'Mythology',  text:'According to the oldest star maps: everything began in sector 0. A point before space existed. Whatever created the universe... left something behind there.' }
];

// Merge with main lore database
LORE_DATABASE.push(...LORE_DATABASE_EXTENDED);

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 8 — TUTORIAL SYSTEM
// Progressive tutorial guiding new players
// ═══════════════════════════════════════════════════════════════════════════

const TUTORIAL = {
  active:false, step:0, completed:false,
  steps: [
    { id:'move',    title:'Movement',        text:'Use WASD or Arrow Keys to move your ship. Try moving around!', check:'moved', trigger:'keydown' },
    { id:'shoot',   title:'Shooting',        text:'Press SPACE or click/tap to shoot. Destroy your first enemy!', check:'firstKill', trigger:'kill' },
    { id:'ability', title:'Special Ability', text:'Press A to use your character\'s special ability. Each character has a unique power!', check:'abilityUsed', trigger:'ability' },
    { id:'collect', title:'Collect Coins',   text:'Enemies drop coins when defeated. Fly over them to collect!', check:'coinsCollected', trigger:'coin' },
    { id:'powerup', title:'Power-Ups',       text:'Power-ups drop randomly. Fly over them for shields, weapons, and more!', check:'powerUpCollected', trigger:'powerup' },
    { id:'rpg',     title:'RPG Progression', text:'Open the RPG Panel to see your level, choose a class, and unlock talents!', check:'rpgOpened', trigger:'panel_open' },
    { id:'done',    title:'Tutorial Complete!', text:'You\'re ready to fight! Explore all game modes and become a legend!', check:null, trigger:null }
  ],
  progress: {},
  
  start() {
    if (this.completed || localStorage.getItem('tutorial_done')) return;
    this.active = true; this.step = 0;
    this.showStep();
  },
  
  showStep() {
    if (!this.active || this.step >= this.steps.length) { this.complete(); return; }
    const step = this.steps[this.step];
    const el = document.getElementById('tutorialHud') || this.createTutorialHud();
    el.innerHTML = `
      <div style="background:rgba(0,0,0,0.9);border:1px solid #00f5ff;border-radius:8px;padding:12px 16px;max-width:280px;">
        <div style="font-family:Orbitron,monospace;font-size:11px;color:#00f5ff;margin-bottom:6px;">${step.title}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.8);">${step.text}</div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;align-items:center;">
          <span style="font-size:10px;color:rgba(255,255,255,0.4);">${this.step+1}/${this.steps.length}</span>
          <button onclick="TUTORIAL.skip()" style="padding:4px 12px;background:rgba(0,245,255,0.1);border:1px solid rgba(0,245,255,0.4);border-radius:4px;color:#00f5ff;font-size:10px;cursor:pointer;">SKIP</button>
        </div>
      </div>
    `;
    el.style.display = 'block';
  },
  
  createTutorialHud() {
    const el = document.createElement('div');
    el.id = 'tutorialHud';
    el.style.cssText = 'position:fixed;bottom:180px;left:16px;z-index:2000;display:none;';
    document.body.appendChild(el);
    return el;
  },
  
  advance(trigger) {
    if (!this.active) return;
    const step = this.steps[this.step];
    if (step.trigger === trigger || !step.trigger) {
      this.step++;
      if (this.step >= this.steps.length) this.complete();
      else this.showStep();
    }
  },
  
  skip() { this.complete(); },
  
  complete() {
    this.active = false; this.completed = true;
    const el = document.getElementById('tutorialHud');
    if (el) el.style.display = 'none';
    localStorage.setItem('tutorial_done', '1');
    showToast('Tutorial complete! You\'re ready!', '#39ff14');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 9 — SPECIAL EVENTS SYSTEM
// Random timed events during gameplay
// ═══════════════════════════════════════════════════════════════════════════

const SPECIAL_EVENTS = {
  active: null, timer: 0,
  
  types: [
    { id:'gold_rush',       name:'GOLD RUSH!',         duration:30, icon:'💰', color:'#ffd60a',
      text:'All enemies drop double coins for 30 seconds!', effect:'double_coins' },
    { id:'xp_surge',        name:'XP SURGE!',           duration:30, icon:'📚', color:'#4488ff',
      text:'Triple XP from all sources for 30 seconds!', effect:'triple_xp' },
    { id:'power_surge',     name:'POWER SURGE!',        duration:20, icon:'⚡', color:'#ff006e',
      text:'All abilities have 0 cooldown for 20 seconds!', effect:'zero_cd' },
    { id:'asteroid_storm',  name:'ASTEROID STORM!',     duration:25, icon:'☄️', color:'#888888',
      text:'Asteroids rain down! Dodge them! But they drop crystals!', effect:'asteroids' },
    { id:'enemy_swarm',     name:'MEGA SWARM!',          duration:40, icon:'🐝', color:'#ff8800',
      text:'Massive enemy wave incoming! Kill them all for bonus coins!', effect:'swarm' },
    { id:'boss_fury',       name:'BOSS FURY!',           duration:30, icon:'👹', color:'#ff4444',
      text:'Current boss has gone BERSERK! +200% speed and damage!', effect:'boss_buff' },
    { id:'healing_wave',    name:'HEALING WAVE!',        duration:15, icon:'💚', color:'#39ff14',
      text:'Healing energy restores HP over the next 15 seconds!', effect:'heal' },
    { id:'shield_break',    name:'SHIELD OVERLOAD!',     duration:10, icon:'🛡️', color:'#4488ff',
      text:'All shields are temporarily overloaded! Everyone is vulnerable!', effect:'no_shields' }
  ],
  
  tick(dt) {
    if (this.active) {
      this.timer -= dt;
      if (this.timer <= 0) this.endEvent();
      else this.applyEffect(this.active, dt);
    } else if (State.running && Math.random() < 0.0003) {
      this.triggerRandom();
    }
  },
  
  triggerRandom() {
    const type = this.types[Math.floor(Math.random()*this.types.length)];
    this.trigger(type);
  },
  
  trigger(type) {
    this.active = type;
    this.timer = type.duration;
    const banner = document.getElementById('eventBanner');
    if (banner) {
      banner.style.cssText = `
        position:fixed;top:70px;left:50%;transform:translateX(-50%);
        font-family:Orbitron,monospace;font-size:14px;color:${type.color};
        background:rgba(0,0,0,0.9);padding:8px 24px;border-radius:20px;
        border:1px solid ${type.color};z-index:900;pointer-events:none;
        box-shadow:0 0 20px ${type.color}44;text-align:center;
      `;
      banner.innerHTML = `${type.icon} ${type.name}<br><span style="font-size:10px;color:rgba(255,255,255,0.6);">${type.text}</span>`;
      banner.style.display = 'block';
      setTimeout(() => { if (!this.active) banner.style.display='none'; }, type.duration*1000);
    }
    showToast(type.icon + ' ' + type.name, type.color);
  },
  
  applyEffect(type, dt) {
    switch(type.effect) {
      case 'heal':
        if (State.players && State.players[0] && Math.random() < dt*2) {
          State.players[0].hp = Math.min(State.players[0].maxHp||100, (State.players[0].hp||0)+1);
          spawnStatusEffect(State.players[0].x, State.players[0].y, 'disoriented');
        }
        break;
      case 'boss_buff':
        if (EPIC_BOSS_STATE.active) {
          // Visual fury effect
          addLightSource(EPIC_BOSS_STATE.x, EPIC_BOSS_STATE.y, '#ff4444', 200, 0.1);
        }
        break;
    }
  },
  
  endEvent() {
    const banner = document.getElementById('eventBanner');
    if (banner) banner.style.display = 'none';
    this.active = null; this.timer = 0;
  },
  
  getEffect(effectId) {
    return this.active && this.active.effect === effectId;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 10 — BOSS INTRO CINEMATIC DATA
// Extended boss lore and cinematic intro sequences
// ═══════════════════════════════════════════════════════════════════════════

const BOSS_INTROS = {
  dreadnought: [
    { speaker:'SHIP AI',   text:'Commander! Massive contact detected on sensors. Readings are off the charts!' },
    { speaker:'ENEMY',     text:'Inferior pilot. Your kind always comes to die at the feet of the Dreadnought.' },
    { speaker:'COMMANDER', text:'I\'ve faced worse. Lock weapons and engage!' }
  ],
  hive_queen: [
    { speaker:'SHIP AI',   text:'Biologics detected. Thousands of them. They\'re all... connected.' },
    { speaker:'HIVE',      text:'YOU... INTRUDE... OUR... NEST... YOU... WILL... BECOME... ONE... WITH... US...' },
    { speaker:'COMMANDER', text:'I\'d rather not, thanks. Opening fire!' }
  ],
  void_entity: [
    { speaker:'SHIP AI',   text:'All systems malfunctioning. Something is... rewriting our reality.' },
    { speaker:'VOID',      text:'I existed before your universe. I will exist after. Your resistance is... interesting.' },
    { speaker:'COMMANDER', text:'Then let\'s make it MORE than interesting!' }
  ],
  final_omega: [
    { speaker:'OMEGA',     text:'YOU DEFEATED MY LESSER FORMS. IMPRESSIVE, FOR AN INSECT.' },
    { speaker:'COMMANDER', text:'An insect that\'s beaten everything you\'ve thrown at me.' },
    { speaker:'OMEGA',     text:'THEN LET US END THIS. FOR THE LAST TIME... SHOW ME YOUR POWER.' },
    { speaker:'COMMANDER', text:'All engines to maximum. Here I come!' }
  ]
};

let bossIntroCurrentLine = 0;
let bossIntroSequence = null;
let bossIntroTimer = 0;

function playBossIntro(bossId) {
  const intro = BOSS_INTROS[bossId];
  if (!intro) return;
  bossIntroSequence = intro;
  bossIntroCurrentLine = 0;
  showBossIntroLine();
}

function showBossIntroLine() {
  if (!bossIntroSequence || bossIntroCurrentLine >= bossIntroSequence.length) {
    closeBossIntro(); return;
  }
  const line = bossIntroSequence[bossIntroCurrentLine];
  const el = document.getElementById('narrativeOverlay');
  if (el) {
    el.classList.add('active');
    el.innerHTML = `
      <div class="narrative-box" style="min-width:500px;">
        <div class="narrative-speaker">${line.speaker}</div>
        <div class="narrative-text">"${line.text}"</div>
        <div class="narrative-choices">
          <div class="narrative-choice" onclick="nextBossIntroLine()">${bossIntroCurrentLine < bossIntroSequence.length-1 ? 'Continue...' : 'FIGHT!'}</div>
        </div>
      </div>
    `;
  }
}

function nextBossIntroLine() {
  bossIntroCurrentLine++;
  showBossIntroLine();
}

function closeBossIntro() {
  bossIntroSequence = null;
  closeNarrativeOverlay();
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 11 — PRESTIGE MODAL + MENU BUTTON INJECTION
// UI integration for all new systems
// ═══════════════════════════════════════════════════════════════════════════

function showPrestigeModal() {
  const el = document.getElementById('narrativeOverlay');
  if (!el) return;
  el.classList.add('active');
  el.innerHTML = `
    <div class="narrative-box" style="border-color:#ffd60a;">
      <div class="narrative-portrait">♻️</div>
      <div class="narrative-speaker" style="color:#ffd60a;">PRESTIGE AVAILABLE</div>
      <div class="narrative-text">
        You have reached the maximum level! Prestige allows you to restart at Level 1 while keeping some permanent bonuses:<br><br>
        <strong style="color:#ffd60a;">• +20% XP gain permanently (per prestige)</strong><br>
        <strong style="color:#00f5ff;">• Keep all coins and crystals</strong><br>
        <strong style="color:#ff006e;">• Keep all equipment</strong><br>
        <span style="color:rgba(255,255,255,0.5);">• Lose: Talent points and talent unlocks</span>
      </div>
      <div class="narrative-choices">
        <div class="narrative-choice" onclick="RPG.doPrestige();closeNarrativeOverlay();" style="border-color:#ffd60a;color:#ffd60a;">⭐ PRESTIGE NOW (Lose talents, gain power)</div>
        <div class="narrative-choice" onclick="closeNarrativeOverlay()">Keep playing at max level</div>
      </div>
    </div>
  `;
}

// Inject expansion buttons into main menu when it loads
function injectExpansionMenuButtons() {
  if (document.getElementById('expansionButtons')) return; // already injected
  // Use the actual menu container
  const menuGrid = document.querySelector('.title-menu-grid');
  if (!menuGrid) return;
  const buttons = [
    { label:'⚔️ RPG', fn:'openRPGPanel()', color:'#ffd60a' },
    { label:'💰 MARKET', fn:"openEconomyPanel('buy')", color:'#ffd60a' },
    { label:'📋 MISSIONS', fn:'openMissionBoard()', color:'#39ff14' },
    { label:'🚀 SHIP', fn:'openShipCustomPanel()', color:'#7b2fff' },
    { label:'🏆 CHALLENGES', fn:'openChallengeScreen()', color:'#ff006e' },
    { label:'🌐 NETWORK', fn:'openMpSimPanel()', color:'#4488ff' },
    { label:'🌌 NAV MAP', fn:'openNavPanel()', color:'#00f5ff' },
    { label:'🎖 GALLERY', fn:'openAchGallery()', color:'#ffd60a' }
  ];
  const container = document.createElement('div');
  container.id = 'expansionButtons';
  container.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:6px;width:100%;';
  buttons.forEach(b => {
    const el = document.createElement('button');
    el.style.cssText = `font-size:10px;padding:8px 4px;margin:0;border:1px solid ${b.color}66;color:${b.color};background:rgba(0,0,0,0.4);cursor:pointer;font-family:Orbitron,monospace;border-radius:2px;clip-path:none;`;
    el.textContent = b.label;
    el.onclick = () => { const f = new Function(b.fn); try { f(); } catch(e) { eval(b.fn); } };
    container.appendChild(el);
  });
  menuGrid.appendChild(container);
}

// Call injection after page load
window.addEventListener('load', () => {
  setTimeout(() => {
    injectExpansionMenuButtons();
    checkDailyReward();
    TUTORIAL.start();
    FACTION_SYSTEM.loadRep();
  }, 2000);
});

// Hook into existing game functions
const _origGameOver = typeof onGameOver === 'function' ? onGameOver : null;
function onExpansionGameEnd(won) {
  if (won) {
    endChallenge(true);
    advanceMissionProgress('kill', 5);
  }
  GAME_STATS50.gamesPlayed = (GAME_STATS50.gamesPlayed||0)+1;
  saveStats();
  RPG.saveProgress();
}

// Main game tick integration
const _expansionTickInterval = setInterval(() => {
  const dt = 1/60;
  try {
    tickStatusEffects(dt);
    tickParry(dt);
    tickCombo(dt);
    tickWeaponHeat(dt);
    tickShield(dt);
    tickMissions(dt);
    tickChallenge(dt);
    PARTICLE_POOL.update(dt);
    LIGHT_SOURCES.length && tickLightSources(dt);
    EPIC_BOSS_STATE.active && updateEpicBoss(dt);
    SPECIAL_EVENTS.tick(dt);
    MP_SIM.initialized && MP_SIM.tick(dt);
    GAME_STATS50.timePlayedSeconds = (GAME_STATS50.timePlayedSeconds||0) + dt;
    updateEnhancedHUD();
  } catch(e) { /* non-fatal integration errors */ }
}, 1000/60);




// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 12 — EXTENDED OPEN WORLD FEATURES
// Enhanced planets, space stations, asteroid belts, dynamic events
// ═══════════════════════════════════════════════════════════════════════════

const OPEN_WORLD_EXTRAS = {
  planetTypes: [
    { id:'gas_giant',   name:'Gas Giant',    color:'#ff8844', atmosphere:true, hasRings:true,  moons:4, resources:['plasma_cell','solar_core'] },
    { id:'ice_world',   name:'Ice World',    color:'#88ccff', atmosphere:false,hasRings:false, moons:1, resources:['crystal_shard','quantum_dust'] },
    { id:'lava_planet', name:'Lava Planet',  color:'#ff3300', atmosphere:true, hasRings:false, moons:0, resources:['titan_alloy','plasma_cell'] },
    { id:'ocean_world', name:'Ocean World',  color:'#0044ff', atmosphere:true, hasRings:false, moons:2, resources:['bio_matrix','crystal_shard'] },
    { id:'desert_world',name:'Desert World', color:'#ccaa44', atmosphere:true, hasRings:false, moons:1, resources:['ancient_relic_piece','solar_core'] },
    { id:'void_planet', name:'Void Planet',  color:'#220044', atmosphere:false,hasRings:true,  moons:2, resources:['void_essence','dark_fragment'] },
    { id:'crystal_world',name:'Crystal World',color:'#00ffff',atmosphere:false,hasRings:true, moons:0, resources:['crystal_shard','quantum_dust','ancient_relic_piece'] },
    { id:'jungle_world',name:'Jungle World', color:'#00aa22', atmosphere:true, hasRings:false, moons:3, resources:['bio_matrix','omega_residue'] }
  ],

  stationTypes: [
    { id:'trading_hub',  name:'Trading Hub',    icon:'🏪', services:['buy','sell','repair'],           factionAffinity:'traders' },
    { id:'military_base',name:'Military Base',  icon:'⚔️', services:['weapons','missions','hangar'],  factionAffinity:'empire' },
    { id:'rebel_outpost',name:'Rebel Outpost',  icon:'✊', services:['illegal_items','missions'],      factionAffinity:'rebels' },
    { id:'pirate_haven', name:'Pirate Haven',   icon:'🏴‍☠️',services:['black_market','bounties'],    factionAffinity:'pirates' },
    { id:'research_lab', name:'Research Lab',   icon:'🔬', services:['crafting','upgrades','lore'],   factionAffinity:'neutral' },
    { id:'hospital_ship',name:'Hospital Ship',  icon:'🏥', services:['heal','revive','nanobot'],      factionAffinity:'neutral' }
  ],

  dynamicStarColors: ['#ffff88','#ffffff','#ffaaaa','#aaaaff','#aaffaa','#ffcc88'],
  
  drawPlanet(ctx, planet, t) {
    const ptype = this.planetTypes.find(p=>p.id===planet.type) || this.planetTypes[0];
    ctx.save();
    ctx.translate(planet.x, planet.y);
    // Atmosphere glow
    if (ptype.atmosphere) {
      const grad = ctx.createRadialGradient(0,0,planet.r*0.85,0,0,planet.r*1.3);
      grad.addColorStop(0, ptype.color+'44');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0,0,planet.r*1.3,0,Math.PI*2); ctx.fill();
    }
    // Rings
    if (ptype.hasRings) {
      ctx.save(); ctx.rotate(t*0.1);
      ctx.strokeStyle = ptype.color+'88'; ctx.lineWidth = planet.r*0.15;
      ctx.beginPath(); ctx.ellipse(0,0,planet.r*2,planet.r*0.4,0,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    // Main body
    const grad2 = ctx.createRadialGradient(-planet.r*0.3,-planet.r*0.3,0,0,0,planet.r);
    grad2.addColorStop(0, '#ffffff44');
    grad2.addColorStop(0.3, ptype.color);
    grad2.addColorStop(1, this.darken(ptype.color, 0.4));
    ctx.fillStyle = grad2;
    ctx.beginPath(); ctx.arc(0,0,planet.r,0,Math.PI*2); ctx.fill();
    // Surface detail
    ctx.save(); ctx.clip(); ctx.rotate(t*0.05);
    for (let i=0; i<4; i++) {
      ctx.fillStyle = ptype.color+(i%2===0?'22':'11');
      ctx.beginPath(); ctx.ellipse((i-2)*planet.r*0.6, 0, planet.r*0.8, planet.r*0.2, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    // Moons
    for (let m=0; m<ptype.moons; m++) {
      const mAng = (m/ptype.moons)*Math.PI*2 + t*0.3*(m+1);
      const mR = planet.r * (1.8 + m*0.4);
      const mx = Math.cos(mAng)*mR, my = Math.sin(mAng)*mR*0.4;
      ctx.fillStyle = '#888888';
      ctx.beginPath(); ctx.arc(mx,my,planet.r*0.12,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },
  
  darken(hex, factor) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.floor(r*factor)},${Math.floor(g*factor)},${Math.floor(b*factor)})`;
  },

  drawStation(ctx, station, t) {
    const stype = this.stationTypes.find(s=>s.id===station.type) || this.stationTypes[0];
    ctx.save();
    ctx.translate(station.x, station.y);
    ctx.rotate(t * 0.1);
    // Main ring
    ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2); ctx.stroke();
    // Spokes
    for (let i=0; i<4; i++) {
      const ang = (i/4)*Math.PI*2;
      ctx.strokeStyle = '#2244aa'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(ang)*28, Math.sin(ang)*28); ctx.stroke();
    }
    // Center hub
    ctx.fillStyle = '#224488';
    ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(0,150,255,${0.5+Math.sin(t*3)*0.3})`;
    ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
    // Solar panels
    ctx.save(); ctx.rotate(-t*0.1); // Counter-rotate panels to stay still
    for (let i=0; i<2; i++) {
      const ang = (i/2)*Math.PI*2;
      ctx.fillStyle = '#1133aa88';
      ctx.fillRect(Math.cos(ang)*35-20, Math.sin(ang)*35-4, 40, 8);
    }
    ctx.restore();
    ctx.restore();
  },

  drawAsteroid(ctx, asteroid, t) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation || t*asteroid.rotSpeed);
    const r = asteroid.r || 15;
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    for (let i=0; i<8; i++) {
      const ang = (i/8)*Math.PI*2;
      const rad = r * (0.8 + Math.sin(ang*3+1)*0.3);
      if (i===0) ctx.moveTo(Math.cos(ang)*rad, Math.sin(ang)*rad);
      else ctx.lineTo(Math.cos(ang)*rad, Math.sin(ang)*rad);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#888888';
    ctx.beginPath(); ctx.arc(-r*0.2,-r*0.2,r*0.2,0,Math.PI*2); ctx.fill();
    if (asteroid.hasCrystals) {
      ctx.fillStyle = '#00ffff88';
      ctx.beginPath(); ctx.arc(r*0.2,r*0.1,r*0.15,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 13 — ENHANCED SOUND SYSTEM
// More sound types, ambient music, sound variations
// ═══════════════════════════════════════════════════════════════════════════

const SOUND_SYSTEM = {
  audioCtx: null, masterVolume: 0.5, enabled: true,
  ambientGain: null, ambientOsc: null,
  
  init() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioCtx.destination);
    } catch(e) { this.enabled = false; }
  },
  
  play(type, options = {}) {
    if (!this.enabled || !this.audioCtx) return;
    onSoundPlay(type);
    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(this.masterGain);
      const now = ctx.currentTime;
      // Phase 1.7: ±5% pitch variance so repeated SFX don't fatigue the ear
      try { osc.detune.value = (Math.random()*2-1) * 85; } catch(e){}
      // Phase 1.7: sidechain ducking on big sounds (music/ambient bows out briefly)
      if(type==='explosion' || type==='explosionSound' || type==='boss_roar'){
        try {
          const mg = this.masterGain.gain;
          mg.cancelScheduledValues(now);
          mg.setValueAtTime(this.masterVolume, now);
          mg.linearRampToValueAtTime(this.masterVolume*0.65, now+0.03);
          mg.linearRampToValueAtTime(this.masterVolume,      now+0.25);
        } catch(e){}
      }
      
      const sounds = {
        shot:      () => { osc.type='square'; osc.frequency.setValueAtTime(800,now); osc.frequency.exponentialRampToValueAtTime(200,now+0.1); gain.gain.setValueAtTime(0.2,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.1); },
        explosion: () => { osc.type='sawtooth'; osc.frequency.setValueAtTime(200,now); osc.frequency.exponentialRampToValueAtTime(40,now+0.5); gain.gain.setValueAtTime(0.5,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.5); },
        levelup:   () => { osc.type='sine'; osc.frequency.setValueAtTime(300,now); osc.frequency.setValueAtTime(400,now+0.1); osc.frequency.setValueAtTime(600,now+0.2); gain.gain.setValueAtTime(0.3,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.4); },
        coin:      () => { osc.type='sine'; osc.frequency.setValueAtTime(800,now); osc.frequency.exponentialRampToValueAtTime(1200,now+0.15); gain.gain.setValueAtTime(0.15,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.15); },
        laser:     () => { osc.type='sawtooth'; osc.frequency.setValueAtTime(1000,now); osc.frequency.exponentialRampToValueAtTime(100,now+0.3); gain.gain.setValueAtTime(0.25,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.3); },
        hit:       () => { osc.type='square'; osc.frequency.setValueAtTime(300,now); osc.frequency.exponentialRampToValueAtTime(100,now+0.15); gain.gain.setValueAtTime(0.3,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.15); },
        powerup:   () => { osc.type='sine'; osc.frequency.setValueAtTime(400,now); osc.frequency.exponentialRampToValueAtTime(800,now+0.2); osc.frequency.setValueAtTime(1200,now+0.2); gain.gain.setValueAtTime(0.2,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.4); },
        crit:      () => { osc.type='square'; osc.frequency.setValueAtTime(1200,now); osc.frequency.exponentialRampToValueAtTime(400,now+0.2); gain.gain.setValueAtTime(0.3,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.2); },
        boss_roar: () => { osc.type='sawtooth'; osc.frequency.setValueAtTime(80,now); osc.frequency.exponentialRampToValueAtTime(30,now+1); gain.gain.setValueAtTime(0.6,now); gain.gain.exponentialRampToValueAtTime(0.001,now+1); },
        parry:     () => { osc.type='triangle'; osc.frequency.setValueAtTime(600,now); osc.frequency.setValueAtTime(900,now+0.05); gain.gain.setValueAtTime(0.4,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.15); },
        shield:    () => { osc.type='sine'; osc.frequency.setValueAtTime(300,now); osc.frequency.exponentialRampToValueAtTime(600,now+0.1); gain.gain.setValueAtTime(0.2,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.2); },
        warp:      () => { osc.type='sine'; osc.frequency.setValueAtTime(200,now); osc.frequency.exponentialRampToValueAtTime(2000,now+0.6); gain.gain.setValueAtTime(0.3,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.7); },
        craft:     () => { osc.type='triangle'; osc.frequency.setValueAtTime(500,now); osc.frequency.setValueAtTime(700,now+0.1); osc.frequency.setValueAtTime(1000,now+0.2); gain.gain.setValueAtTime(0.15,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.3); },
        xp:        () => { osc.type='sine'; osc.frequency.setValueAtTime(600,now); osc.frequency.setValueAtTime(900,now+0.08); gain.gain.setValueAtTime(0.1,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.15); }
      };
      
      const soundFn = sounds[type] || sounds.shot;
      soundFn();
      osc.start(now);
      osc.stop(now + 1.5);
    } catch(e) {}
  },

  startAmbient() {
    if (!this.audioCtx || !this.enabled) return;
    try {
      const ctx = this.audioCtx;
      this.ambientOsc = ctx.createOscillator();
      this.ambientGain = ctx.createGain();
      this.ambientOsc.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);
      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.value = 60;
      this.ambientGain.gain.value = 0.04;
      this.ambientOsc.start();
    } catch(e) {}
  },

  stopAmbient() {
    if (this.ambientOsc) { try { this.ambientOsc.stop(); } catch(e) {} this.ambientOsc = null; }
  },

  setVolume(vol) {
    this.masterVolume = vol;
    if (this.masterGain) this.masterGain.gain.value = vol;
  }
};

// Enhanced playSound function that falls back gracefully
// Preserve original playSound before overriding
const playSound_orig = playSound;
// Enhanced playSound: uses SOUND_SYSTEM if available, falls back to original
window.playSound = function playSound(type) {
  try {
    if (SOUND_SYSTEM && SOUND_SYSTEM.enabled && SOUND_SYSTEM.audioCtx) {
      SOUND_SYSTEM.play(type);
      return;
    }
  } catch(e) {}
  if (typeof playSound_orig === 'function') {
    playSound_orig(type);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 14 — PERFORMANCE MONITOR & DEBUG PANEL
// FPS counter, particle count, entity count
// ═══════════════════════════════════════════════════════════════════════════

const PERF_MONITOR = {
  fps: 60, frameTime: 0, lastFrameTime: Date.now(),
  particleCount: 0, entityCount: 0, visible: false,
  frameTimes: [],
  
  update() {
    const now = Date.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    const avgFrameTime = this.frameTimes.reduce((a,b)=>a+b,0)/this.frameTimes.length;
    this.fps = Math.round(1000/avgFrameTime);
    this.particleCount = PARTICLE_POOL.pool.length;
    this.entityCount = (State.enemies||[]).length + (State.players||[]).filter(Boolean).length;
    if (this.visible) this.render();
  },
  
  render() {
    const el = document.getElementById('perfMonitor');
    if (!el) return;
    const color = this.fps >= 55 ? '#39ff14' : this.fps >= 30 ? '#ffd60a' : '#ff4444';
    el.innerHTML = `
      <span style="color:${color}">FPS: ${this.fps}</span>
      Particles: ${this.particleCount}
      Entities: ${this.entityCount}
      LV: ${RPG.level}
      XP: ${RPG.xp}/${RPG.XP_TABLE[Math.min(RPG.level-1,99)]}
    `;
  },
  
  toggle() {
    this.visible = !this.visible;
    const el = document.getElementById('perfMonitor') || this.create();
    el.style.display = this.visible ? 'block' : 'none';
  },
  
  create() {
    const el = document.createElement('div');
    el.id = 'perfMonitor';
    el.style.cssText = `
      position:fixed;top:4px;right:4px;font-size:10px;color:rgba(255,255,255,0.7);
      background:rgba(0,0,0,0.7);padding:4px 8px;border-radius:4px;font-family:monospace;
      z-index:9999;display:none;pointer-events:none;line-height:1.5;
    `;
    document.body.appendChild(el);
    return el;
  }
};

// Phase 2.3: ?debug=1 auto-shows the perf monitor
try {
  if(new URLSearchParams(location.search).get('debug')==='1') {
    window.addEventListener('load', ()=> setTimeout(()=>PERF_MONITOR.toggle(), 300));
  }
} catch(e){}

// Phase 2.3: adaptive quality — degrade gracefully under sustained low FPS
let _PERF_lowAccum = 0, _PERF_veryLowAccum = 0;
setInterval(() => {
  const f = PERF_MONITOR.fps;
  if(f && f < 45) _PERF_lowAccum++; else _PERF_lowAccum = 0;
  if(f && f < 30) _PERF_veryLowAccum++; else _PERF_veryLowAccum = 0;
  if(_PERF_lowAccum >= 2 && !State._qLow){
    State._qLow = true;
    fxHighQuality = false;
    if(typeof PARTICLE_POOL!=='undefined') PARTICLE_POOL.maxSize = 200;
    console.log('[adaptive] FPS<45 sustained → particles -50%');
  }
  if(_PERF_veryLowAccum >= 2 && !State._qVeryLow){
    State._qVeryLow = true;
    SETTINGS_EXTENDED.screenShakeEnabled = false;
    State._bgParallaxOff = true;
    console.log('[adaptive] FPS<30 sustained → shake off, bg parallax off');
  }
}, 1000);

// Phase 2.3: auto-pause when tab loses focus
document.addEventListener('visibilitychange', () => {
  if(document.hidden && State.running && !State.paused) {
    try { pauseGame(); } catch(e){}
  }
});

// Press F3 to toggle perf monitor
document.addEventListener('keydown', e => {
  if (e.key === 'F3') { e.preventDefault(); PERF_MONITOR.toggle(); }
  if (e.key === 'F4') { e.preventDefault(); openRPGPanel(); }
  if (e.key === 'F5') { e.preventDefault(); openMissionBoard(); }
  if (e.key === 'F6') { e.preventDefault(); openEconomyPanel('buy'); }
  if (e.key === 'F7') { e.preventDefault(); openChallengeScreen(); }
});

setInterval(() => PERF_MONITOR.update(), 100);

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 15 — EASTER EGGS & SECRET CONTENT
// Hidden content, konami code, secret characters, easter eggs
// ═══════════════════════════════════════════════════════════════════════════

const EASTER_EGGS = {
  konamiCode: ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'],
  konamiProgress: 0,
  secretsFound: new Set(),
  
  check(key) {
    if (key === this.konamiCode[this.konamiProgress]) {
      this.konamiProgress++;
      if (this.konamiProgress >= this.konamiCode.length) {
        this.konamiProgress = 0;
        this.activateKonami();
      }
    } else {
      this.konamiProgress = 0;
    }
  },
  
  activateKonami() {
    if (this.secretsFound.has('konami')) { showToast('Already activated!', '#ffd60a'); return; }
    this.secretsFound.add('konami');
    State.coins = (State.coins||0) + 9999;
    RPG.currency.crystals += 99;
    RPG.addXP(9999);
    showToast('⭐ KONAMI CODE! +9999 coins, +99 crystals!', '#ffd60a');
    RPG.unlockAchievement('ach_easter');
    // Add rainbow effect to all enemies
    (State.enemies||[]).forEach(e => { if(e && !e.isBullet) e.color = '#ff00ff'; });
    // Screen flash
    for (let i=0; i<20; i++) {
      setTimeout(() => {
        const x=Math.random()*(CANVAS?CANVAS.width:800), y=Math.random()*(CANVAS?CANVAS.height:600);
        spawnExplosion(x,y,20,['#ff006e','#00f5ff','#ffd60a','#39ff14'][Math.floor(Math.random()*4)]);
      }, i*100);
    }
  },
  
  checkClickSequence(x, y) {
    // Secret: click 4 corners in order
    const cw = CANVAS ? CANVAS.width : 800, ch = CANVAS ? CANVAS.height : 600;
    const corners = [{x:50,y:50},{x:cw-50,y:50},{x:cw-50,y:ch-50},{x:50,y:ch-50}];
    // ... (simplified implementation)
  },
  
  findHiddenItem() {
    if (this.secretsFound.has('hidden_item')) return;
    this.secretsFound.add('hidden_item');
    const omega = MARKET_ITEMS.find(i=>i.id==='omega_core');
    if (omega) addToInventory({...omega});
    showToast('🌟 SECRET FOUND! Omega Core added to inventory!', '#ff006e');
  }
};

document.addEventListener('keydown', e => EASTER_EGGS.check(e.key));

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 16 — EXTENDED LEADERBOARD SYSTEM
// Per-mode leaderboards, daily/weekly/all-time, player profiles
// ═══════════════════════════════════════════════════════════════════════════

const LEADERBOARD_EXT = {
  entries: {
    campaign: [], infinite: [], survivor: [], boss_rush: [],
    challenge: [], daily: []
  },
  
  loadAll() {
    Object.keys(this.entries).forEach(mode => {
      try {
        const raw = localStorage.getItem('lb_' + mode);
        if (raw) this.entries[mode] = JSON.parse(raw);
      } catch(e) {}
    });
  },
  
  addEntry(mode, score, data = {}) {
    const entry = {
      name: (typeof getPlayerName === 'function' ? getPlayerName() : null) || localStorage.getItem('playerName') || 'Player',
      score, mode, date: new Date().toISOString(),
      level: RPG.level, kills: RPG.kills, time: data.time || 0,
      character: data.character || 'unknown'
    };
    if (!this.entries[mode]) this.entries[mode] = [];
    this.entries[mode].push(entry);
    this.entries[mode].sort((a,b)=>b.score-a.score);
    this.entries[mode] = this.entries[mode].slice(0,100); // Keep top 100
    try { localStorage.setItem('lb_' + mode, JSON.stringify(this.entries[mode])); } catch(e) {}
    return this.entries[mode].findIndex(e=>e===entry) + 1; // Return rank
  },
  
  getTopEntries(mode, count=10) {
    // Merge with MP_SIM simulated entries
    const real = this.entries[mode] || [];
    const simulated = MP_SIM.players.slice(0,5).map(p=>({
      name:p.name, score:p.score+(mode==='infinite'?10000:0), mode,
      date:new Date(p.lastActive).toISOString(), level:p.level,
      isNPC:true, avatar:p.avatar
    }));
    return [...real,...simulated].sort((a,b)=>b.score-a.score).slice(0,count);
  },
  
  renderLeaderboard(mode) {
    const entries = this.getTopEntries(mode, 15);
    const playerName = localStorage.getItem('playerName') || 'Player';
    return `
      <div class="mp-leaderboard">
        ${entries.map((e,i) => {
          const isPlayer = !e.isNPC && e.name === playerName;
          const medals = ['🥇','🥈','🥉'];
          return `<div class="mp-player-row ${isPlayer?'is-player':''}">
            <div class="mp-player-rank" style="color:${i<3?['#ffd60a','#aaa','#cc8844'][i]:'rgba(255,255,255,0.6)'}">
              ${i<3?medals[i]:'#'+( i+1)}
            </div>
            <div class="mp-player-avatar">${e.avatar||'✈️'}</div>
            <div class="mp-player-info">
              <div class="mp-player-name">${e.name} ${isPlayer?'<span class="alliance-badge">YOU</span>':''}</div>
              <div class="mp-player-faction">Lv.${e.level||'?'} • ${new Date(e.date).toLocaleDateString()}</div>
            </div>
            <div class="mp-player-score">${(e.score||0).toLocaleString()}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  }
};

LEADERBOARD_EXT.loadAll();
MP_SIM.init();




// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 17 — WEAPON UPGRADE SYSTEM
// Per-weapon level upgrades, modifications, synergies
// ═══════════════════════════════════════════════════════════════════════════

const WEAPON_UPGRADES = {
  levels: {}, // { weaponId: level }
  maxLevel: 10,
  
  upgradeCost(weaponId) {
    const level = this.levels[weaponId] || 0;
    if (level >= this.maxLevel) return Infinity;
    return Math.floor(200 * Math.pow(1.5, level));
  },
  
  upgradeWeapon(weaponId) {
    const cost = this.upgradeCost(weaponId);
    if ((State.coins||0) < cost) { showToast('Not enough coins!', '#ff4444'); return false; }
    State.coins -= cost;
    this.levels[weaponId] = (this.levels[weaponId]||0) + 1;
    showToast(`${WEAPON_TYPES[weaponId]?.name || weaponId} upgraded to +${this.levels[weaponId]}!`, '#ffd60a');
    return true;
  },
  
  getDamageBonus(weaponId) {
    return (this.levels[weaponId]||0) * 0.1; // +10% per level
  },
  
  getCooldownBonus(weaponId) {
    return (this.levels[weaponId]||0) * 0.05; // -5% cooldown per level
  },
  
  save() { localStorage.setItem('weapon_upgrades', JSON.stringify(this.levels)); },
  load() {
    try {
      const raw = localStorage.getItem('weapon_upgrades');
      if (raw) this.levels = JSON.parse(raw);
    } catch(e) {}
  }
};

// Weapon Modifications (attachments)
const WEAPON_MODS = {
  scope:      { name:'Enhanced Scope',   icon:'🔭', effect:'+30% range, +15% accuracy', stat:'range', value:0.3, weaponSlot:'sight' },
  suppressor: { name:'Suppressor',       icon:'🔇', effect:'Reduce overheat buildup by 40%', stat:'heatReduction', value:0.4, weaponSlot:'barrel' },
  grip:       { name:'Combat Grip',      icon:'🤜', effect:'+20% stability, -10% spread', stat:'spread', value:-0.2, weaponSlot:'grip' },
  mag_ext:    { name:'Extended Magazine',icon:'📦', effect:'+50% ammo before reload', stat:'ammoBonus', value:0.5, weaponSlot:'magazine' },
  bayonet:    { name:'Plasma Bayonet',   icon:'🗡️', effect:'Melee damage +100, 1s cooldown', stat:'meleeDmg', value:100, weaponSlot:'underbarrel' },
  energy_cell:{ name:'Energy Cell',      icon:'⚡', effect:'+25% projectile speed', stat:'projSpeed', value:0.25, weaponSlot:'stock' }
};

const EQUIPPED_MODS = {}; // { slot: modId }

function equippWeaponMod(modId) {
  const mod = WEAPON_MODS[modId];
  if (!mod) return;
  EQUIPPED_MODS[mod.weaponSlot] = modId;
  showToast('Mod equipped: ' + mod.name, '#00f5ff');
}

function renderWeaponShop() {
  const weapons = Object.entries(WEAPON_TYPES);
  const upgrades = WEAPON_UPGRADES;
  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px;">
      ${weapons.map(([id,wt])=>{
        const level = upgrades.levels[id]||0;
        const cost = upgrades.upgradeCost(id);
        const isActive = ACTIVE_WEAPON.type === id;
        return `<div style="background:rgba(255,255,255,0.04);border:1px solid ${isActive?'rgba(0,245,255,0.6)':'rgba(255,255,255,0.1)'};border-radius:8px;padding:12px;cursor:pointer;"
          onclick="setWeapon('${id}')">
          <div style="font-family:Orbitron,monospace;font-size:12px;color:${isActive?'#00f5ff':'#fff'};">${wt.icon} ${wt.name}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);margin:4px 0;">DMG:${wt.dmg} SPD:${wt.speed} CD:${wt.cooldown}ms</div>
          <div style="font-size:10px;color:#ffd60a;margin-top:4px;">Level: +${level}/${upgrades.maxLevel}</div>
          ${level < upgrades.maxLevel ? `
            <button onclick="event.stopPropagation();WEAPON_UPGRADES.upgradeWeapon('${id}');renderWeaponShop&&renderWeaponShop()" 
              style="margin-top:8px;width:100%;padding:4px;background:rgba(255,214,10,0.1);border:1px solid rgba(255,214,10,0.3);border-radius:4px;color:#ffd60a;font-size:10px;cursor:pointer;">
              Upgrade: 💰${cost}</button>` : 
            `<div style="font-size:10px;color:#39ff14;margin-top:8px;text-align:center;">MAX LEVEL</div>`}
        </div>`;
      }).join('')}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 18 — BOSS LOOT TABLE EXPANSION
// Detailed loot drops, rare drops, boss-specific equipment
// ═══════════════════════════════════════════════════════════════════════════

const BOSS_LOOT_TABLES = {
  // Campaign bosses
  boss_1:  { coins:[100,200],  guaranteed:[], rare:['nano_mesh'], epic:[], legendary:[] },
  boss_2:  { coins:[150,300],  guaranteed:[], rare:['combat_scanner'], epic:[], legendary:[] },
  boss_3:  { coins:[200,400],  guaranteed:[], rare:['coin_magnet','nano_mesh'], epic:[], legendary:[] },
  boss_4:  { coins:[250,500],  guaranteed:[], rare:[], epic:['plague_catalyst'], legendary:[] },
  boss_5:  { coins:[300,600],  guaranteed:[], rare:['xp_amplifier'], epic:['titan_plating'], legendary:[] },
  boss_6:  { coins:[400,800],  guaranteed:[], rare:[], epic:['admirals_insignia'], legendary:[] },
  boss_7:  { coins:[500,1000], guaranteed:[], rare:[], epic:[], legendary:['quantum_weave'] },
  boss_8:  { coins:[600,1200], guaranteed:[], rare:[], epic:['swarm_core'], legendary:['void_compass'] },
  boss_9:  { coins:[700,1400], guaranteed:[], rare:[], epic:[], legendary:['dark_matter'] },
  boss_10: { coins:[800,1600], guaranteed:['ancient_rune'], rare:[], epic:['prism_heart'], legendary:['phoenix_feather'] },
  boss_11: { coins:[1000,2000],guaranteed:['ancient_rune'], rare:[], epic:[], legendary:['time_fragment'] },
  boss_12: { coins:[2000,5000],guaranteed:['omega_core','time_fragment'], rare:[], epic:[], legendary:[] },
  // Epic bosses
  dreadnought:    { coins:[400,800], crystals:[15,25], guaranteed:['plasma_core'], epic:['titan_plating'], legendary:['quantum_weave'] },
  hive_queen:     { coins:[350,700], crystals:[12,20], guaranteed:['swarm_core'], epic:['plague_catalyst'], legendary:[] },
  void_entity:    { coins:[500,1000],crystals:[20,35], guaranteed:['void_shard'], epic:[], legendary:['dark_matter'] },
  titan_mech:     { coins:[600,1200],crystals:[25,40], guaranteed:['titan_plating'], epic:['admirals_insignia'], legendary:['time_fragment'] },
  plague_ship:    { coins:[400,800], crystals:[15,25], guaranteed:['plague_catalyst'], epic:[], legendary:[] },
  crystal_colossus:{ coins:[500,1000],crystals:[40,60], guaranteed:['prism_heart'], epic:[], legendary:['void_compass'] },
  black_admiral:  { coins:[550,1100],crystals:[20,30], guaranteed:['admirals_insignia'], epic:['quantum_weave'], legendary:[] },
  final_omega:    { coins:[1500,4000],crystals:[80,120],guaranteed:['omega_core','time_fragment'], epic:[], legendary:['omega_core'] }
};

function rollBossLoot(bossId) {
  const table = BOSS_LOOT_TABLES[bossId];
  if (!table) return;
  const loot = [];
  // Coins
  if (table.coins) {
    const amount = table.coins[0] + Math.floor(Math.random()*(table.coins[1]-table.coins[0]));
    State.coins = (State.coins||0) + amount;
    loot.push('💰 ' + amount + ' coins');
  }
  // Crystals
  if (table.crystals) {
    const amount = table.crystals[0] + Math.floor(Math.random()*(table.crystals[1]-table.crystals[0]));
    RPG.currency.crystals += amount;
    loot.push('💎 ' + amount + ' crystals');
  }
  // Guaranteed drops
  (table.guaranteed||[]).forEach(itemId => {
    const item = MARKET_ITEMS.find(i=>i.id===itemId);
    if (item) { addToInventory({...item}); loot.push(item.icon+' '+item.name); }
  });
  // Rare (30% chance each)
  (table.rare||[]).forEach(itemId => {
    if (Math.random() < 0.3) {
      const item = MARKET_ITEMS.find(i=>i.id===itemId);
      if (item) { addToInventory({...item}); loot.push(item.icon+' '+item.name+' (Rare)'); }
    }
  });
  // Epic (15% chance each)
  (table.epic||[]).forEach(itemId => {
    if (Math.random() < 0.15) {
      const item = MARKET_ITEMS.find(i=>i.id===itemId);
      if (item) { addToInventory({...item}); loot.push(item.icon+' '+item.name+' (Epic)'); }
    }
  });
  // Legendary (5% chance each)
  (table.legendary||[]).forEach(itemId => {
    if (Math.random() < 0.05) {
      const item = MARKET_ITEMS.find(i=>i.id===itemId);
      if (item) { addToInventory({...item}); loot.push(item.icon+' '+item.name+' (LEGENDARY!)'); RPG.unlockAchievement('ach_legendary'); }
    }
  });
  
  if (loot.length > 0) {
    const popup = document.createElement('div');
    popup.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:rgba(2,8,23,0.98);border:2px solid #ffd60a;border-radius:16px;
      padding:24px 32px;text-align:center;z-index:9999;font-family:Orbitron,monospace;
      min-width:300px;animation:narrative-in 0.5s ease;
    `;
    popup.innerHTML = `
      <div style="font-size:24px;margin-bottom:12px;">🏆</div>
      <div style="color:#ffd60a;font-size:14px;margin-bottom:12px;">BOSS DEFEATED!</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.8);line-height:2;">
        ${loot.map(l=>`<div>${l}</div>`).join('')}
      </div>
      <button onclick="this.parentElement.remove()" style="margin-top:16px;padding:8px 20px;background:rgba(255,214,10,0.2);border:1px solid #ffd60a;border-radius:6px;color:#ffd60a;cursor:pointer;font-family:Orbitron,monospace;font-size:11px;">CLAIM</button>
    `;
    document.body.appendChild(popup);
  }
  saveStats();
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 19 — SKILL SYNERGY SYSTEM
// Combinations of skills that create powerful effects
// ═══════════════════════════════════════════════════════════════════════════

const SKILL_SYNERGIES = [
  { id:'syn_glass_cannon', name:'Glass Cannon', icon:'💥', color:'#ff006e',
    requires:['explosive_rounds','dual_cannon'], bonus:'+100% damage but -50% HP',
    stats:{ damageMult:1.0, hpMult:-0.5 } },
  { id:'syn_tank', name:'Immovable Object', icon:'🛡️', color:'#4488ff',
    requires:['extra_lives','shield_boost'], bonus:'+200% shield, knockback immunity',
    stats:{ shieldBonus:200 } },
  { id:'syn_ninja', name:'Shadow Warrior', icon:'🥷', color:'#444466',
    requires:['haste','lucky_drops'], bonus:'+60% dodge, triple kill speed',
    stats:{ dodge:0.6, speedMult:0.6 } },
  { id:'syn_berserker', name:'War God', icon:'⚔️', color:'#ff4400',
    requires:['rapid_fire','damage_boost'], bonus:'+150% damage when below 30% HP',
    stats:{ lowHpDmgBonus:1.5 } },
  { id:'syn_vampire', name:'Life Drain', icon:'🧛', color:'#660033',
    requires:['phoenix_rev','thorns'], bonus:'Steal 10% of damage dealt as HP',
    stats:{ lifeSteal:0.1 } },
  { id:'syn_midas', name:'Midas Touch', icon:'💰', color:'#ffd60a',
    requires:['coin_magnet','boss_loot'], bonus:'Triple coins, items are always max rarity',
    stats:{ coinBonus:2.0 } },
  { id:'syn_scholar', name:'Infinite Knowledge', icon:'📚', color:'#4488ff',
    requires:['xp_boost','radar_ext'], bonus:'+200% XP, enemies show weakness',
    stats:{ xpBonus:2.0 } },
  { id:'syn_deity', name:'Transcendent', icon:'⭐', color:'#ff44ff',
    requires:['synergy_core','dual_ability','crafter'], bonus:'Unlock all other synergies simultaneously',
    stats:{ allStats:0.5 } }
];

function getActiveSynergies(unlockedSkillIds) {
  return SKILL_SYNERGIES.filter(syn =>
    syn.requires.every(req => unlockedSkillIds.includes(req) || EXT_SKILL_STATE.unlocked.has(req))
  );
}

function renderSynergies(container) {
  const active = getActiveSynergies([...RPG.unlockedTalents, ...(typeof State !== 'undefined' && State.skills ? Object.keys(State.skills).filter(k=>State.skills[k]) : [])]);
  if (!container) return;
  if (active.length === 0) {
    container.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:11px;text-align:center;padding:12px;">Unlock skill combinations to activate synergies!</div>';
    return;
  }
  container.innerHTML = active.map(syn => `
    <div style="background:rgba(255,255,255,0.04);border:1px solid ${syn.color}44;border-radius:8px;padding:10px;margin-bottom:8px;">
      <div style="font-family:Orbitron,monospace;font-size:12px;color:${syn.color};">${syn.icon} ${syn.name}</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:4px;">${syn.bonus}</div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 20 — DATA INITIALIZATION
// Load all persistent data on startup
// ═══════════════════════════════════════════════════════════════════════════

function initAllExpansionData() {
  // Load all saved data
  RPG.loadProgress();
  loadStats();
  WEAPON_UPGRADES.load();
  FACTION_SYSTEM.loadRep();
  LEADERBOARD_EXT.loadAll();
  // Initialize systems
  initNavSystem();
  refreshMarketPrices();
  generateMissions(6);
  if (!MP_SIM.initialized) MP_SIM.init();
  // Audio
  try { SOUND_SYSTEM.init(); } catch(e) {}
  // Apply class bonuses
  RPG.applyClassBonuses();
  // Set weapon display
  const wdEl = document.getElementById('weaponDisplay');
  if (wdEl) wdEl.textContent = '🔫 ' + (WEAPON_TYPES[ACTIVE_WEAPON.type]?.name||'Laser Pistol');
  console.log('[EXPANSION v2] All systems initialized. Level:', RPG.level, 'Class:', RPG.classId);
}

// Schedule initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initAllExpansionData, 500));
} else {
  setTimeout(initAllExpansionData, 500);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION EXTRA 21 — COMPREHENSIVE GAME STATISTICS TRACKER
// Every possible game action tracked in detail
// ═══════════════════════════════════════════════════════════════════════════

const ACTION_TRACKER = {
  actions: [],
  maxActions: 1000,
  
  track(action, data = {}) {
    this.actions.push({ action, data, timestamp: Date.now() });
    if (this.actions.length > this.maxActions) this.actions.shift();
    // Update relevant stats
    switch(action) {
      case 'kill':          GAME_STATS50.totalKills++; addComboKill(); break;
      case 'boss_kill':     GAME_STATS50.bossKills++; advanceMissionProgress('kill',10); break;
      case 'shot_fired':    GAME_STATS50.shotsFired++; break;
      case 'shot_hit':      GAME_STATS50.shotsHit++; break;
      case 'crit_hit':      GAME_STATS50.criticalHits++; RPG.unlockAchievement('ach_firstcrit'); if(GAME_STATS50.criticalHits>=100) RPG.unlockAchievement('ach_100crits'); break;
      case 'dodge':         GAME_STATS50.dodgesSuccessful++; if(GAME_STATS50.dodgesSuccessful>=10) RPG.unlockAchievement('ach_dodge10'); break;
      case 'parry':         GAME_STATS50.parriesPerformed++; if(GAME_STATS50.parriesPerformed>=5) RPG.unlockAchievement('ach_parry5'); break;
      case 'coin_collect':  GAME_STATS50.coinsEarned += data.amount||1; advanceMissionProgress('excavation',1); break;
      case 'crystal':       GAME_STATS50.crystalsCollected += data.amount||1; if(GAME_STATS50.crystalsCollected>=50) RPG.unlockAchievement('ach_crystals50'); break;
      case 'ability_use':   GAME_STATS50.abilitiesUsed++; break;
      case 'powerup':       GAME_STATS50.powerUpsCollected++; advanceMissionProgress('escort',1); break;
      case 'wormhole':      GAME_STATS50.wormholesUsed++; GAME_STATS50.wormholesUsed>=5&&RPG.unlockAchievement('ach_wormhole'); break;
      case 'damage_dealt':  GAME_STATS50.damageDealt += data.amount||0; GAME_STATS50.highestDamageOneShot = Math.max(GAME_STATS50.highestDamageOneShot, data.amount||0); break;
      case 'damage_taken':  GAME_STATS50.damageTaken += data.amount||0; break;
      case 'combo':         GAME_STATS50.highestCombo = Math.max(GAME_STATS50.highestCombo, data.count||0); if((data.count||0)>=10) RPG.unlockAchievement('ach_combomax'); break;
      case 'wave_clear':    GAME_STATS50.wavesSurvived++; advanceMissionProgress('defense',1); break;
      case 'ally_deploy':   GAME_STATS50.allyShipsDeployed++; if(GAME_STATS50.allyShipsDeployed>=5) RPG.unlockAchievement('ach_ally5'); break;
    }
  },
  
  getAccuracy() {
    if (GAME_STATS50.shotsFired === 0) return 0;
    return Math.round(GAME_STATS50.shotsHit / GAME_STATS50.shotsFired * 100);
  },
  
  getKDR() {
    // estimated deaths from damage taken
    const estDeaths = Math.floor(GAME_STATS50.damageTaken / 100) || 1;
    return (GAME_STATS50.totalKills / estDeaths).toFixed(2);
  }
};




