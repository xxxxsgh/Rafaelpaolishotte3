// ═══════════════════════════════════════════════════════════════════
// CONFIG — todos os dados de balanceamento do remake 3D
// Portado de "Rafa Paoli's Shooter — Ultimate V2/V3" (canvas 2D)
// ═══════════════════════════════════════════════════════════════════

// Campo de jogo. O jogador vive no plano z = 0 e os inimigos vêm do -Z.
export const FIELD = {
  x: 19,          // meia-largura jogável
  y: 11,          // meia-altura jogável
  spawnZ: -155,   // onde inimigos nascem
  despawnZ: 26,   // onde inimigos "escapam"
  bossZ: -42,     // distância de combate do chefe
};

export const DIFFICULTY = {
  easy:    { label: 'EASY',    mult: 0.7, coin: 0.8, desc: 'Inimigos fracos, menos moedas.' },
  normal:  { label: 'NORMAL',  mult: 1.0, coin: 1.0, desc: 'A experiência padrão.' },
  hard:    { label: 'HARD',    mult: 1.5, coin: 1.4, desc: 'Mais rápidos e resistentes.' },
  extreme: { label: 'EXTREME', mult: 2.0, coin: 2.0, desc: 'Dificuldade máxima, recompensa máxima.' },
};

// ─────────────────────────────────────────────────────────────────
// PERSONAGENS — cada um tem um casco 3D próprio (style) e um poder
// ─────────────────────────────────────────────────────────────────
export const CHARACTERS = {
  marcelo: {
    label: 'MARCELO', title: 'AI MASTER', style: 'delta',
    ability: 'Ally Drones', abilityDesc: 'Invoca 2 drones aliados que atiram por 12s',
    speed: 24, cooldown: 190, dmg: 1.0, price: 0, color: 0x00f5ff, bullet: 0x39ff14,
    abilityCd: 14000, abilityDur: 12000,
  },
  robos: {
    label: 'ROBOS', title: 'TECH SQUAD', style: 'wide',
    ability: 'Triple Formation', abilityDesc: 'Canhões laterais extras por 8s',
    speed: 24, cooldown: 200, dmg: 1.0, price: 300, color: 0x7b2fff, bullet: 0x9d5bff,
    abilityCd: 12000, abilityDur: 8000,
  },
  felipe: {
    label: 'FELIPE', title: 'THE SWIFT', style: 'dart',
    ability: 'Turbo', abilityDesc: '+60% velocidade e tiro turbinado por 7s',
    speed: 32, cooldown: 145, dmg: 0.9, price: 400, color: 0x39ff14, bullet: 0xaaff33,
    abilityCd: 11000, abilityDur: 7000,
  },
  takeshi: {
    label: 'TAKESHI', title: 'NINJA', style: 'shuriken',
    ability: 'Shuriken Storm', abilityDesc: 'Leque de 7 shurikens giratórios por 6s',
    speed: 25, cooldown: 280, dmg: 1.5, price: 600, color: 0xff006e, bullet: 0xff5c9d,
    abilityCd: 13000, abilityDur: 6000,
  },
  deepseek: {
    label: 'DEEPSEEK', title: 'THE BEAM', style: 'prism',
    ability: 'Laser Ray', abilityDesc: 'Raio contínuo perfurante por 5s',
    speed: 22, cooldown: 460, dmg: 2.0, price: 800, color: 0x00b4d8, bullet: 0x00f5ff,
    abilityCd: 15000, abilityDur: 5000,
  },
  omega: {
    label: 'OMEGA', title: 'CHAINGUN', style: 'gunship',
    ability: 'Missile Barrage', abilityDesc: '16 mísseis teleguiados em leque',
    speed: 21, cooldown: 105, dmg: 0.65, price: 500, color: 0xffd60a, bullet: 0xffe066,
    abilityCd: 12000, abilityDur: 200,
  },
  phantom: {
    label: 'PHANTOM', title: 'GHOST', style: 'stealth',
    ability: 'Blink', abilityDesc: 'Teleporte instantâneo + 3s invencível',
    speed: 30, cooldown: 230, dmg: 1.2, price: 700, color: 0x9400d3, bullet: 0xc77dff,
    abilityCd: 9000, abilityDur: 3000,
  },
  titan: {
    label: 'TITAN', title: 'COLOSSUS', style: 'bulk',
    ability: 'Armor Mode', abilityDesc: 'Escudo por 6s + onda de choque',
    speed: 16, cooldown: 370, dmg: 2.8, price: 1000, color: 0xff8800, bullet: 0xffaa33,
    abilityCd: 14000, abilityDur: 6000,
  },
};
export const CHARACTER_IDS = Object.keys(CHARACTERS);

// ─────────────────────────────────────────────────────────────────
// SKINS — trocam a cor do casco (e o "rainbow" cicla o matiz)
// ─────────────────────────────────────────────────────────────────
export const SKINS = [
  { id: 'default', name: 'Default',  price: 0,    color: 0xb0c4de, desc: 'Sua nave inicial.' },
  { id: 'golden',  name: 'Golden',   price: 500,  color: 0xffd700, desc: 'Blindagem dourada.' },
  { id: 'redfire', name: 'Fireship', price: 300,  color: 0xff4500, desc: 'Queima os inimigos.' },
  { id: 'blueice', name: 'Ice Ship', price: 300,  color: 0x00bfff, desc: 'Congela tudo.' },
  { id: 'venom',   name: 'Venom',    price: 400,  color: 0x39ff14, desc: 'Revestimento tóxico.' },
  { id: 'shadow',  name: 'Shadow',   price: 600,  color: 0x9400d3, desc: 'Ataca das sombras.' },
  { id: 'neon',    name: 'Neon',     price: 500,  color: 0xff00ff, desc: 'Explosão neon pura.' },
  { id: 'plasma',  name: 'Plasma',   price: 700,  color: 0x4fc3f7, desc: 'Energia de plasma.' },
  { id: 'lava',    name: 'Lava',     price: 800,  color: 0xff3d00, desc: 'Núcleo derretido.' },
  { id: 'void',    name: 'Void',     price: 1000, color: 0x8800ff, desc: 'Vem do vazio.' },
  { id: 'crystal', name: 'Crystal',  price: 900,  color: 0xe0f7fa, desc: 'Pureza cristalina.' },
  { id: 'rainbow', name: 'Rainbow',  price: 1200, color: 'animated', desc: 'Muda de cor. Raridade.' },
];

// ─────────────────────────────────────────────────────────────────
// INIMIGOS
// hp/speed são valores base; escalam com fase e dificuldade
// ─────────────────────────────────────────────────────────────────
export const ENEMY_TYPES = {
  basic:   { hp: 2,  speed: 21, size: 1.7, coins: 5,  score: 10, color: 0x00f5ff, fire: 2400, behavior: 'straight', bulletSpeed: 42 },
  ufo:     { hp: 3,  speed: 17, size: 2.0, coins: 8,  score: 15, color: 0x39ff14, fire: 1900, behavior: 'sway',     bulletSpeed: 46 },
  tank:    { hp: 12, speed: 11, size: 3.1, coins: 15, score: 25, color: 0xff8800, fire: 2600, behavior: 'straight', bulletSpeed: 38, burst: 3 },
  fast:    { hp: 1,  speed: 42, size: 1.4, coins: 10, score: 20, color: 0xffd60a, fire: 0,    behavior: 'rush',     bulletSpeed: 0 },
  unique:  { hp: 8,  speed: 19, size: 2.3, coins: 20, score: 30, color: 0xff006e, fire: 1500, behavior: 'sway',     bulletSpeed: 52, homing: true },
  spinner: { hp: 5,  speed: 15, size: 2.2, coins: 12, score: 18, color: 0x7b2fff, fire: 2200, behavior: 'orbit',    bulletSpeed: 34, radial: 8 },
  diver:   { hp: 3,  speed: 26, size: 1.8, coins: 10, score: 15, color: 0x00ffc8, fire: 0,    behavior: 'dive',     bulletSpeed: 0 },
  bomber:  { hp: 7,  speed: 14, size: 2.6, coins: 18, score: 22, color: 0xcc00ff, fire: 2000, behavior: 'sway',     bulletSpeed: 30, bomb: true },
};
export const ENEMY_IDS = Object.keys(ENEMY_TYPES);

// Quais tipos aparecem em cada fase (índice 0 = fase 1)
export const PHASE_ENEMY_POOL = [
  ['basic'],
  ['basic', 'ufo'],
  ['basic', 'ufo', 'fast'],
  ['basic', 'ufo', 'fast', 'tank'],
  ['basic', 'ufo', 'spinner', 'tank'],
  ['ufo', 'fast', 'spinner', 'diver'],
  ['basic', 'tank', 'diver', 'bomber'],
  ['ufo', 'spinner', 'bomber', 'unique'],
  ['fast', 'diver', 'bomber', 'unique'],
  ['tank', 'spinner', 'unique', 'bomber'],
  ['fast', 'unique', 'bomber', 'spinner', 'tank'],
  ['basic', 'ufo', 'tank', 'fast', 'unique', 'spinner', 'diver', 'bomber'],
];

// ─────────────────────────────────────────────────────────────────
// CHEFES — 12 fases, cada um com forma, movimento e padrão próprios
// ─────────────────────────────────────────────────────────────────
export const BOSSES = [
  { name: 'THE GUARDIAN',   subtitle: 'FASE 1 — VIGIA ESTELAR',        hp: 60,   pattern: 'triple',     movement: 'horizontal', reward: 50,   style: 'guardian', color: 0x00f5ff, accent: 0xffffff },
  { name: 'DOUBLE CANNON',  subtitle: 'FASE 2 — MESTRE DAS RAJADAS',   hp: 100,  pattern: 'fan',        movement: 'sinusoidal', reward: 100,  style: 'cannon',   color: 0xff8800, accent: 0xffd60a },
  { name: 'THE VORTEX',     subtitle: 'FASE 3 — DEVORADOR DIMENSIONAL',hp: 150,  pattern: 'circle',     movement: 'teleport',   reward: 150,  style: 'vortex',   color: 0x7b2fff, accent: 0xff00ff },
  { name: 'ARMORED TANK',   subtitle: 'FASE 4 — FORTALEZA VIVA',       hp: 240,  pattern: 'burst',      movement: 'armored',    reward: 250,  style: 'tank',     color: 0x9e9e9e, accent: 0xff3333 },
  { name: 'WORLD DEVOURER', subtitle: 'FASE 5 — O FIM DE TUDO',        hp: 340,  pattern: 'spiral',     movement: 'chaotic',    reward: 500,  style: 'world',    color: 0x00b4d8, accent: 0x39ff14 },
  { name: 'THE INFERNO',    subtitle: 'FASE 6 — CHAMA ETERNA',         hp: 430,  pattern: 'fireball',   movement: 'zigzag',     reward: 600,  style: 'inferno',  color: 0xff2200, accent: 0xffaa00 },
  { name: 'GIANT GLACIER',  subtitle: 'FASE 7 — ERA DO GELO',          hp: 500,  pattern: 'ice_shard',  movement: 'float',      reward: 700,  style: 'glacier',  color: 0x88ddff, accent: 0xffffff },
  { name: 'CYBER COLOSSUS', subtitle: 'FASE 8 — DOMÍNIO DA MÁQUINA',   hp: 600,  pattern: 'laser_grid', movement: 'turret',     reward: 850,  style: 'cyber',    color: 0xaa44ff, accent: 0x00ff88 },
  { name: 'STELLAR VOID',   subtitle: 'FASE 9 — SEM VOLTA',            hp: 700,  pattern: 'black_hole', movement: 'gravity',    reward: 1000, style: 'void',     color: 0x6600cc, accent: 0xffffff },
  { name: 'RAFA PAOLI',     subtitle: 'FINAL — O CRIADOR',             hp: 1100, pattern: 'ultimate',   movement: 'adaptive',   reward: 2000, style: 'rafa',     color: 0xffd60a, accent: 0x00f5ff },
  { name: 'THE AMALGAM',    subtitle: 'FASE 11 — CAOS ENCARNADO',      hp: 950,  pattern: 'amalgam',    movement: 'adaptive',   reward: 1800, style: 'amalgam',  color: 0xff00cc, accent: 0x39ff14 },
  { name: 'GENESIS OMEGA',  subtitle: 'FASE 12 — FORMA FINAL',         hp: 1600, pattern: 'genesis',    movement: 'genesis',    reward: 3500, style: 'genesis',  color: 0xffffff, accent: 0xffd60a },
];

// ─────────────────────────────────────────────────────────────────
// TEMAS DE FASE — cor de fog, grid, estrelas e luz
// ─────────────────────────────────────────────────────────────────
export const THEMES = [
  { name: 'NEBULA GATE',     fog: 0x020817, grid: 0x00f5ff, star: 0xffffff, light: 0x4488ff, nebula: 0x7b2fff },
  { name: 'CRIMSON VOID',    fog: 0x0d0205, grid: 0xff3c3c, star: 0xff9999, light: 0xff4444, nebula: 0xff0044 },
  { name: 'TOXIC SWAMP',     fog: 0x010d01, grid: 0x39ff14, star: 0x99ff99, light: 0x44ff66, nebula: 0x00c81e },
  { name: 'SOLAR FURNACE',   fog: 0x0d0600, grid: 0xffa000, star: 0xffcc66, light: 0xffaa33, nebula: 0xff6400 },
  { name: 'DEEP OCEAN',      fog: 0x000b12, grid: 0x00b4ff, star: 0x66ccff, light: 0x3399ff, nebula: 0x0064c8 },
  { name: 'INFERNO CORE',    fog: 0x0d0200, grid: 0xff3200, star: 0xff6633, light: 0xff3311, nebula: 0xc80000 },
  { name: 'GLACIAL ABYSS',   fog: 0x010a10, grid: 0x78d2ff, star: 0xccf0ff, light: 0x88ccff, nebula: 0x3cb4ff },
  { name: 'MACHINE DOMAIN',  fog: 0x060609, grid: 0xb450ff, star: 0xcc88ff, light: 0xaa66ff, nebula: 0x7828c8 },
  { name: 'EVENT HORIZON',   fog: 0x000003, grid: 0x5000c8, star: 0x8866ff, light: 0x6644ff, nebula: 0x280096 },
  { name: 'GENESIS FIELD',   fog: 0x08060d, grid: 0xffdc00, star: 0xffee88, light: 0xffcc44, nebula: 0xc89600 },
  { name: 'CHAOS REALM',     fog: 0x06000d, grid: 0xff00c8, star: 0xff66ff, light: 0xff44cc, nebula: 0xb400ff },
  { name: 'OMEGA DIMENSION', fog: 0x000000, grid: 0xffffff, star: 0xffffff, light: 0xffffff, nebula: 0x888888 },
];

// ─────────────────────────────────────────────────────────────────
// POWER-UPS
// ─────────────────────────────────────────────────────────────────
export const POWERUPS = {
  life:   { color: 0xff006e, icon: '♥', label: 'REPARO',        chance: 0.30 },
  weapon: { color: 0x00f5ff, icon: '⚡', label: 'ARMA +1',       chance: 0.32 },
  shield: { color: 0x39ff14, icon: '⛨', label: 'ESCUDO 8s',     chance: 0.18 },
  double: { color: 0xff8800, icon: '✦', label: 'DANO DOBRO 10s', chance: 0.12 },
  bomb:   { color: 0xcc00ff, icon: '💥', label: 'NUKE',          chance: 0.08 },
};

// ─────────────────────────────────────────────────────────────────
// UPGRADES DE RUN — escolhidos ao subir de nível (3 cartas)
// ─────────────────────────────────────────────────────────────────
export const RUN_UPGRADES = [
  { id: 'dmg',      name: 'FIREPOWER',   icon: '🔥', desc: '+25% de dano',              max: 5, apply: (g) => { g.player.damageMult *= 1.25; } },
  { id: 'speed',    name: 'AFTERBURNER', icon: '⚡', desc: '+15% de velocidade',        max: 4, apply: (g) => { g.player.speed *= 1.15; } },
  { id: 'rof',      name: 'RAPID COILS', icon: '💨', desc: '-15% no tempo de recarga',  max: 4, apply: (g) => { g.player.cooldown = Math.max(45, g.player.cooldown * 0.85); } },
  { id: 'life',     name: 'HULL REPAIR', icon: '❤️', desc: '+1 vida (máx. 6)',          max: 3, apply: (g) => { g.player.lives = Math.min(g.player.lives + 1, 6); } },
  { id: 'magnet',   name: 'XP MAGNET',   icon: '🧲', desc: '+60% de raio de coleta',    max: 3, apply: (g) => { g.magnetRadius *= 1.6; } },
  { id: 'xp',       name: 'SCHOLAR',     icon: '📚', desc: '+30% de XP',                max: 3, apply: (g) => { g.xpMult += 0.3; } },
  { id: 'spread',   name: 'SPREAD SHOT', icon: '🌟', desc: '+1 tiro angulado',          max: 3, apply: (g) => { g.player.spread += 1; } },
  { id: 'pierce',   name: 'PIERCING',    icon: '➡️', desc: 'Tiros perfuram +1 inimigo', max: 2, apply: (g) => { g.player.pierce += 1; } },
  { id: 'aoe',      name: 'NOVA BURST',  icon: '💥', desc: 'Abates causam explosão',    max: 2, apply: (g) => { g.player.aoe += 1; } },
  { id: 'coins',    name: 'SCAVENGER',   icon: '💰', desc: '+30% de moedas',            max: 3, apply: (g) => { g.coinMult += 0.3; } },
  { id: 'crit',     name: 'CRITICAL',    icon: '🎯', desc: '+8% de chance de crítico',  max: 4, apply: (g) => { g.player.crit += 0.08; } },
  { id: 'shieldup', name: 'AEGIS',       icon: '🛡️', desc: 'Escudo dura +50%',          max: 2, apply: (g) => { g.player.shieldBonus += 0.5; } },
  { id: 'drone',    name: 'ESCORT',      icon: '🤖', desc: '+1 drone permanente',       max: 2, apply: (g) => { g.player.addDrone(); } },
  { id: 'cdr',      name: 'OVERCLOCK',   icon: '⏱️', desc: '-20% recarga da habilidade', max: 3, apply: (g) => { g.player.abilityCd *= 0.8; } },
  { id: 'regen',    name: 'NANO REGEN',  icon: '💚', desc: 'Cura 1 vida a cada 45s',    max: 2, apply: (g) => { g.player.regen += 1; } },
];

// ─────────────────────────────────────────────────────────────────
// CONQUISTAS
// ─────────────────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'FIRST BLOOD',      desc: 'Destrua o primeiro inimigo',   reward: 50,   icon: '💀', stat: 'kills',        goal: 1 },
  { id: 'boss_slayer', name: 'BOSS SLAYER',      desc: 'Derrote um chefe',             reward: 100,  icon: '👑', stat: 'bosses',       goal: 1 },
  { id: 'coin_king',   name: 'COIN COLLECTOR',   desc: 'Junte 1000 moedas no total',   reward: 200,  icon: '💰', stat: 'totalCoins',   goal: 1000 },
  { id: 'survivor',    name: 'SURVIVOR',         desc: 'Sobreviva 5 minutos',          reward: 150,  icon: '⏱️', stat: 'bestSurvival', goal: 300 },
  { id: 'combo',       name: 'COMBO MASTER',     desc: 'Combo de 10 abates',           reward: 300,  icon: '🔥', stat: 'maxCombo',     goal: 10 },
  { id: 'infinite',    name: 'INFINITE WARRIOR', desc: 'Chegue à onda 10 no Infinito', reward: 500,  icon: '∞',  stat: 'maxWave',      goal: 10 },
  { id: 'phase8',      name: 'PHASE MASTER',     desc: 'Complete a fase 8',            reward: 750,  icon: '🗺️', stat: 'maxPhase',     goal: 8 },
  { id: 'phase12',     name: 'ALÉM DO FINAL',    desc: 'Chegue à fase 12',             reward: 1500, icon: '🌌', stat: 'maxPhase',     goal: 12 },
  { id: 'powerups',    name: 'POWER CONSUMER',   desc: 'Colete 50 power-ups',          reward: 200,  icon: '⚡', stat: 'powerups',     goal: 50 },
  { id: 'level10',     name: 'ASCENSÃO',         desc: 'Chegue ao nível 10 numa run',  reward: 400,  icon: '🌟', stat: 'maxLevel',     goal: 10 },
  { id: 'allchars',    name: 'CHAR MASTER',      desc: 'Jogue com os 8 personagens',   reward: 600,  icon: '👥', stat: 'charsPlayed',  goal: 8 },
  { id: 'killer',      name: 'EXTERMINADOR',     desc: 'Destrua 500 inimigos',         reward: 800,  icon: '☠️', stat: 'kills',        goal: 500 },
];

// XP necessário para o próximo nível
export const xpForLevel = (lvl) => Math.floor(8 + lvl * 6 + lvl * lvl * 1.2);
