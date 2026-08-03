// ──────────────────────────────────────────────────────────────
// progression.js — difficulty, in-run upgrade cards, power-ups,
// achievements. Everything the player earns lives here.
// ──────────────────────────────────────────────────────────────

export const DIFFICULTIES = {
  cadet: { id: 'cadet', label: 'CADET', enemyHp: 0.7, enemySpeed: 0.85, enemyDmg: 1, reward: 0.7, desc: 'Aprenda os padrões sem sofrer.' },
  pilot: { id: 'pilot', label: 'PILOT', enemyHp: 1, enemySpeed: 1, enemyDmg: 1, reward: 1, desc: 'A experiência como foi desenhada.' },
  ace: { id: 'ace', label: 'ACE', enemyHp: 1.45, enemySpeed: 1.15, enemyDmg: 1, reward: 1.5, desc: 'Mais vida, mais velocidade, mais bala.' },
  legend: { id: 'legend', label: 'LEGEND', enemyHp: 2.1, enemySpeed: 1.3, enemyDmg: 2, reward: 2.2, desc: 'Dano dobrado. Boa sorte.' },
};

export const MODES = {
  campaign: { id: 'campaign', label: 'CAMPANHA', desc: '10 fases, 10 chefes, um final.' },
  endless: { id: 'endless', label: 'INFINITO', desc: 'Ondas sem fim que só aceleram.' },
  bossrush: { id: 'bossrush', label: 'BOSS RUSH', desc: 'Os 10 chefes em sequência. Sem descanso.' },
  daily: { id: 'daily', label: 'DESAFIO DIÁRIO', desc: 'Seed do dia com um modificador. Uma tentativa por dia.' },
};

// ── Level-up cards ────────────────────────────────────────────
// `apply(p, run)` mutates the player / run state directly.

export const UPGRADES = [
  { id: 'dmg', name: 'FIREPOWER', icon: '🔥', desc: '+22% de dano', max: 6, color: '#ff4d6d', apply: (p) => (p.damageMul *= 1.22) },
  { id: 'rate', name: 'RAPID COILS', icon: '💨', desc: '+18% cadência de tiro', max: 5, color: '#00f5ff', apply: (p) => (p.fireMul *= 1.18) },
  { id: 'speed', name: 'AFTERBURNER', icon: '⚡', desc: '+12% de velocidade', max: 5, color: '#39ff14', apply: (p) => (p.speedMul *= 1.12) },
  { id: 'spread', name: 'SPREAD', icon: '🌟', desc: '+1 canhão lateral', max: 2, color: '#ffd60a', apply: (p) => (p.spread += 1) },
  { id: 'pierce', name: 'PIERCING', icon: '➡️', desc: 'Tiros atravessam +1 inimigo', max: 3, color: '#b388ff', apply: (p) => (p.pierce += 1) },
  { id: 'hp', name: 'HULL PLATING', icon: '❤️', desc: '+1 vida (e cura 1)', max: 4, color: '#ff006e', apply: (p) => { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 1); } },
  { id: 'magnet', name: 'MAGNETISMO', icon: '🧲', desc: '+70px de coleta', max: 3, color: '#4cc9f0', apply: (p) => (p.magnet += 70) },
  { id: 'xp', name: 'SCHOLAR', icon: '📚', desc: '+30% de XP', max: 3, color: '#90e0ef', apply: (p, run) => (run.xpMul += 0.3) },
  { id: 'coins', name: 'SCAVENGER', icon: '💰', desc: '+35% de créditos', max: 3, color: '#ffd60a', apply: (p, run) => (run.coinMul += 0.35) },
  { id: 'regen', name: 'BIO-REGEN', icon: '🌿', desc: 'Cura 1 a cada 25s', max: 2, color: '#39ff14', apply: (p) => (p.regen += 1) },
  { id: 'shieldTime', name: 'ESCUDO REFORÇADO', icon: '🛡️', desc: '+60% duração de escudo', max: 3, color: '#00f5ff', apply: (p) => (p.shieldMul += 0.6) },
  { id: 'cooldown', name: 'OVERCLOCK', icon: '♻️', desc: '-18% recarga da habilidade', max: 3, color: '#b388ff', apply: (p) => (p.cooldownMul *= 0.82) },
  { id: 'nova', name: 'NOVA BURST', icon: '💥', desc: 'Inimigos explodem ao morrer', max: 2, color: '#ff8c00', apply: (p) => (p.nova += 1) },
  { id: 'crit', name: 'PONTO FRACO', icon: '🎯', desc: '+12% de chance de crítico (×3)', max: 4, color: '#ff2fd0', apply: (p) => (p.crit += 0.12) },
  { id: 'invuln', name: 'GHOST FRAMES', icon: '👻', desc: '+0.5s de invulnerabilidade', max: 3, color: '#e0f7fa', apply: (p) => (p.invulnBonus += 0.5) },
  { id: 'orbit', name: 'ORBITAIS', icon: '🔵', desc: '+1 esfera que orbita e fere', max: 3, color: '#00f5ff', apply: (p) => (p.orbits += 1) },
  { id: 'lifesteal', name: 'PACTO', icon: '🩸', desc: '4% de chance de curar ao matar', max: 3, color: '#ff006e', apply: (p) => (p.lifesteal += 0.04) },
  { id: 'slowfield', name: 'CAMPO LENTO', icon: '🕸️', desc: 'Balas inimigas próximas ficam 30% mais lentas', max: 1, color: '#7b2fff', apply: (p) => (p.slowField = 1) },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

// ── Power-ups dropped by enemies ──────────────────────────────

export const POWERUPS = {
  heal: { id: 'heal', icon: '♥', color: '#ff006e', label: 'REPARO', weight: 18 },
  rapid: { id: 'rapid', icon: '⚡', color: '#00f5ff', label: 'RAPID FIRE', weight: 24, duration: 9 },
  shield: { id: 'shield', icon: '⛨', color: '#39ff14', label: 'ESCUDO', weight: 18, duration: 8 },
  double: { id: 'double', icon: '✦', color: '#ffd60a', label: 'DANO DOBRADO', weight: 16, duration: 10 },
  nuke: { id: 'nuke', icon: '☢', color: '#ff8c00', label: 'NUKE', weight: 8 },
  magnet: { id: 'magnet', icon: '🧲', color: '#b388ff', label: 'ÍMÃ', weight: 12, duration: 12 },
};

const POWERUP_TABLE = Object.values(POWERUPS).flatMap((p) => Array(p.weight).fill(p.id));

export function rollPowerup(rand) {
  return POWERUP_TABLE[Math.floor(rand() * POWERUP_TABLE.length)];
}

// ── Achievements ──────────────────────────────────────────────
// `check` receives the persistent stats object.

export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'PRIMEIRO SANGUE', desc: 'Destrua 1 inimigo', icon: '💀', reward: 40, goal: 1, get: (s) => s.kills },
  { id: 'hundred', name: 'CENTURIÃO', desc: 'Destrua 100 inimigos', icon: '⚔️', reward: 120, goal: 100, get: (s) => s.kills },
  { id: 'thousand', name: 'EXTERMINADOR', desc: 'Destrua 1000 inimigos', icon: '☠️', reward: 600, goal: 1000, get: (s) => s.kills },
  { id: 'boss1', name: 'MATADOR DE CHEFES', desc: 'Derrote um chefe', icon: '👑', reward: 100, goal: 1, get: (s) => s.bosses },
  { id: 'boss10', name: 'CAÇADOR DE LENDAS', desc: 'Derrote 10 chefes', icon: '🏹', reward: 400, goal: 10, get: (s) => s.bosses },
  { id: 'clear', name: 'O CRIADOR CAIU', desc: 'Termine a campanha', icon: '🏆', reward: 1200, goal: 1, get: (s) => s.campaignClears },
  { id: 'combo20', name: 'MESTRE DO COMBO', desc: 'Alcance combo ×20', icon: '🔥', reward: 250, goal: 20, get: (s) => s.bestCombo },
  { id: 'combo50', name: 'IMPARÁVEL', desc: 'Alcance combo ×50', icon: '🌋', reward: 700, goal: 50, get: (s) => s.bestCombo },
  { id: 'rich', name: 'COLECIONADOR', desc: 'Acumule 5000 créditos', icon: '💰', reward: 300, goal: 5000, get: (s) => s.coinsEarned },
  { id: 'levels', name: 'EVOLUÍDO', desc: 'Ganhe 50 níveis no total', icon: '📈', reward: 350, goal: 50, get: (s) => s.levelsGained },
  { id: 'wave20', name: 'SOBREVIVENTE', desc: 'Chegue à onda 20 no Infinito', icon: '∞', reward: 500, goal: 20, get: (s, p) => p.bestWave },
  { id: 'allpilots', name: 'ESQUADRÃO COMPLETO', desc: 'Pilote os 8 personagens', icon: '👥', reward: 800, goal: 8, get: (s) => s.pilotsUsed.length },
  { id: 'perfect', name: 'INTOCÁVEL', desc: 'Complete uma fase sem tomar dano', icon: '✨', reward: 300, goal: 1, get: (s) => s.perfectPhases },
  { id: 'powerups', name: 'CONSUMIDOR', desc: 'Pegue 100 power-ups', icon: '⚡', reward: 250, goal: 100, get: (s) => s.powerupsTaken },
  { id: 'marathon', name: 'MARATONISTA', desc: 'Jogue por 1 hora no total', icon: '⏳', reward: 400, goal: 3600, get: (s) => s.playSeconds },
];

/**
 * Re-evaluates every achievement; returns the ones unlocked just now.
 */
export function checkAchievements(profile) {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (profile.achievements.includes(a.id)) continue;
    if (a.get(profile.stats, profile) >= a.goal) {
      profile.achievements.push(a.id);
      profile.coins += a.reward;
      profile.stats.coinsEarned += a.reward;
      unlocked.push(a);
    }
  }
  return unlocked;
}

export function achievementProgress(profile, a) {
  const cur = Math.min(a.get(profile.stats, profile), a.goal);
  return { cur, goal: a.goal, pct: cur / a.goal, done: profile.achievements.includes(a.id) };
}

// ── Daily modifiers ───────────────────────────────────────────

export const DAILY_MODIFIERS = [
  { id: 'glass', name: 'CASCO DE VIDRO', desc: '1 de vida, dano ×2', apply: (p) => { p.maxHp = 1; p.hp = 1; p.damageMul *= 2; } },
  { id: 'swarm', name: 'ENXAME', desc: 'Dobro de inimigos, metade da vida deles', apply: (p, run) => { run.spawnMul = 2; run.enemyHpMul = 0.5; } },
  { id: 'speedrun', name: 'HIPERVELOCIDADE', desc: 'Tudo 40% mais rápido', apply: (p, run) => { run.timeScale = 1.4; p.speedMul *= 1.25; } },
  { id: 'sniper', name: 'ATIRADOR', desc: 'Cadência -50%, dano ×3', apply: (p) => { p.fireMul *= 0.5; p.damageMul *= 3; } },
  { id: 'richie', name: 'CORRIDA DO OURO', desc: 'Créditos ×3, inimigos mais fortes', apply: (p, run) => { run.coinMul *= 3; run.enemyHpMul = 1.5; } },
  { id: 'pacifist', name: 'ENXAME LENTO', desc: 'Inimigos lentos mas numerosos', apply: (p, run) => { run.enemySpeedMul = 0.6; run.spawnMul = 2.2; } },
  { id: 'orbital', name: 'DEFESA ORBITAL', desc: 'Começa com 3 orbitais', apply: (p) => { p.orbits += 3; } },
];
