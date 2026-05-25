// ═══════════════════════════════════════════════════════════════════
// SECTION 1 – CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const CANVAS = document.getElementById('gameCanvas');
const CTX    = CANVAS.getContext('2d', { willReadFrequently:false, alpha:true });
const BGCANVAS = document.getElementById('bgCanvas');
const BGCTX    = BGCANVAS.getContext('2d', { willReadFrequently:false, alpha:true });

// ─── Phase 2.1: DPR-aware backing store (Retina-crisp) ───
// CANVAS.width / CANVAS.height keep returning CSS pixels (compat with all
// gameplay code), while the underlying backing store is sized for devicePixelRatio
// and the 2D context is pre-scaled. No gameplay reference needs to change.
(function setupDPI(){
  const _wSet = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width').set;
  const _hSet = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'height').set;
  const dpr   = Math.min(window.devicePixelRatio || 1, 2);   // cap at 2 for perf
  function attach(c, ctx){
    let cssW = window.innerWidth, cssH = window.innerHeight;
    c.style.width  = cssW + 'px';
    c.style.height = cssH + 'px';
    _wSet.call(c, Math.floor(cssW*dpr));
    _hSet.call(c, Math.floor(cssH*dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Object.defineProperty(c, 'width', {
      configurable:true,
      get(){ return cssW; },
      set(v){ cssW = v; c.style.width = v+'px';
        _wSet.call(c, Math.floor(v*dpr)); ctx.setTransform(dpr,0,0,dpr,0,0); }
    });
    Object.defineProperty(c, 'height', {
      configurable:true,
      get(){ return cssH; },
      set(v){ cssH = v; c.style.height = v+'px';
        _hSet.call(c, Math.floor(v*dpr)); ctx.setTransform(dpr,0,0,dpr,0,0); }
    });
    c._dpr = dpr;
  }
  try { attach(CANVAS, CTX); attach(BGCANVAS, BGCTX); }
  catch(e){ console.warn('DPR attach failed, falling back to 1x', e); }
})();

// ─ Web Audio API – Synthesized Sounds ─
let _audioCtx = null;
let masterVolume = 0.5;
let soundEnabled = true;

function getACtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function _g(ctx, vol) {
  const g = ctx.createGain();
  g.gain.value = Math.max(0.001, vol * masterVolume);
  g.connect(ctx.destination);
  return g;
}

function playSound(name) {
  if (!soundEnabled) return;
  try {
    const ctx = getACtx();
    switch (name) {
      case 'shootSound': {
        const o = ctx.createOscillator(), g = _g(ctx, 0.12);
        o.type = 'square';
        o.frequency.setValueAtTime(900, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.07);
        g.gain.setValueAtTime(0.12 * masterVolume, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        o.connect(g); o.start(); o.stop(ctx.currentTime + 0.07);
        break;
      }
      case 'explosionSound': {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.45, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(500, ctx.currentTime);
        f.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.45);
        const g = _g(ctx, 0.35);
        g.gain.setValueAtTime(0.35 * masterVolume, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        src.connect(f); f.connect(g);
        src.start(); src.stop(ctx.currentTime + 0.45);
        break;
      }
      case 'powerupSound':
      case 'abilitySound': {
        [523, 659, 784, 1047].forEach((freq, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = freq;
          const t = ctx.currentTime + i * 0.08;
          g.gain.setValueAtTime(0.14 * masterVolume, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          o.connect(g); o.start(t); o.stop(t + 0.1);
        });
        break;
      }
      case 'levelUpSound': {
        [392, 523, 659, 784, 1047, 1319].forEach((freq, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = freq;
          const t = ctx.currentTime + i * 0.1;
          g.gain.setValueAtTime(0.22 * masterVolume, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          o.connect(g); o.start(t); o.stop(t + 0.15);
        });
        break;
      }
      case 'laserSound': {
        const o = ctx.createOscillator(), g = _g(ctx, 0.18);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(1400, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.18);
        g.gain.setValueAtTime(0.18 * masterVolume, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        o.connect(g); o.start(); o.stop(ctx.currentTime + 0.18);
        break;
      }
      case 'xpSound': {
        const o = ctx.createOscillator(), g = _g(ctx, 0.08);
        o.type = 'sine'; o.frequency.value = 1400;
        g.gain.setValueAtTime(0.08 * masterVolume, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        o.connect(g); o.start(); o.stop(ctx.currentTime + 0.06);
        break;
      }
    }
  } catch(e) {}
}

// ─ Difficulty ─
const DIFFICULTY_CFG = {
  easy:    { label:'EASY',    multiplier:0.7, desc:'Easier enemies, fewer coins.' },
  normal:  { label:'NORMAL',  multiplier:1.0, desc:'Standard experience.' },
  hard:    { label:'HARD',    multiplier:1.5, desc:'Stronger & faster enemies.' },
  extreme: { label:'EXTREME', multiplier:2.0, desc:'Max difficulty, max reward.' },
};

// ─ Characters ─
const CHARACTER_CFG = {
  marcelo:  { label:'MARCELO — AI MASTER',   ability:'Ally Robots — Summons 2 helper bots', speed:8,  shootCooldown:200, dmgMult:1,   price:0    },
  robos:    { label:'ROBOS — TECH SQUAD',    ability:'Triple Formation — 3-way shot',        speed:8,  shootCooldown:200, dmgMult:1,   price:300  },
  felipe:   { label:'FELIPE — THE SWIFT',    ability:'Turbo — 50% faster + rapid shots',    speed:12, shootCooldown:150, dmgMult:1,   price:400  },
  takeshi:  { label:'TAKESHI — NINJA',       ability:'Triple Shuriken — 3 projectile fan',  speed:8,  shootCooldown:300, dmgMult:1.5, price:600  },
  deepseek: { label:'DEEPSEEK — THE BEAM',   ability:'Laser Ray — Piercing laser beam',      speed:8,  shootCooldown:500, dmgMult:2,   price:800  },
  omega:    { label:'OMEGA — CHAINGUN',      ability:'Missile Barrage — 8 mísseis em leque', speed:7,  shootCooldown:110, dmgMult:0.8, price:500  },
  phantom:  { label:'PHANTOM — GHOST',       ability:'Blink — Teleporte + 2s invencível',   speed:11, shootCooldown:240, dmgMult:1.2, price:700  },
  titan:    { label:'TITAN — COLOSSUS',      ability:'Armor Mode — 3s escudo + knockback',  speed:5,  shootCooldown:380, dmgMult:2.8, price:1000 },
};
const CHARACTER_IDS = Object.keys(CHARACTER_CFG);

// ─ Skins ─
const SKINS_DATA = [
  { id:'default',      name:'Default',     price:0,    color:'#b0c4de', desc:'Your starting ship.' },
  { id:'golden',       name:'Golden',      price:500,  color:'#ffd700', desc:'Premium gold plating.' },
  { id:'redfire',      name:'Fireship',    price:300,  color:'#ff4500', desc:'Burns your enemies.' },
  { id:'blueice',      name:'Ice Ship',    price:300,  color:'#00bfff', desc:'Freezes your enemies.' },
  { id:'greenvenom',   name:'Venom',       price:400,  color:'#39ff14', desc:'Poison coating.' },
  { id:'purpleshadow', name:'Shadow',      price:600,  color:'#9400d3', desc:'Strikes from shadows.' },
  { id:'neonpink',     name:'Neon',        price:500,  color:'#ff00ff', desc:'Explosão neon pura.' },
  { id:'plasma',       name:'Plasma',      price:700,  color:'#4fc3f7', desc:'Energia de plasma.' },
  { id:'lava',         name:'Lava',        price:800,  color:'#ff3d00', desc:'Núcleo derretido.' },
  { id:'void',         name:'Void',        price:1000, color:'#8800ff', desc:'Vem do vazio.' },
  { id:'crystal',      name:'Crystal',     price:900,  color:'#e0f7fa', desc:'Pureza cristalina.' },
  { id:'rainbow',      name:'Rainbow ✨',  price:1200, color:'animated',desc:'Muda de cor! Raridade.' },
];

// ─ Achievements ─
const ACHIEVEMENTS_DATA = [
  { id:'first_blood',     name:'FIRST BLOOD',        desc:'Destroy first enemy',              reward:50,   icon:'💀', progress:(s)=>({cur:s.enemiesKilled,       max:1   }) },
  { id:'boss_slayer',     name:'BOSS SLAYER',         desc:'Defeat a boss',                    reward:100,  icon:'👑', progress:(s)=>({cur:s.bossesDefeated,     max:1   }) },
  { id:'coin_collector',  name:'COIN COLLECTOR',      desc:'Collect 1000 coins',               reward:200,  icon:'💰', progress:(s)=>({cur:s.totalCoinsEarned,   max:1000}) },
  { id:'survivor',        name:'SURVIVOR',            desc:'Survive 5 minutes',                reward:150,  icon:'⏱️', progress:(s)=>({cur:s.longestSurvival,   max:300 }) },
  { id:'perfectionist',   name:'PERFECTIONIST',       desc:'Complete phase without damage',    reward:250,  icon:'✨', progress:(s)=>({cur:s.perfectLevels,     max:1   }) },
  { id:'ultimate_champ',  name:'ULTIMATE CHAMPION',   desc:'Beat final boss on Extreme',       reward:1000, icon:'🏆', progress:(s)=>({cur:s.finalBossOnExtreme,max:1   }) },
  { id:'power_consumer',  name:'POWER CONSUMER',      desc:'Collect 50 power-ups',             reward:200,  icon:'⚡', progress:(s)=>({cur:s.powerupsCollected, max:50  }) },
  { id:'combo_master',    name:'COMBO MASTER',        desc:'10 enemies in 5 seconds',          reward:300,  icon:'🔥', progress:(s)=>({cur:s.maxCombo,          max:10  }) },
  { id:'infinite_warrior',name:'INFINITE WARRIOR',    desc:'Reach wave 10 in Infinite',        reward:500,  icon:'∞',  progress:(s)=>({cur:s.maxInfiniteWave,   max:10  }) },
  { id:'char_master',     name:'CHAR MASTER',         desc:'Play all 8 characters',            reward:600,  icon:'👥', progress:(s)=>({cur:s.charactersPlayed,  max:8   }) },
  { id:'survivor_expert', name:'SURVIVOR EXPERT',     desc:'Survive 10 minutes',               reward:400,  icon:'⏳', progress:(s)=>({cur:s.maxSurvivorTime,   max:600 }) },
  { id:'upgrade_king',    name:'UPGRADE KING',        desc:'Max all survivor abilities',       reward:500,  icon:'👑', progress:(s)=>({cur:s.maxUpgradeLevel,   max:15  }) },
  { id:'mp_master',       name:'MULTIPLAYER MASTER',  desc:'Win a 2-player match',             reward:350,  icon:'🤝', progress:(s)=>({cur:s.multiplayerWins,   max:1   }) },
  { id:'phase_master',    name:'PHASE MASTER',        desc:'Complete phase 8 on Normal+',      reward:750,  icon:'🗺️', progress:(s)=>({cur:s.maxPhase,          max:8   }) },
  { id:'new_char',        name:'NOVO COMEÇO',         desc:'Jogue com Omega, Phantom ou Titan',reward:150,  icon:'🚀', progress:(s)=>({cur:s.newCharPlayed?1:0, max:1   }) },
  { id:'skill_tree_1',    name:'APRENDIZ',            desc:'Desbloqueie 3 skills na Skill Tree',reward:200, icon:'🌱', progress:(s)=>({cur:s.skillsUnlocked||0, max:3   }) },
  { id:'skill_tree_max',  name:'MESTRE DAS SKILLS',   desc:'Desbloqueie 10 skills',            reward:1000, icon:'🌳', progress:(s)=>({cur:s.skillsUnlocked||0, max:10  }) },
  { id:'boss_rush_done',  name:'BOSS RUSHER',         desc:'Complete o Boss Rush',             reward:2000, icon:'⚔️', progress:(s)=>({cur:s.bossRushDone?1:0, max:1   }) },
  { id:'rainbow_skin',    name:'ARCO-ÍRIS',           desc:'Vista a skin Rainbow em batalha',  reward:300,  icon:'🌈', progress:(s)=>({cur:s.rainbowUsed?1:0,  max:1   }) },
  { id:'bomber_killed',   name:'DEMOLIDOR',           desc:'Mate 10 Bombers',                  reward:250,  icon:'💣', progress:(s)=>({cur:s.bombersKilled||0, max:10  }) },
  { id:'phase_12',        name:'ALÉM DO FINAL',       desc:'Chegue na fase 12',                reward:1500, icon:'🌌', progress:(s)=>({cur:s.maxPhase,          max:12  }) },
  { id:'double_kill',     name:'DOUBLE POWER',        desc:'Colete 20 Double Damage',          reward:400,  icon:'💥', progress:(s)=>({cur:s.ddCollected||0,    max:20  }) },
];

// ─ Bosses ─
const BOSSES_DATA = [
  { name:'THE GUARDIAN',       subtitle:'PHASE 1 — STAR WATCHER',          health:50,  pattern:'triple',      movement:'horizontal',    reward:50,  draw:drawBossGuardian },
  { name:'DOUBLE CANNON',      subtitle:'PHASE 2 — MASTER OF BURSTS',       health:80,  pattern:'fan',         movement:'sinusoidal',    reward:100, draw:drawBossCannon },
  { name:'THE VORTEX',         subtitle:'PHASE 3 — DIMENSIONAL DEVOUR',     health:120, pattern:'circle',      movement:'teleport',      reward:150, draw:drawBossVortex },
  { name:'ARMORED TANK',       subtitle:'PHASE 4 — LIVING FORTRESS',        health:200, pattern:'burst',       movement:'armored',       reward:250, draw:drawBossTank },
  { name:'WORLD DEVOURER',     subtitle:'PHASE 5 — THE END OF ALL',         health:300, pattern:'spiral',      movement:'chaotic',       reward:500, draw:drawBossWorld },
  { name:'THE INFERNO',        subtitle:'PHASE 6 — ETERNAL FLAME',          health:400, pattern:'fireball',    movement:'zigzag',        reward:600, draw:drawBossInferno },
  { name:'GIANT GLACIER',      subtitle:'PHASE 7 — THE ICE AGE',            health:450, pattern:'ice_shard',   movement:'float_sink',    reward:700, draw:drawBossGlacier },
  { name:'CYBER COLOSSUS',     subtitle:'PHASE 8 — DOMAIN OF THE MACHINE',  health:550, pattern:'laser_grid',  movement:'static_turret', reward:850, draw:drawBossCyber },
  { name:'STELLAR VOID',       subtitle:'PHASE 9 — POINT OF NO RETURN',     health:650, pattern:'black_hole',  movement:'gravity',       reward:1000,draw:drawBossVoid },
  { name:'RAFA PAOLI',         subtitle:'FINAL — THE CREATOR',              health:1000,pattern:'ultimate',    movement:'adaptive',      reward:2000,draw:drawBossRafa },
  { name:'THE AMALGAM',        subtitle:'PHASE 11 — CHAOS INCARNATE',       health:900, pattern:'amalgam',     movement:'adaptive',      reward:1800,draw:drawBossAmalgam },
  { name:'GENESIS OMEGA',      subtitle:'PHASE 12 — TRUE FINAL FORM',       health:1500,pattern:'genesis',     movement:'genesis',       reward:3500,draw:drawBossGenesis },
];
const INFINITE_COOLDOWNS = { nuke:30000, heal:45000, shield:60000 };

// ─ Skill Tree ─
const SKILL_TREE = {
  firepower: [
    { id:'fp1',  name:'Extra Bullet',     desc:'+1 side bullet per shot',        cost:200,  maxLevel:1 },
    { id:'fp2',  name:'Damage Boost',     desc:'+25% damage per level',          cost:400,  maxLevel:3 },
    { id:'fp3',  name:'Rapid Fire',       desc:'-15% shoot cooldown per level',  cost:600,  maxLevel:3 },
    { id:'fp4',  name:'Piercing Shot',    desc:'Bullets pass through 1 enemy',   cost:800,  maxLevel:1 },
    { id:'fp5',  name:'Burst Fire',       desc:'Every 5th shot fires 3x',        cost:700,  maxLevel:2 },
    { id:'fp6',  name:'Explosive Rounds', desc:'Bullets deal AoE on hit',        cost:900,  maxLevel:2 },
    { id:'fp7',  name:'Sniper Mode',      desc:'+100% damage, -30% fire rate',   cost:1200, maxLevel:1 },
    { id:'fp8',  name:'Dual Cannons',     desc:'Fire 2 parallel shots',          cost:1000, maxLevel:1 },
    { id:'fp9',  name:'Overcharge',       desc:'Charged shot deals +50% dmg',    cost:1100, maxLevel:2 },
    { id:'fp10', name:'Crits',            desc:'5% chance per level for 3× dmg', cost:500,  maxLevel:3 },
  ],
  defense: [
    { id:'df1',  name:'Extra Life',       desc:'+1 starting life',               cost:300,  maxLevel:2 },
    { id:'df2',  name:'Phoenix',          desc:'Revive once per run',            cost:1000, maxLevel:1 },
    { id:'df3',  name:'Shield Boost',     desc:'+50% shield duration per level', cost:500,  maxLevel:2 },
    { id:'df4',  name:'Thorns',           desc:'Damage attacker on shield hit',  cost:600,  maxLevel:2 },
    { id:'df5',  name:'Regen',            desc:'Recover HP slowly over time',    cost:800,  maxLevel:1 },
    { id:'df6',  name:'Bulwark',          desc:'+1 HP cap, start with full HP',  cost:700,  maxLevel:2 },
    { id:'df7',  name:'Deflector',        desc:'20% chance to deflect bullets',  cost:900,  maxLevel:2 },
    { id:'df8',  name:'Last Stand',       desc:'At 1HP: +50% dmg, 2s invuln',   cost:1500, maxLevel:1 },
    { id:'df9',  name:'Hardened',         desc:'-0.3s invincibility frames',     cost:400,  maxLevel:3 },
    { id:'df10', name:'Mirror Shield',    desc:'Reflected bullets deal 2× dmg', cost:1200, maxLevel:1 },
  ],
  utility: [
    { id:'ut1',  name:'Coin Magnet',      desc:'+75px coin attraction per level',cost:150,  maxLevel:3 },
    { id:'ut2',  name:'XP Boost',         desc:'+20% XP gained per level',       cost:250,  maxLevel:3 },
    { id:'ut3',  name:'Lucky Drops',      desc:'+20% power-up drop chance',      cost:400,  maxLevel:2 },
    { id:'ut4',  name:'Scavenger',        desc:'Enemies drop crafting materials', cost:350,  maxLevel:1 },
    { id:'ut5',  name:'Scholar',          desc:'+1 equipment offered per run',   cost:300,  maxLevel:2 },
    { id:'ut6',  name:'Haste',            desc:'+1 movement speed per level',    cost:200,  maxLevel:3 },
    { id:'ut7',  name:'Looter',           desc:'+25% coins from bosses',         cost:700,  maxLevel:2 },
    { id:'ut8',  name:'Radar Extend',     desc:'+30% radar detection range',     cost:250,  maxLevel:2 },
    { id:'ut9',  name:'Quick Revive',     desc:'-25% respawn wait per level',    cost:500,  maxLevel:2 },
    { id:'ut10', name:'Fortune',          desc:'+15% double-damage duration',    cost:450,  maxLevel:2 },
  ],
  special: [
    { id:'sp1',  name:'Quick Cooldown',   desc:'-15% ability cooldown per level',cost:350,  maxLevel:2 },
    { id:'sp2',  name:'Combo Bonus',      desc:'Combos give extra coins',        cost:500,  maxLevel:2 },
    { id:'sp3',  name:'Boss Loot',        desc:'+25% coins from boss kills',     cost:700,  maxLevel:2 },
    { id:'sp4',  name:'Synergy Core',     desc:'Enables item synergy slots',     cost:800,  maxLevel:1 },
    { id:'sp5',  name:'Crafter',          desc:'Unlock advanced crafting tiers', cost:600,  maxLevel:2 },
    { id:'sp6',  name:'Run Specialist',   desc:'+10% stats for full-clear runs', cost:900,  maxLevel:2 },
    { id:'sp7',  name:'Dual Ability',     desc:'Second ability charge stored',   cost:1200, maxLevel:1 },
    { id:'sp8',  name:'Overclock',        desc:'Ability active 25% longer',      cost:700,  maxLevel:2 },
    { id:'sp9',  name:'Mastery',          desc:'+5% of all stats per boss kill', cost:1000, maxLevel:2 },
    { id:'sp10', name:'Ultimate',         desc:'Unlocks super-ability at LV 10', cost:2000, maxLevel:1 },
  ],
};

// ─ Equipment Rarities ─
const RARITY = {
  common:    { label:'COMMON',    color:'#9e9e9e', multiplier:1.0 },
  uncommon:  { label:'UNCOMMON',  color:'#4caf50', multiplier:1.3 },
  rare:      { label:'RARE',      color:'#2196f3', multiplier:1.7 },
  epic:      { label:'EPIC',      color:'#9c27b0', multiplier:2.2 },
  legendary: { label:'LEGENDARY', color:'#ff9800', multiplier:3.0 },
};

// ─ Equipment Definitions ─
const EQUIPMENT_DATA = [
  { id:'plasma_gun',    slot:'weapon',    name:'Plasma Gun',     effect:'dmg',      value:0.20, desc:'+20% bullet damage' },
  { id:'twin_laser',    slot:'weapon',    name:'Twin Laser',     effect:'spread',   value:1,    desc:'+1 extra shot angle' },
  { id:'rapid_coil',   slot:'weapon',    name:'Rapid Coil',     effect:'fire',     value:0.25, desc:'-25% shoot cooldown' },
  { id:'void_blade',   slot:'weapon',    name:'Void Blade',     effect:'pierce',   value:1,    desc:'Bullets pierce 1 enemy' },
  { id:'nova_cannon',  slot:'weapon',    name:'Nova Cannon',    effect:'aoe',      value:30,   desc:'Bullets explode in 30px' },
  { id:'nano_vest',    slot:'armor',     name:'Nano Vest',      effect:'maxhp',    value:1,    desc:'+1 max HP' },
  { id:'pulse_shield', slot:'armor',     name:'Pulse Shield',   effect:'deflect',  value:0.15, desc:'15% bullet deflect chance' },
  { id:'regen_core',   slot:'armor',     name:'Regen Core',     effect:'regen',    value:1,    desc:'Recover 1 HP per phase' },
  { id:'mirror_plate', slot:'armor',     name:'Mirror Plate',   effect:'thorns',   value:0.5,  desc:'Reflect 50% bullet damage' },
  { id:'titan_hull',   slot:'armor',     name:'Titan Hull',     effect:'reduction',value:0.15, desc:'-15% damage taken' },
  { id:'coin_ring',    slot:'accessory', name:'Coin Ring',      effect:'coins',    value:0.25, desc:'+25% coin drops' },
  { id:'xp_lens',      slot:'accessory', name:'XP Lens',        effect:'xp',       value:0.30, desc:'+30% XP gain' },
  { id:'lucky_charm',  slot:'accessory', name:'Lucky Charm',    effect:'drop',     value:0.20, desc:'+20% power-up drop' },
  { id:'speed_ring',   slot:'accessory', name:'Speed Ring',     effect:'speed',    value:2,    desc:'+2 movement speed' },
  { id:'magnet_coil',  slot:'accessory', name:'Magnet Coil',    effect:'magnet',   value:100,  desc:'+100px coin attraction' },
  { id:'dark_heart',   slot:'relic',     name:'Dark Heart',     effect:'lifesteal',value:0.05, desc:'5% lifesteal on kill' },
  { id:'chaos_gem',    slot:'relic',     name:'Chaos Gem',      effect:'random',   value:1,    desc:'Random buff each phase' },
  { id:'omega_core',   slot:'relic',     name:'Omega Core',     effect:'all',      value:0.10, desc:'+10% all stats' },
  { id:'void_shard',   slot:'relic',     name:'Void Shard',     effect:'blink',    value:1,    desc:'Dodge blink on damage' },
  { id:'genesis_key',  slot:'relic',     name:'Genesis Key',    effect:'boss_dmg', value:0.50, desc:'+50% damage vs bosses' },
];

// ─ Item Synergies ─
const ITEM_SYNERGIES = [
  {
    id:'plasma_twin',
    items:['plasma_gun','twin_laser'],
    name:'PLASMA STORM',
    desc:'All shots become 3-way + 30% damage',
    effect:(player)=>{ player.damageMultiplier*=1.3; player._tripleShot=true; }
  },
  {
    id:'regen_heart',
    items:['regen_core','dark_heart'],
    name:'BLOOD PACT',
    desc:'Lifesteal heals above max HP as temp shield',
    effect:(player)=>{ player._bloodPact=true; }
  },
  {
    id:'void_mirror',
    items:['void_blade','mirror_plate'],
    name:'ECHO VOID',
    desc:'Piercing bullets also deflect enemy shots',
    effect:(player)=>{ player._echoVoid=true; }
  },
  {
    id:'omega_chaos',
    items:['omega_core','chaos_gem'],
    name:'GENESIS SURGE',
    desc:'Random buff refreshes every 20s, +20% all stats',
    effect:(player)=>{ player.damageMultiplier*=1.2; player._genesisSurge=true; }
  },
];

// ─ Crafting Recipes ─
const CRAFTING_RECIPES = [
  { id:'craft_plasma_gun',  result:{itemId:'plasma_gun',  rarity:'uncommon'}, ingredients:{scrap_metal:3,energy_cell:2},           name:'Plasma Gun (Uncommon)' },
  { id:'craft_twin_laser',  result:{itemId:'twin_laser',  rarity:'rare'},     ingredients:{energy_cell:4,nano_fiber:2},             name:'Twin Laser (Rare)' },
  { id:'craft_rapid_coil',  result:{itemId:'rapid_coil',  rarity:'uncommon'}, ingredients:{scrap_metal:4,energy_cell:1},            name:'Rapid Coil (Uncommon)' },
  { id:'craft_regen_core',  result:{itemId:'regen_core',  rarity:'rare'},     ingredients:{nano_fiber:4,void_crystal:1},            name:'Regen Core (Rare)' },
  { id:'craft_nano_vest',   result:{itemId:'nano_vest',   rarity:'uncommon'}, ingredients:{scrap_metal:5,nano_fiber:2},             name:'Nano Vest (Uncommon)' },
  { id:'craft_coin_ring',   result:{itemId:'coin_ring',   rarity:'rare'},     ingredients:{energy_cell:3,chaos_shard:1},            name:'Coin Ring (Rare)' },
  { id:'craft_speed_ring',  result:{itemId:'speed_ring',  rarity:'uncommon'}, ingredients:{nano_fiber:3,scrap_metal:2},             name:'Speed Ring (Uncommon)' },
  { id:'craft_dark_heart',  result:{itemId:'dark_heart',  rarity:'epic'},     ingredients:{void_crystal:2,chaos_shard:2,nano_fiber:3}, name:'Dark Heart (Epic)' },
  { id:'craft_omega_core',  result:{itemId:'omega_core',  rarity:'legendary'},ingredients:{void_crystal:3,chaos_shard:3,energy_cell:5}, name:'Omega Core (Legendary)' },
  { id:'craft_genesis_key', result:{itemId:'genesis_key', rarity:'legendary'},ingredients:{void_crystal:4,chaos_shard:4,nano_fiber:4}, name:'Genesis Key (Legendary)' },
];

// ─ Leaderboard Config ─
const LEADERBOARD_CONFIG = {
  apiKey: '$2b$10$placeholder_key_replace_with_real',
  binIds: { campaign:'', infinite:'', survivor:'' },
  maxEntries: 20,
};

function freshSurvivorAbilities() {
  return [
    { name:'Attack',  level:0, maxLevel:5, cooldown:0, maxCooldown:5000,  icon:'⚔️', desc:'+20% damage per level' },
    { name:'Defense', level:0, maxLevel:5, cooldown:0, maxCooldown:8000,  icon:'🛡️', desc:'Temporary shield' },
    { name:'Special', level:0, maxLevel:5, cooldown:0, maxCooldown:10000, icon:'✨', desc:'Character special' },
  ];
}

// ─ Phase Themes (open world + phase backgrounds)
const PHASE_THEMES = [
  { name:'NEBULA GATE',     bg:'#020817', grid:'rgba(0,245,255,0.04)',  accent:'rgba(123,47,255,0.06)',  star:'#ffffff', enemyColor:'#00f5ff' },
  { name:'CRIMSON VOID',    bg:'#0d0205', grid:'rgba(255,60,60,0.05)',  accent:'rgba(255,0,60,0.07)',    star:'#ff9999', enemyColor:'#ff3333' },
  { name:'TOXIC SWAMP',     bg:'#010d01', grid:'rgba(57,255,20,0.05)',  accent:'rgba(0,200,30,0.06)',    star:'#99ff99', enemyColor:'#39ff14' },
  { name:'SOLAR FURNACE',   bg:'#0d0600', grid:'rgba(255,160,0,0.06)',  accent:'rgba(255,100,0,0.07)',   star:'#ffcc66', enemyColor:'#ff8800' },
  { name:'DEEP OCEAN',      bg:'#000b12', grid:'rgba(0,180,255,0.05)',  accent:'rgba(0,100,200,0.07)',   star:'#66ccff', enemyColor:'#0088ff' },
  { name:'INFERNO CORE',    bg:'#0d0200', grid:'rgba(255,50,0,0.06)',   accent:'rgba(200,0,0,0.07)',     star:'#ff6633', enemyColor:'#ff2200' },
  { name:'GLACIAL ABYSS',   bg:'#010a10', grid:'rgba(120,210,255,0.06)',accent:'rgba(60,180,255,0.06)',  star:'#ccf0ff', enemyColor:'#88ddff' },
  { name:'MACHINE DOMAIN',  bg:'#060609', grid:'rgba(180,80,255,0.05)', accent:'rgba(120,40,200,0.06)',  star:'#cc88ff', enemyColor:'#aa44ff' },
  { name:'EVENT HORIZON',   bg:'#000003', grid:'rgba(80,0,200,0.06)',   accent:'rgba(40,0,150,0.08)',    star:'#8866ff', enemyColor:'#6600cc' },
  { name:'GENESIS FIELD',   bg:'#08060d', grid:'rgba(255,220,0,0.05)',  accent:'rgba(200,150,0,0.06)',   star:'#ffee88', enemyColor:'#ffcc00' },
  { name:'CHAOS REALM',     bg:'#06000d', grid:'rgba(255,0,200,0.06)',  accent:'rgba(180,0,255,0.07)',   star:'#ff66ff', enemyColor:'#ff00cc' },
  { name:'OMEGA DIMENSION', bg:'#000000', grid:'rgba(255,255,255,0.07)',accent:'rgba(255,255,255,0.04)', star:'#ffffff', enemyColor:'#ffffff' },
];

// ─ Run Upgrade Pool (used in all modes with XP leveling)
const RUN_UPGRADES_POOL = [
  { id:'ru_dmg',      name:'FIREPOWER',     icon:'🔥', desc:'+25% bullet damage',     maxLevel:4, apply:(p)=>{ p.damageMultiplier*=1.25; } },
  { id:'ru_speed',    name:'AFTERBURNER',   icon:'⚡', desc:'+1 movement speed',       maxLevel:4, apply:(p)=>{ p.speed=Math.min(p.speed+1,20); } },
  { id:'ru_cooldown', name:'RAPID COILS',   icon:'💨', desc:'-15% shoot cooldown',     maxLevel:4, apply:(p)=>{ p.shootCooldown=Math.max(50,Math.floor(p.shootCooldown*0.85)); } },
  { id:'ru_life',     name:'HULL REPAIR',   icon:'❤️', desc:'+1 life (max 5)',         maxLevel:3, apply:(p)=>{ p.lives=Math.min(p.lives+1,5); } },
  { id:'ru_magnet',   name:'XP MAGNET',     icon:'🧲', desc:'+80px XP attraction',     maxLevel:3, apply:()=>{ State.magnetRadius+=80; } },
  { id:'ru_xpmult',   name:'SCHOLAR',       icon:'📚', desc:'+30% XP gain',            maxLevel:3, apply:()=>{ State.xpMultiplier+=0.30; } },
  { id:'ru_spread',   name:'SPREAD SHOT',   icon:'🌟', desc:'+1 angled side bullet',   maxLevel:2, apply:(p)=>{ p._extraSpread=(p._extraSpread||0)+1; } },
  { id:'ru_pierce',   name:'PIERCING',      icon:'➡️', desc:'Bullets pierce 1 enemy',  maxLevel:1, apply:(p)=>{ p._pierce=(p._pierce||0)+1; } },
  { id:'ru_aoe',      name:'NOVA BURST',    icon:'💥', desc:'Kills trigger small AoE', maxLevel:1, apply:(p)=>{ p._aoeBurst=true; } },
  { id:'ru_coinboost',name:'SCAVENGER',     icon:'💰', desc:'+30% coin drops',         maxLevel:3, apply:()=>{ State._runCoinMult=(State._runCoinMult||1)*1.30; } },
  { id:'ru_invframe', name:'GHOST BLINK',   icon:'👻', desc:'+0.4s invincibility',     maxLevel:3, apply:(p)=>{ p._invBonus=(p._invBonus||0)+400; } },
  { id:'ru_regen',    name:'BIO REGEN',     icon:'🌿', desc:'Heal 1 HP every 20s',     maxLevel:2, apply:(p)=>{ p._regenInterval=true; } },
  { id:'ru_deflect',  name:'MIRROR HULL',   icon:'🪞', desc:'20% chance deflect bullet',maxLevel:2,apply:(p)=>{ p._deflectChance=(p._deflectChance||0)+0.20; } },
  { id:'ru_combobonus',name:'COMBO KING',   icon:'🔥', desc:'Combo gives extra coins', maxLevel:2, apply:()=>{ State._runComboBonus=(State._runComboBonus||0)+1; } },
  { id:'ru_shield_dur',name:'SHIELD BOOST', icon:'🛡️', desc:'+30% shield duration',   maxLevel:2, apply:()=>{ State._shieldDurMult=(State._shieldDurMult||1)*1.30; } },
];

// ═══════════════════════════════════════════════════════════════════
// OPEN WORLD EXPANSION CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const FACTIONS = {
  pirates: { name:'SPACE PIRATES', color:'#ff4444', enemies:['basic','fast','bomber'], baseRep:0 },
  empire:  { name:'GALACTIC EMPIRE', color:'#4488ff', enemies:['tank','ufo','spinner'], baseRep:0 },
  rebels:  { name:'REBEL FLEET', color:'#ffaa00', enemies:['diver','fast','basic'], baseRep:0 },
  traders: { name:'MERCHANT GUILD', color:'#00ff88', enemies:[], baseRep:50 },
};

const QUEST_TEMPLATES = [
  { id:'escort',          name:'Escort Mission',    desc:'Survive 60s in this sector',       type:'time',    target:60,  reward:{coins:200,xp:500} },
  { id:'hunt',            name:'Bounty Hunt',        desc:'Kill 15 enemies in sector',        type:'kill',    target:15,  reward:{coins:150,xp:300} },
  { id:'destroy_fortress',name:'Fortress Assault',  desc:'Destroy a Space Fortress',         type:'fortress',target:1,   reward:{coins:300,xp:600} },
  { id:'collect_crystals',name:'Crystal Rush',      desc:'Collect 200 XP from crystals',     type:'crystal', target:200, reward:{coins:100,xp:200} },
  { id:'explore',         name:'Galaxy Explorer',   desc:'Visit 5 different sectors',        type:'explore', target:5,   reward:{coins:250,xp:400} },
  { id:'survivor',        name:'No Damage Run',     desc:'Survive 90s without damage',       type:'nodmg',   target:90,  reward:{coins:500,xp:1000} },
  { id:'rescue',          name:'Rescue Mission',    desc:'Reach 3 distress beacons',         type:'beacon',  target:3,   reward:{coins:200,xp:350} },
  { id:'merchant',        name:'Trade Route',       desc:'Use 2 trading posts',              type:'trade',   target:2,   reward:{coins:180,xp:250} },
  { id:'boss_slayer',     name:'Boss Slayer',       desc:'Defeat 3 sector bosses',           type:'boss',    target:3,   reward:{coins:600,xp:1200} },
  { id:'explorer',        name:'Deep Space',        desc:'Reach the Omega Dimension sector', type:'omega',   target:1,   reward:{coins:400,xp:800} },
];

const WEATHER_TYPES = ['clear','solar_storm','asteroid_rain','nebula_surge','quantum_flux','ion_storm','void_rift'];

const WEATHER_DISPLAY = {
  clear:         { name:'CLEAR SPACE',     color:'rgba(0,245,255,0.6)' },
  solar_storm:   { name:'SOLAR STORM',     color:'rgba(255,140,0,0.8)' },
  asteroid_rain: { name:'ASTEROID RAIN',   color:'rgba(200,150,100,0.8)' },
  nebula_surge:  { name:'NEBULA SURGE',    color:'rgba(180,0,255,0.8)' },
  quantum_flux:  { name:'QUANTUM FLUX',    color:'rgba(0,255,200,0.8)' },
  ion_storm:     { name:'ION STORM',       color:'rgba(100,200,255,0.8)' },
  void_rift:     { name:'VOID RIFT',       color:'rgba(80,0,0,0.9)' },
};

const ALLY_SHIP_TYPES = [
  { type:'scout',     cost:200, color:'#00ff88', speed:4,   damage:1, health:3,  fireRate:500,  range:350, label:'SCOUT',   icon:'S' },
  { type:'fighter',   cost:350, color:'#ffaa00', speed:3,   damage:2, health:5,  fireRate:800,  range:300, label:'FIGHTER', icon:'F' },
  { type:'bomber',    cost:500, color:'#ff6644', speed:2,   damage:4, health:8,  fireRate:1500, range:250, label:'BOMBER',  icon:'B' },
  { type:'healer',    cost:400, color:'#ff69b4', speed:3,   damage:0, health:6,  fireRate:0,    range:200, label:'HEALER',  icon:'H', healsPlayer:true },
  { type:'tank_ship', cost:600, color:'#4488ff', speed:1.5, damage:3, health:20, fireRate:1200, range:280, label:'TANK',    icon:'T' },
];

const CRAFT_RECIPES = [
  { id:'plasma_cannon', name:'PLASMA CANNON', icon:'🔥', cost:{crystals:3,coins:300}, effect:'tripleDamage5s',  desc:'3x damage for 5s' },
  { id:'warp_drive',    name:'WARP DRIVE',    icon:'⚡', cost:{crystals:5,coins:500}, effect:'speedBoost10s',   desc:'3x speed for 10s' },
  { id:'repair_kit',    name:'REPAIR KIT',    icon:'🛠', cost:{crystals:2,coins:150}, effect:'heal2lives',      desc:'Heal 2 lives' },
  { id:'emp_blast',     name:'EMP BLAST',     icon:'💥', cost:{crystals:4,coins:400}, effect:'stunAllEnemies',  desc:'Stun all enemies 3s' },
  { id:'mega_shield',   name:'MEGA SHIELD',   icon:'🛡', cost:{crystals:3,coins:350}, effect:'invincible8s',    desc:'Invincible for 8s' },
];

const CODEX_ENTRIES = [
  { id:'c0',  title:'The Spiral Arm',        text:'Ancient star-forming region at the galaxy rim.' },
  { id:'c1',  title:'Space Pirates',         text:'Scavenger fleets who terrorize trade routes.' },
  { id:'c2',  title:'The Galactic Empire',   text:'Authoritarian regime controlling inner systems.' },
  { id:'c3',  title:'Rebel Fleet',           text:'Freedom fighters opposing imperial expansion.' },
  { id:'c4',  title:'Merchant Guild',        text:'Peaceful traders who keep the economy flowing.' },
  { id:'c5',  title:'Wormhole Technology',   text:'Allows instantaneous travel between star sectors.' },
  { id:'c6',  title:'Black Hole Physics',    text:'Singularities that bend space-time infinitely.' },
  { id:'c7',  title:'Ancient Ruins',         text:'Remnants of a precursor civilization.' },
  { id:'c8',  title:'Crystal Formations',    text:'Energy-rich minerals found near nebulae.' },
  { id:'c9',  title:'Space Fortresses',      text:'Armored strongholds of warring factions.' },
  { id:'c10', title:'Distress Beacons',      text:'Emergency signals from stranded crew members.' },
  { id:'c11', title:'Trading Posts',         text:'Neutral market stations accepted by all factions.' },
  { id:'c12', title:'Nebula Clouds',         text:'Dense gas clouds that affect shields and engines.' },
  { id:'c13', title:'Ion Storms',            text:'Electromagnetic anomalies rich in particles.' },
  { id:'c14', title:'Void Rifts',            text:'Tears in spacetime leading nowhere and everywhere.' },
  { id:'c15', title:'The Omega Sector',      text:'Final frontier at the edge of the known galaxy.' },
  { id:'c16', title:'Solar Flares',          text:'Intense bursts of radiation from unstable stars.' },
  { id:'c17', title:'Quantum Flux Zones',    text:'Areas where probability itself becomes unstable.' },
  { id:'c18', title:'Ally Ship Classes',     text:'Various vessel types available for recruitment.' },
  { id:'c19', title:'The Galactic Core',     text:'Supermassive black hole at the center of it all.' },
];

const GALAXY_EVENTS = [
  { id:'pirate_raid',    name:'PIRATE RAID',     desc:'5 pirate ships ambush!',          spawnCount:5, gives:null },
  { id:'empire_patrol',  name:'EMPIRE PATROL',   desc:'Imperial patrol detected!',       spawnCount:3, gives:null },
  { id:'meteor_shower',  name:'METEOR SHOWER',   desc:'Meteors inbound!',                spawnCount:0, duration:15, gives:null },
  { id:'supply_drop',    name:'SUPPLY DROP',     desc:'Merchant convoy passing!',        spawnCount:0, gives:'powerup' },
  { id:'void_creature',  name:'VOID ENTITY',     desc:'Something ancient stirs...',      spawnCount:1, gives:null, special:true },
  { id:'data_cache',     name:'DATA CACHE',      desc:'Encrypted files recovered!',      spawnCount:0, gives:'xp', amount:500 },
  { id:'crew_rescue',    name:'CREW RESCUED',    desc:'Survivors found!',                spawnCount:0, gives:'ally' },
  { id:'warp_storm',     name:'WARP STORM',      desc:'Gravitational anomaly!',          spawnCount:0, gives:null, effect:'teleport' },
];

const OW_SECTOR_THEMES = [
  { name:'NEBULA PRIME',    color:'#aa44ff', bg:'#1a0030' },
  { name:'ASTEROID BELT',   color:'#aa7744', bg:'#221100' },
  { name:'CRYSTAL EXPANSE', color:'#44aaff', bg:'#001122' },
  { name:'VOID REACHES',    color:'#ff4444', bg:'#200000' },
  { name:'ION FIELDS',      color:'#44ffaa', bg:'#001a10' },
  { name:'SOLAR FRONTIER',  color:'#ffaa44', bg:'#1a1000' },
  { name:'DEEP CORE',       color:'#ff44ff', bg:'#1a001a' },
  { name:'WARP ZONE ALPHA', color:'#44ffff', bg:'#001a1a' },
  { name:'EMPIRE SPACE',    color:'#4488ff', bg:'#00051a' },
  { name:'REBEL TERRITORY', color:'#ffdd44', bg:'#1a1200' },
  { name:'PIRATE HAVEN',    color:'#ff6644', bg:'#1a0a00' },
  { name:'TRADE NEXUS',     color:'#44ff88', bg:'#001a0a' },
  { name:'STARFALL BASIN',  color:'#ff88aa', bg:'#1a0010' },
  { name:'QUANTUM RIFT',    color:'#88aaff', bg:'#000a1a' },
  { name:'GHOST SECTOR',    color:'#aaaaaa', bg:'#0a0a0a' },
  { name:'PLASMA SHORES',   color:'#ff8844', bg:'#1a0800' },
  { name:'DARK MATTER RIFT',color:'#8844ff', bg:'#0a0018' },
  { name:'PULSAR FIELDS',   color:'#ffff44', bg:'#1a1a00' },
  { name:'SINGULARITY',     color:'#ffffff', bg:'#050505' },
  { name:'BINARY STARS',    color:'#ffcc44', bg:'#1a0f00' },
  { name:'SUPERNOVA REMNANT',color:'#ff4488',bg:'#1a0010' },
  { name:'MAGNETAR ZONE',   color:'#44ccff', bg:'#001018' },
  { name:'COMET TRAIL',     color:'#aaffee', bg:'#001a15' },
  { name:'STELLAR NURSERY', color:'#ffaaee', bg:'#1a0015' },
  { name:'QUASAR REACH',    color:'#ccaaff', bg:'#0a0018' },
  { name:'NOVA CORE',       color:'#ff6600', bg:'#1a0900' },
  { name:'TENEBRIS VOID',   color:'#440044', bg:'#0a000a' },
  { name:'HELIX CORRIDOR',  color:'#00ffcc', bg:'#001a15' },
  { name:'FRACTURE ZONE',   color:'#ccff44', bg:'#101a00' },
  { name:'DRIFTER SPACE',   color:'#ff9955', bg:'#1a0c00' },
  { name:'SENTINEL RING',   color:'#5599ff', bg:'#00051a' },
  { name:'RESONANCE FIELD', color:'#ff55aa', bg:'#1a000f' },
  { name:'ECLIPSE SECTOR',  color:'#9955ff', bg:'#0a0018' },
  { name:'PHOTON STREAM',   color:'#ffff88', bg:'#1a1a05' },
  { name:'ANTIMATTER SEA',  color:'#ff0088', bg:'#1a0010' },
  { name:'OMEGA DIMENSION', color:'#00ffff', bg:'#001a1a' },
];

// ═══════════════════════════════════════════════════════════════════
// SECTION 2 – GAME STATE
// ═══════════════════════════════════════════════════════════════════
const State = {
  running:false, paused:false, infiniteMode:false, survivorMode:false, twoPlayer:false,
  difficulty:'normal',
  selectedChar:['marcelo','marcelo'],
  players:[],
  enemies:[], boss:null, powerUps:[], explosions:[], xpOrbs:[], stars:[],
  scores:[0,0],
  gameLevel:1, wave:1, bossSpawned:false, uniqueSpawned:false, lastEnemySpawn:0,
  powerUpActive:false, powerUpEndTime:0, shieldActive:false, shieldEndTime:0,
  survivorDifficulty:'normal',
  xp:0, xpToNextLevel:100, level:1,
  survivorAbilities:freshSurvivorAbilities(),
  survivorStartTime:0, survivorElapsed:0, magnetRadius:0, xpMultiplier:1,
  infiniteCooldowns:{ nuke:0, heal:0, shield:0 },
  coins:0, equippedSkin:'default', unlockedSkins:['default'], achievements:[],
  stats:{
    enemiesKilled:0, bossesDefeated:0, totalCoinsEarned:0,
    longestSurvival:0, perfectLevels:0, finalBossOnExtreme:0,
    powerupsCollected:0, maxCombo:0, currentCombo:0, lastKillTime:0,
    phaseDamageTaken:0, maxInfiniteWave:0, charactersPlayed:0,
    charactersUsed:[], maxSurvivorTime:0, maxUpgradeLevel:0,
    multiplayerWins:0, maxPhase:0,
    bombersKilled:0, ddCollected:0, newCharPlayed:false,
    bossRushDone:false, rainbowUsed:false, skillsUnlocked:0,
  },
  gameStartTime:0,
  // IMPROVEMENT 1: floating score texts
  floatingTexts:[],
  // IMPROVEMENT 2: screen shake
  screenShake:0, trauma:0,
  // Phase 1.1: timing engine
  dt:1, timeScale:1, hitstopUntil:0, scheduledEvents:[],
  slowmoUntil:0, slowmoScale:1, _hitThisWave:false,
  // New V3 state
  unlockedSkills:{},
  doubleDamage:false, doubleDamageEnd:0,
  phoenixUsed:false,
  bossRushMode:false, bossRushIndex:0, bossRushStartTime:0,
  // Equipment & Crafting (run-specific, reset each run)
  runEquipment:{ weapon:null, armor:null, accessory:null, relic:null },
  activeSynergies:[],
  materialInventory:{},
  collectedItems:[],
  // PvP
  pvpMode:false, pvpWinner:-1,
  // Online
  onlineBossKillCount:0,
  // Open World Galaxy
  openWorldMode:false,
  camera:{ x:0, y:0 },
  currentSector:0,
  galaxySectors:[],
  galaxyObjects:[],
  worldWidth:6000,
  worldHeight:6000,
  visitedSectors:[],
  openWorldBossActive:false,
  runUpgrades:{},
  unlockedChars:['marcelo'],
  // ═══ OPEN WORLD EXPANSION STATE ═══
  factionRep:{ pirates:0, empire:0, rebels:0, traders:50 },
  activeQuests:[],
  completedQuests:[],
  questProgress:{},
  questLog:false,
  spaceWeather:{ type:'clear', timer:0, duration:0, lastCheck:0 },
  allyFleet:[],
  codex:{ discoveries:[], totalExplored:0 },
  activeEvents:[],
  craftingMaterials:{ crystals:0 },
  galaxyStars:[],
  _nodalDamageTimer:0,
  _craftEffects:{},
  _tradeMenuOpen:false,
  _activeTradeObj:null,
  _sectorObjectiveProgress:{},
  _formationEnemyTimer:0,
  _weatherParticles:[],
  _allyBullets:[],
  _eventCheckTimer:0,
};

