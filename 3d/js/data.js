/* ═══════════════════════════════════════════════════════════════════
   RAFA PAOLI'S SHOOTER 3D — DATA
   Todos os números (vida, dano, cooldown, preço, score, moedas) são
   portados 1:1 do jogo 2D original. Só a geometria virou 3D.
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Escalas de conversão 2D → 3D ─────────────────────────────────
   O original roda num canvas ~900×700 px. Aqui o campo de jogo é um
   corredor: X lateral, Y vertical, Z profundidade (negativo = longe). */
const FIELD = { hw: 16, hh: 9, spawnZ: -185, killZ: 22, playerZ: 0 };
const K = {
  lat: 1 / 22,   // px/frame lateral  → unidades/step
  depth: 0.33,   // px/frame vertical → unidades/step em Z
  size: 1 / 24,  // px                → unidades
  ebullet: 0.12, // velocidade de tiro inimigo
};

/* ─── Dificuldade ─────────────────────────────────────────────────── */
const DIFFICULTY_CFG = {
  easy:    { label: 'EASY',    multiplier: 0.7, desc: 'Inimigos fracos, menos moedas.' },
  normal:  { label: 'NORMAL',  multiplier: 1.0, desc: 'Experiência padrão.' },
  hard:    { label: 'HARD',    multiplier: 1.5, desc: 'Inimigos mais fortes e rápidos.' },
  extreme: { label: 'EXTREME', multiplier: 2.0, desc: 'Dificuldade máxima, prêmio máximo.' },
};

/* ─── Personagens ─────────────────────────────────────────────────── */
const CHARACTER_CFG = {
  marcelo:  { label: 'MARCELO — AI MASTER', ability: 'Ally Drones — invoca 2 drones aliados', speed: 8,  shootCooldown: 200, dmgMult: 1,   price: 0,    hue: 0.55 },
  robos:    { label: 'ROBOS — TECH SQUAD',  ability: 'Triple Formation — tiro triplo (passivo)', speed: 8,  shootCooldown: 200, dmgMult: 1,   price: 300,  hue: 0.08 },
  felipe:   { label: 'FELIPE — THE SWIFT',  ability: 'Turbo — 50% mais rápido + tiro veloz', speed: 12, shootCooldown: 150, dmgMult: 1,   price: 400,  hue: 0.33 },
  takeshi:  { label: 'TAKESHI — NINJA',     ability: 'Triple Shuriken — leque de 9 projéteis', speed: 8,  shootCooldown: 300, dmgMult: 1.5, price: 600,  hue: 0.95 },
  deepseek: { label: 'DEEPSEEK — THE BEAM', ability: 'Laser Ray — feixe perfurante 2s',     speed: 8,  shootCooldown: 500, dmgMult: 2,   price: 800,  hue: 0.5 },
  omega:    { label: 'OMEGA — CHAINGUN',    ability: 'Missile Barrage — 8 mísseis em leque', speed: 7,  shootCooldown: 110, dmgMult: 0.8, price: 500,  hue: 0.12 },
  phantom:  { label: 'PHANTOM — GHOST',     ability: 'Blink — teleporte + 2s invencível',   speed: 11, shootCooldown: 240, dmgMult: 1.2, price: 700,  hue: 0.78 },
  titan:    { label: 'TITAN — COLOSSUS',    ability: 'Armor Mode — 3s escudo + knockback',  speed: 5,  shootCooldown: 380, dmgMult: 2.8, price: 1000, hue: 0.02 },
};
const CHARACTER_IDS = Object.keys(CHARACTER_CFG);

/* ─── Skins ───────────────────────────────────────────────────────── */
const SKINS_DATA = [
  { id: 'default',      name: 'Default',   price: 0,    color: '#b0c4de', desc: 'Sua nave inicial.' },
  { id: 'golden',       name: 'Golden',    price: 500,  color: '#ffd700', desc: 'Banho de ouro premium.' },
  { id: 'redfire',      name: 'Fireship',  price: 300,  color: '#ff4500', desc: 'Queima seus inimigos.' },
  { id: 'blueice',      name: 'Ice Ship',  price: 300,  color: '#00bfff', desc: 'Congela seus inimigos.' },
  { id: 'greenvenom',   name: 'Venom',     price: 400,  color: '#39ff14', desc: 'Revestimento de veneno.' },
  { id: 'purpleshadow', name: 'Shadow',    price: 600,  color: '#9400d3', desc: 'Ataca das sombras.' },
  { id: 'neonpink',     name: 'Neon',      price: 500,  color: '#ff00ff', desc: 'Explosão neon pura.' },
  { id: 'plasma',       name: 'Plasma',    price: 700,  color: '#4fc3f7', desc: 'Energia de plasma.' },
  { id: 'lava',         name: 'Lava',      price: 800,  color: '#ff3d00', desc: 'Núcleo derretido.' },
  { id: 'void',         name: 'Void',      price: 1000, color: '#8800ff', desc: 'Vem do vazio.' },
  { id: 'crystal',      name: 'Crystal',   price: 900,  color: '#e0f7fa', desc: 'Pureza cristalina.' },
  { id: 'rainbow',      name: 'Rainbow ✨', price: 1200, color: 'animated', desc: 'Muda de cor! Raridade.' },
];

/* ─── Conquistas ──────────────────────────────────────────────────── */
const ACHIEVEMENTS_DATA = [
  { id: 'first_blood',      name: 'FIRST BLOOD',      desc: 'Destrua o primeiro inimigo',     reward: 50,   icon: '💀', progress: s => ({ cur: s.enemiesKilled, max: 1 }) },
  { id: 'boss_slayer',      name: 'BOSS SLAYER',      desc: 'Derrote um boss',                reward: 100,  icon: '👑', progress: s => ({ cur: s.bossesDefeated, max: 1 }) },
  { id: 'coin_collector',   name: 'COIN COLLECTOR',   desc: 'Colete 1000 moedas',             reward: 200,  icon: '💰', progress: s => ({ cur: s.totalCoinsEarned, max: 1000 }) },
  { id: 'survivor',         name: 'SURVIVOR',         desc: 'Sobreviva 5 minutos',            reward: 150,  icon: '⏱️', progress: s => ({ cur: s.longestSurvival, max: 300 }) },
  { id: 'perfectionist',    name: 'PERFECTIONIST',    desc: 'Complete uma fase sem dano',     reward: 250,  icon: '✨', progress: s => ({ cur: s.perfectLevels, max: 1 }) },
  { id: 'ultimate_champ',   name: 'ULTIMATE CHAMPION', desc: 'Vença o boss final no Extreme', reward: 1000, icon: '🏆', progress: s => ({ cur: s.finalBossOnExtreme, max: 1 }) },
  { id: 'power_consumer',   name: 'POWER CONSUMER',   desc: 'Colete 50 power-ups',            reward: 200,  icon: '⚡', progress: s => ({ cur: s.powerupsCollected, max: 50 }) },
  { id: 'combo_master',     name: 'COMBO MASTER',     desc: '10 inimigos em 5 segundos',      reward: 300,  icon: '🔥', progress: s => ({ cur: s.maxCombo, max: 10 }) },
  { id: 'infinite_warrior', name: 'INFINITE WARRIOR', desc: 'Chegue à wave 10 no Infinite',   reward: 500,  icon: '∞',  progress: s => ({ cur: s.maxInfiniteWave, max: 10 }) },
  { id: 'char_master',      name: 'CHAR MASTER',      desc: 'Jogue com os 8 personagens',     reward: 600,  icon: '👥', progress: s => ({ cur: s.charactersPlayed, max: 8 }) },
  { id: 'survivor_expert',  name: 'SURVIVOR EXPERT',  desc: 'Sobreviva 10 minutos',           reward: 400,  icon: '⏳', progress: s => ({ cur: s.maxSurvivorTime, max: 600 }) },
  { id: 'upgrade_king',     name: 'UPGRADE KING',     desc: 'Maximize as habilidades Survivor', reward: 500, icon: '👑', progress: s => ({ cur: s.maxUpgradeLevel, max: 15 }) },
  { id: 'mp_master',        name: 'MULTIPLAYER MASTER', desc: 'Vença uma partida em 2 players', reward: 350, icon: '🤝', progress: s => ({ cur: s.multiplayerWins, max: 1 }) },
  { id: 'phase_master',     name: 'PHASE MASTER',     desc: 'Complete a fase 8',              reward: 750,  icon: '🗺️', progress: s => ({ cur: s.maxPhase, max: 8 }) },
  { id: 'new_char',         name: 'NOVO COMEÇO',      desc: 'Jogue com Omega, Phantom ou Titan', reward: 150, icon: '🚀', progress: s => ({ cur: s.newCharPlayed ? 1 : 0, max: 1 }) },
  { id: 'skill_tree_1',     name: 'APRENDIZ',         desc: 'Desbloqueie 3 skills',           reward: 200,  icon: '🌱', progress: s => ({ cur: s.skillsUnlocked || 0, max: 3 }) },
  { id: 'skill_tree_max',   name: 'MESTRE DAS SKILLS', desc: 'Desbloqueie 10 skills',         reward: 1000, icon: '🌳', progress: s => ({ cur: s.skillsUnlocked || 0, max: 10 }) },
  { id: 'boss_rush_done',   name: 'BOSS RUSHER',      desc: 'Complete o Boss Rush',           reward: 2000, icon: '⚔️', progress: s => ({ cur: s.bossRushDone ? 1 : 0, max: 1 }) },
  { id: 'rainbow_skin',     name: 'ARCO-ÍRIS',        desc: 'Use a skin Rainbow em batalha',  reward: 300,  icon: '🌈', progress: s => ({ cur: s.rainbowUsed ? 1 : 0, max: 1 }) },
  { id: 'bomber_killed',    name: 'DEMOLIDOR',        desc: 'Mate 10 Bombers',                reward: 250,  icon: '💣', progress: s => ({ cur: s.bombersKilled || 0, max: 10 }) },
  { id: 'phase_12',         name: 'ALÉM DO FINAL',    desc: 'Chegue na fase 12',              reward: 1500, icon: '🌌', progress: s => ({ cur: s.maxPhase, max: 12 }) },
  { id: 'double_kill',      name: 'DOUBLE POWER',     desc: 'Colete 20 Double Damage',        reward: 400,  icon: '💥', progress: s => ({ cur: s.ddCollected || 0, max: 20 }) },
];

/* ─── Bosses ──────────────────────────────────────────────────────── */
const BOSSES_DATA = [
  { name: 'THE GUARDIAN',   subtitle: 'FASE 1 — STAR WATCHER',        health: 50,   pattern: 'triple',     movement: 'horizontal',    reward: 50,   model: 'guardian', color: 0x6600bb, accent: 0xaa66ff },
  { name: 'DOUBLE CANNON',  subtitle: 'FASE 2 — MASTER OF BURSTS',    health: 80,   pattern: 'fan',        movement: 'sinusoidal',    reward: 100,  model: 'cannon',   color: 0x8b0000, accent: 0xff4444 },
  { name: 'THE VORTEX',     subtitle: 'FASE 3 — DIMENSIONAL DEVOUR',  health: 120,  pattern: 'circle',     movement: 'teleport',      reward: 150,  model: 'vortex',   color: 0x001a66, accent: 0x0088ff },
  { name: 'ARMORED TANK',   subtitle: 'FASE 4 — LIVING FORTRESS',     health: 200,  pattern: 'burst',      movement: 'armored',       reward: 250,  model: 'tank',     color: 0x1a3d1a, accent: 0x66cc44 },
  { name: 'WORLD DEVOURER', subtitle: 'FASE 5 — THE END OF ALL',      health: 300,  pattern: 'spiral',     movement: 'chaotic',       reward: 500,  model: 'world',    color: 0xcc4400, accent: 0xff8800 },
  { name: 'THE INFERNO',    subtitle: 'FASE 6 — ETERNAL FLAME',       health: 400,  pattern: 'fireball',   movement: 'zigzag',        reward: 600,  model: 'inferno',  color: 0x8b1a00, accent: 0xff6600 },
  { name: 'GIANT GLACIER',  subtitle: 'FASE 7 — THE ICE AGE',         health: 450,  pattern: 'ice_shard',  movement: 'float_sink',    reward: 700,  model: 'glacier',  color: 0x4fc3f7, accent: 0xd6f6ff },
  { name: 'CYBER COLOSSUS', subtitle: 'FASE 8 — DOMAIN OF THE MACHINE', health: 550, pattern: 'laser_grid', movement: 'static_turret', reward: 850, model: 'cyber',    color: 0x333333, accent: 0x39ff14 },
  { name: 'STELLAR VOID',   subtitle: 'FASE 9 — POINT OF NO RETURN',  health: 650,  pattern: 'black_hole', movement: 'gravity',       reward: 1000, model: 'void',     color: 0x050008, accent: 0x7b2fff },
  { name: 'RAFA PAOLI',     subtitle: 'FINAL — THE CREATOR',          health: 1000, pattern: 'ultimate',   movement: 'adaptive',      reward: 2000, model: 'rafa',     color: 0xffd60a, accent: 0xff006e },
  { name: 'THE AMALGAM',    subtitle: 'FASE 11 — CHAOS INCARNATE',    health: 900,  pattern: 'amalgam',    movement: 'adaptive',      reward: 1800, model: 'amalgam',  color: 0x220033, accent: 0xff00cc },
  { name: 'GENESIS OMEGA',  subtitle: 'FASE 12 — TRUE FINAL FORM',    health: 1500, pattern: 'genesis',    movement: 'genesis',       reward: 3500, model: 'genesis',  color: 0x111111, accent: 0xffffff },
];

const INFINITE_COOLDOWNS = { nuke: 30000, heal: 45000, shield: 60000 };

/* ─── Skill Tree ──────────────────────────────────────────────────── */
const SKILL_TREE = {
  firepower: [
    { id: 'fp1',  name: 'Extra Bullet',     desc: '+2 tiros laterais por disparo',    cost: 200,  maxLevel: 1 },
    { id: 'fp2',  name: 'Damage Boost',     desc: '+25% de dano por nível',           cost: 400,  maxLevel: 3 },
    { id: 'fp3',  name: 'Rapid Fire',       desc: '-15% cooldown de tiro por nível',  cost: 600,  maxLevel: 3 },
    { id: 'fp4',  name: 'Piercing Shot',    desc: 'Tiros atravessam 1 inimigo',       cost: 800,  maxLevel: 1 },
    { id: 'fp5',  name: 'Burst Fire',       desc: 'A cada 5º disparo, atira 3x',      cost: 700,  maxLevel: 2 },
    { id: 'fp6',  name: 'Explosive Rounds', desc: 'Tiros causam dano em área',        cost: 900,  maxLevel: 2 },
    { id: 'fp7',  name: 'Sniper Mode',      desc: '+100% dano, -30% cadência',        cost: 1200, maxLevel: 1 },
    { id: 'fp8',  name: 'Dual Cannons',     desc: 'Dispara 2 tiros paralelos',        cost: 1000, maxLevel: 1 },
    { id: 'fp9',  name: 'Overcharge',       desc: 'Tiro carregado +50% de dano',      cost: 1100, maxLevel: 2 },
    { id: 'fp10', name: 'Crits',            desc: '5% de chance por nível de 3× dano', cost: 500,  maxLevel: 3 },
  ],
  defense: [
    { id: 'df1',  name: 'Extra Life',       desc: '+1 vida inicial',                  cost: 300,  maxLevel: 2 },
    { id: 'df2',  name: 'Phoenix',          desc: 'Reviva uma vez por run',           cost: 1000, maxLevel: 1 },
    { id: 'df3',  name: 'Shield Boost',     desc: '+50% duração do escudo por nível', cost: 500,  maxLevel: 2 },
    { id: 'df4',  name: 'Thorns',           desc: 'Danifica quem acerta seu escudo',  cost: 600,  maxLevel: 2 },
    { id: 'df5',  name: 'Regen',            desc: 'Recupera HP lentamente',           cost: 800,  maxLevel: 1 },
    { id: 'df6',  name: 'Bulwark',          desc: '+1 vida máxima, começa cheio',     cost: 700,  maxLevel: 2 },
    { id: 'df7',  name: 'Deflector',        desc: '20% de chance de defletir tiros',  cost: 900,  maxLevel: 2 },
    { id: 'df8',  name: 'Last Stand',       desc: 'Com 1 HP: +50% dano, 2s invuln.',  cost: 1500, maxLevel: 1 },
    { id: 'df9',  name: 'Hardened',         desc: '+0.3s de invencibilidade',         cost: 400,  maxLevel: 3 },
    { id: 'df10', name: 'Mirror Shield',    desc: 'Tiros refletidos causam 2× dano',  cost: 1200, maxLevel: 1 },
  ],
  utility: [
    { id: 'ut1',  name: 'Coin Magnet',      desc: '+3 de raio de atração por nível',  cost: 150,  maxLevel: 3 },
    { id: 'ut2',  name: 'XP Boost',         desc: '+20% de XP por nível',             cost: 250,  maxLevel: 3 },
    { id: 'ut3',  name: 'Lucky Drops',      desc: '+20% de chance de power-up',       cost: 400,  maxLevel: 2 },
    { id: 'ut4',  name: 'Scavenger',        desc: '+10% de moedas dos inimigos',      cost: 350,  maxLevel: 1 },
    { id: 'ut5',  name: 'Scholar',          desc: '+15% de score final',              cost: 300,  maxLevel: 2 },
    { id: 'ut6',  name: 'Haste',            desc: '+1 de velocidade por nível',       cost: 200,  maxLevel: 3 },
    { id: 'ut7',  name: 'Looter',           desc: '+25% de moedas dos bosses',        cost: 700,  maxLevel: 2 },
    { id: 'ut8',  name: 'Radar Extend',     desc: 'Marca inimigos distantes',         cost: 250,  maxLevel: 2 },
    { id: 'ut9',  name: 'Quick Revive',     desc: '+0.5s de invuln. ao renascer',     cost: 500,  maxLevel: 2 },
    { id: 'ut10', name: 'Fortune',          desc: '+15% de duração do Double Damage', cost: 450,  maxLevel: 2 },
  ],
  special: [
    { id: 'sp1',  name: 'Quick Cooldown',   desc: '-15% cooldown de habilidade',      cost: 350,  maxLevel: 2 },
    { id: 'sp2',  name: 'Combo Bonus',      desc: 'Combos dão moedas extras',         cost: 500,  maxLevel: 2 },
    { id: 'sp3',  name: 'Boss Loot',        desc: '+25% de moedas por boss',          cost: 700,  maxLevel: 2 },
    { id: 'sp4',  name: 'Synergy Core',     desc: '+5% dano por power-up coletado',   cost: 800,  maxLevel: 1 },
    { id: 'sp5',  name: 'Crafter',          desc: 'Power-ups caem 15% mais rápido',   cost: 600,  maxLevel: 2 },
    { id: 'sp6',  name: 'Run Specialist',   desc: '+10% de stats em runs sem dano',   cost: 900,  maxLevel: 2 },
    { id: 'sp7',  name: 'Dual Ability',     desc: 'Guarda uma 2ª carga da habilidade', cost: 1200, maxLevel: 1 },
    { id: 'sp8',  name: 'Overclock',        desc: 'Habilidade dura 25% mais',         cost: 700,  maxLevel: 2 },
    { id: 'sp9',  name: 'Mastery',          desc: '+5% de stats por boss morto',      cost: 1000, maxLevel: 2 },
    { id: 'sp10', name: 'Ultimate',         desc: 'Começa cada run com escudo 10s',   cost: 2000, maxLevel: 1 },
  ],
};

/* ─── Upgrades de run (Survivor / level-up) ───────────────────────── */
const RUN_UPGRADES_POOL = [
  { id: 'ru_dmg',       name: 'FIREPOWER',   icon: '🔥', desc: '+25% de dano',            maxLevel: 4, apply: p => { p.damageMultiplier *= 1.25; } },
  { id: 'ru_speed',     name: 'AFTERBURNER', icon: '⚡', desc: '+1 de velocidade',        maxLevel: 4, apply: p => { p.speed = Math.min(p.speed + 1, 20); } },
  { id: 'ru_cooldown',  name: 'RAPID COILS', icon: '💨', desc: '-15% cooldown de tiro',   maxLevel: 4, apply: p => { p.shootCooldown = Math.max(50, Math.floor(p.shootCooldown * 0.85)); } },
  { id: 'ru_life',      name: 'HULL REPAIR', icon: '❤️', desc: '+1 vida (máx 5)',         maxLevel: 3, apply: p => { p.lives = Math.min(p.lives + 1, 5); } },
  { id: 'ru_magnet',    name: 'XP MAGNET',   icon: '🧲', desc: '+4 de atração de XP',     maxLevel: 3, apply: () => { State.magnetRadius += 4; } },
  { id: 'ru_xpmult',    name: 'SCHOLAR',     icon: '📚', desc: '+30% de XP',              maxLevel: 3, apply: () => { State.xpMultiplier += 0.30; } },
  { id: 'ru_spread',    name: 'SPREAD SHOT', icon: '🌟', desc: '+1 tiro angulado',        maxLevel: 2, apply: p => { p._extraSpread = (p._extraSpread || 0) + 1; } },
  { id: 'ru_pierce',    name: 'PIERCING',    icon: '➡️', desc: 'Tiros perfuram 1 inimigo', maxLevel: 1, apply: p => { p._pierce = (p._pierce || 0) + 1; } },
  { id: 'ru_aoe',       name: 'NOVA BURST',  icon: '💥', desc: 'Mortes causam dano em área', maxLevel: 1, apply: p => { p._aoeBurst = true; } },
  { id: 'ru_coinboost', name: 'SCAVENGER',   icon: '💰', desc: '+30% de moedas',          maxLevel: 3, apply: () => { State._runCoinMult = (State._runCoinMult || 1) * 1.30; } },
  { id: 'ru_invframe',  name: 'GHOST BLINK', icon: '👻', desc: '+0.4s de invencibilidade', maxLevel: 3, apply: p => { p._invBonus = (p._invBonus || 0) + 400; } },
  { id: 'ru_regen',     name: 'BIO REGEN',   icon: '🌿', desc: 'Cura 1 HP a cada 20s',    maxLevel: 2, apply: p => { p._regenInterval = true; } },
  { id: 'ru_deflect',   name: 'MIRROR HULL', icon: '🪞', desc: '20% de chance de defletir', maxLevel: 2, apply: p => { p._deflectChance = (p._deflectChance || 0) + 0.20; } },
  { id: 'ru_combo',     name: 'COMBO KING',  icon: '🔥', desc: 'Combos dão moedas extras', maxLevel: 2, apply: () => { State._runComboBonus = (State._runComboBonus || 0) + 1; } },
  { id: 'ru_shield',    name: 'SHIELD BOOST', icon: '🛡️', desc: '+30% de duração do escudo', maxLevel: 2, apply: () => { State._shieldDurMult = (State._shieldDurMult || 1) * 1.30; } },
];

/* ─── Temas das fases (fog / grid / estrelas) ─────────────────────── */
const PHASE_THEMES = [
  { name: 'NEBULA GATE',     fog: 0x020817, grid: 0x00f5ff, accent: 0x7b2fff, star: 0xffffff },
  { name: 'CRIMSON VOID',    fog: 0x0d0205, grid: 0xff3c3c, accent: 0xff003c, star: 0xff9999 },
  { name: 'TOXIC SWAMP',     fog: 0x010d01, grid: 0x39ff14, accent: 0x00c81e, star: 0x99ff99 },
  { name: 'SOLAR FURNACE',   fog: 0x0d0600, grid: 0xffa000, accent: 0xff6400, star: 0xffcc66 },
  { name: 'DEEP OCEAN',      fog: 0x000b12, grid: 0x00b4ff, accent: 0x0064c8, star: 0x66ccff },
  { name: 'INFERNO CORE',    fog: 0x0d0200, grid: 0xff3200, accent: 0xc80000, star: 0xff6633 },
  { name: 'GLACIAL ABYSS',   fog: 0x010a10, grid: 0x78d2ff, accent: 0x3cb4ff, star: 0xccf0ff },
  { name: 'MACHINE DOMAIN',  fog: 0x060609, grid: 0xb450ff, accent: 0x7828c8, star: 0xcc88ff },
  { name: 'EVENT HORIZON',   fog: 0x000003, grid: 0x5000c8, accent: 0x280096, star: 0x8866ff },
  { name: 'GENESIS FIELD',   fog: 0x08060d, grid: 0xffdc00, accent: 0xc89600, star: 0xffee88 },
  { name: 'CHAOS REALM',     fog: 0x06000d, grid: 0xff00c8, accent: 0xb400ff, star: 0xff66ff },
  { name: 'OMEGA DIMENSION', fog: 0x000000, grid: 0xffffff, accent: 0xaaaaaa, star: 0xffffff },
];

/* ─── Inimigos ────────────────────────────────────────────────────── */
const ENEMY_CFG = {
  basic:   { r: 0.85, health: 1, speed: [2, 3],     shoot: [2000, 4000], color: 0xcc2222, glow: 0xff4444, score: 10, coins: 5 },
  ufo:     { r: 1.25, health: 1, speed: [3, 4],     shoot: [2000, 4000], color: 0xbb00bb, glow: 0xff00ff, score: 15, coins: 8 },
  tank:    { r: 1.5,  health: 3, speed: [1, 1.5],   shoot: [2000, 4000], color: 0x2d5a1b, glow: 0x8b6030, score: 25, coins: 15 },
  fast:    { r: 0.7,  health: 1, speed: [5, 7],     shoot: [2500, 4500], color: 0x0090cc, glow: 0x00f5ff, score: 20, coins: 10 },
  spinner: { r: 1.1,  health: 2, speed: [2, 2],     shoot: [1000, 1000], color: 0x6600cc, glow: 0xaa00ff, score: 18, coins: 12 },
  diver:   { r: 0.9,  health: 1, speed: [3, 3],     shoot: [9e9, 9e9],   color: 0x2222cc, glow: 0x4444ff, score: 15, coins: 10 },
  bomber:  { r: 1.0,  health: 2, speed: [2.5, 3.5], shoot: [9e9, 9e9],   color: 0xff6600, glow: 0xff4400, score: 22, coins: 18 },
  unique:  { r: 1.35, health: 1, speed: [1.5, 1.5], shoot: [2000, 4000], color: 0xffd700, glow: 0xffcc00, score: 30, coins: 20 },
};

/* ─── Power-ups ───────────────────────────────────────────────────── */
const POWERUP_CFG = {
  life:   { color: 0xff006e, icon: '♥', label: '+1 VIDA' },
  weapon: { color: 0x00f5ff, icon: '⚡', label: 'RAPID FIRE' },
  shield: { color: 0x39ff14, icon: '⛨', label: 'ESCUDO' },
  double: { color: 0xff8800, icon: '✦', label: 'DOUBLE DAMAGE' },
  bomb:   { color: 0xcc00ff, icon: '💥', label: 'BOMBA' },
};

function freshSurvivorAbilities() {
  return [
    { name: 'Attack',  level: 0, maxLevel: 5, cooldown: 0, maxCooldown: 5000,  icon: '⚔️', desc: '+20% de dano por nível' },
    { name: 'Defense', level: 0, maxLevel: 5, cooldown: 0, maxCooldown: 8000,  icon: '🛡️', desc: 'Escudo temporário' },
    { name: 'Special', level: 0, maxLevel: 5, cooldown: 0, maxCooldown: 10000, icon: '✨', desc: 'Especial do personagem' },
  ];
}

const HS_KEY = 'rp3d_highscores';
const SAVE_KEY = 'rp3d_save';
