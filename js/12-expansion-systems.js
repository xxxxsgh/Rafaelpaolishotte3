// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 1 — RPG PROGRESSION SYSTEM
// Levels 1-100, 6 Classes, Talent Trees, Prestige System, Full Stat Sheet
// ═══════════════════════════════════════════════════════════════════════════

const RPG = {
  level: 1, xp: 0, prestige: 0, classId: 'pilot',
  talentPoints: 0, unlockedTalents: new Set(),
  stats: { hp:100, shield:50, speed:1, damage:1, critRate:0.05, critDmg:1.5, dodge:0.02, regen:0 },
  baseStats: { hp:100, shield:50, speed:1, damage:1, critRate:0.05, critDmg:1.5, dodge:0.02, regen:0 },
  equipped: { weapon:null, armor:null, accessory:null, relic:null },
  inventory: [], currency: { coins:0, crystals:0, scrap:0, plasma:0 },
  kills: 0, bossKills: 0, missionsCompleted: 0, totalDamageDealt: 0,
  achievements: new Set(), stats50: {},

  XP_TABLE: Array.from({length:100}, (_,i) => Math.floor(100 * Math.pow(1.18, i))),

  addXP(amount) {
    const bonus = RPG.getStatValue('xpBonus', 0);
    amount = Math.floor(amount * (1 + bonus));
    RPG.xp += amount;
    showFloatText('+' + amount + ' XP', '#a0c4ff');
    while (RPG.level < 100 && RPG.xp >= RPG.XP_TABLE[RPG.level - 1]) {
      RPG.xp -= RPG.XP_TABLE[RPG.level - 1];
      RPG.level++;
      RPG.talentPoints++;
      RPG.applyClassBonuses();
      showFloatText('LEVEL UP! ' + RPG.level, '#ffd60a');
      playSound('levelup');
      RPG.checkLevelAchievements();
    }
    if (RPG.level >= 100 && RPG.prestige === 0) RPG.showPrestigeOption();
    RPG.saveProgress();
    updateRPGHUD();
  },

  getXPProgress() {
    if (RPG.level >= 100) return 1;
    return RPG.xp / RPG.XP_TABLE[RPG.level - 1];
  },

  getStatValue(key, def = 0) {
    const cls = RPG_CLASSES[RPG.classId];
    let val = def;
    if (cls && cls.passives[key]) val += cls.passives[key];
    RPG.unlockedTalents.forEach(tid => {
      const t = RPG_TALENTS.find(t => t.id === tid);
      if (t && t.stat === key) val += t.value;
    });
    if (RPG.equipped.weapon?.stats?.[key]) val += RPG.equipped.weapon.stats[key];
    if (RPG.equipped.armor?.stats?.[key]) val += RPG.equipped.armor.stats[key];
    if (RPG.equipped.accessory?.stats?.[key]) val += RPG.equipped.accessory.stats[key];
    if (RPG.equipped.relic?.stats?.[key]) val += RPG.equipped.relic.stats[key];
    return val;
  },

  applyClassBonuses() {
    const cls = RPG_CLASSES[RPG.classId];
    if (!cls) return;
    RPG.stats.hp = RPG.baseStats.hp + cls.baseHpBonus + RPG.level * cls.hpPerLevel;
    RPG.stats.damage = RPG.baseStats.damage * (1 + RPG.getStatValue('damageMult', 0));
    RPG.stats.speed = RPG.baseStats.speed * (1 + RPG.getStatValue('speedMult', 0));
    RPG.stats.critRate = RPG.baseStats.critRate + RPG.getStatValue('critRate', 0);
    RPG.stats.dodge = RPG.baseStats.dodge + RPG.getStatValue('dodge', 0);
    RPG.stats.shield = RPG.baseStats.shield + RPG.getStatValue('shieldBonus', 0);
  },

  unlockTalent(talentId) {
    if (RPG.talentPoints <= 0) { showToast('Not enough talent points!', '#ff4444'); return; }
    const t = RPG_TALENTS.find(t => t.id === talentId);
    if (!t) return;
    if (t.requires && !RPG.unlockedTalents.has(t.requires)) { showToast('Unlock prerequisite first!', '#ff4444'); return; }
    if (RPG.unlockedTalents.has(talentId)) { showToast('Already unlocked!', '#ffaa00'); return; }
    RPG.unlockedTalents.add(talentId);
    RPG.talentPoints--;
    RPG.applyClassBonuses();
    showFloatText('TALENT: ' + t.name, '#ffd60a');
    playSound('coin');
    RPG.saveProgress();
    renderRPGPanel();
  },

  selectClass(classId) {
    if (RPG.classId === classId) return;
    RPG.classId = classId;
    RPG.unlockedTalents.clear();
    RPG.applyClassBonuses();
    showToast('Class: ' + RPG_CLASSES[classId].name, '#00f5ff');
    RPG.saveProgress();
    renderRPGPanel();
  },

  showPrestigeOption() {
    if (typeof showPrestigeModal === 'function') showPrestigeModal();
  },

  doPrestige() {
    RPG.prestige++;
    RPG.level = 1; RPG.xp = 0; RPG.talentPoints = 0;
    RPG.unlockedTalents.clear();
    // Prestige bonus: +20% XP permanently per prestige
    RPG.applyClassBonuses();
    showToast('PRESTIGE ' + RPG.prestige + '! Power increased!', '#ff006e');
    RPG.saveProgress();
  },

  checkLevelAchievements() {
    if (RPG.level >= 10) RPG.unlockAchievement('ach_level10');
    if (RPG.level >= 25) RPG.unlockAchievement('ach_level25');
    if (RPG.level >= 50) RPG.unlockAchievement('ach_level50');
    if (RPG.level >= 100) RPG.unlockAchievement('ach_maxlevel');
  },

  unlockAchievement(id) {
    if (RPG.achievements.has(id)) return;
    const ach = ACH_DATA.find(a => a.id === id);
    if (!ach) return;
    RPG.achievements.add(id);
    showAchievementPopup(ach);
    if (ach.reward) {
      if (ach.reward.coins) { State.coins = (State.coins||0) + ach.reward.coins; }
      if (ach.reward.crystals) { RPG.currency.crystals += ach.reward.crystals; }
    }
    RPG.saveProgress();
  },

  trackKill(enemyType, isBoss) {
    RPG.kills++;
    GAME_STATS50.totalKills = (GAME_STATS50.totalKills||0) + 1;
    if (isBoss) { RPG.bossKills++; GAME_STATS50.bossKills = (GAME_STATS50.bossKills||0) + 1; }
    if (RPG.kills >= 100) RPG.unlockAchievement('ach_100kills');
    if (RPG.kills >= 500) RPG.unlockAchievement('ach_500kills');
    if (RPG.kills >= 1000) RPG.unlockAchievement('ach_1000kills');
    if (RPG.bossKills >= 5) RPG.unlockAchievement('ach_5bosses');
    if (RPG.bossKills >= 12) RPG.unlockAchievement('ach_allbosses');
    saveStats();
  },

  saveProgress() {
    const data = {
      level: RPG.level, xp: RPG.xp, prestige: RPG.prestige, classId: RPG.classId,
      talentPoints: RPG.talentPoints, unlockedTalents: [...RPG.unlockedTalents],
      achievements: [...RPG.achievements], currency: RPG.currency, kills: RPG.kills,
      bossKills: RPG.bossKills, missionsCompleted: RPG.missionsCompleted
    };
    localStorage.setItem('rpg_progress', JSON.stringify(data));
  },

  loadProgress() {
    try {
      const raw = localStorage.getItem('rpg_progress');
      if (!raw) return;
      const d = JSON.parse(raw);
      Object.assign(RPG, { level:d.level||1, xp:d.xp||0, prestige:d.prestige||0,
        classId:d.classId||'pilot', talentPoints:d.talentPoints||0,
        kills:d.kills||0, bossKills:d.bossKills||0,
        missionsCompleted:d.missionsCompleted||0 });
      RPG.unlockedTalents = new Set(d.unlockedTalents||[]);
      RPG.achievements = new Set(d.achievements||[]);
      if (d.currency) Object.assign(RPG.currency, d.currency);
      RPG.applyClassBonuses();
    } catch(e) { console.error('RPG load error', e); }
  }
};

const RPG_CLASSES = {
  pilot: {
    name:'Ace Pilot', icon:'✈️', desc:'Master of speed and agility. Dodge enemies and strike fast.',
    baseHpBonus:0, hpPerLevel:2, color:'#00f5ff',
    passives: { speedMult:0.2, dodge:0.05, damageMult:0.1 },
    abilities: [
      { id:'barrel_roll', name:'Barrel Roll', desc:'Invincible for 0.5s and teleport sideways', cooldown:4, key:'A' },
      { id:'ace_burst', name:'Ace Burst', desc:'Fire 5 shots in rapid succession', cooldown:3, key:'S' },
      { id:'afterburner', name:'Afterburner', desc:'+100% speed for 3 seconds', cooldown:8, key:'D' },
      { id:'lock_on', name:'Lock-On', desc:'Next 3 shots auto-aim at nearest enemy', cooldown:5, key:'F' },
      { id:'evasion_protocol', name:'Evasion Protocol', desc:'Auto-dodge next incoming attack', cooldown:12, key:'G' }
    ]
  },
  engineer: {
    name:'Engineer', icon:'🔧', desc:'Deploy turrets, drones, and shields. Control the battlefield.',
    baseHpBonus:20, hpPerLevel:3, color:'#ffa500',
    passives: { shieldBonus:30, damageMult:0.05, critRate:0.02 },
    abilities: [
      { id:'deploy_turret', name:'Deploy Turret', desc:'Place an auto-turret for 10 seconds', cooldown:10, key:'A' },
      { id:'repair_drone', name:'Repair Drone', desc:'Heal 20 HP over 5 seconds', cooldown:8, key:'S' },
      { id:'emp_burst', name:'EMP Burst', desc:'Stun all enemies for 2 seconds', cooldown:12, key:'D' },
      { id:'overclock', name:'Overclock', desc:'+50% fire rate for 4 seconds', cooldown:10, key:'F' },
      { id:'shield_matrix', name:'Shield Matrix', desc:'Deploy energy barrier blocking all shots', cooldown:15, key:'G' }
    ]
  },
  mercenary: {
    name:'Mercenary', icon:'💰', desc:'All about damage and coins. High risk, high reward.',
    baseHpBonus:-10, hpPerLevel:1.5, color:'#ffd60a',
    passives: { damageMult:0.35, critRate:0.1, critDmg:0.5 },
    abilities: [
      { id:'double_tap', name:'Double Tap', desc:'Fire twice instantly dealing massive damage', cooldown:2, key:'A' },
      { id:'bounty_mark', name:'Bounty Mark', desc:'Mark enemy — 3x coin drop on kill', cooldown:6, key:'S' },
      { id:'adrenaline', name:'Adrenaline', desc:'+80% damage for 3s but take extra damage', cooldown:8, key:'D' },
      { id:'smoke_grenade', name:'Smoke Grenade', desc:'Enemies miss 50% for 4 seconds', cooldown:10, key:'F' },
      { id:'kill_streak', name:'Kill Streak', desc:'Each kill in 3s grants stacking +10% damage', cooldown:0, key:'G' }
    ]
  },
  explorer: {
    name:'Explorer', icon:'🔭', desc:'Map the galaxy, find secrets and rare resources.',
    baseHpBonus:10, hpPerLevel:2.5, color:'#39ff14',
    passives: { xpBonus:0.25, speedMult:0.1, dodge:0.03 },
    abilities: [
      { id:'scan', name:'Deep Scan', desc:'Reveal all enemies and items on radar for 10s', cooldown:8, key:'A' },
      { id:'warp_beacon', name:'Warp Beacon', desc:'Teleport to any seen location instantly', cooldown:12, key:'S' },
      { id:'resource_magnet', name:'Resource Magnet', desc:'Pull all nearby coins and XP to you', cooldown:5, key:'D' },
      { id:'nebula_cloak', name:'Nebula Cloak', desc:'Turn invisible for 4 seconds', cooldown:14, key:'F' },
      { id:'stellar_drift', name:'Stellar Drift', desc:'Phase through objects for 2s', cooldown:10, key:'G' }
    ]
  },
  scientist: {
    name:'Scientist', icon:'🔬', desc:'Master of status effects and experimental weapons.',
    baseHpBonus:0, hpPerLevel:2, color:'#aa44ff',
    passives: { critRate:0.08, damageMult:0.15, statusDuration:0.5 },
    abilities: [
      { id:'freeze_ray', name:'Freeze Ray', desc:'Freeze all enemies for 3 seconds', cooldown:8, key:'A' },
      { id:'acid_cloud', name:'Acid Cloud', desc:'Deal 5 damage/s to all enemies for 5s', cooldown:10, key:'S' },
      { id:'gravity_well', name:'Gravity Well', desc:'Pull all enemies toward center for 3s', cooldown:12, key:'D' },
      { id:'time_dilation', name:'Time Dilation', desc:'Slow time to 30% for 3 seconds', cooldown:15, key:'F' },
      { id:'plasma_infuse', name:'Plasma Infuse', desc:'All shots leave burning trail for 5s', cooldown:10, key:'G' }
    ]
  },
  commander: {
    name:'Commander', icon:'⭐', desc:'Lead the fleet. Buffs allies and commands the battlefield.',
    baseHpBonus:30, hpPerLevel:4, color:'#4488ff',
    passives: { shieldBonus:20, damageMult:0.1, allyDamage:0.3 },
    abilities: [
      { id:'rally', name:'Battle Cry', desc:'All allies deal +50% damage for 5 seconds', cooldown:12, key:'A' },
      { id:'fortress_mode', name:'Fortress Mode', desc:'+70% defense and knockback immunity for 4s', cooldown:10, key:'S' },
      { id:'orbital_strike', name:'Orbital Strike', desc:'Call massive beam from above dealing 200dmg', cooldown:18, key:'D' },
      { id:'reinforce', name:'Reinforce', desc:'Summon 2 ally drones to fight for 8s', cooldown:14, key:'F' },
      { id:'last_stand', name:'Last Stand', desc:'When HP<20%, auto-activate invincibility for 3s', cooldown:0, key:'G' }
    ]
  }
};

const RPG_TALENTS = [
  // Pilot talents
  { id:'t_pilot_speed1', name:'Afterburners I', tree:'pilot', branch:0, tier:0, row:0, col:0, stat:'speedMult', value:0.1, cost:1, icon:'⚡', desc:'+10% speed', requires:null },
  { id:'t_pilot_speed2', name:'Afterburners II', tree:'pilot', branch:0, tier:1, row:1, col:0, stat:'speedMult', value:0.15, cost:2, icon:'🔥', desc:'+15% speed', requires:'t_pilot_speed1' },
  { id:'t_pilot_speed3', name:'Hyperdrive', tree:'pilot', branch:0, tier:2, row:2, col:0, stat:'speedMult', value:0.2, cost:3, icon:'💨', desc:'+20% speed', requires:'t_pilot_speed2' },
  { id:'t_pilot_dodge1', name:'Evasive I', tree:'pilot', branch:1, tier:0, row:0, col:1, stat:'dodge', value:0.05, cost:1, icon:'🌀', desc:'+5% dodge', requires:null },
  { id:'t_pilot_dodge2', name:'Ghost Protocol', tree:'pilot', branch:1, tier:1, row:1, col:1, stat:'dodge', value:0.08, cost:2, icon:'👻', desc:'+8% dodge', requires:'t_pilot_dodge1' },
  { id:'t_pilot_crit1', name:'Precision I', tree:'pilot', branch:2, tier:0, row:0, col:2, stat:'critRate', value:0.05, cost:1, icon:'🎯', desc:'+5% crit', requires:null },
  { id:'t_pilot_crit2', name:'Precision II', tree:'pilot', branch:2, tier:1, row:1, col:2, stat:'critRate', value:0.07, cost:2, icon:'🎯', desc:'+7% crit', requires:'t_pilot_crit1' },
  { id:'t_pilot_dmg1', name:'Ace Shot I', tree:'pilot', branch:3, tier:0, row:0, col:3, stat:'damageMult', value:0.1, cost:1, icon:'💥', desc:'+10% damage', requires:null },
  { id:'t_pilot_dmg2', name:'Ace Shot II', tree:'pilot', branch:3, tier:1, row:1, col:3, stat:'damageMult', value:0.15, cost:2, icon:'💥', desc:'+15% damage', requires:'t_pilot_dmg1' },
  { id:'t_pilot_xp1', name:'Combat Veteran', tree:'pilot', branch:4, tier:0, row:0, col:4, stat:'xpBonus', value:0.15, cost:1, icon:'📚', desc:'+15% XP', requires:null },
  // Engineer talents
  { id:'t_eng_shield1', name:'Reinforced Hull I', tree:'engineer', branch:0, tier:0, row:0, col:0, stat:'shieldBonus', value:20, cost:1, icon:'🛡️', desc:'+20 shield', requires:null },
  { id:'t_eng_shield2', name:'Reinforced Hull II', tree:'engineer', branch:0, tier:1, row:1, col:0, stat:'shieldBonus', value:30, cost:2, icon:'🛡️', desc:'+30 shield', requires:'t_eng_shield1' },
  { id:'t_eng_regen1', name:'Self-Repair I', tree:'engineer', branch:1, tier:0, row:0, col:1, stat:'regen', value:1, cost:1, icon:'🔄', desc:'+1 HP/s regen', requires:null },
  { id:'t_eng_regen2', name:'Self-Repair II', tree:'engineer', branch:1, tier:1, row:1, col:1, stat:'regen', value:2, cost:2, icon:'🔄', desc:'+2 HP/s regen', requires:'t_eng_regen1' },
  { id:'t_eng_dmg1', name:'Overload I', tree:'engineer', branch:2, tier:0, row:0, col:2, stat:'damageMult', value:0.1, cost:1, icon:'⚡', desc:'+10% damage', requires:null },
  { id:'t_eng_cd1', name:'Rapid Systems', tree:'engineer', branch:3, tier:0, row:0, col:3, stat:'cdReduction', value:0.15, cost:1, icon:'⏱️', desc:'-15% cooldowns', requires:null },
  { id:'t_eng_turret1', name:'Turret MkII', tree:'engineer', branch:4, tier:0, row:0, col:4, stat:'turretDmg', value:0.3, cost:2, icon:'🔫', desc:'+30% turret dmg', requires:null },
  // Mercenary talents
  { id:'t_merc_crit1', name:'Executioner I', tree:'mercenary', branch:0, tier:0, row:0, col:0, stat:'critDmg', value:0.25, cost:1, icon:'💀', desc:'+25% crit damage', requires:null },
  { id:'t_merc_crit2', name:'Executioner II', tree:'mercenary', branch:0, tier:1, row:1, col:0, stat:'critDmg', value:0.35, cost:2, icon:'💀', desc:'+35% crit damage', requires:'t_merc_crit1' },
  { id:'t_merc_crit3', name:'Death Mark', tree:'mercenary', branch:0, tier:2, row:2, col:0, stat:'critDmg', value:0.5, cost:3, icon:'☠️', desc:'+50% crit damage', requires:'t_merc_crit2' },
  { id:'t_merc_coin1', name:'Bounty Hunter I', tree:'mercenary', branch:1, tier:0, row:0, col:1, stat:'coinBonus', value:0.25, cost:1, icon:'💰', desc:'+25% coin drops', requires:null },
  { id:'t_merc_coin2', name:'Bounty Hunter II', tree:'mercenary', branch:1, tier:1, row:1, col:1, stat:'coinBonus', value:0.4, cost:2, icon:'💰', desc:'+40% coin drops', requires:'t_merc_coin1' },
  { id:'t_merc_dmg1', name:'War Machine I', tree:'mercenary', branch:2, tier:0, row:0, col:2, stat:'damageMult', value:0.15, cost:1, icon:'🔫', desc:'+15% damage', requires:null },
  { id:'t_merc_dmg2', name:'War Machine II', tree:'mercenary', branch:2, tier:1, row:1, col:2, stat:'damageMult', value:0.2, cost:2, icon:'🔫', desc:'+20% damage', requires:'t_merc_dmg1' },
  { id:'t_merc_life1', name:'Iron Will', tree:'mercenary', branch:3, tier:0, row:0, col:3, stat:'hpBonus', value:25, cost:1, icon:'❤️', desc:'+25 max HP', requires:null },
  // Explorer talents
  { id:'t_exp_xp1', name:'Scholar I', tree:'explorer', branch:0, tier:0, row:0, col:0, stat:'xpBonus', value:0.2, cost:1, icon:'📚', desc:'+20% XP gain', requires:null },
  { id:'t_exp_xp2', name:'Scholar II', tree:'explorer', branch:0, tier:1, row:1, col:0, stat:'xpBonus', value:0.3, cost:2, icon:'📖', desc:'+30% XP gain', requires:'t_exp_xp1' },
  { id:'t_exp_radar1', name:'Enhanced Radar', tree:'explorer', branch:1, tier:0, row:0, col:1, stat:'radarRange', value:50, cost:1, icon:'📡', desc:'+50 radar range', requires:null },
  { id:'t_exp_crystal1', name:'Crystal Sense', tree:'explorer', branch:2, tier:0, row:0, col:2, stat:'crystalBonus', value:0.4, cost:1, icon:'💎', desc:'+40% crystal find', requires:null },
  { id:'t_exp_speed1', name:'Star Legs', tree:'explorer', branch:3, tier:0, row:0, col:3, stat:'speedMult', value:0.12, cost:1, icon:'🌟', desc:'+12% speed', requires:null },
  { id:'t_exp_dodge1', name:'Phase Shift', tree:'explorer', branch:4, tier:0, row:0, col:4, stat:'dodge', value:0.06, cost:1, icon:'🌀', desc:'+6% dodge', requires:null },
  // Scientist talents
  { id:'t_sci_status1', name:'Toxic Chemistry', tree:'scientist', branch:0, tier:0, row:0, col:0, stat:'statusDuration', value:0.3, cost:1, icon:'☠️', desc:'+30% status duration', requires:null },
  { id:'t_sci_crit1', name:'Calculated Crit I', tree:'scientist', branch:1, tier:0, row:0, col:1, stat:'critRate', value:0.07, cost:1, icon:'🔬', desc:'+7% crit rate', requires:null },
  { id:'t_sci_dmg1', name:'Amplified Fields', tree:'scientist', branch:2, tier:0, row:0, col:2, stat:'damageMult', value:0.12, cost:1, icon:'⚗️', desc:'+12% damage', requires:null },
  { id:'t_sci_aoe1', name:'Blast Radius', tree:'scientist', branch:3, tier:0, row:0, col:3, stat:'aoeSize', value:0.3, cost:1, icon:'💣', desc:'+30% explosion size', requires:null },
  { id:'t_sci_plasma1', name:'Plasma Mastery', tree:'scientist', branch:4, tier:0, row:0, col:4, stat:'plasmaDmg', value:0.4, cost:2, icon:'🔮', desc:'+40% plasma damage', requires:null },
  // Commander talents
  { id:'t_cmd_hp1', name:'Titan Body I', tree:'commander', branch:0, tier:0, row:0, col:0, stat:'hpBonus', value:40, cost:1, icon:'💪', desc:'+40 max HP', requires:null },
  { id:'t_cmd_hp2', name:'Titan Body II', tree:'commander', branch:0, tier:1, row:1, col:0, stat:'hpBonus', value:60, cost:2, icon:'💪', desc:'+60 max HP', requires:'t_cmd_hp1' },
  { id:'t_cmd_ally1', name:'Squad Leader', tree:'commander', branch:1, tier:0, row:0, col:1, stat:'allyDamage', value:0.2, cost:1, icon:'⭐', desc:'+20% ally damage', requires:null },
  { id:'t_cmd_dmg1', name:'Commanding Strike', tree:'commander', branch:2, tier:0, row:0, col:2, stat:'damageMult', value:0.12, cost:1, icon:'⚔️', desc:'+12% damage', requires:null },
  { id:'t_cmd_shield1', name:'Fortress Armor', tree:'commander', branch:3, tier:0, row:0, col:3, stat:'shieldBonus', value:35, cost:1, icon:'🛡️', desc:'+35 shield', requires:null },
  { id:'t_cmd_orbital1', name:'Precision Strike', tree:'commander', branch:4, tier:0, row:0, col:4, stat:'orbitalDmg', value:0.5, cost:2, icon:'🎯', desc:'+50% orbital strike damage', requires:null }
];

function openRPGPanel() {
  const el = document.getElementById('rpgPanel');
  if (!el) return;
  el.classList.add('active');
  renderRPGPanel();
}
function closeRPGPanel() {
  const el = document.getElementById('rpgPanel');
  if (el) el.classList.remove('active');
}

function renderRPGPanel() {
  const el = document.getElementById('rpgPanel');
  if (!el) return;
  const cls = RPG_CLASSES[RPG.classId];
  const xpPct = Math.round(RPG.getXPProgress() * 100);
  const totalAch = ACH_DATA.length;
  const unlockedAch = RPG.achievements.size;
  el.innerHTML = `
    <button class="modal-close" onclick="closeRPGPanel()" style="position:absolute;top:16px;right:16px;">✕ CLOSE</button>
    <h2>⚔️ RPG PROGRESSION ${RPG.prestige > 0 ? '<span class="prestige-badge">★ PRESTIGE '+RPG.prestige+'</span>' : ''}</h2>
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-family:Orbitron,monospace;font-size:13px;color:rgba(255,255,255,0.5);">CURRENT CLASS</div>
      <div style="font-size:40px;margin:8px 0;">${cls.icon}</div>
      <div style="font-family:Orbitron,monospace;font-size:20px;color:${cls.color};">${cls.name}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:6px;">${cls.desc}</div>
    </div>
    <div class="rpg-grid">
      <div class="rpg-stat-card">
        <h3>📊 CHARACTER STATS</h3>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Level</span><span class="rpg-stat-value">${RPG.level} / 100</span></div>
        <div class="rpg-bar"><div class="rpg-bar-fill" style="width:${xpPct}%;background:#4488ff;"></div></div>
        <div style="font-size:10px;color:rgba(255,255,255,0.4);text-align:right;margin-top:2px;">${RPG.xp} / ${RPG.XP_TABLE[Math.min(RPG.level-1,99)]} XP</div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Max HP</span><span class="rpg-stat-value">${Math.floor(RPG.stats.hp)}</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Shield</span><span class="rpg-stat-value">${Math.floor(RPG.stats.shield)}</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Damage Bonus</span><span class="rpg-stat-value">+${Math.round(RPG.getStatValue('damageMult',0)*100)}%</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Speed Bonus</span><span class="rpg-stat-value">+${Math.round(RPG.getStatValue('speedMult',0)*100)}%</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Crit Rate</span><span class="rpg-stat-value">${Math.round(RPG.stats.critRate*100)}%</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Crit Damage</span><span class="rpg-stat-value">${Math.round(RPG.stats.critDmg*100)}%</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Dodge Chance</span><span class="rpg-stat-value">${Math.round(RPG.stats.dodge*100)}%</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Talent Points</span><span class="rpg-stat-value" style="color:#ffd60a;">${RPG.talentPoints} available</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Achievements</span><span class="rpg-stat-value">${unlockedAch} / ${totalAch}</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Total Kills</span><span class="rpg-stat-value">${RPG.kills}</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Boss Kills</span><span class="rpg-stat-value">${RPG.bossKills}</span></div>
        <div class="rpg-stat-row"><span class="rpg-stat-label">Missions Done</span><span class="rpg-stat-value">${RPG.missionsCompleted}</span></div>
      </div>
      <div class="rpg-stat-card">
        <h3>🏛️ SELECT CLASS</h3>
        <div class="rpg-class-selector">
          ${Object.entries(RPG_CLASSES).map(([id,c])=>`
            <div class="rpg-class-btn ${RPG.classId===id?'selected':''}" onclick="RPG.selectClass('${id}')">
              <span class="class-icon">${c.icon}</span>${c.name}
            </div>
          `).join('')}
        </div>
        <h3 style="margin-top:16px;">⚡ CLASS ABILITIES</h3>
        ${(cls.abilities||[]).map(ab=>`
          <div style="display:flex;align-items:center;gap:8px;margin:6px 0;padding:8px;background:rgba(255,255,255,0.04);border-radius:6px;">
            <div style="font-family:Orbitron,monospace;font-size:10px;color:#ffd60a;width:20px;text-align:center;">[${ab.key}]</div>
            <div>
              <div style="font-family:Orbitron,monospace;font-size:11px;color:#00f5ff;">${ab.name}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.5);">${ab.desc} • CD: ${ab.cooldown}s</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="rpg-stat-card" style="max-width:900px;margin:20px auto 0;">
      <h3>🌳 TALENT TREE — ${cls.name}</h3>
      <div class="talent-tree" style="grid-template-columns:repeat(5,60px);justify-content:center;">
        ${RPG_TALENTS.filter(t=>t.tree===RPG.classId).map(t=>{
          const unlocked = RPG.unlockedTalents.has(t.id);
          const prereqOk = !t.requires || RPG.unlockedTalents.has(t.requires);
          const canUnlock = prereqOk && RPG.talentPoints > 0 && !unlocked;
          const cls2 = unlocked ? 'unlocked' : (canUnlock ? 'available' : 'locked');
          return `<div class="talent-node ${cls2}" onclick="RPG.unlockTalent('${t.id}')">
            ${t.icon}
            <div class="talent-tooltip">
              <strong>${t.name}</strong>
              ${t.desc}<br>
              <span style="color:#ffd60a">Cost: ${t.cost} pt${t.cost>1?'s':''}</span>
              ${t.requires ? '<br><span style="color:rgba(255,255,255,0.4)">Req: prev</span>' : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    ${RPG.level >= 100 ? `<div style="text-align:center;margin-top:20px;">
      <button class="menu-btn" onclick="RPG.doPrestige()" style="background:linear-gradient(135deg,#ff006e,#ffd60a);color:#000;">
        ★ PRESTIGE (Reset to Level 1 for permanent bonuses)
      </button></div>` : ''}
  `;
}

function updateRPGHUD() {
  // Update XP bar if visible
  const bar = document.getElementById('xpBar');
  if (bar) bar.style.width = (RPG.getXPProgress() * 100) + '%';
  const lvlEl = document.getElementById('playerLevelHud');
  if (lvlEl) lvlEl.textContent = 'LV' + RPG.level;
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 2 — ADVANCED COMBAT SYSTEM
// 12 Weapon Types, Critical Hits, 6 Status Effects, Shield Types, Dodge/Parry
// ═══════════════════════════════════════════════════════════════════════════

const WEAPON_TYPES = {
  laser_pistol: { name:'Laser Pistol', icon:'🔫', dmg:8, speed:14, cooldown:200, spread:0, count:1, color:'#00f5ff', pierce:0, explosive:false, homing:false },
  twin_blaster: { name:'Twin Blaster', icon:'🔫', dmg:6, speed:13, cooldown:180, spread:0.1, count:2, color:'#4488ff', pierce:0, explosive:false, homing:false },
  heavy_cannon: { name:'Heavy Cannon', icon:'💣', dmg:22, speed:10, cooldown:600, spread:0, count:1, color:'#ffa500', pierce:1, explosive:false, homing:false },
  spread_shot: { name:'Spread Shot', icon:'🌟', dmg:5, speed:12, cooldown:300, spread:0.25, count:5, color:'#ff006e', pierce:0, explosive:false, homing:false },
  rail_gun: { name:'Rail Gun', icon:'⚡', dmg:35, speed:20, cooldown:1200, spread:0, count:1, color:'#39ff14', pierce:3, explosive:false, homing:false },
  rocket_launcher: { name:'Rocket Launcher', icon:'🚀', dmg:45, speed:8, cooldown:1500, spread:0, count:1, color:'#ff4400', pierce:0, explosive:true, homing:false },
  plasma_burst: { name:'Plasma Burst', icon:'🔮', dmg:15, speed:11, cooldown:400, spread:0.05, count:3, color:'#aa44ff', pierce:1, explosive:false, homing:false },
  homing_missile: { name:'Homing Missile', icon:'🎯', dmg:18, speed:9, cooldown:700, spread:0, count:1, color:'#ff6600', pierce:0, explosive:true, homing:true },
  shotgun_blast: { name:'Shotgun Blast', icon:'💥', dmg:7, speed:11, cooldown:500, spread:0.4, count:7, color:'#ffcc00', pierce:0, explosive:false, homing:false },
  chain_lightning: { name:'Chain Lightning', icon:'⚡', dmg:12, speed:15, cooldown:350, spread:0, count:1, color:'#ffff00', pierce:0, explosive:false, homing:false, chain:3 },
  void_cannon: { name:'Void Cannon', icon:'🌑', dmg:30, speed:9, cooldown:900, spread:0, count:1, color:'#6600cc', pierce:2, explosive:true, homing:false },
  burst_rifle: { name:'Burst Rifle', icon:'🔫', dmg:9, speed:14, cooldown:250, spread:0.06, count:3, color:'#88ff88', pierce:0, explosive:false, homing:false }
};

const ACTIVE_WEAPON = { type:'laser_pistol', level:1, ammo:-1, overheated:false, heatLevel:0 };

function setWeapon(typeId) {
  if (!WEAPON_TYPES[typeId]) return;
  ACTIVE_WEAPON.type = typeId;
  ACTIVE_WEAPON.heatLevel = 0;
  ACTIVE_WEAPON.overheated = false;
  showToast('Weapon: ' + WEAPON_TYPES[typeId].name, '#00f5ff');
  const el = document.getElementById('weaponDisplay');
  if (el) el.textContent = '🔫 ' + WEAPON_TYPES[typeId].name;
}

function getCombatDamage(baseDmg) {
  const wt = WEAPON_TYPES[ACTIVE_WEAPON.type] || WEAPON_TYPES.laser_pistol;
  let dmg = baseDmg * wt.dmg / 8;
  dmg *= 1 + RPG.getStatValue('damageMult', 0);
  const critRate = RPG.stats.critRate + RPG.getStatValue('critRate', 0);
  const isCrit = Math.random() < critRate;
  if (isCrit) {
    dmg *= RPG.stats.critDmg;
    return { dmg: Math.round(dmg), isCrit: true };
  }
  return { dmg: Math.round(dmg), isCrit: false };
}

function tryDodge() {
  const dodgeChance = RPG.stats.dodge + RPG.getStatValue('dodge', 0);
  return Math.random() < dodgeChance;
}

// Status Effects System
const STATUS_EFFECTS = {
  burning:  { icon:'🔥', color:'#ff6600', damagePerSec:5, duration:4, stackable:false },
  frozen:   { icon:'❄️', color:'#44aaff', speedMult:0,   duration:2, stackable:false },
  slowed:   { icon:'🌀', color:'#aa00ff', speedMult:0.4, duration:3, stackable:false },
  shocked:  { icon:'⚡', color:'#ffff00', damageBonus:0.25, duration:3, stackable:false },
  weakened: { icon:'💔', color:'#ff0044', damageTaken:0.5, duration:4, stackable:true, maxStacks:3 },
  disoriented:{ icon:'😵', color:'#00ffaa', accuracy:-0.6, duration:2, stackable:false }
};

const activeStatusEffects = {}; // { effectId: { remaining, stacks } }

function applyStatusEffect(effectId, target) {
  const ef = STATUS_EFFECTS[effectId];
  if (!ef) return;
  const key = target + '_' + effectId;
  if (activeStatusEffects[key] && !ef.stackable) {
    activeStatusEffects[key].remaining = ef.duration;
  } else if (ef.stackable) {
    if (!activeStatusEffects[key]) activeStatusEffects[key] = { remaining: ef.duration, stacks: 0 };
    activeStatusEffects[key].stacks = Math.min((activeStatusEffects[key].stacks||0)+1, ef.maxStacks||1);
    activeStatusEffects[key].remaining = ef.duration;
  } else {
    activeStatusEffects[key] = { remaining: ef.duration, stacks: 1 };
  }
  updateStatusEffectHUD();
}

function tickStatusEffects(dt) {
  let anyActive = false;
  for (const key in activeStatusEffects) {
    activeStatusEffects[key].remaining -= dt;
    if (activeStatusEffects[key].remaining <= 0) {
      delete activeStatusEffects[key];
    } else {
      anyActive = true;
    }
  }
  if (anyActive) updateStatusEffectHUD();
}

function updateStatusEffectHUD() {
  const hud = document.getElementById('statusEffectHud');
  if (!hud) return;
  const playerEffects = Object.entries(activeStatusEffects)
    .filter(([k]) => k.startsWith('player_'))
    .map(([k, v]) => ({ id: k.replace('player_',''), ...v }));
  hud.innerHTML = playerEffects.map(e => {
    const ef = STATUS_EFFECTS[e.id];
    if (!ef) return '';
    return `<div class="status-effect-badge status-${e.id}">
      ${ef.icon} ${e.id.toUpperCase()}${e.stacks>1?' x'+e.stacks:''}
      <span style="opacity:0.6;">${e.remaining.toFixed(1)}s</span>
    </div>`;
  }).join('');
}

// Shield Types
const SHIELD_TYPES = {
  standard:  { name:'Standard Shield',  maxShield:100, rechargeRate:5, rechargeDelay:3, color:'#4488ff' },
  reflective:{ name:'Reflective Shield',maxShield:80,  rechargeRate:4, rechargeDelay:4, color:'#ffff00', reflect:0.3 },
  adaptive:  { name:'Adaptive Shield',  maxShield:90,  rechargeRate:6, rechargeDelay:2, color:'#00ffaa', adaptDmgReduction:0.2 },
  absorb:    { name:'Absorb Shield',     maxShield:120, rechargeRate:3, rechargeDelay:5, color:'#aa44ff', absorbToHP:0.15 }
};

const ACTIVE_SHIELD = { type:'standard', current:100, rechargeTimer:0 };

function tickShield(dt) {
  const st = SHIELD_TYPES[ACTIVE_SHIELD.type];
  if (ACTIVE_SHIELD.current < st.maxShield) {
    ACTIVE_SHIELD.rechargeTimer -= dt;
    if (ACTIVE_SHIELD.rechargeTimer <= 0) {
      ACTIVE_SHIELD.current = Math.min(st.maxShield, ACTIVE_SHIELD.current + st.rechargeRate * dt);
    }
  }
}

function damageShield(amount) {
  const st = SHIELD_TYPES[ACTIVE_SHIELD.type];
  let absorbed = Math.min(ACTIVE_SHIELD.current, amount);
  ACTIVE_SHIELD.current -= absorbed;
  ACTIVE_SHIELD.rechargeTimer = st.rechargeDelay;
  if (st.reflect && absorbed > 0) {
    // Reflect damage back to enemies
    State.enemies && State.enemies.forEach(e => { if (e && e.hp) e.hp -= absorbed * st.reflect; });
  }
  if (st.absorbToHP && absorbed > 0 && State.players[0]) {
    State.players[0].hp = Math.min(State.players[0].maxHp||100, (State.players[0].hp||0) + absorbed * st.absorbToHP);
  }
  return amount - absorbed; // remaining damage to HP
}

// Combo Multiplier System
const COMBO = { count:0, multiplier:1, timer:0, maxTimer:3 };

function addComboKill() {
  COMBO.count++;
  COMBO.timer = COMBO.maxTimer;
  COMBO.multiplier = Math.min(10, 1 + Math.floor(COMBO.count / 3) * 0.5);
  updateComboDisplay();
}

function tickCombo(dt) {
  if (COMBO.count > 0) {
    COMBO.timer -= dt;
    if (COMBO.timer <= 0) {
      COMBO.count = 0; COMBO.multiplier = 1;
      updateComboDisplay();
    }
  }
}

function updateComboDisplay() {
  const el = document.getElementById('comboCurrent');
  const mx = document.getElementById('comboMultiplier');
  if (!el) return;
  if (COMBO.count > 2) {
    el.textContent = COMBO.count + ' COMBO';
    if (mx) mx.textContent = 'x' + COMBO.multiplier.toFixed(1) + ' damage';
    el.style.transform = 'scale(1.2)';
    setTimeout(() => { if(el) el.style.transform = 'scale(1)'; }, 150);
  } else {
    el.textContent = '';
    if (mx) mx.textContent = '';
  }
}

// Weapon Heat System
function tickWeaponHeat(dt) {
  if (ACTIVE_WEAPON.overheated) {
    ACTIVE_WEAPON.heatLevel = Math.max(0, ACTIVE_WEAPON.heatLevel - dt * 40);
    if (ACTIVE_WEAPON.heatLevel <= 0) {
      ACTIVE_WEAPON.overheated = false;
      showToast('Weapon cooled!', '#00f5ff');
    }
  } else {
    ACTIVE_WEAPON.heatLevel = Math.max(0, ACTIVE_WEAPON.heatLevel - dt * 15);
  }
}

function addWeaponHeat(amount) {
  if (ACTIVE_WEAPON.overheated) return;
  ACTIVE_WEAPON.heatLevel += amount;
  if (ACTIVE_WEAPON.heatLevel >= 100) {
    ACTIVE_WEAPON.overheated = true;
    ACTIVE_WEAPON.heatLevel = 100;
    showToast('WEAPON OVERHEATED!', '#ff4400');
  }
}

// Critical hit visual
function showCritHit(x, y, dmg) {
  const canvas = document.getElementById('gameCanvas') || CANVAS;
  if (!canvas) return;
  const popup = document.createElement('div');
  popup.className = 'combat-popup popup-crit';
  popup.textContent = 'CRIT! ' + dmg;
  const rect = canvas.getBoundingClientRect();
  popup.style.left = (rect.left + x) + 'px';
  popup.style.top = (rect.top + y - 20) + 'px';
  document.body.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove());
}

function showDamageNumber(x, y, dmg, type='normal') {
  const canvas = CANVAS;
  if (!canvas) return;
  const popup = document.createElement('div');
  popup.className = 'combat-popup popup-' + type;
  popup.textContent = type === 'heal' ? '+' + dmg : (type === 'miss' ? 'MISS' : dmg);
  const rect = canvas.getBoundingClientRect();
  popup.style.left = (rect.left + x + (Math.random()-0.5)*30) + 'px';
  popup.style.top = (rect.top + y) + 'px';
  document.body.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove());
}

// Parry window system
const PARRY = { active:false, window:0, windowDuration:0.15, cooldown:0, cooldownMax:4 };

function tryParry() {
  if (PARRY.cooldown > 0) return false;
  PARRY.active = true;
  PARRY.window = PARRY.windowDuration;
  PARRY.cooldown = PARRY.cooldownMax;
  showToast('PARRY!', '#ffd60a');
  return true;
}

function tickParry(dt) {
  if (PARRY.window > 0) {
    PARRY.window -= dt;
    if (PARRY.window <= 0) { PARRY.active = false; }
  }
  if (PARRY.cooldown > 0) PARRY.cooldown -= dt;
}

function checkParryHit() {
  if (!PARRY.active) return false;
  PARRY.active = false;
  PARRY.window = 0;
  showToast('PERFECT PARRY! COUNTER!', '#ff006e');
  // Deal counter damage to all nearby enemies
  State.enemies && State.enemies.forEach(e => { if (e) e.hp -= 30; });
  addComboKill();
  return true;
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 3 — 8 NEW EPIC BOSSES
// Each with 4 phases, unique draw functions, attack patterns, loot tables
// ═══════════════════════════════════════════════════════════════════════════

const EPIC_BOSSES = [
  {
    id:'dreadnought', name:'THE DREADNOUGHT', subtitle:'Harbinger of Annihilation',
    hp:2000, phases:4, phaseHpPcts:[0.75,0.5,0.25,0], color:'#ff4400', size:80,
    loot:{ coins:500, crystals:20, equipment:'plasma_core' },
    attacks: [
      { id:'broadside', name:'Broadside Cannon', pattern:'spread_7', dmg:15, cooldown:2.5 },
      { id:'missile_barrage', name:'Missile Barrage', pattern:'homing_4', dmg:20, cooldown:4 },
      { id:'ram_charge', name:'Ram Charge', pattern:'dash', dmg:40, cooldown:6 },
      { id:'death_blossom', name:'Death Blossom', pattern:'circle_16', dmg:12, cooldown:8 }
    ],
    draw(ctx, x, y, t) {
      ctx.save();
      ctx.translate(x, y);
      // Main hull
      ctx.fillStyle = '#331100';
      ctx.beginPath(); ctx.ellipse(0, 0, this.size, this.size*0.6, 0, 0, Math.PI*2); ctx.fill();
      // Orange glow
      const grad = ctx.createRadialGradient(0,0,0,0,0,this.size);
      grad.addColorStop(0,'rgba(255,80,0,0.4)'); grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0,this.size,0,Math.PI*2); ctx.fill();
      // Cannons
      for (let i=-2; i<=2; i++) {
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(i*22-4, this.size*0.5, 8, 30);
      }
      // Bridge
      ctx.fillStyle = '#ff4400';
      ctx.beginPath(); ctx.arc(0, -this.size*0.2, 18, 0, Math.PI*2); ctx.fill();
      // Engines glow
      for (let i=-2; i<=2; i++) {
        ctx.fillStyle = `rgba(255,${100+Math.sin(t*8+i)*50},0,0.8)`;
        ctx.beginPath(); ctx.arc(i*20, -this.size*0.5, 8, 0, Math.PI*2); ctx.fill();
      }
      // Warning lights
      ctx.fillStyle = `rgba(255,0,0,${0.5+Math.sin(t*6)*0.5})`;
      for (let i=-3; i<=3; i++) {
        ctx.beginPath(); ctx.arc(i*24, 0, 4, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  },
  {
    id:'hive_queen', name:'THE HIVE QUEEN', subtitle:'Mother of Swarms',
    hp:1500, phases:4, phaseHpPcts:[0.75,0.5,0.25,0], color:'#aa44ff', size:70,
    loot:{ coins:400, crystals:15, equipment:'swarm_core' },
    attacks: [
      { id:'spawn_drones', name:'Spawn Drones', pattern:'spawn_8', dmg:5, cooldown:3 },
      { id:'acid_spit', name:'Acid Spit', pattern:'burst_5', dmg:10, cooldown:2 },
      { id:'cocoon_web', name:'Cocoon Web', pattern:'web', dmg:8, cooldown:5 },
      { id:'swarm_explosion', name:'Swarm Explosion', pattern:'all_drones_explode', dmg:25, cooldown:12 }
    ],
    draw(ctx, x, y, t) {
      ctx.save(); ctx.translate(x, y);
      // Body
      ctx.fillStyle = '#440033';
      ctx.beginPath(); ctx.ellipse(0, 0, this.size*0.8, this.size, 0, 0, Math.PI*2); ctx.fill();
      // Purple glow
      const grad = ctx.createRadialGradient(0,0,0,0,0,this.size);
      grad.addColorStop(0,'rgba(170,0,255,0.5)'); grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0,this.size,0,Math.PI*2); ctx.fill();
      // Tentacles
      for (let i=0; i<6; i++) {
        const ang = (i/6)*Math.PI*2 + t*0.5;
        ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.bezierCurveTo(
          Math.cos(ang)*40, Math.sin(ang)*40,
          Math.cos(ang+0.5)*80, Math.sin(ang+0.5)*80,
          Math.cos(ang+1)*this.size*1.4, Math.sin(ang+1)*this.size*1.4
        );
        ctx.stroke();
      }
      // Eyes
      ctx.fillStyle = '#ff00ff';
      for (let i=-2; i<=2; i+=2) {
        ctx.beginPath(); ctx.ellipse(i*14, -10, 10, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(i*14, -10, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff00ff';
      }
      // Mouth
      ctx.strokeStyle = '#ff44ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 10, 20, 0.2, Math.PI-0.2); ctx.stroke();
      ctx.restore();
    }
  },
  {
    id:'void_entity', name:'VOID ENTITY', subtitle:'Born of Nothingness',
    hp:1800, phases:4, phaseHpPcts:[0.75,0.5,0.25,0], color:'#6600cc', size:75,
    loot:{ coins:600, crystals:25, equipment:'void_shard' },
    attacks: [
      { id:'void_pull', name:'Void Pull', pattern:'gravity', dmg:8, cooldown:4 },
      { id:'shadow_bolts', name:'Shadow Bolts', pattern:'spread_9', dmg:12, cooldown:2.5 },
      { id:'blink_strike', name:'Blink Strike', pattern:'teleport_attack', dmg:35, cooldown:6 },
      { id:'void_collapse', name:'Void Collapse', pattern:'black_hole', dmg:50, cooldown:15 }
    ],
    draw(ctx, x, y, t) {
      ctx.save(); ctx.translate(x, y);
      // Void core
      const grad = ctx.createRadialGradient(0,0,0,0,0,this.size*1.2);
      grad.addColorStop(0,'#000000'); grad.addColorStop(0.4,'#1a0033'); grad.addColorStop(0.7,'rgba(102,0,204,0.5)'); grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0,this.size*1.2,0,Math.PI*2); ctx.fill();
      // Rotating shards
      for (let i=0; i<8; i++) {
        const ang = (i/8)*Math.PI*2 + t;
        const r = this.size*0.7;
        ctx.save(); ctx.translate(Math.cos(ang)*r, Math.sin(ang)*r); ctx.rotate(ang+t*2);
        ctx.fillStyle = `rgba(102,0,204,${0.6+Math.sin(t*3+i)*0.3})`;
        ctx.fillRect(-6, -15, 12, 30);
        ctx.restore();
      }
      // Eyes
      ctx.fillStyle = `rgba(200,0,255,${0.7+Math.sin(t*5)*0.3})`;
      ctx.beginPath(); ctx.ellipse(-18,-5,12,8,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(18,-5,12,8,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(-18,-5,4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(18,-5,4,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  {
    id:'titan_mech', name:'TITAN MECH', subtitle:'Steel God of War',
    hp:2500, phases:4, phaseHpPcts:[0.75,0.5,0.25,0], color:'#888888', size:90,
    loot:{ coins:700, crystals:30, equipment:'titan_plating' },
    attacks: [
      { id:'gatling', name:'Gatling Guns', pattern:'rapid_burst', dmg:8, cooldown:0.5 },
      { id:'rocket_pods', name:'Rocket Pods', pattern:'spread_6_explosive', dmg:30, cooldown:4 },
      { id:'stomp_wave', name:'Stomp Wave', pattern:'shockwave', dmg:20, cooldown:5 },
      { id:'nuclear_option', name:'Nuclear Option', pattern:'mega_explosion', dmg:80, cooldown:20 }
    ],
    draw(ctx, x, y, t) {
      ctx.save(); ctx.translate(x, y);
      // Body
      ctx.fillStyle = '#444444';
      ctx.fillRect(-this.size*0.6, -this.size*0.7, this.size*1.2, this.size*1.4);
      // Metal sheen
      const grad = ctx.createLinearGradient(-this.size*0.6, -this.size*0.7, this.size*0.6, this.size*0.7);
      grad.addColorStop(0,'rgba(255,255,255,0.1)'); grad.addColorStop(0.5,'rgba(255,255,255,0)'); grad.addColorStop(1,'rgba(0,0,0,0.3)');
      ctx.fillStyle = grad; ctx.fillRect(-this.size*0.6,-this.size*0.7,this.size*1.2,this.size*1.4);
      // Head
      ctx.fillStyle = '#666666';
      ctx.fillRect(-this.size*0.35, -this.size*0.9, this.size*0.7, this.size*0.25);
      // Visor
      ctx.fillStyle = `rgba(255,${100+Math.sin(t*4)*80},0,0.9)`;
      ctx.fillRect(-this.size*0.3, -this.size*0.88, this.size*0.6, 0.1*this.size);
      // Arms
      ctx.fillStyle = '#555';
      ctx.fillRect(-this.size*0.95, -this.size*0.65, this.size*0.3, this.size);
      ctx.fillRect(this.size*0.65, -this.size*0.65, this.size*0.3, this.size);
      // Cannon barrels
      ctx.fillStyle = '#333';
      ctx.fillRect(-this.size*1.1, -this.size*0.3, this.size*0.2, 12);
      ctx.fillRect(this.size*0.9, -this.size*0.3, this.size*0.2, 12);
      // Chest symbol
      ctx.fillStyle = `rgba(255,50,0,${0.5+Math.sin(t*3)*0.5})`;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  {
    id:'plague_ship', name:'PLAGUE SHIP', subtitle:'Bringer of Pestilence',
    hp:1700, phases:4, phaseHpPcts:[0.75,0.5,0.25,0], color:'#88ff44', size:72,
    loot:{ coins:450, crystals:18, equipment:'plague_catalyst' },
    attacks: [
      { id:'toxic_spray', name:'Toxic Spray', pattern:'cone_toxic', dmg:6, cooldown:2, status:'burning' },
      { id:'spore_bombs', name:'Spore Bombs', pattern:'bomb_3', dmg:18, cooldown:4, status:'weakened' },
      { id:'disease_cloud', name:'Disease Cloud', pattern:'aoe_slow', dmg:4, cooldown:6, status:'slowed' },
      { id:'plague_explosion', name:'Plague Explosion', pattern:'mega_aoe_toxic', dmg:45, cooldown:18 }
    ],
    draw(ctx, x, y, t) {
      ctx.save(); ctx.translate(x, y);
      // Corroded hull
      ctx.fillStyle = '#1a3300';
      ctx.beginPath(); ctx.ellipse(0, 0, this.size, this.size*0.65, 0, 0, Math.PI*2); ctx.fill();
      // Toxic glow
      const grad = ctx.createRadialGradient(0,0,0,0,0,this.size*1.1);
      grad.addColorStop(0,'rgba(80,255,0,0.3)'); grad.addColorStop(0.6,'rgba(80,255,0,0.08)'); grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0,this.size*1.1,0,Math.PI*2); ctx.fill();
      // Exhaust vents with toxic gas
      for (let i=-2; i<=2; i++) {
        ctx.fillStyle = `rgba(80,255,0,${0.3+Math.sin(t*4+i)*0.3})`;
        ctx.beginPath(); ctx.ellipse(i*22, -this.size*0.6+Math.sin(t*3+i)*4, 8, 12, 0, 0, Math.PI*2); ctx.fill();
      }
      // Spore emitters
      for (let i=0; i<4; i++) {
        const ang = (i/4)*Math.PI*2 + t*0.3;
        ctx.fillStyle = '#44aa00';
        ctx.beginPath(); ctx.arc(Math.cos(ang)*this.size*0.7, Math.sin(ang)*this.size*0.7, 8, 0, Math.PI*2); ctx.fill();
      }
      // Bridge
      ctx.fillStyle = '#336600';
      ctx.beginPath(); ctx.arc(0, -10, 20, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(150,255,50,${0.4+Math.sin(t*5)*0.4})`;
      ctx.beginPath(); ctx.arc(0, -10, 10, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  {
    id:'crystal_colossus', name:'CRYSTAL COLOSSUS', subtitle:'Ancient Gem Guardian',
    hp:2200, phases:4, phaseHpPcts:[0.75,0.5,0.25,0], color:'#00f5ff', size:85,
    loot:{ coins:550, crystals:50, equipment:'prism_heart' },
    attacks: [
      { id:'prism_beam', name:'Prism Beam', pattern:'laser_refracted', dmg:25, cooldown:3 },
      { id:'crystal_shards', name:'Crystal Shards', pattern:'spiral_shards', dmg:12, cooldown:2.5 },
      { id:'gem_shield', name:'Gem Shield', pattern:'summon_shield', dmg:0, cooldown:8 },
      { id:'crystal_storm', name:'Crystal Storm', pattern:'all_shards', dmg:8, cooldown:14 }
    ],
    draw(ctx, x, y, t) {
      ctx.save(); ctx.translate(x, y);
      // Crystal body
      ctx.fillStyle = '#003355';
      ctx.beginPath(); ctx.moveTo(0,-this.size); ctx.lineTo(this.size*0.6,-this.size*0.3);
      ctx.lineTo(this.size*0.7,this.size*0.4); ctx.lineTo(0,this.size*0.8);
      ctx.lineTo(-this.size*0.7,this.size*0.4); ctx.lineTo(-this.size*0.6,-this.size*0.3);
      ctx.closePath(); ctx.fill();
      // Crystal shine
      const grad = ctx.createLinearGradient(-this.size, -this.size, this.size, this.size);
      grad.addColorStop(0,'rgba(0,245,255,0.4)'); grad.addColorStop(0.5,'rgba(255,255,255,0.1)'); grad.addColorStop(1,'rgba(0,100,200,0.3)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(0,-this.size); ctx.lineTo(this.size*0.6,-this.size*0.3);
      ctx.lineTo(this.size*0.7,this.size*0.4); ctx.lineTo(0,this.size*0.8);
      ctx.lineTo(-this.size*0.7,this.size*0.4); ctx.lineTo(-this.size*0.6,-this.size*0.3);
      ctx.closePath(); ctx.fill();
      // Rotating crystal facets
      for (let i=0; i<6; i++) {
        const ang = (i/6)*Math.PI*2 + t*0.4;
        const r = this.size*0.5;
        ctx.strokeStyle = `rgba(0,245,255,${0.3+Math.sin(t*3+i)*0.3})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r); ctx.stroke();
      }
      // Core gem
      ctx.fillStyle = `rgba(0,245,255,${0.6+Math.sin(t*5)*0.3})`;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(-4,-4,4,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  {
    id:'black_admiral', name:'BLACK ADMIRAL', subtitle:'Commander of the Dark Fleet',
    hp:1900, phases:4, phaseHpPcts:[0.75,0.5,0.25,0], color:'#333344', size:75,
    loot:{ coins:650, crystals:22, equipment:'admirals_insignia' },
    attacks: [
      { id:'fleet_order', name:'Fleet Order', pattern:'spawn_fighters', dmg:8, cooldown:5 },
      { id:'torpedo_spread', name:'Torpedo Spread', pattern:'spread_5_slow', dmg:28, cooldown:4 },
      { id:'battle_formation', name:'Battle Formation', pattern:'shield_allies', dmg:0, cooldown:8 },
      { id:'annihilation_order', name:'Annihilation Order', pattern:'all_ships_charge', dmg:20, cooldown:16 }
    ],
    draw(ctx, x, y, t) {
      ctx.save(); ctx.translate(x, y);
      // Dark hull
      ctx.fillStyle = '#111122';
      ctx.beginPath(); ctx.moveTo(0,-this.size); ctx.lineTo(this.size*0.5,-this.size*0.3);
      ctx.lineTo(this.size*0.7,this.size*0.5); ctx.lineTo(-this.size*0.7,this.size*0.5);
      ctx.lineTo(-this.size*0.5,-this.size*0.3); ctx.closePath(); ctx.fill();
      // Gold trim
      ctx.strokeStyle = '#ccaa00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0,-this.size*0.8); ctx.lineTo(this.size*0.4,-this.size*0.2);
      ctx.lineTo(this.size*0.6,this.size*0.3); ctx.lineTo(-this.size*0.6,this.size*0.3);
      ctx.lineTo(-this.size*0.4,-this.size*0.2); ctx.closePath(); ctx.stroke();
      // Command bridge
      ctx.fillStyle = '#222244';
      ctx.fillRect(-20, -this.size*0.7, 40, this.size*0.35);
      ctx.fillStyle = `rgba(80,80,255,${0.5+Math.sin(t*4)*0.3})`;
      ctx.fillRect(-14, -this.size*0.66, 28, this.size*0.27);
      // Battle flags (animated)
      ctx.strokeStyle = '#ccaa00'; ctx.lineWidth = 2;
      for (let i=-1; i<=1; i+=2) {
        ctx.beginPath(); ctx.moveTo(i*40, -this.size*0.4);
        ctx.lineTo(i*40, -this.size*0.8); ctx.stroke();
        ctx.fillStyle = '#220066';
        ctx.fillRect(i*40, -this.size*0.8, i*20, 14);
      }
      // Engines
      for (let i=-2; i<=2; i++) {
        ctx.fillStyle = `rgba(0,50,200,${0.6+Math.sin(t*5+i)*0.3})`;
        ctx.beginPath(); ctx.arc(i*16, this.size*0.6, 7, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  },
  {
    id:'final_omega', name:'OMEGA PRIME', subtitle:'The True Final Form',
    hp:3000, phases:4, phaseHpPcts:[0.75,0.5,0.25,0], color:'#ff006e', size:100,
    loot:{ coins:2000, crystals:100, equipment:'omega_core' },
    attacks: [
      { id:'omega_beam', name:'Omega Beam', pattern:'sweep_beam', dmg:40, cooldown:4 },
      { id:'reality_tear', name:'Reality Tear', pattern:'void_zone', dmg:20, cooldown:6 },
      { id:'phase_cannon', name:'Phase Cannon', pattern:'spread_12', dmg:15, cooldown:3 },
      { id:'omega_nova', name:'OMEGA NOVA', pattern:'screen_nuke', dmg:100, cooldown:25 }
    ],
    draw(ctx, x, y, t) {
      ctx.save(); ctx.translate(x, y);
      // Omega aura
      for (let i=3; i>0; i--) {
        const grad = ctx.createRadialGradient(0,0,0,0,0,this.size*i*0.7);
        grad.addColorStop(0,'rgba(255,0,110,0.08)'); grad.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0,this.size*i*0.7,0,Math.PI*2); ctx.fill();
      }
      // Main form - rotating rings
      for (let ring=0; ring<3; ring++) {
        const r = this.size*(0.4+ring*0.25);
        const segments = 8+ring*4;
        ctx.strokeStyle = `rgba(255,${ring*40},${110+ring*50},${0.4+Math.sin(t+ring)*0.4})`;
        ctx.lineWidth = 3-ring;
        ctx.beginPath();
        for (let i=0; i<=segments; i++) {
          const ang = (i/segments)*Math.PI*2 + t*(0.5+ring*0.3);
          const rd = r + Math.sin(ang*3+t*2)*15;
          if (i===0) ctx.moveTo(Math.cos(ang)*rd, Math.sin(ang)*rd);
          else ctx.lineTo(Math.cos(ang)*rd, Math.sin(ang)*rd);
        }
        ctx.closePath(); ctx.stroke();
      }
      // Core
      const grad = ctx.createRadialGradient(0,0,0,0,0,30);
      grad.addColorStop(0,'#ffffff'); grad.addColorStop(0.3,'#ff006e'); grad.addColorStop(1,'rgba(255,0,110,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2); ctx.fill();
      // Eye
      ctx.fillStyle = `rgba(255,255,255,${0.8+Math.sin(t*8)*0.2})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ff006e'; ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
      // Arm-like structures
      for (let i=0; i<4; i++) {
        const ang = (i/4)*Math.PI*2 + t*0.2;
        const len = this.size*0.9;
        ctx.strokeStyle = `rgba(255,0,110,0.6)`; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(Math.cos(ang)*30, Math.sin(ang)*30);
        ctx.bezierCurveTo(
          Math.cos(ang+0.4)*60, Math.sin(ang+0.4)*60,
          Math.cos(ang-0.4)*len*0.7, Math.sin(ang-0.4)*len*0.7,
          Math.cos(ang)*len, Math.sin(ang)*len
        );
        ctx.stroke();
        // Claw tips
        ctx.fillStyle = '#ff006e';
        ctx.beginPath(); ctx.arc(Math.cos(ang)*len, Math.sin(ang)*len, 10, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  }
];

const EPIC_BOSS_STATE = {
  active: false, bossIndex: -1, boss: null, hp: 0, maxHp: 0,
  phase: 0, attackTimer: 0, phaseTransitionTimer: 0,
  x: 0, y: 0, vx: 0, vy: 0, spawnedMinions: [], enraged: false,
  cutsceneActive: false, cutsceneTimer: 0, cutsceneText: ''
};

function spawnEpicBoss(bossIndex) {
  const boss = EPIC_BOSSES[bossIndex];
  if (!boss) return;
  EPIC_BOSS_STATE.active = true;
  EPIC_BOSS_STATE.bossIndex = bossIndex;
  EPIC_BOSS_STATE.boss = boss;
  EPIC_BOSS_STATE.hp = boss.hp;
  EPIC_BOSS_STATE.maxHp = boss.hp;
  EPIC_BOSS_STATE.phase = 0;
  EPIC_BOSS_STATE.x = (CANVAS ? CANVAS.width : 800) / 2;
  EPIC_BOSS_STATE.y = 100;
  EPIC_BOSS_STATE.vx = 1;
  EPIC_BOSS_STATE.vy = 0;
  EPIC_BOSS_STATE.enraged = false;
  EPIC_BOSS_STATE.spawnedMinions = [];
  showEpicBossCutscene(boss);
}

function showEpicBossCutscene(boss) {
  const el = document.getElementById('bossEncounterOverlay');
  if (!el) return;
  el.classList.add('active');
  el.innerHTML = `
    <div class="boss-encounter-panel">
      <div class="boss-encounter-name">${boss.name}</div>
      <div class="boss-encounter-subtitle">${boss.subtitle}</div>
      <div class="boss-phase-bar">
        ${boss.attacks.map((_,i)=>`<div class="boss-phase-pip ${i===0?'active':''}"></div>`).join('')}
      </div>
    </div>
  `;
  setTimeout(() => el.classList.remove('active'), 3000);
}

function updateEpicBoss(dt) {
  if (!EPIC_BOSS_STATE.active) return;
  const bs = EPIC_BOSS_STATE;
  const boss = bs.boss;
  const cw = CANVAS ? CANVAS.width : 800;
  // Phase check
  const hpPct = bs.hp / bs.maxHp;
  for (let p = boss.phases - 1; p >= 0; p--) {
    if (hpPct <= boss.phaseHpPcts[p] && bs.phase <= p) {
      bs.phase = p + 1;
      bs.enraged = bs.phase >= boss.phases - 1;
      if (bs.phase > 1) {
        showToast(boss.name + ' — PHASE ' + (bs.phase+1), boss.color);
        SCREEN_SHAKE.magnitude = 20; SCREEN_SHAKE.duration = 0.5;
      }
      break;
    }
  }
  // Movement
  bs.x += bs.vx * (bs.enraged ? 3 : 2);
  if (bs.x < 80 || bs.x > cw - 80) bs.vx *= -1;
  bs.y += Math.sin(Date.now()*0.001) * 0.5;
  bs.y = Math.max(60, Math.min(250, bs.y));
  // Attack
  bs.attackTimer -= dt;
  if (bs.attackTimer <= 0) {
    const atkIdx = bs.phase % boss.attacks.length;
    const atk = boss.attacks[atkIdx];
    executeEpicBossAttack(bs, atk);
    bs.attackTimer = (atk.cooldown || 3) * (bs.enraged ? 0.65 : 1);
  }
  // Check dead
  if (bs.hp <= 0) {
    onEpicBossDefeated(bs);
  }
}

function executeEpicBossAttack(bs, atk) {
  if (!State.enemies) return;
  const cw = CANVAS ? CANVAS.width : 800;
  const ch = CANVAS ? CANVAS.height : 600;
  switch(atk.pattern) {
    case 'spread_7':
    case 'spread_5':
    case 'spread_9':
    case 'spread_6_explosive':
    case 'spread_12': {
      const count = parseInt(atk.pattern.split('_')[1]) || 5;
      for (let i = 0; i < count; i++) {
        const ang = ((i / count) - 0.5) * Math.PI + Math.PI/2;
        State.enemies.push({
          x:bs.x, y:bs.y+30, vx:Math.cos(ang)*6, vy:Math.sin(ang)*6,
          w:8, h:8, hp:1, isBullet:true, dmg:atk.dmg, color:bs.boss.color,
          fromBoss:true
        });
      }
      break;
    }
    case 'homing_4': {
      const player = State.players && State.players[0];
      if (player) {
        for (let i=0; i<4; i++) {
          const t2 = i/4 * Math.PI*2;
          State.enemies.push({
            x:bs.x+Math.cos(t2)*30, y:bs.y+Math.sin(t2)*30,
            vx:0, vy:2, w:10,h:10, hp:1, isBullet:true, dmg:atk.dmg,
            color:bs.boss.color, fromBoss:true, homing:true,
            targetX: player.x, targetY: player.y
          });
        }
      }
      break;
    }
    case 'circle_16': {
      for (let i=0; i<16; i++) {
        const ang = (i/16)*Math.PI*2;
        State.enemies.push({
          x:bs.x, y:bs.y, vx:Math.cos(ang)*5, vy:Math.sin(ang)*5,
          w:8,h:8, hp:1, isBullet:true, dmg:atk.dmg, color:bs.boss.color, fromBoss:true
        });
      }
      break;
    }
    case 'rapid_burst': {
      const p = State.players && State.players[0];
      if (p) {
        const dx = p.x - bs.x, dy = p.y - bs.y;
        const len = Math.sqrt(dx*dx+dy*dy)||1;
        State.enemies.push({ x:bs.x, y:bs.y, vx:(dx/len)*10, vy:(dy/len)*10,
          w:6,h:6, hp:1, isBullet:true, dmg:atk.dmg, color:bs.boss.color, fromBoss:true });
      }
      break;
    }
    default: {
      const p = State.players && State.players[0];
      if (p) {
        const dx = p.x - bs.x, dy = p.y - bs.y;
        const len = Math.sqrt(dx*dx+dy*dy)||1;
        State.enemies.push({ x:bs.x, y:bs.y, vx:(dx/len)*7, vy:(dy/len)*7,
          w:10,h:10, hp:1, isBullet:true, dmg:atk.dmg||10, color:bs.boss.color||'#ff006e', fromBoss:true });
      }
    }
  }
}

function drawEpicBoss(ctx) {
  if (!EPIC_BOSS_STATE.active) return;
  const bs = EPIC_BOSS_STATE;
  const t = Date.now() * 0.001;
  bs.boss.draw(ctx, bs.x, bs.y, t);
  // Health bar
  const bw = 300, bh = 12;
  const bx = bs.x - bw/2, by = bs.y - bs.boss.size - 40;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx-2,by-2,bw+4,bh+4);
  ctx.fillStyle = '#333'; ctx.fillRect(bx,by,bw,bh);
  const pct = Math.max(0,bs.hp/bs.maxHp);
  const grad = ctx.createLinearGradient(bx,by,bx+bw,by);
  grad.addColorStop(0, bs.boss.color); grad.addColorStop(1,'#ffffff');
  ctx.fillStyle = grad; ctx.fillRect(bx,by,bw*pct,bh);
  // Boss name
  ctx.fillStyle = bs.boss.color; ctx.font = 'bold 13px Orbitron,monospace';
  ctx.textAlign = 'center'; ctx.fillText(bs.boss.name, bs.x, by - 8); ctx.textAlign = 'left';
  // Phase indicators
  for (let i=0; i<bs.boss.phases; i++) {
    const px = bx + (i+1)*bw/(bs.boss.phases+1) - 1;
    ctx.fillStyle = i < bs.phase ? bs.boss.color : 'rgba(255,255,255,0.3)';
    ctx.fillRect(px, by-1, 2, bh+2);
  }
  if (bs.enraged) {
    ctx.fillStyle = `rgba(255,0,0,${0.5+Math.sin(Date.now()*0.01)*0.5})`;
    ctx.font = 'bold 11px Orbitron,monospace'; ctx.textAlign='center';
    ctx.fillText('⚡ ENRAGED', bs.x, by-22); ctx.textAlign='left';
  }
}

function damageEpicBoss(amount) {
  if (!EPIC_BOSS_STATE.active) return;
  const bs = EPIC_BOSS_STATE;
  bs.hp -= amount;
  SCREEN_SHAKE.magnitude = 4; SCREEN_SHAKE.duration = 0.1;
  if (bs.hp < 0) bs.hp = 0;
}

function onEpicBossDefeated(bs) {
  bs.active = false;
  const boss = bs.boss;
  const loot = boss.loot;
  if (loot) {
    State.coins = (State.coins||0) + loot.coins;
    if (loot.crystals) RPG.currency.crystals += loot.crystals;
  }
  State.score = (State.score||0) + boss.hp * 2;
  RPG.trackKill('epic_boss', true);
  RPG.addXP(500 + boss.hp);
  GAME_STATS50.epicBossKills = (GAME_STATS50.epicBossKills||0) + 1;
  showToast(boss.name + ' DEFEATED! +' + loot.coins + ' coins!', '#ffd60a');
  showCelebration();
  saveStats();
}

function showCelebration() {
  if (typeof triggerExplosionAt === 'function') {
    for (let i=0; i<10; i++) {
      setTimeout(() => {
        const x = Math.random()*( CANVAS?CANVAS.width:800);
        const y = Math.random()*(CANVAS?CANVAS.height:600)*0.5;
        triggerExplosionAt(x,y);
      }, i*150);
    }
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 4 — ECONOMY & TRADING SYSTEM
// 20+ items, 6 rarities, dynamic market prices, crafting, black market
// ═══════════════════════════════════════════════════════════════════════════

const RARITY_DATA = {
  common:    { label:'Common',    color:'#aaaaaa', multiplier:1 },
  uncommon:  { label:'Uncommon',  color:'#00c864', multiplier:1.5 },
  rare:      { label:'Rare',      color:'#4488ff', multiplier:2.5 },
  epic:      { label:'Epic',      color:'#aa44ff', multiplier:5 },
  legendary: { label:'Legendary', color:'#ffa500', multiplier:12 },
  mythic:    { label:'Mythic',    color:'#ff44aa', multiplier:30 }
};

const MARKET_ITEMS = [
  // Weapons
  { id:'plasma_core',       name:'Plasma Core',       type:'weapon', rarity:'rare',      basePrice:350, icon:'🔮', desc:'Enhances plasma shots by 40%', stats:{damageMult:0.4,critRate:0.03} },
  { id:'void_shard',        name:'Void Shard',         type:'weapon', rarity:'epic',      basePrice:900, icon:'🌑', desc:'Pierces enemies and ignores shields', stats:{damageMult:0.6,pierce:2} },
  { id:'omega_core',        name:'Omega Core',         type:'weapon', rarity:'mythic',    basePrice:5000,icon:'⚡', desc:'The heart of Omega Prime. Ultimate power.', stats:{damageMult:1.2,critRate:0.1,critDmg:0.5} },
  { id:'prism_heart',       name:'Prism Heart',        type:'weapon', rarity:'legendary', basePrice:1800,icon:'💎', desc:'Splits shots into 3 crystal beams', stats:{damageMult:0.5,critRate:0.08} },
  { id:'swarm_core',        name:'Swarm Core',         type:'weapon', rarity:'epic',      basePrice:850, icon:'🐝', desc:'Summons 3 attacking drones on each shot', stats:{damageMult:0.3,drones:3} },
  { id:'titans_fist',       name:"Titan's Fist",       type:'weapon', rarity:'legendary', basePrice:2200,icon:'💪', desc:'Massive AoE slam. Stuns all nearby enemies.', stats:{damageMult:0.8,aoeSize:0.6} },
  // Armor
  { id:'titan_plating',     name:'Titan Plating',      type:'armor',  rarity:'epic',      basePrice:1200,icon:'🛡️', desc:'Reduces all incoming damage by 30%', stats:{shieldBonus:60,damageTakenMult:-0.3} },
  { id:'plague_catalyst',   name:'Plague Catalyst',    type:'armor',  rarity:'rare',      basePrice:600, icon:'☠️', desc:'30% chance to poison attackers', stats:{shieldBonus:20,poisonReturn:0.3} },
  { id:'admirals_insignia', name:"Admiral's Insignia", type:'armor',  rarity:'epic',      basePrice:1100,icon:'⭐', desc:'Ally damage +50%, incoming dmg -15%', stats:{allyDamage:0.5,damageTakenMult:-0.15} },
  { id:'quantum_weave',     name:'Quantum Weave',      type:'armor',  rarity:'legendary', basePrice:2500,icon:'🌀', desc:'30% dodge chance, +40 shield', stats:{dodge:0.3,shieldBonus:40} },
  { id:'nano_mesh',         name:'Nano Mesh',          type:'armor',  rarity:'uncommon',  basePrice:200, icon:'🔬', desc:'Slowly regenerates 2 HP/s', stats:{regen:2} },
  // Accessories
  { id:'combat_scanner',    name:'Combat Scanner',     type:'accessory',rarity:'uncommon',basePrice:180, icon:'📡', desc:'Show enemy HP bars and +20 radar range', stats:{radarRange:20,seeHp:true} },
  { id:'xp_amplifier',      name:'XP Amplifier',       type:'accessory',rarity:'rare',    basePrice:450, icon:'📚', desc:'+50% XP gain from all sources', stats:{xpBonus:0.5} },
  { id:'coin_magnet',       name:'Coin Magnet',         type:'accessory',rarity:'rare',    basePrice:400, icon:'🧲', desc:'Doubles coin pickup range, +30% coins', stats:{coinBonus:0.3,magnetRange:2} },
  { id:'adrenaline_chip',   name:'Adrenaline Chip',    type:'accessory',rarity:'epic',    basePrice:800, icon:'💊', desc:'+25% speed, +15% damage when HP < 50%', stats:{speedMult:0.25,lowHpDmgBonus:0.15} },
  { id:'void_compass',      name:'Void Compass',        type:'accessory',rarity:'legendary',basePrice:2000,icon:'🧭', desc:'Reveal all secrets, +100% crystals found', stats:{crystalBonus:1,revealSecrets:true} },
  // Relics
  { id:'ancient_rune',      name:'Ancient Rune',        type:'relic',  rarity:'rare',     basePrice:700, icon:'🔮', desc:'5% chance to auto-parry any attack', stats:{autoParry:0.05} },
  { id:'phoenix_feather',   name:'Phoenix Feather',     type:'relic',  rarity:'epic',     basePrice:1500,icon:'🐦', desc:'Revive once with 50% HP per session', stats:{revive:1} },
  { id:'dark_matter',       name:'Dark Matter',          type:'relic',  rarity:'legendary',basePrice:3000,icon:'🌑', desc:'All abilities charge 50% faster', stats:{cdReduction:0.5} },
  { id:'time_fragment',     name:'Time Fragment',        type:'relic',  rarity:'mythic',   basePrice:8000,icon:'⏳', desc:'Slow time for 1s on near-death (30s CD)', stats:{timeSlowOnDeath:1} }
];

const MARKET_STATE = {
  priceFluctuations: {}, lastRefresh: 0, refreshInterval: 60000, // 1 min
  cart: [], tab: 'buy', searchFilter: '', rarityFilter: 'all'
};

function getMarketPrice(itemId) {
  const item = MARKET_ITEMS.find(i => i.id === itemId);
  if (!item) return 0;
  const rarity = RARITY_DATA[item.rarity];
  const fluctuation = MARKET_STATE.priceFluctuations[itemId] || 1;
  return Math.floor(item.basePrice * rarity.multiplier * fluctuation);
}

function refreshMarketPrices() {
  MARKET_ITEMS.forEach(item => {
    MARKET_STATE.priceFluctuations[item.id] = 0.8 + Math.random() * 0.4;
  });
  MARKET_STATE.lastRefresh = Date.now();
}

function buyMarketItem(itemId) {
  const item = MARKET_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  const price = getMarketPrice(itemId);
  if ((State.coins||0) < price) { showToast('Not enough coins! Need ' + price, '#ff4444'); return; }
  State.coins = (State.coins||0) - price;
  addToInventory(item);
  showToast('Purchased: ' + item.name, '#00f5ff');
  playSound('coin');
  GAME_STATS50.itemsBought = (GAME_STATS50.itemsBought||0) + 1;
  renderEconomyPanel();
}

function sellMarketItem(itemId) {
  const item = RPG.inventory.find(i => i.id === itemId);
  if (!item) return;
  const price = Math.floor(getMarketPrice(itemId) * 0.5);
  State.coins = (State.coins||0) + price;
  RPG.inventory = RPG.inventory.filter(i => i !== item);
  showToast('Sold: ' + item.name + ' for ' + price + ' coins', '#ffd60a');
  playSound('coin');
  renderEconomyPanel();
}

function addToInventory(item) {
  RPG.inventory.push({...item, instanceId: Date.now() + Math.random()});
  GAME_STATS50.itemsCollected = (GAME_STATS50.itemsCollected||0) + 1;
  checkInventoryAchievements();
}

function equipItem(instanceId) {
  const item = RPG.inventory.find(i => i.instanceId === instanceId);
  if (!item) return;
  const slot = item.type;
  // Unequip current
  if (RPG.equipped[slot]) { RPG.inventory.push(RPG.equipped[slot]); }
  RPG.equipped[slot] = item;
  RPG.inventory = RPG.inventory.filter(i => i.instanceId !== instanceId);
  RPG.applyClassBonuses();
  showToast('Equipped: ' + item.name, '#00f5ff');
  renderEconomyPanel();
}

function checkInventoryAchievements() {
  if (RPG.inventory.length >= 5) RPG.unlockAchievement('ach_hoarder');
  const hasLegendary = RPG.inventory.some(i => i.rarity === 'legendary' || i.rarity === 'mythic');
  if (hasLegendary) RPG.unlockAchievement('ach_legendary');
}

function openEconomyPanel(tab='buy') {
  MARKET_STATE.tab = tab;
  if (Date.now() - MARKET_STATE.lastRefresh > MARKET_STATE.refreshInterval) refreshMarketPrices();
  const el = document.getElementById('economyPanel');
  if (el) { el.classList.add('active'); renderEconomyPanel(); }
}
function closeEconomyPanel() {
  const el = document.getElementById('economyPanel');
  if (el) el.classList.remove('active');
}

function renderEconomyPanel() {
  const el = document.getElementById('economyPanel');
  if (!el) return;
  const coins = State.coins || 0;
  const crystals = RPG.currency.crystals || 0;
  const filterItems = MARKET_ITEMS.filter(item => {
    if (MARKET_STATE.rarityFilter !== 'all' && item.rarity !== MARKET_STATE.rarityFilter) return false;
    if (MARKET_STATE.searchFilter && !item.name.toLowerCase().includes(MARKET_STATE.searchFilter.toLowerCase())) return false;
    return true;
  });
  el.innerHTML = `
    <button class="modal-close" onclick="closeEconomyPanel()" style="position:absolute;top:16px;right:16px;">✕</button>
    <h2>💰 GALACTIC MARKET</h2>
    <div style="text-align:center;margin-bottom:16px;font-family:Orbitron,monospace;font-size:14px;">
      <span style="color:#ffd60a;">⚡ ${coins} coins</span>
      &nbsp;&nbsp;
      <span style="color:#00f5ff;">💎 ${crystals} crystals</span>
    </div>
    <div class="economy-tabs">
      <div class="economy-tab ${MARKET_STATE.tab==='buy'?'active':''}" onclick="openEconomyPanel('buy')">BUY</div>
      <div class="economy-tab ${MARKET_STATE.tab==='sell'?'active':''}" onclick="openEconomyPanel('sell')">SELL</div>
      <div class="economy-tab ${MARKET_STATE.tab==='inventory'?'active':''}" onclick="openEconomyPanel('inventory')">INVENTORY</div>
      <div class="economy-tab ${MARKET_STATE.tab==='equipped'?'active':''}" onclick="openEconomyPanel('equipped')">EQUIPPED</div>
    </div>
    <div style="display:flex;gap:10px;max-width:1000px;margin:0 auto 16px;flex-wrap:wrap;">
      <input type="text" placeholder="Search items..." style="flex:1;padding:8px 12px;background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;font-family:Orbitron,monospace;font-size:11px;min-width:150px;"
        oninput="MARKET_STATE.searchFilter=this.value;renderEconomyPanel()" value="${MARKET_STATE.searchFilter}">
      <select onchange="MARKET_STATE.rarityFilter=this.value;renderEconomyPanel()" style="padding:8px;background:rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;font-family:Orbitron,monospace;font-size:11px;">
        <option value="all" ${MARKET_STATE.rarityFilter==='all'?'selected':''}>All Rarities</option>
        ${Object.entries(RARITY_DATA).map(([k,v])=>`<option value="${k}" ${MARKET_STATE.rarityFilter===k?'selected':''}>${v.label}</option>`).join('')}
      </select>
    </div>
    ${MARKET_STATE.tab==='buy' ? `
      <div class="market-grid">
        ${filterItems.map(item => {
          const price = getMarketPrice(item.id);
          const rd = RARITY_DATA[item.rarity];
          const canBuy = coins >= price;
          return `<div class="market-card" onclick="${canBuy?`buyMarketItem('${item.id}')`:''}" style="${!canBuy?'opacity:0.5;cursor:not-allowed':''}">
            <span class="item-rarity rarity-${item.rarity}">${rd.label}</span>
            <div style="font-size:28px;text-align:center;margin:8px 0;">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.desc}</div>
            <div class="item-price">💰 ${price.toLocaleString()}</div>
          </div>`;
        }).join('')}
      </div>
    ` : MARKET_STATE.tab==='sell' ? `
      <div class="market-grid">
        ${RPG.inventory.map(item => {
          const sellPrice = Math.floor(getMarketPrice(item.id)*0.5);
          const rd = RARITY_DATA[item.rarity]||{label:'?',color:'#888'};
          return `<div class="market-card" onclick="sellMarketItem('${item.instanceId}')">
            <span class="item-rarity rarity-${item.rarity}">${rd.label}</span>
            <div style="font-size:28px;text-align:center;margin:8px 0;">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-price" style="color:#ff9944;">💰 Sell: ${sellPrice.toLocaleString()}</div>
          </div>`;
        }).join('') || '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px;">No items to sell</div>'}
      </div>
    ` : MARKET_STATE.tab==='inventory' ? `
      <div class="market-grid">
        ${RPG.inventory.map(item => {
          const rd = RARITY_DATA[item.rarity]||{label:'?',color:'#888'};
          return `<div class="market-card" onclick="equipItem(${item.instanceId})">
            <span class="item-rarity rarity-${item.rarity}">${rd.label}</span>
            <div style="font-size:28px;text-align:center;margin:8px 0;">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.desc}</div>
            <div style="font-size:10px;color:#39ff14;margin-top:6px;">Click to equip</div>
          </div>`;
        }).join('') || '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:40px;">Inventory empty</div>'}
      </div>
    ` : `
      <div class="market-grid">
        ${['weapon','armor','accessory','relic'].map(slot => {
          const item = RPG.equipped[slot];
          const rd = item ? RARITY_DATA[item.rarity]||{label:'?',color:'#888'} : null;
          return `<div class="market-card" style="border-color:rgba(255,214,10,0.4);">
            <div style="font-family:Orbitron,monospace;font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:8px;">${slot.toUpperCase()} SLOT</div>
            ${item ? `
              <span class="item-rarity rarity-${item.rarity}">${rd.label}</span>
              <div style="font-size:28px;text-align:center;margin:8px 0;">${item.icon}</div>
              <div class="item-name">${item.name}</div>
              <div class="item-desc">${item.desc}</div>
            ` : `<div style="text-align:center;color:rgba(255,255,255,0.3);padding:20px;">Empty</div>`}
          </div>`;
        }).join('')}
      </div>
    `}
  `;
}

// Black Market (special illegal items, higher prices)
const BLACK_MARKET_ITEMS = [
  { id:'time_bomb', name:'Temporal Bomb', icon:'💣', price:2000, desc:'Screen-clearing explosion, oneshot all regular enemies', type:'consumable' },
  { id:'god_mode', name:'Invincibility Serum', icon:'💊', price:5000, desc:'15 seconds of true invincibility', type:'consumable' },
  { id:'infinite_ammo', name:'Infinite Ammo Chip', icon:'🔫', price:3000, desc:'No ammo limits for 60 seconds', type:'consumable' },
  { id:'clone_device', name:'Clone Device', icon:'👥', price:4500, desc:'Spawns a clone that fights alongside you for 30s', type:'consumable' }
];

function openBlackMarket() {
  showToast('⚠️ BLACK MARKET — Illegal goods. No refunds.', '#ff4400');
  // Show special UI embedded in economy panel
  MARKET_STATE.tab = 'black';
  openEconomyPanel('buy');
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 5 — MISSION GENERATOR
// 50+ mission templates, escort, bounty, rescue, sabotage, time-limited
// ═══════════════════════════════════════════════════════════════════════════

const MISSION_TYPES = {
  kill:       { label:'Kill Target',   icon:'💀', color:'#ff4444', baseXP:150, baseCoin:80 },
  escort:     { label:'Escort',        icon:'🛡️',  color:'#4488ff', baseXP:200, baseCoin:120 },
  rescue:     { label:'Rescue',        icon:'🆘',  color:'#ffaa00', baseXP:180, baseCoin:100 },
  bounty:     { label:'Bounty Hunt',   icon:'🎯',  color:'#ffd60a', baseXP:250, baseCoin:200 },
  sabotage:   { label:'Sabotage',      icon:'💣',  color:'#ff6600', baseXP:220, baseCoin:150 },
  survey:     { label:'Survey',        icon:'🔭',  color:'#39ff14', baseXP:100, baseCoin:60 },
  courier:    { label:'Courier',       icon:'📦',  color:'#00f5ff', baseXP:80,  baseCoin:90 },
  excavation: { label:'Excavation',    icon:'⛏️',  color:'#aa8844', baseXP:160, baseCoin:140 },
  defense:    { label:'Defense',       icon:'🏰',  color:'#888888', baseXP:200, baseCoin:130 },
  infiltration:{ label:'Infiltration', icon:'👤',  color:'#444488', baseXP:300, baseCoin:180 }
};

const MISSION_TEMPLATES = [
  // Kill missions
  { type:'kill',   title:'Pirate Elimination',        desc:'Destroy the pirate leader lurking in sector {sector}.', difficulty:1, time:null },
  { type:'kill',   title:'Hunter Protocol',            desc:'Track down and eliminate {count} elite enemy fighters.', difficulty:2, time:null },
  { type:'kill',   title:'Assassination Contract',     desc:'A high-value target has been spotted. Eliminate them silently.', difficulty:3, time:120 },
  { type:'kill',   title:'Purge the Nest',             desc:'Clear all enemies from the infested zone in sector {sector}.', difficulty:2, time:null },
  { type:'kill',   title:'The Bounty: EXTREME',        desc:'The most wanted criminal in the galaxy. Bring them down.', difficulty:5, time:300 },
  // Escort missions
  { type:'escort', title:'VIP Transport',              desc:'Escort the diplomat ship safely through the danger zone.', difficulty:2, time:180 },
  { type:'escort', title:'Refugee Convoy',             desc:'Protect {count} refugee ships from pirate attacks.', difficulty:3, time:240 },
  { type:'escort', title:'Supply Run',                 desc:'Guard the supply convoy to the space station.', difficulty:1, time:120 },
  { type:'escort', title:'Prototype Delivery',         desc:'A secret weapon prototype must reach base. Protect it at all costs.', difficulty:4, time:200 },
  // Rescue missions
  { type:'rescue', title:'Stranded Crew',              desc:'A crew of {count} soldiers is stranded in hostile territory. Rescue them.', difficulty:2, time:null },
  { type:'rescue', title:'POW Extraction',             desc:'Enemy forces hold prisoners. Get them out alive.', difficulty:3, time:180 },
  { type:'rescue', title:'Civilian Evacuation',        desc:'Evacuate civilians from the war zone before time runs out.', difficulty:2, time:240 },
  // Bounty missions
  { type:'bounty', title:'Wanted: Dead or Alive',      desc:'A notorious war criminal carries a 500,000 credit bounty.', difficulty:4, time:null },
  { type:'bounty', title:'Outlaw Squadron',            desc:'Three outlaw ships have been terrorizing trade routes. Stop them.', difficulty:3, time:null },
  { type:'bounty', title:'The Red Corsair',            desc:'The Red Corsair has escaped prison. Hunt them down in {sector}.', difficulty:5, time:null },
  // Sabotage missions
  { type:'sabotage', title:'Destroy the Relay',        desc:'Enemy communications depend on a relay in sector {sector}. Destroy it.', difficulty:2, time:null },
  { type:'sabotage', title:'Fuel Depot Strike',        desc:'Detonate the enemy fuel depot to cripple their operations.', difficulty:3, time:120 },
  { type:'sabotage', title:'Station Infiltration',     desc:'Disable the enemy command station before reinforcements arrive.', difficulty:4, time:180 },
  { type:'sabotage', title:'Operation Blackout',       desc:'Shut down enemy sensors across {count} installations.', difficulty:3, time:240 },
  // Survey missions
  { type:'survey',   title:'Sector Mapping',           desc:'Chart the unexplored regions of sector {sector}.', difficulty:1, time:null },
  { type:'survey',   title:'Anomaly Investigation',    desc:'A strange energy signal has been detected. Investigate its source.', difficulty:2, time:null },
  { type:'survey',   title:'Resource Survey',          desc:'Map all asteroid fields and crystal deposits in the area.', difficulty:1, time:null },
  // Courier missions
  { type:'courier',  title:'Urgent Dispatch',          desc:'Deliver classified documents to the outpost before the deadline.', difficulty:1, time:90 },
  { type:'courier',  title:'Medical Supplies',         desc:'Get medical supplies to the colony before people die.', difficulty:2, time:150 },
  { type:'courier',  title:'Black Market Deal',        desc:'Deliver a mysterious package. No questions asked.', difficulty:2, time:null },
  // Excavation missions
  { type:'excavation', title:'Crystal Extraction',     desc:'Mine {count} rare crystal formations from the asteroid belt.', difficulty:2, time:null },
  { type:'excavation', title:'Ancient Artifact',       desc:'Recover an ancient relic from the derelict station.', difficulty:3, time:null },
  { type:'excavation', title:'Ore Collection Run',     desc:'Collect {count} units of rare ore from the mining fields.', difficulty:1, time:null },
  // Defense missions
  { type:'defense',  title:'Station Defense',          desc:'The space station is under attack! Hold the line for {time} minutes.', difficulty:3, time:180 },
  { type:'defense',  title:'Colony Protection',        desc:'A pirate fleet is incoming. Protect the colony at all costs.', difficulty:4, time:240 },
  { type:'defense',  title:'Last Stand',               desc:'You are the last ship standing. Survive the onslaught.', difficulty:5, time:300 },
  // Infiltration missions
  { type:'infiltration', title:'Ghost Protocol',       desc:'Infiltrate enemy base without triggering alarms.', difficulty:4, time:180 },
  { type:'infiltration', title:'Data Heist',           desc:'Steal classified data from the enemy commander.', difficulty:3, time:null },
  { type:'infiltration', title:'Undercover Agent',     desc:'Pose as a pirate to get close to the target.', difficulty:5, time:null }
];

const MISSION_STATE = {
  activeMissions: [], completedMissionIds: new Set(),
  generatedMissions: [], lastGenerated: 0, generationInterval: 300000 // 5 min
};

function generateMissions(count = 6) {
  MISSION_STATE.generatedMissions = [];
  for (let i = 0; i < count; i++) {
    const template = MISSION_TEMPLATES[Math.floor(Math.random() * MISSION_TEMPLATES.length)];
    const diff = template.difficulty + Math.floor(Math.random() * 2) - 1;
    const mtype = MISSION_TYPES[template.type];
    const xpReward = Math.floor(mtype.baseXP * (1 + diff * 0.4) * (1 + Math.random() * 0.3));
    const coinReward = Math.floor(mtype.baseCoin * (1 + diff * 0.4) * (1 + Math.random() * 0.3));
    const sector = Math.floor(Math.random() * 36) + 1;
    const count2 = 3 + Math.floor(Math.random() * 5);
    const isUrgent = Math.random() < 0.2;
    MISSION_STATE.generatedMissions.push({
      id: 'mission_' + Date.now() + '_' + i,
      type: template.type, title: template.title,
      desc: template.desc.replace('{sector}', 'S-'+sector).replace('{count}', count2).replace('{time}', 3),
      difficulty: Math.max(1, Math.min(5, diff)),
      timeLimit: template.time || null, timeRemaining: template.time || null,
      xpReward, coinReward, crystalReward: Math.floor(Math.random()*5*diff),
      isUrgent, progress: 0, required: 1 + diff * 2,
      sector, status: 'available'
    });
  }
  MISSION_STATE.lastGenerated = Date.now();
}

function acceptMission(missionId) {
  if (MISSION_STATE.activeMissions.length >= 3) {
    showToast('Max 3 active missions!', '#ff4444'); return;
  }
  const mission = MISSION_STATE.generatedMissions.find(m => m.id === missionId);
  if (!mission || mission.status !== 'available') return;
  mission.status = 'active';
  MISSION_STATE.activeMissions.push(mission);
  MISSION_STATE.generatedMissions = MISSION_STATE.generatedMissions.filter(m => m.id !== missionId);
  showToast('Mission accepted: ' + mission.title, '#39ff14');
  renderMissionBoard();
}

function completeMission(missionId) {
  const idx = MISSION_STATE.activeMissions.findIndex(m => m.id === missionId);
  if (idx < 0) return;
  const mission = MISSION_STATE.activeMissions[idx];
  MISSION_STATE.activeMissions.splice(idx, 1);
  MISSION_STATE.completedMissionIds.add(missionId);
  // Rewards
  State.coins = (State.coins || 0) + mission.coinReward;
  RPG.addXP(mission.xpReward);
  if (mission.crystalReward) RPG.currency.crystals += mission.crystalReward;
  RPG.missionsCompleted++;
  GAME_STATS50.missionsCompleted = (GAME_STATS50.missionsCompleted||0) + 1;
  showToast(`Mission Complete: ${mission.title}! +${mission.coinReward} coins, +${mission.xpReward} XP`, '#39ff14');
  checkMissionAchievements();
  saveStats();
}

function tickMissions(dt) {
  for (const mission of MISSION_STATE.activeMissions) {
    if (mission.timeLimit && mission.timeRemaining !== null) {
      mission.timeRemaining -= dt;
      if (mission.timeRemaining <= 0) {
        failMission(mission.id);
      }
    }
  }
  if (Date.now() - MISSION_STATE.lastGenerated > MISSION_STATE.generationInterval) {
    generateMissions(6);
  }
}

function failMission(missionId) {
  const idx = MISSION_STATE.activeMissions.findIndex(m => m.id === missionId);
  if (idx < 0) return;
  const mission = MISSION_STATE.activeMissions[idx];
  MISSION_STATE.activeMissions.splice(idx, 1);
  showToast('MISSION FAILED: ' + mission.title, '#ff4444');
  GAME_STATS50.missionsFailed = (GAME_STATS50.missionsFailed||0) + 1;
}

function advanceMissionProgress(type, amount = 1) {
  MISSION_STATE.activeMissions.forEach(m => {
    if (m.type === type) {
      m.progress = Math.min(m.required, m.progress + amount);
      if (m.progress >= m.required) completeMission(m.id);
    }
  });
}

function checkMissionAchievements() {
  if (RPG.missionsCompleted >= 5) RPG.unlockAchievement('ach_5missions');
  if (RPG.missionsCompleted >= 20) RPG.unlockAchievement('ach_20missions');
  if (RPG.missionsCompleted >= 50) RPG.unlockAchievement('ach_50missions');
}

function openMissionBoard() {
  if (Date.now() - MISSION_STATE.lastGenerated > MISSION_STATE.generationInterval || MISSION_STATE.generatedMissions.length === 0) {
    generateMissions(6);
  }
  const el = document.getElementById('missionBoard');
  if (el) { el.classList.add('active'); renderMissionBoard(); }
}
function closeMissionBoard() {
  const el = document.getElementById('missionBoard');
  if (el) el.classList.remove('active');
}

function renderMissionBoard() {
  const el = document.getElementById('missionBoard');
  if (!el) return;
  const stars = n => '★'.repeat(n) + '☆'.repeat(5-n);
  el.innerHTML = `
    <button class="modal-close" onclick="closeMissionBoard()" style="position:absolute;top:16px;right:16px;">✕</button>
    <h2>📋 MISSION BOARD</h2>
    <div style="font-family:Orbitron,monospace;font-size:11px;color:rgba(255,255,255,0.4);text-align:center;margin-bottom:16px;">
      Active: ${MISSION_STATE.activeMissions.length}/3 &nbsp;|&nbsp; Completed: ${RPG.missionsCompleted}
    </div>
    ${MISSION_STATE.activeMissions.length > 0 ? `
      <h3 style="font-family:Orbitron,monospace;font-size:13px;color:#39ff14;max-width:800px;margin:0 auto 12px;">ACTIVE MISSIONS</h3>
      <div class="mission-list">
        ${MISSION_STATE.activeMissions.map(m => {
          const mt = MISSION_TYPES[m.type];
          const pct = (m.progress / m.required * 100).toFixed(0);
          const timeStr = m.timeRemaining !== null ? `⏱️ ${Math.ceil(m.timeRemaining)}s` : '';
          return `<div class="mission-card ${m.isUrgent?'urgent':''}">
            <div class="mission-header">
              <div>
                <div class="mission-title">${mt.icon} ${m.title}</div>
                <span class="mission-type" style="background:rgba(${m.isUrgent?'255,102,0':'57,255,20'},0.15);color:${m.isUrgent?'#ff6600':'#39ff14'}">${m.isUrgent?'⚡ URGENT':mt.label}</span>
              </div>
              <div style="text-align:right;">
                <div class="mission-difficulty-stars">${stars(m.difficulty)}</div>
                ${timeStr ? `<div class="mission-timer">${timeStr}</div>` : ''}
              </div>
            </div>
            <div class="mission-desc">${m.desc}</div>
            <div class="mission-progress"><div class="mission-progress-fill" style="width:${pct}%"></div></div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;">${m.progress}/${m.required} — ${pct}%</div>
          </div>`;
        }).join('')}
      </div>
    ` : ''}
    <h3 style="font-family:Orbitron,monospace;font-size:13px;color:#ffd60a;max-width:800px;margin:16px auto 12px;">AVAILABLE MISSIONS</h3>
    <div class="mission-list">
      ${MISSION_STATE.generatedMissions.map(m => {
        const mt = MISSION_TYPES[m.type];
        return `<div class="mission-card ${m.isUrgent?'urgent':''}" onclick="acceptMission('${m.id}')">
          <div class="mission-header">
            <div>
              <div class="mission-title">${mt.icon} ${m.title}</div>
              <span class="mission-type" style="background:rgba(255,255,255,0.07);color:${mt.color}">${mt.label}</span>
              ${m.isUrgent ? '<span class="mission-type" style="color:#ff6600;margin-left:6px;">⚡ URGENT</span>' : ''}
            </div>
            <div class="mission-difficulty-stars">${'★'.repeat(m.difficulty)}${'☆'.repeat(5-m.difficulty)}</div>
          </div>
          <div class="mission-desc">${m.desc}</div>
          <div class="mission-rewards">
            <span class="mission-reward-item">💰 ${m.coinReward}</span>
            <span class="mission-reward-item">📚 +${m.xpReward} XP</span>
            ${m.crystalReward ? `<span class="mission-reward-item">💎 +${m.crystalReward}</span>` : ''}
            ${m.timeLimit ? `<span style="color:#ff6600;font-size:11px;">⏱️ ${m.timeLimit}s limit</span>` : ''}
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:8px;">Click to accept</div>
        </div>`;
      }).join('')}
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 6 — ADVANCED AI SYSTEM
// 15 enemy types, squad AI, personalities, retreat/regroup, stealth
// ═══════════════════════════════════════════════════════════════════════════

const AI_PERSONALITIES = {
  scout:       { name:'Scout',       speed:1.6, hp:0.6, dmg:0.7, aggression:0.3, flee:0.2, patrol:true,  stealth:false, social:true,  color:'#88ff88' },
  berserker:   { name:'Berserker',   speed:1.4, hp:1.5, dmg:1.8, aggression:1.0, flee:0.0, patrol:false, stealth:false, social:false, color:'#ff4444' },
  sniper:      { name:'Sniper',      speed:0.8, hp:0.8, dmg:2.0, aggression:0.2, flee:0.6, patrol:true,  stealth:false, social:false, color:'#ff8844' },
  support:     { name:'Support',     speed:1.0, hp:1.0, dmg:0.5, aggression:0.2, flee:0.5, patrol:false, stealth:false, social:true,  color:'#44ff88' },
  carrier:     { name:'Carrier',     speed:0.7, hp:2.5, dmg:0.8, aggression:0.4, flee:0.3, patrol:true,  stealth:false, social:true,  color:'#8844ff' },
  stealth:     { name:'Stealth',     speed:1.3, hp:0.7, dmg:1.3, aggression:0.5, flee:0.4, patrol:true,  stealth:true,  social:false, color:'#444488' },
  swarm:       { name:'Swarm',       speed:1.8, hp:0.3, dmg:0.6, aggression:0.8, flee:0.1, patrol:false, stealth:false, social:true,  color:'#ffcc44' },
  juggernaut:  { name:'Juggernaut',  speed:0.5, hp:4.0, dmg:2.5, aggression:0.7, flee:0.0, patrol:false, stealth:false, social:false, color:'#ff6600' },
  tactician:   { name:'Tactician',   speed:1.0, hp:1.0, dmg:1.0, aggression:0.5, flee:0.3, patrol:true,  stealth:false, social:true,  color:'#4488ff' },
  bomber:      { name:'Bomber',      speed:0.9, hp:1.2, dmg:3.0, aggression:0.6, flee:0.4, patrol:false, stealth:false, social:false, color:'#ff4400' },
  assassin:    { name:'Assassin',    speed:2.0, hp:0.5, dmg:2.0, aggression:0.7, flee:0.5, patrol:true,  stealth:true,  social:false, color:'#aa00ff' },
  warden:      { name:'Warden',      speed:0.7, hp:3.0, dmg:1.2, aggression:0.5, flee:0.0, patrol:true,  stealth:false, social:true,  color:'#8888ff' },
  phantom:     { name:'Phantom',     speed:1.5, hp:0.6, dmg:1.5, aggression:0.6, flee:0.5, patrol:false, stealth:true,  social:false, color:'#888888' },
  commander_ai:{ name:'Commander',   speed:0.8, hp:2.0, dmg:1.0, aggression:0.6, flee:0.2, patrol:true,  stealth:false, social:true,  color:'#ffff44' },
  elite:       { name:'Elite Guard', speed:1.2, hp:1.5, dmg:1.5, aggression:0.8, flee:0.1, patrol:true,  stealth:false, social:true,  color:'#ff00ff' }
};

class AdvancedEnemy {
  constructor(x, y, personalityId, squadId = null) {
    const p = AI_PERSONALITIES[personalityId] || AI_PERSONALITIES.scout;
    this.x = x; this.y = y;
    this.personality = personalityId;
    this.squadId = squadId;
    this.w = 20; this.h = 20;
    this.maxHp = Math.floor(30 * p.hp);
    this.hp = this.maxHp;
    this.speed = 2 * p.speed;
    this.dmg = Math.floor(10 * p.dmg);
    this.color = p.color;
    this.aggression = p.aggression;
    this.fleeThreshold = p.flee;
    this.isStealth = p.stealth;
    this.isSocial = p.social;
    this.state = 'patrol'; // patrol|chase|attack|flee|regroup|stealth
    this.target = null;
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.patrolRadius = 60 + Math.random() * 80;
    this.patrolCenterX = x; this.patrolCenterY = y;
    this.alertTimer = 0;
    this.attackTimer = 0;
    this.stealthAlpha = p.stealth ? 0.2 : 1;
    this.retreatX = x; this.retreatY = y;
    this.lastKnownPlayerX = null; this.lastKnownPlayerY = null;
    this.threatLevel = 0; // 0=none,1=low,2=med,3=high
    this.regroupTimer = 0;
    this.supportRadius = 120;
    this.shootCooldown = 0;
    this.isBullet = false;
  }

  update(dt, player, squadMembers) {
    const p = AI_PERSONALITIES[this.personality];
    const dist = player ? Math.hypot(this.x - player.x, this.y - player.y) : 9999;
    const sightRange = p.stealth ? 180 : 280;
    const aggroRange = sightRange * this.aggression;

    // Stealth visibility
    if (this.isStealth) {
      const targetAlpha = this.state === 'attack' ? 0.7 : 0.15;
      this.stealthAlpha += (targetAlpha - this.stealthAlpha) * dt * 3;
    }

    // State transitions
    if (this.state !== 'flee' && this.state !== 'regroup') {
      if (player && dist < aggroRange) {
        this.lastKnownPlayerX = player.x; this.lastKnownPlayerY = player.y;
        this.alertTimer = 3;
        const hpPct = this.hp / this.maxHp;
        if (hpPct < this.fleeThreshold && this.fleeThreshold > 0) {
          this.state = 'flee';
          this.retreatX = this.x + (this.x - player.x) * 3;
          this.retreatY = this.y + (this.y - player.y) * 3;
        } else if (dist < 150) {
          this.state = 'attack';
        } else {
          this.state = 'chase';
        }
      } else {
        this.alertTimer -= dt;
        if (this.alertTimer <= 0) {
          if (this.state !== 'patrol') this.state = 'patrol';
        }
      }
    }
    // Squad social behavior - rally nearby allies
    if (this.isSocial && this.state === 'attack' && squadMembers) {
      squadMembers.forEach(m => {
        if (m !== this && m.state === 'patrol' && Math.hypot(m.x-this.x,m.y-this.y) < this.supportRadius) {
          m.state = 'chase';
          m.alertTimer = 2;
          if (player) { m.lastKnownPlayerX = player.x; m.lastKnownPlayerY = player.y; }
        }
      });
    }

    // Movement
    switch(this.state) {
      case 'patrol': {
        this.patrolAngle += dt * 0.4;
        const tx = this.patrolCenterX + Math.cos(this.patrolAngle) * this.patrolRadius;
        const ty = this.patrolCenterY + Math.sin(this.patrolAngle) * this.patrolRadius;
        this.moveToward(tx, ty, dt, this.speed * 0.5);
        break;
      }
      case 'chase': {
        const tx = this.lastKnownPlayerX || (player ? player.x : this.x);
        const ty = this.lastKnownPlayerY || (player ? player.y : this.y);
        this.moveToward(tx, ty, dt, this.speed);
        break;
      }
      case 'attack': {
        if (player) {
          // Orbit player
          const ang = Math.atan2(this.y - player.y, this.x - player.x);
          const orbitDist = 140;
          const tx = player.x + Math.cos(ang) * orbitDist;
          const ty = player.y + Math.sin(ang) * orbitDist;
          this.moveToward(tx, ty, dt, this.speed * 0.8);
          // Shoot
          this.shootCooldown -= dt;
          if (this.shootCooldown <= 0) {
            this.shootAtPlayer(player);
            this.shootCooldown = 1.5 / this.aggression;
          }
        }
        break;
      }
      case 'flee': {
        this.moveToward(this.retreatX, this.retreatY, dt, this.speed * 1.3);
        this.regroupTimer = 3;
        const retreatDist = Math.hypot(this.x - this.retreatX, this.y - this.retreatY);
        if (retreatDist < 30) { this.state = 'regroup'; }
        break;
      }
      case 'regroup': {
        this.regroupTimer -= dt;
        if (this.regroupTimer <= 0) {
          this.state = 'patrol';
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3); // Partial heal on regroup
        }
        break;
      }
    }
    // Bounds
    const cw = CANVAS ? CANVAS.width : 800, ch = CANVAS ? CANVAS.height : 600;
    this.x = Math.max(10, Math.min(cw - 10, this.x));
    this.y = Math.max(10, Math.min(ch - 10, this.y));
  }

  moveToward(tx, ty, dt, speed) {
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if (dist > 2) {
      this.x += (dx/dist) * speed * dt * 60;
      this.y += (dy/dist) * speed * dt * 60;
    }
  }

  shootAtPlayer(player) {
    if (!State.enemies) State.enemies = [];
    const dx = player.x - this.x, dy = player.y - this.y;
    const len = Math.sqrt(dx*dx+dy*dy)||1;
    const spread = (Math.random()-0.5)*0.3;
    State.enemies.push({
      x:this.x, y:this.y,
      vx: (dx/len + spread)*8, vy: (dy/len + spread)*8,
      w:8, h:8, hp:1, isBullet:true, dmg:this.dmg,
      color:this.color, fromAdvAI:true
    });
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.stealthAlpha;
    // Shadow/glow
    ctx.shadowColor = this.color; ctx.shadowBlur = this.state==='attack'?16:6;
    // Body
    ctx.fillStyle = this.color;
    const hpPct = this.hp / this.maxHp;
    if (hpPct < 0.3) {
      // Flickering at low HP
      ctx.globalAlpha = this.stealthAlpha * (0.6 + Math.sin(Date.now()*0.02)*0.4);
    }
    ctx.beginPath();
    switch(this.personality) {
      case 'berserker': // Diamond shape
        ctx.moveTo(this.x, this.y-14); ctx.lineTo(this.x+10,this.y);
        ctx.lineTo(this.x,this.y+14); ctx.lineTo(this.x-10,this.y);
        break;
      case 'sniper': // Arrow
        ctx.moveTo(this.x, this.y-16); ctx.lineTo(this.x+6, this.y+10);
        ctx.lineTo(this.x-6, this.y+10); break;
      case 'juggernaut': // Large square
        ctx.rect(this.x-14, this.y-14, 28, 28); break;
      case 'swarm': // Small circle
        ctx.arc(this.x, this.y, 7, 0, Math.PI*2); break;
      case 'stealth': case 'phantom': case 'assassin': // Triangle outline
        ctx.moveTo(this.x, this.y-12); ctx.lineTo(this.x+10, this.y+10);
        ctx.lineTo(this.x-10, this.y+10); break;
      default: // Standard triangle
        ctx.moveTo(this.x, this.y-12); ctx.lineTo(this.x+8, this.y+10);
        ctx.lineTo(this.x-8, this.y+10);
    }
    ctx.closePath(); ctx.fill();
    // State indicator
    if (this.state === 'alert' || this.alertTimer > 2) {
      ctx.fillStyle = '#ffff00'; ctx.font = '12px monospace';
      ctx.fillText('!', this.x-3, this.y-18);
    }
    // HP bar
    const bw = 24;
    ctx.fillStyle = '#333'; ctx.fillRect(this.x-bw/2, this.y-20, bw, 3);
    ctx.fillStyle = hpPct > 0.5 ? '#39ff14' : hpPct > 0.25 ? '#ffd60a' : '#ff4444';
    ctx.fillRect(this.x-bw/2, this.y-20, bw*hpPct, 3);
    ctx.restore();
  }
}

// Squad system
const SQUADS = {};
let squadCounter = 0;

function createSquad(size, personalityId, centerX, centerY) {
  const squadId = 'squad_' + (squadCounter++);
  SQUADS[squadId] = { members: [], personalityId, leaderId: null };
  for (let i = 0; i < size; i++) {
    const angle = (i / size) * Math.PI * 2;
    const r = 40 + Math.random() * 30;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    const enemy = new AdvancedEnemy(x, y, personalityId, squadId);
    SQUADS[squadId].members.push(enemy);
    State.enemies = State.enemies || [];
    State.enemies.push(enemy);
  }
  if (SQUADS[squadId].members.length > 0) {
    SQUADS[squadId].leaderId = SQUADS[squadId].members[0];
  }
  return squadId;
}

function spawnAdvancedWave() {
  const cw = CANVAS ? CANVAS.width : 800;
  const types = Object.keys(AI_PERSONALITIES);
  const type1 = types[Math.floor(Math.random() * types.length)];
  const type2 = types[Math.floor(Math.random() * types.length)];
  const size = 3 + Math.floor(Math.random() * 4);
  createSquad(size, type1, cw/2 + (Math.random()-0.5)*300, -30);
  if (Math.random() < 0.4) {
    createSquad(2, type2, Math.random()*cw, -30);
  }
}

// Threat Assessment
function assessThreatLevel(player) {
  if (!player) return 0;
  const nearbyCount = (State.enemies||[]).filter(e => !e.isBullet && Math.hypot(e.x-player.x,e.y-player.y) < 300).length;
  if (nearbyCount >= 8) return 3;
  if (nearbyCount >= 4) return 2;
  if (nearbyCount >= 1) return 1;
  return 0;
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 7 — ADVANCED VISUAL EFFECTS SYSTEM
// ParticlePool, 20 effect types, engine trails, shield ripples, warp jump
// ═══════════════════════════════════════════════════════════════════════════

const PARTICLE_POOL = {
  pool: [], maxSize: 2000, activeCount: 0,

  create(opts) {
    if (this.pool.length > this.maxSize) return null;
    const p = {
      x: opts.x || 0, y: opts.y || 0,
      vx: opts.vx || 0, vy: opts.vy || 0,
      life: opts.life || 1, maxLife: opts.life || 1,
      size: opts.size || 4, endSize: opts.endSize || 0,
      color: opts.color || '#ffffff', endColor: opts.endColor || null,
      alpha: opts.alpha || 1, gravity: opts.gravity || 0,
      drag: opts.drag || 0.98, type: opts.type || 'circle',
      trail: opts.trail || false, rotation: opts.rotation || 0,
      rotSpeed: opts.rotSpeed || 0, glow: opts.glow || false,
      blendMode: opts.blendMode || 'source-over'
    };
    this.pool.push(p);
    return p;
  },

  update(dt) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += p.gravity * dt;
      p.vx *= p.drag; p.vy *= p.drag;
      p.life -= dt;
      p.rotation += p.rotSpeed * dt;
      if (p.life <= 0) { this.pool.splice(i, 1); }
    }
    this.activeCount = this.pool.length;
  },

  draw(ctx) {
    ctx.save();
    for (const p of this.pool) {
      const lifePct = p.life / p.maxLife;
      const alpha = p.alpha * lifePct;
      const size = p.size * lifePct + (p.endSize || 0) * (1 - lifePct);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.globalCompositeOperation = p.blendMode;
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = size*2; }
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      switch(p.type) {
        case 'circle':
          ctx.beginPath(); ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI*2); ctx.fill();
          break;
        case 'square':
          ctx.fillRect(-size/2, -size/2, size, size);
          break;
        case 'spark':
          ctx.strokeStyle = p.color; ctx.lineWidth = size*0.3;
          ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.stroke();
          break;
        case 'star': {
          const spikes = 4;
          ctx.beginPath();
          for (let s=0; s<spikes*2; s++) {
            const r2 = s%2===0 ? size : size*0.4;
            const a2 = (s/spikes/2)*Math.PI*2;
            if (s===0) ctx.moveTo(Math.cos(a2)*r2, Math.sin(a2)*r2);
            else ctx.lineTo(Math.cos(a2)*r2, Math.sin(a2)*r2);
          }
          ctx.closePath(); ctx.fill();
          break;
        }
        case 'ring':
          ctx.strokeStyle = p.color; ctx.lineWidth = size*0.3;
          ctx.beginPath(); ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI*2); ctx.stroke();
          break;
      }
      ctx.restore();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
};

// Effect spawners
function spawnExplosion(x, y, size=30, color='#ff6600') {
  const count = Math.floor(8 + size);
  for (let i=0; i<count; i++) {
    const ang = Math.random()*Math.PI*2, speed = 1+Math.random()*4;
    PARTICLE_POOL.create({
      x, y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed,
      life:0.4+Math.random()*0.6, size:2+Math.random()*size*0.4,
      color:i%3===0?'#ffffff':i%3===1?color:'#ffff00',
      glow:true, drag:0.92, blendMode:'lighter'
    });
  }
  // Shockwave ring
  PARTICLE_POOL.create({ x, y, vx:0, vy:0, life:0.5, size:size*0.5, color, type:'ring', glow:false });
  // Debris
  for (let i=0; i<5; i++) {
    const ang=Math.random()*Math.PI*2, speed=2+Math.random()*3;
    PARTICLE_POOL.create({ x, y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed-1,
      life:0.8+Math.random()*0.5, size:3+Math.random()*5, color:'#888', type:'square',
      gravity:0.05, drag:0.94, rotation:Math.random()*Math.PI, rotSpeed:(Math.random()-0.5)*5 });
  }
}

function spawnEngineTrail(x, y, color='#00f5ff', size=6) {
  PARTICLE_POOL.create({
    x: x+(Math.random()-0.5)*4, y: y+(Math.random()-0.5)*4,
    vx:(Math.random()-0.5)*0.5, vy:1+Math.random()*1.5,
    life:0.2+Math.random()*0.2, size, endSize:0, color,
    glow:true, drag:0.96, blendMode:'lighter', alpha:0.7
  });
}

function spawnShieldRipple(x, y, radius, color='#4488ff') {
  for (let r=0; r<3; r++) {
    setTimeout(() => {
      PARTICLE_POOL.create({ x, y, vx:0, vy:0, life:0.4+r*0.1, size:radius+r*10,
        color, type:'ring', glow:true, alpha:0.8 });
    }, r*80);
  }
}

function spawnHitSpark(x, y, color='#ffffff') {
  for (let i=0; i<6; i++) {
    const ang = Math.random()*Math.PI*2, speed=2+Math.random()*4;
    PARTICLE_POOL.create({ x, y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed,
      life:0.15+Math.random()*0.2, size:2+Math.random()*4, color, type:'spark',
      glow:true, drag:0.9, blendMode:'lighter' });
  }
}

function spawnStatusEffect(x, y, type) {
  const configs = {
    burning:     { color:'#ff6600', endColor:'#ff0000', count:5, life:0.6, size:5, vy:-1.5, glow:true },
    frozen:      { color:'#88ccff', count:6, life:0.5, size:4, vy:-0.5, type:'star', glow:false },
    shocked:     { color:'#ffff00', count:4, life:0.3, size:6, vy:-1, type:'spark', glow:true },
    slowed:      { color:'#aa44ff', count:3, life:0.8, size:5, vy:-0.3, glow:false },
    weakened:    { color:'#ff4444', count:4, life:0.6, size:4, vy:-0.8, glow:false },
    disoriented: { color:'#00ffaa', count:5, life:0.5, size:5, vy:-1, glow:true }
  };
  const cfg = configs[type] || configs.burning;
  for (let i=0; i<cfg.count; i++) {
    PARTICLE_POOL.create({
      x:x+(Math.random()-0.5)*20, y,
      vx:(Math.random()-0.5)*2, vy:cfg.vy+(Math.random()-0.5)*0.5,
      life:cfg.life, size:cfg.size, color:cfg.color,
      glow:cfg.glow||false, drag:0.96, type:cfg.type||'circle', alpha:0.8
    });
  }
}

function spawnLevelUpEffect(x, y) {
  for (let i=0; i<30; i++) {
    const ang = (i/30)*Math.PI*2;
    PARTICLE_POOL.create({
      x, y, vx:Math.cos(ang)*3+Math.random()-0.5, vy:Math.sin(ang)*3-2,
      life:1+Math.random()*0.5, size:4+Math.random()*6,
      color:['#ffd60a','#ff006e','#00f5ff','#39ff14'][i%4],
      glow:true, drag:0.94, blendMode:'lighter', alpha:0.9
    });
  }
  // Stars
  for (let i=0; i<10; i++) {
    PARTICLE_POOL.create({
      x:x+(Math.random()-0.5)*60, y:y+(Math.random()-0.5)*60,
      vx:(Math.random()-0.5)*0.5, vy:-2-Math.random()*2,
      life:1.5, size:6+Math.random()*8, color:'#ffd60a',
      glow:true, type:'star', drag:0.97, blendMode:'lighter'
    });
  }
}

function spawnCoinParticle(x, y) {
  PARTICLE_POOL.create({ x, y, vx:(Math.random()-0.5)*2, vy:-2-Math.random()*2,
    life:0.6, size:5, color:'#ffd60a', glow:true, drag:0.95, type:'circle' });
}

function spawnXPOrb(x, y) {
  PARTICLE_POOL.create({ x, y, vx:(Math.random()-0.5)*1.5, vy:-1.5-Math.random(),
    life:0.8, size:4, color:'#4488ff', glow:true, drag:0.96, type:'circle', blendMode:'lighter' });
}

function spawnCritEffect(x, y) {
  for (let i=0; i<8; i++) {
    const ang = Math.random()*Math.PI*2, speed=3+Math.random()*4;
    PARTICLE_POOL.create({ x, y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed,
      life:0.3, size:5+Math.random()*5, color:'#ff006e', glow:true, blendMode:'lighter', drag:0.9 });
  }
}

// Warp Jump Visual Sequence
const WARP_FX = { active:false, phase:0, timer:0, lines:[], callback:null };

function triggerWarpJump(onComplete) {
  WARP_FX.active = true; WARP_FX.phase = 0; WARP_FX.timer = 0;
  WARP_FX.lines = []; WARP_FX.callback = onComplete;
  const el = document.getElementById('warpOverlay');
  if (el) el.classList.add('active');
  // Generate warp lines
  const cw = window.innerWidth, ch = window.innerHeight;
  for (let i=0; i<80; i++) {
    const x = Math.random()*cw, y = Math.random()*ch;
    const len = 30+Math.random()*200;
    const l = document.createElement('div');
    l.className = 'warp-line';
    l.style.cssText = `left:${x}px;top:${y}px;width:${len}px;height:${1+Math.random()*2}px;
      opacity:${0.3+Math.random()*0.7};animation-delay:${Math.random()*0.3}s;
      transform:rotate(${Math.random()*360}deg);`;
    el.appendChild(l);
    WARP_FX.lines.push(l);
  }
  setTimeout(() => {
    const flash = document.getElementById('warpFlash');
    if (flash) { flash.style.display='block'; flash.style.opacity='1'; }
    setTimeout(() => {
      if (flash) { flash.style.opacity='0'; setTimeout(()=>flash.style.display='none',300); }
      if (el) { el.classList.remove('active'); el.innerHTML=''; }
      WARP_FX.active = false;
      if (WARP_FX.callback) WARP_FX.callback();
    }, 200);
  }, 700);
}

// Screen Shake system (improved)
const SCREEN_SHAKE = { magnitude:0, duration:0, x:0, y:0 };

function triggerScreenShake(magnitude=10, duration=0.3) {
  SCREEN_SHAKE.magnitude = Math.max(SCREEN_SHAKE.magnitude, magnitude);
  SCREEN_SHAKE.duration = Math.max(SCREEN_SHAKE.duration, duration);
}

function tickScreenShake(dt) {
  if (SCREEN_SHAKE.duration > 0) {
    SCREEN_SHAKE.duration -= dt;
    const intensity = SCREEN_SHAKE.magnitude * (SCREEN_SHAKE.duration / 0.3);
    SCREEN_SHAKE.x = (Math.random()-0.5)*intensity;
    SCREEN_SHAKE.y = (Math.random()-0.5)*intensity;
  } else {
    SCREEN_SHAKE.x = 0; SCREEN_SHAKE.y = 0;
  }
}

// Dynamic lighting (glow points on canvas)
const LIGHT_SOURCES = [];

function addLightSource(x, y, color, radius, duration) {
  LIGHT_SOURCES.push({ x, y, color, radius, duration, maxDuration:duration });
}

function tickLightSources(dt) {
  for (let i=LIGHT_SOURCES.length-1; i>=0; i--) {
    LIGHT_SOURCES[i].duration -= dt;
    if (LIGHT_SOURCES[i].duration <= 0) LIGHT_SOURCES.splice(i,1);
  }
}

function drawLightSources(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const ls of LIGHT_SOURCES) {
    const pct = ls.duration / ls.maxDuration;
    const grad = ctx.createRadialGradient(ls.x, ls.y, 0, ls.x, ls.y, ls.radius*pct);
    grad.addColorStop(0, ls.color+'44');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(ls.x, ls.y, ls.radius*pct, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// Audio Visualizer
const AUDIO_VIZ = { bars:8, data:new Array(8).fill(0), active:false };

function updateAudioViz() {
  const el = document.getElementById('audioViz');
  if (!el) return;
  const bars = el.querySelectorAll('.viz-bar');
  AUDIO_VIZ.data.forEach((v,i) => {
    AUDIO_VIZ.data[i] = Math.max(0, v - 0.05) + (State.running&&!State.gameOver ? Math.random()*0.3 : 0);
  });
  bars.forEach((b,i) => {
    const h = 5 + AUDIO_VIZ.data[i]*40;
    b.style.height = h+'px';
  });
}

function activateAudioViz() {
  const el = document.getElementById('audioViz');
  if (el) el.classList.add('active');
  AUDIO_VIZ.active = true;
}

function onSoundPlay(type) {
  const typeMap = { shot:0, hit:2, explosion:1, levelup:7, coin:4, laser:3, xp:6 };
  const barIdx = typeMap[type] || Math.floor(Math.random()*8);
  AUDIO_VIZ.data[barIdx] = Math.min(1, (AUDIO_VIZ.data[barIdx]||0) + 0.5);
}

function triggerExplosionAt(x, y, size=40) {
  spawnExplosion(x, y, size, '#ff6600');
  addLightSource(x, y, '#ff4400', size*3, 0.4);
  triggerScreenShake(size*0.5, 0.25);
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 8 — 50 ACHIEVEMENTS + 50 STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

const ACH_DATA = [
  // Kill-based
  { id:'first_blood',   name:'First Blood',         icon:'🩸', desc:'Get your first kill',                 reward:{coins:50},   category:'combat',    threshold:1 },
  { id:'ach_100kills',  name:'Centurion',            icon:'⚔️', desc:'Defeat 100 enemies',                  reward:{coins:200},  category:'combat',    threshold:100 },
  { id:'ach_500kills',  name:'Conqueror',            icon:'🏆', desc:'Defeat 500 enemies',                  reward:{coins:500},  category:'combat',    threshold:500 },
  { id:'ach_1000kills', name:'Destroyer of Worlds',  icon:'💀', desc:'Defeat 1000 enemies',                 reward:{coins:1000}, category:'combat',    threshold:1000 },
  { id:'ach_5bosses',   name:'Boss Slayer',           icon:'👹', desc:'Defeat 5 bosses',                    reward:{coins:300},  category:'combat',    threshold:5 },
  { id:'ach_allbosses', name:'Legendary Slayer',      icon:'🐲', desc:'Defeat all 12 bosses',               reward:{coins:1000}, category:'combat',    threshold:12 },
  // Level-based
  { id:'ach_level10',   name:'Rookie Pilot',          icon:'🎖️', desc:'Reach level 10',                    reward:{coins:100},  category:'rpg',       threshold:10 },
  { id:'ach_level25',   name:'Veteran Ace',           icon:'🥈', desc:'Reach level 25',                    reward:{coins:300},  category:'rpg',       threshold:25 },
  { id:'ach_level50',   name:'Elite Commander',       icon:'🥇', desc:'Reach level 50',                    reward:{coins:600},  category:'rpg',       threshold:50 },
  { id:'ach_maxlevel',  name:'Transcendent',          icon:'⭐', desc:'Reach the maximum level 100',        reward:{coins:2000}, category:'rpg',       threshold:100 },
  // Mission-based
  { id:'ach_5missions', name:'Freelancer',            icon:'📋', desc:'Complete 5 missions',                reward:{coins:150},  category:'missions',  threshold:5 },
  { id:'ach_20missions',name:'Merc for Hire',         icon:'🎯', desc:'Complete 20 missions',               reward:{coins:400},  category:'missions',  threshold:20 },
  { id:'ach_50missions',name:'Mission Specialist',    icon:'🏅', desc:'Complete 50 missions',               reward:{coins:800},  category:'missions',  threshold:50 },
  // Economy-based
  { id:'ach_rich',      name:'Space Merchant',        icon:'💰', desc:'Earn 10,000 coins total',            reward:{coins:500},  category:'economy',   threshold:10000 },
  { id:'ach_millionaire',name:'Space Millionaire',    icon:'🤑', desc:'Earn 100,000 coins total',           reward:{crystals:50},category:'economy',   threshold:100000 },
  { id:'ach_hoarder',   name:'Pack Rat',              icon:'🎒', desc:'Have 5 items in inventory',          reward:{coins:200},  category:'economy',   threshold:5 },
  { id:'ach_legendary', name:'Legendary Loot',        icon:'🌟', desc:'Acquire a legendary or mythic item', reward:{coins:1000}, category:'economy',   threshold:1 },
  // Combat techniques
  { id:'ach_firstcrit', name:'Critical Thinker',      icon:'💥', desc:'Land your first critical hit',       reward:{coins:100},  category:'combat',    threshold:1 },
  { id:'ach_100crits',  name:'Precision Striker',     icon:'🎯', desc:'Land 100 critical hits',             reward:{coins:300},  category:'combat',    threshold:100 },
  { id:'ach_dodge10',   name:'Ghost Step',            icon:'👻', desc:'Successfully dodge 10 attacks',      reward:{coins:150},  category:'combat',    threshold:10 },
  { id:'ach_parry5',    name:'Counter Master',         icon:'🥋', desc:'Perform 5 perfect parries',          reward:{coins:200},  category:'combat',    threshold:5 },
  { id:'ach_combomax',  name:'MEGA COMBO',            icon:'🌪️', desc:'Reach a 10-kill combo',             reward:{coins:300},  category:'combat',    threshold:10 },
  { id:'ach_nodam',     name:'Untouchable',           icon:'💎', desc:'Complete a wave without taking damage',reward:{coins:500},category:'combat',    threshold:1 },
  // Exploration
  { id:'ach_explore10', name:'Cartographer',          icon:'🗺️', desc:'Explore 10 sectors',                reward:{coins:200},  category:'explore',   threshold:10 },
  { id:'ach_exploreall',name:'Galaxy Mapper',         icon:'🌌', desc:'Explore all 36 sectors',             reward:{coins:1500}, category:'explore',   threshold:36 },
  { id:'ach_wormhole',  name:'Wormhole Surfer',       icon:'🌀', desc:'Use 5 wormholes',                    reward:{coins:150},  category:'explore',   threshold:5 },
  { id:'ach_crystals50',name:'Crystal Miner',         icon:'💎', desc:'Collect 50 crystals',               reward:{coins:300},  category:'explore',   threshold:50 },
  { id:'ach_weather',   name:'Storm Rider',           icon:'🌩️', desc:'Survive a space storm',             reward:{coins:200},  category:'explore',   threshold:1 },
  { id:'ach_lore10',    name:'Archivist',             icon:'📚', desc:'Discover 10 codex entries',          reward:{coins:300},  category:'explore',   threshold:10 },
  { id:'ach_loreall',   name:'Historian',             icon:'📖', desc:'Discover all codex entries',         reward:{coins:2000}, category:'explore',   threshold:50 },
  // Mode-specific
  { id:'ach_survival10',name:'Survivor',              icon:'🛡️', desc:'Survive 10 minutes in Survivor mode',reward:{coins:400},  category:'modes',     threshold:1 },
  { id:'ach_infinite50',name:'Endless Warrior',       icon:'♾️', desc:'Reach wave 50 in Infinite mode',    reward:{coins:600},  category:'modes',     threshold:50 },
  { id:'ach_speedrun',  name:'Speed Demon',           icon:'⚡', desc:'Complete campaign in under 15 min',  reward:{coins:800},  category:'modes',     threshold:1 },
  { id:'ach_nopower',   name:'True Skill',            icon:'🏋️', desc:'Beat a boss without using power-ups',reward:{coins:400},  category:'modes',     threshold:1 },
  { id:'ach_pacifist',  name:'Pacifist',              icon:'✌️', desc:'Complete Pacifist challenge',        reward:{crystals:20},category:'modes',     threshold:1 },
  { id:'ach_bossrush',  name:'Rush Hour',             icon:'⏩', desc:'Complete Boss Rush mode',             reward:{coins:700},  category:'modes',     threshold:1 },
  // Social/Multiplayer
  { id:'ach_coop5',     name:'Team Player',           icon:'🤝', desc:'Play 5 co-op sessions',              reward:{coins:200},  category:'social',    threshold:5 },
  { id:'ach_pvpwin',    name:'PvP Champion',          icon:'🏆', desc:'Win 3 PvP matches',                  reward:{coins:500},  category:'social',    threshold:3 },
  { id:'ach_bounty',    name:'Most Wanted',           icon:'🎯', desc:'Have a bounty placed on you',        reward:{coins:300},  category:'social',    threshold:1 },
  // Special/Secret
  { id:'ach_easter',    name:'Found It!',             icon:'🥚', desc:'Discover the hidden Easter egg',     reward:{coins:500},  category:'secret',    threshold:1 },
  { id:'ach_prestige',  name:'Prestige',              icon:'♻️', desc:'Reach prestige level 1',             reward:{crystals:100},category:'secret',   threshold:1 },
  { id:'ach_ally5',     name:'Admiral',               icon:'👥', desc:'Have 5 ally ships at once',          reward:{coins:400},  category:'special',   threshold:5 },
  { id:'ach_craft10',   name:'Master Craftsman',      icon:'🔨', desc:'Craft 10 equipment items',           reward:{coins:500},  category:'special',   threshold:10 },
  { id:'ach_epic_boss', name:'Epic Boss Slayer',      icon:'🦁', desc:'Defeat any Epic Boss',               reward:{coins:600},  category:'combat',    threshold:1 },
  { id:'ach_all_epic',  name:'Monster Hunter',        icon:'🐉', desc:'Defeat all 8 Epic Bosses',           reward:{crystals:100},category:'combat',   threshold:8 },
  { id:'ach_talent30',  name:'Talent Master',         icon:'🌳', desc:'Unlock 30 talents across any classes',reward:{coins:800}, category:'rpg',       threshold:30 },
  { id:'ach_class_all', name:'Jack of All Trades',    icon:'🎭', desc:'Reach level 10 with all 6 classes',  reward:{crystals:50},category:'rpg',       threshold:6 },
  { id:'ach_daily7',    name:'Daily Warrior',         icon:'📅', desc:'Complete 7 daily challenges',        reward:{coins:600},  category:'modes',     threshold:7 },
  { id:'ach_streak5',   name:'On Fire',               icon:'🔥', desc:'Get a 5-day login streak',           reward:{coins:300},  category:'special',   threshold:5 }
];

// 50+ Game Statistics
const GAME_STATS50 = {
  totalKills: 0, bossKills: 0, epicBossKills: 0, damageDealt: 0, damageTaken: 0,
  shotsFired: 0, shotsHit: 0, criticalHits: 0, dodgesSuccessful: 0, parriesPerformed: 0,
  coinsEarned: 0, coinsSpent: 0, crystalsCollected: 0, scrapCollected: 0,
  missionsCompleted: 0, missionsFailed: 0, itemsBought: 0, itemsSold: 0, itemsCollected: 0, itemsCrafted: 0,
  sectorsExplored: 0, wormholesUsed: 0, planetsVisited: 0, stationsVisited: 0,
  timePlayedSeconds: 0, gamesPlayed: 0, wavesSurvived: 0, highestCombo: 0,
  totalXPGained: 0, abilitiesUsed: 0, powerUpsCollected: 0, bombsUsed: 0,
  allyShipsDeployed: 0, turretsDeployed: 0, dronesLaunched: 0,
  longestSurvivalSeconds: 0, fastestBossKillSeconds: 0, highestDamageOneShot: 0,
  mostKillsOneWave: 0, mostCoinsOneGame: 0, bossPhasesSurvived: 0,
  coopSessionsPlayed: 0, pvpMatchesPlayed: 0, pvpMatchesWon: 0,
  prestigeTimes: 0, talentsUnlocked: 0, achievementsUnlocked: 0,
  codexEntriesFound: 0, questsCompleted: 0, factionRelations: { pirates:0, empire:0, rebels:0, traders:0 },
  weatherEventsEncountered: 0, blackHolesEscaped: 0, asteroidsMined: 0,
  loginStreak: 0, lastLoginDate: ''
};

function saveStats() {
  localStorage.setItem('game_stats50', JSON.stringify(GAME_STATS50));
}

function loadStats() {
  try {
    const raw = localStorage.getItem('game_stats50');
    if (raw) Object.assign(GAME_STATS50, JSON.parse(raw));
  } catch(e) {}
}

function checkStat(statKey, value) {
  // Check if any achievements depend on this stat
  ACH_DATA.forEach(ach => {
    if (RPG.achievements.has(ach.id)) return;
    if (GAME_STATS50[statKey] >= ach.threshold) {
      // Try to match stat name to ach category/requirements
      // (simplified: specific checks done elsewhere)
    }
  });
}

function openAchGallery() {
  const el = document.getElementById('achGallery');
  if (!el) return;
  const total = ACH_DATA.length;
  const unlocked = RPG.achievements.size;
  const byCategory = {};
  ACH_DATA.forEach(a => { if (!byCategory[a.category]) byCategory[a.category]=0; byCategory[a.category]++; });
  el.classList.add('active');
  el.innerHTML = `
    <button class="modal-close" onclick="document.getElementById('achGallery').classList.remove('active')" style="position:absolute;top:16px;right:16px;">✕</button>
    <h2>🏆 ACHIEVEMENT GALLERY</h2>
    <div class="ach-stats-row">
      <div class="ach-stat"><div class="ach-stat-val">${unlocked}</div><div class="ach-stat-lbl">Unlocked</div></div>
      <div class="ach-stat"><div class="ach-stat-val">${total}</div><div class="ach-stat-lbl">Total</div></div>
      <div class="ach-stat"><div class="ach-stat-val">${Math.round(unlocked/total*100)}%</div><div class="ach-stat-lbl">Complete</div></div>
      <div class="ach-stat"><div class="ach-stat-val">${GAME_STATS50.totalKills}</div><div class="ach-stat-lbl">Total Kills</div></div>
      <div class="ach-stat"><div class="ach-stat-val">${GAME_STATS50.timePlayedSeconds > 3600 ? (GAME_STATS50.timePlayedSeconds/3600).toFixed(1)+'h' : Math.floor(GAME_STATS50.timePlayedSeconds/60)+'m'}</div><div class="ach-stat-lbl">Time Played</div></div>
    </div>
    <div class="ach-progress-bar" style="max-width:600px;margin:12px auto;"><div class="ach-progress-fill" style="width:${unlocked/total*100}%;"></div></div>
    <div style="max-width:1000px;margin:0 auto;">
      ${Object.keys(byCategory).map(cat => `
        <div style="font-family:Orbitron,monospace;font-size:12px;color:rgba(255,255,255,0.4);margin:20px 0 10px;letter-spacing:2px;">${cat.toUpperCase()}</div>
        <div class="ach-gallery-grid">
          ${ACH_DATA.filter(a=>a.category===cat).map(a => {
            const isUnlocked = RPG.achievements.has(a.id);
            return `<div class="ach-gallery-card ${isUnlocked?'unlocked':'locked'}">
              <span class="ach-gallery-icon">${a.icon}</span>
              <div class="ach-gallery-name">${a.name}</div>
              <div class="ach-gallery-desc">${isUnlocked ? a.desc : '???'}</div>
              ${isUnlocked && a.reward ? `<div class="ach-gallery-reward">
                ${a.reward.coins?'💰 +'+a.reward.coins:''}
                ${a.reward.crystals?'💎 +'+a.reward.crystals:''}
              </div>` : ''}
            </div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>
    <div style="max-width:800px;margin:30px auto 0;padding:20px;background:rgba(255,255,255,0.03);border-radius:8px;">
      <h3 style="font-family:Orbitron,monospace;font-size:14px;color:#00f5ff;margin-bottom:16px;">📊 STATISTICS</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px;">
        ${Object.entries(GAME_STATS50).filter(([k,v])=>typeof v==='number').map(([k,v])=>`
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="color:rgba(255,255,255,0.5);">${k.replace(/([A-Z])/g,' $1').trim()}</span>
            <span style="color:#00f5ff;font-family:Orbitron,monospace;">${typeof v==='number'?v.toLocaleString():v}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function showAchievementPopup(ach) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position:fixed;bottom:80px;right:16px;z-index:9999;
    background:rgba(2,8,23,0.95);border:2px solid #ffd60a;border-radius:12px;
    padding:14px 20px;display:flex;align-items:center;gap:14px;
    font-family:Orbitron,monospace;animation:popup-float 4s ease forwards;
    box-shadow:0 0 20px rgba(255,214,10,0.3);max-width:320px;
  `;
  popup.innerHTML = `
    <span style="font-size:36px;">${ach.icon}</span>
    <div>
      <div style="font-size:9px;color:#ffd60a;letter-spacing:2px;margin-bottom:4px;">ACHIEVEMENT UNLOCKED</div>
      <div style="font-size:14px;color:#fff;margin-bottom:4px;">${ach.name}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.6);">${ach.desc}</div>
      ${ach.reward?.coins ? `<div style="font-size:11px;color:#ffd60a;margin-top:4px;">💰 +${ach.reward.coins}</div>` : ''}
    </div>
  `;
  document.body.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove());
  GAME_STATS50.achievementsUnlocked = RPG.achievements.size;
  saveStats();
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 9 — SHIP CUSTOMIZATION SYSTEM
// 10 hull types, loadout system, ship fleet, inspection view
// ═══════════════════════════════════════════════════════════════════════════

const SHIP_HULLS = [
  { id:'interceptor',  name:'Interceptor',  icon:'✈️',  stats:{ hp:80,  speed:1.3, handling:1.4, shield:60  }, desc:'Fast and agile. Low HP.' },
  { id:'destroyer',    name:'Destroyer',    icon:'⚡',  stats:{ hp:120, speed:1.0, handling:1.0, shield:100 }, desc:'Balanced combat ship.' },
  { id:'battleship',   name:'Battleship',   icon:'💪',  stats:{ hp:200, speed:0.7, handling:0.6, shield:150 }, desc:'Heavy firepower. Slow.' },
  { id:'stealth_ship', name:'Shadow',       icon:'🌑',  stats:{ hp:90,  speed:1.2, handling:1.3, shield:70  }, desc:'Stealth plating. Dodge bonus.' },
  { id:'carrier',      name:'Carrier',      icon:'🚀',  stats:{ hp:160, speed:0.8, handling:0.8, shield:120 }, desc:'Deploys ally drones.' },
  { id:'recon',        name:'Recon',        icon:'🔭',  stats:{ hp:70,  speed:1.5, handling:1.6, shield:50  }, desc:'Extreme speed and radar.' },
  { id:'berserker_ship',name:'Berserker',   icon:'🔥',  stats:{ hp:110, speed:1.1, handling:0.9, shield:80  }, desc:'+30% damage, -15% HP.' },
  { id:'guardian',     name:'Guardian',     icon:'🛡️',  stats:{ hp:180, speed:0.9, handling:0.9, shield:200 }, desc:'Massive shields. Defense.' },
  { id:'phantom_ship', name:'Phantom',      icon:'👻',  stats:{ hp:85,  speed:1.4, handling:1.5, shield:60  }, desc:'Phase shift ability.' },
  { id:'omega_ship',   name:'Omega Class',  icon:'⭐',  stats:{ hp:150, speed:1.1, handling:1.0, shield:130 }, desc:'Legendary. All-around best.' }
];

const SHIP_COLORS_CUSTOM = [
  { id:'cyan',    name:'Cyber Cyan',   primary:'#00f5ff', secondary:'#0088aa' },
  { id:'pink',    name:'Nova Pink',    primary:'#ff006e', secondary:'#aa0044' },
  { id:'gold',    name:'Imperial Gold',primary:'#ffd60a', secondary:'#aa8800' },
  { id:'green',   name:'Toxic Green',  primary:'#39ff14', secondary:'#009900' },
  { id:'purple',  name:'Void Purple',  primary:'#7b2fff', secondary:'#4400aa' },
  { id:'red',     name:'Blood Red',    primary:'#ff3333', secondary:'#880000' },
  { id:'white',   name:'Arctic White', primary:'#ffffff', secondary:'#aaaaaa' },
  { id:'orange',  name:'Fire Orange',  primary:'#ff6600', secondary:'#aa3300' }
];

const SHIP_CUSTOM_STATE = {
  selectedHull: 'destroyer',
  selectedColor: 'cyan',
  loadouts: [
    { name:'Loadout 1', hull:'destroyer', color:'cyan', equipped:{ weapon:null, armor:null, accessory:null, relic:null } },
    { name:'Loadout 2', hull:'interceptor', color:'pink', equipped:{ weapon:null, armor:null, accessory:null, relic:null } },
    { name:'Loadout 3', hull:'battleship', color:'gold', equipped:{ weapon:null, armor:null, accessory:null, relic:null } }
  ],
  activeLoadout: 0,
  fleet: [] // Owned ships
};

function openShipCustomPanel() {
  const el = document.getElementById('shipCustomPanel');
  if (!el) return;
  el.classList.add('active');
  renderShipCustomPanel();
}
function closeShipCustomPanel() {
  const el = document.getElementById('shipCustomPanel');
  if (el) el.classList.remove('active');
}

function renderShipCustomPanel() {
  const el = document.getElementById('shipCustomPanel');
  if (!el) return;
  const hull = SHIP_HULLS.find(h=>h.id===SHIP_CUSTOM_STATE.selectedHull) || SHIP_HULLS[0];
  const colorScheme = SHIP_COLORS_CUSTOM.find(c=>c.id===SHIP_CUSTOM_STATE.selectedColor) || SHIP_COLORS_CUSTOM[0];
  el.innerHTML = `
    <button class="modal-close" onclick="closeShipCustomPanel()" style="position:absolute;top:16px;right:16px;">✕</button>
    <h2>🚀 SHIP CUSTOMIZATION</h2>
    <div style="text-align:center;margin-bottom:20px;">
      <canvas id="shipCustomCanvas" width="300" height="200"></canvas>
    </div>
    <div style="max-width:900px;margin:0 auto;">
      <h3 style="font-family:Orbitron,monospace;font-size:13px;color:#7b2fff;margin-bottom:12px;">HULL TYPE</h3>
      <div class="hull-selector">
        ${SHIP_HULLS.map(h=>`
          <div class="hull-option ${SHIP_CUSTOM_STATE.selectedHull===h.id?'selected':''}" onclick="SHIP_CUSTOM_STATE.selectedHull='${h.id}';renderShipCustomPanel()">
            <span class="hull-icon">${h.icon}</span>
            <span class="hull-name">${h.name}</span>
          </div>
        `).join('')}
      </div>
      <div class="ship-loadout" style="margin-top:20px;">
        <div class="loadout-slot">
          <h4>HULL STATS</h4>
          ${Object.entries(hull.stats).map(([k,v])=>`
            <div style="display:flex;justify-content:space-between;margin:6px 0;font-size:12px;">
              <span style="color:rgba(255,255,255,0.6);">${k.toUpperCase()}</span>
              <span style="color:#00f5ff;font-family:Orbitron,monospace;">${v}</span>
            </div>
            <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-bottom:4px;">
              <div style="height:100%;width:${Math.min(100,v/2*100)}%;background:#7b2fff;border-radius:2px;"></div>
            </div>
          `).join('')}
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px;">${hull.desc}</div>
        </div>
        <div class="loadout-slot">
          <h4>COLOR SCHEME</h4>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">
            ${SHIP_COLORS_CUSTOM.map(c=>`
              <div onclick="SHIP_CUSTOM_STATE.selectedColor='${c.id}';renderShipCustomPanel()"
                style="height:36px;border-radius:6px;background:linear-gradient(135deg,${c.primary},${c.secondary});
                cursor:pointer;border:${SHIP_CUSTOM_STATE.selectedColor===c.id?'2px solid #fff':'2px solid transparent'};
                display:flex;align-items:center;justify-content:center;">
                ${SHIP_CUSTOM_STATE.selectedColor===c.id?'✓':''}
              </div>
            `).join('')}
          </div>
          <h4 style="margin-top:12px;">LOADOUT SLOTS</h4>
          ${SHIP_CUSTOM_STATE.loadouts.map((ld,i)=>`
            <div class="loadout-slot-item" style="margin-bottom:8px;border-color:${SHIP_CUSTOM_STATE.activeLoadout===i?'rgba(123,47,255,0.8)':'transparent'}"
              onclick="SHIP_CUSTOM_STATE.activeLoadout=${i};renderShipCustomPanel()">
              <div style="font-family:Orbitron,monospace;font-size:11px;color:${SHIP_CUSTOM_STATE.activeLoadout===i?'#7b2fff':'rgba(255,255,255,0.7)'};">${ld.name}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.4);">Hull: ${ld.hull} • Color: ${ld.color}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="menu-btn" onclick="applyShipCustomization()" style="padding:10px 24px;">APPLY CUSTOMIZATION</button>
        <button class="menu-btn" onclick="saveLoadout()" style="padding:10px 24px;background:rgba(123,47,255,0.3);">SAVE LOADOUT</button>
      </div>
    </div>
  `;
  // Draw ship preview
  setTimeout(() => {
    const previewCanvas = document.getElementById('shipCustomCanvas');
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0,0,300,200);
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,300,200);
    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i=0;i<300;i+=20) { ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,200);ctx.stroke(); }
    for (let i=0;i<200;i+=20) { ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(300,i);ctx.stroke(); }
    // Draw ship
    drawCustomShip(ctx, 150, 120, hull, colorScheme);
    // Engine glow
    const grad = ctx.createRadialGradient(150,160,0,150,160,30);
    grad.addColorStop(0, colorScheme.primary + '66');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(150,160,30,0,Math.PI*2); ctx.fill();
  }, 50);
}

function drawCustomShip(ctx, x, y, hull, colorScheme) {
  ctx.save(); ctx.translate(x, y);
  const p = colorScheme.primary, s = colorScheme.secondary;
  switch(hull.id) {
    case 'interceptor': {
      ctx.fillStyle = s;
      ctx.beginPath(); ctx.moveTo(0,-40); ctx.lineTo(18,20); ctx.lineTo(0,10); ctx.lineTo(-18,20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p; ctx.beginPath(); ctx.moveTo(0,-40); ctx.lineTo(8,0); ctx.lineTo(0,10); ctx.lineTo(-8,0); ctx.closePath(); ctx.fill();
      break;
    }
    case 'battleship': {
      ctx.fillStyle = s; ctx.fillRect(-30,-35,60,60);
      ctx.fillStyle = p; ctx.fillRect(-20,-40,40,20);
      // Guns
      ctx.fillStyle = '#333'; ctx.fillRect(-35,-15,10,40); ctx.fillRect(25,-15,10,40);
      break;
    }
    case 'carrier': {
      ctx.fillStyle = s; ctx.beginPath(); ctx.ellipse(0,0,35,20,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = p; ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(12,0); ctx.lineTo(-12,0); ctx.closePath(); ctx.fill();
      // Drone bays
      for (let i=-2;i<=2;i+=2) { ctx.fillStyle='rgba(0,245,255,0.5)'; ctx.fillRect(i*8-5,8,10,12); }
      break;
    }
    default: { // Standard destroyer
      ctx.fillStyle = s;
      ctx.beginPath(); ctx.moveTo(0,-38); ctx.lineTo(22,15); ctx.lineTo(12,30); ctx.lineTo(-12,30); ctx.lineTo(-22,15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p;
      ctx.beginPath(); ctx.moveTo(0,-38); ctx.lineTo(10,5); ctx.lineTo(0,15); ctx.lineTo(-10,5); ctx.closePath(); ctx.fill();
    }
  }
  // Cockpit glow
  ctx.fillStyle = 'rgba(200,240,255,0.7)';
  ctx.beginPath(); ctx.ellipse(0,-15,7,10,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function applyShipCustomization() {
  const ld = SHIP_CUSTOM_STATE.loadouts[SHIP_CUSTOM_STATE.activeLoadout];
  ld.hull = SHIP_CUSTOM_STATE.selectedHull;
  ld.color = SHIP_CUSTOM_STATE.selectedColor;
  const hull = SHIP_HULLS.find(h=>h.id===SHIP_CUSTOM_STATE.selectedHull);
  if (hull && State.players && State.players[0]) {
    const p = State.players[0];
    if (p.maxHp) p.maxHp = Math.max(p.maxHp, hull.stats.hp);
  }
  showToast('Ship customization applied!', '#7b2fff');
  RPG.saveProgress();
}

function saveLoadout() {
  const ld = SHIP_CUSTOM_STATE.loadouts[SHIP_CUSTOM_STATE.activeLoadout];
  ld.hull = SHIP_CUSTOM_STATE.selectedHull;
  ld.color = SHIP_CUSTOM_STATE.selectedColor;
  ld.equipped = { ...RPG.equipped };
  showToast('Loadout saved!', '#39ff14');
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 10 — NAVIGATION SYSTEM
// Fog of War, A* pathfinding, Hyperspace lanes, Enhanced galaxy map
// ═══════════════════════════════════════════════════════════════════════════

const NAV_SYSTEM = {
  fogOfWar: new Array(36).fill(true), // true = hidden
  revealedSectors: new Set(),
  currentRoute: [],
  routeTarget: -1,
  hyperspaceLanes: [],
  dangerMap: new Array(36).fill(0), // 0-10 danger level
  routeCalcTimer: 0,
  lastPosition: { sector: 0 }
};

function initNavSystem() {
  // Generate hyperspace lanes (connections between sectors)
  NAV_SYSTEM.hyperspaceLanes = [];
  for (let i=0; i<36; i++) {
    const row = Math.floor(i/6), col = i%6;
    // Connect to right neighbor
    if (col < 5) NAV_SYSTEM.hyperspaceLanes.push({ from:i, to:i+1, distance:1 });
    // Connect to bottom neighbor
    if (row < 5) NAV_SYSTEM.hyperspaceLanes.push({ from:i, to:i+6, distance:1 });
    // Diagonal connections (some)
    if (col<5 && row<5 && Math.random()<0.3) {
      NAV_SYSTEM.hyperspaceLanes.push({ from:i, to:i+7, distance:1.5 });
    }
  }
  // Set random danger levels
  for (let i=0; i<36; i++) {
    NAV_SYSTEM.dangerMap[i] = Math.floor(Math.random()*10);
  }
  // Reveal starting sector
  NAV_SYSTEM.fogOfWar[0] = false;
  NAV_SYSTEM.revealedSectors.add(0);
}

function revealSector(sectorIndex) {
  if (sectorIndex < 0 || sectorIndex >= 36) return;
  if (!NAV_SYSTEM.revealedSectors.has(sectorIndex)) {
    NAV_SYSTEM.revealedSectors.add(sectorIndex);
    NAV_SYSTEM.fogOfWar[sectorIndex] = false;
    GAME_STATS50.sectorsExplored = NAV_SYSTEM.revealedSectors.size;
    // Reveal adjacent sectors partially
    const row = Math.floor(sectorIndex/6), col = sectorIndex%6;
    const adjacent = [];
    if (col > 0) adjacent.push(sectorIndex-1);
    if (col < 5) adjacent.push(sectorIndex+1);
    if (row > 0) adjacent.push(sectorIndex-6);
    if (row < 5) adjacent.push(sectorIndex+6);
    adjacent.forEach(adj => {
      NAV_SYSTEM.fogOfWar[adj] = false; // Partially reveal
    });
    checkExploreAchievements();
  }
}

function checkExploreAchievements() {
  const cnt = NAV_SYSTEM.revealedSectors.size;
  if (cnt >= 10) RPG.unlockAchievement('ach_explore10');
  if (cnt >= 36) RPG.unlockAchievement('ach_exploreall');
}

// A* Pathfinding on sector grid
function findRoute(fromSector, toSector) {
  if (fromSector === toSector) return [fromSector];
  // Build adjacency from hyperspace lanes
  const adj = {};
  for (let i=0; i<36; i++) adj[i] = [];
  NAV_SYSTEM.hyperspaceLanes.forEach(lane => {
    adj[lane.from].push({ to:lane.to, cost:lane.distance + NAV_SYSTEM.dangerMap[lane.to]*0.5 });
    adj[lane.to].push({ to:lane.from, cost:lane.distance + NAV_SYSTEM.dangerMap[lane.from]*0.5 });
  });
  // A* heuristic: Manhattan distance
  const heuristic = (a, b) => {
    const ar = Math.floor(a/6), ac = a%6;
    const br = Math.floor(b/6), bc = b%6;
    return Math.abs(ar-br) + Math.abs(ac-bc);
  };
  const openSet = [{ id:fromSector, g:0, f:heuristic(fromSector,toSector) }];
  const cameFrom = {};
  const gScore = { [fromSector]:0 };
  while (openSet.length > 0) {
    openSet.sort((a,b)=>a.f-b.f);
    const current = openSet.shift();
    if (current.id === toSector) {
      const path = [];
      let cur = toSector;
      while (cur !== undefined) { path.unshift(cur); cur = cameFrom[cur]; }
      return path;
    }
    (adj[current.id]||[]).forEach(neighbor => {
      const tentativeG = (gScore[current.id]||0) + neighbor.cost;
      if (tentativeG < (gScore[neighbor.to]||Infinity)) {
        cameFrom[neighbor.to] = current.id;
        gScore[neighbor.to] = tentativeG;
        openSet.push({ id:neighbor.to, g:tentativeG, f:tentativeG+heuristic(neighbor.to,toSector) });
      }
    });
  }
  return []; // No path found
}

function planRoute(toSector) {
  const currentSector = State.currentSector || 0;
  const route = findRoute(currentSector, toSector);
  NAV_SYSTEM.currentRoute = route;
  NAV_SYSTEM.routeTarget = toSector;
  const el = document.getElementById('routeDisplay');
  if (el) el.textContent = route.length > 1 ? `Route: ${route.map(s=>'S-'+s).join(' → ')}` : 'Already here!';
  renderEnhancedGalaxyMap();
}

function openNavPanel() {
  const el = document.getElementById('navPanel');
  if (el) { el.classList.add('active'); renderEnhancedGalaxyMap(); }
}
function closeNavPanel() {
  const el = document.getElementById('navPanel');
  if (el) el.classList.remove('active');
}

function renderEnhancedGalaxyMap() {
  const el = document.getElementById('navPanel');
  if (!el) return;
  const currentSector = State.currentSector || 0;
  el.innerHTML = `
    <button class="modal-close" onclick="closeNavPanel()" style="position:absolute;top:16px;right:16px;">✕</button>
    <h2>🌌 GALAXY NAVIGATION</h2>
    <canvas id="enhancedGalaxyMap" width="700" height="460"></canvas>
    <div class="map-legend">
      <div class="map-legend-item"><div class="map-legend-dot" style="background:#00f5ff"></div>Current Position</div>
      <div class="map-legend-item"><div class="map-legend-dot" style="background:#39ff14"></div>Explored</div>
      <div class="map-legend-item"><div class="map-legend-dot" style="background:#ffd60a"></div>Route</div>
      <div class="map-legend-item"><div class="map-legend-dot" style="background:#ff4444"></div>High Danger</div>
      <div class="map-legend-item"><div class="map-legend-dot" style="background:#333344"></div>Unknown</div>
    </div>
    <div class="route-display" id="routeDisplay">Select a sector to plan route</div>
    <div style="text-align:center;margin-top:12px;font-size:11px;color:rgba(255,255,255,0.4);">
      Explored: ${NAV_SYSTEM.revealedSectors.size}/36 sectors
    </div>
  `;
  setTimeout(() => {
    const canvas = document.getElementById('enhancedGalaxyMap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cols=6, rows=6, cw=700, ch=460;
    const cellW = (cw-40)/cols, cellH = (ch-40)/rows;
    ctx.fillStyle = '#010812'; ctx.fillRect(0,0,cw,ch);
    // Background stars
    for (let i=0;i<100;i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.1+Math.random()*0.3})`;
      ctx.beginPath(); ctx.arc(Math.random()*cw, Math.random()*ch, Math.random()*1.5, 0, Math.PI*2); ctx.fill();
    }
    // Hyperspace lanes
    ctx.save();
    NAV_SYSTEM.hyperspaceLanes.forEach(lane => {
      if (NAV_SYSTEM.fogOfWar[lane.from] && NAV_SYSTEM.fogOfWar[lane.to]) return;
      const fr = Math.floor(lane.from/6), fc = lane.from%6;
      const tr = Math.floor(lane.to/6), tc = lane.to%6;
      const fx = 20+fc*cellW+cellW/2, fy = 20+fr*cellH+cellH/2;
      const tx2 = 20+tc*cellW+cellW/2, ty2 = 20+tr*cellH+cellH/2;
      const isRoute = NAV_SYSTEM.currentRoute.includes(lane.from) && NAV_SYSTEM.currentRoute.includes(lane.to);
      ctx.strokeStyle = isRoute ? '#ffd60a44' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = isRoute ? 3 : 1;
      ctx.setLineDash(isRoute ? [] : [4,4]);
      ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(tx2,ty2); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
    // Sectors
    for (let i=0; i<36; i++) {
      const row=Math.floor(i/6), col=i%6;
      const cx=20+col*cellW+cellW/2, cy2=20+row*cellH+cellH/2;
      const revealed = !NAV_SYSTEM.fogOfWar[i];
      const isCurrent = i===currentSector;
      const isRoute = NAV_SYSTEM.currentRoute.includes(i);
      const danger = NAV_SYSTEM.dangerMap[i];
      const isTarget = i === NAV_SYSTEM.routeTarget;
      if (!revealed) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(cx-cellW*0.45, cy2-cellH*0.45, cellW*0.9, cellH*0.9);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath(); ctx.arc(cx,cy2,18,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.font='14px monospace'; ctx.textAlign='center';
        ctx.fillText('?',cx,cy2+5);
        continue;
      }
      // Sector background
      const dangerColor = danger > 7 ? '#ff3333' : danger > 4 ? '#ff8800' : '#225533';
      ctx.fillStyle = isCurrent ? 'rgba(0,245,255,0.15)' : isRoute ? 'rgba(255,214,10,0.1)' : `rgba(${danger*20},${100-danger*8},${50},0.15)`;
      ctx.fillRect(cx-cellW*0.45, cy2-cellH*0.45, cellW*0.9, cellH*0.9);
      // Border
      ctx.strokeStyle = isCurrent ? '#00f5ff' : isTarget ? '#ff006e' : isRoute ? '#ffd60a' : dangerColor;
      ctx.lineWidth = isCurrent ? 2 : isRoute ? 2 : 1;
      ctx.strokeRect(cx-cellW*0.45, cy2-cellH*0.45, cellW*0.9, cellH*0.9);
      // Glow for current
      if (isCurrent) {
        ctx.shadowColor='#00f5ff'; ctx.shadowBlur=15;
        ctx.beginPath(); ctx.arc(cx,cy2,14,0,Math.PI*2); ctx.fillStyle='rgba(0,245,255,0.3)'; ctx.fill();
        ctx.shadowBlur=0;
      }
      // Sector icon and number
      ctx.fillStyle = isCurrent ? '#00f5ff' : isRoute ? '#ffd60a' : 'rgba(255,255,255,0.7)';
      ctx.font = isCurrent ? 'bold 11px Orbitron,monospace' : '10px Orbitron,monospace';
      ctx.textAlign='center';
      ctx.fillText('S-'+i, cx, cy2+4);
      // Danger indicator
      if (danger > 5) {
        ctx.fillStyle = '#ff4444'; ctx.font='9px monospace';
        ctx.fillText('⚠️', cx, cy2-14);
      }
    }
    ctx.textAlign='left';
    // Click handler
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;
      for (let i=0; i<36; i++) {
        if (NAV_SYSTEM.fogOfWar[i]) continue;
        const row=Math.floor(i/6), col=i%6;
        const cx3=20+col*cellW+cellW/2, cy3=20+row*cellH+cellH/2;
        if (Math.abs(mx-cx3)<cellW/2 && Math.abs(my-cy3)<cellH/2) {
          planRoute(i); return;
        }
      }
    };
  }, 50);
}

// Minimap enhancement
function drawEnhancedMinimap(ctx, x, y, w, h, player) {
  if (!player || !State.running) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = 'rgba(0,245,255,0.4)'; ctx.strokeRect(x,y,w,h);
  const cw = CANVAS ? CANVAS.width : 800, ch = CANVAS ? CANVAS.height : 600;
  // Player dot
  ctx.fillStyle = '#00f5ff';
  ctx.beginPath(); ctx.arc(x+w/2, y+h/2, 3, 0, Math.PI*2); ctx.fill();
  // Enemy dots (relative to player)
  (State.enemies||[]).forEach(e => {
    if (!e || e.isBullet) return;
    const ex = x + w/2 + (e.x-player.x) * w/cw * 2;
    const ey = y + h/2 + (e.y-player.y) * h/ch * 2;
    if (ex>x && ex<x+w && ey>y && ey<y+h) {
      ctx.fillStyle = '#ff4444';
      ctx.beginPath(); ctx.arc(ex,ey,2,0,Math.PI*2); ctx.fill();
    }
  });
  ctx.restore();
}


