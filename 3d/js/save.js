// ═══════════════════════════════════════════════════════════════════
// SAVE — persistência em localStorage (moedas, desbloqueios, stats)
// ═══════════════════════════════════════════════════════════════════
import { ACHIEVEMENTS } from './config.js';

const KEY = 'rafa3d_save_v1';

const DEFAULT = {
  coins: 0,
  characters: ['marcelo'],
  skins: ['default'],
  equippedChar: 'marcelo',
  equippedSkin: 'default',
  achievements: [],
  settings: { volume: 0.5, sound: true, music: true, bloom: true, quality: 'high' },
  stats: {
    kills: 0, bosses: 0, totalCoins: 0, bestSurvival: 0, maxCombo: 0,
    maxWave: 0, maxPhase: 0, powerups: 0, maxLevel: 0, charsPlayed: 0, runs: 0,
    playedChars: [],
  },
  highscores: { campaign: 0, infinite: 0, survivor: 0 },
};

function deepMerge(base, over) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const k in over) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k]) {
      out[k] = deepMerge(base[k], over[k]);
    } else if (over[k] !== undefined) {
      out[k] = over[k];
    }
  }
  return out;
}

export const Save = {
  data: JSON.parse(JSON.stringify(DEFAULT)),

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = deepMerge(DEFAULT, JSON.parse(raw));
    } catch (e) {
      this.data = JSON.parse(JSON.stringify(DEFAULT));
    }
    return this.data;
  },

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* quota/priv mode */ }
  },

  addCoins(n) {
    n = Math.floor(n);
    if (n <= 0) return;
    this.data.coins += n;
    this.data.stats.totalCoins += n;
    this.save();
  },

  spend(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.save();
    return true;
  },

  has(list, id) { return this.data[list].includes(id); },

  unlock(list, id) {
    if (!this.data[list].includes(id)) this.data[list].push(id);
    this.save();
  },

  // Atualiza uma estatística (máximo ou acumulada) e devolve as conquistas novas
  stat(name, value, mode = 'add') {
    const s = this.data.stats;
    if (mode === 'max') s[name] = Math.max(s[name] || 0, value);
    else s[name] = (s[name] || 0) + value;
    return this.checkAchievements();
  },

  markCharPlayed(id) {
    const s = this.data.stats;
    if (!s.playedChars.includes(id)) {
      s.playedChars.push(id);
      s.charsPlayed = s.playedChars.length;
    }
    this.save();
  },

  checkAchievements() {
    const unlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (this.data.achievements.includes(a.id)) continue;
      const cur = this.data.stats[a.stat] || 0;
      if (cur >= a.goal) {
        this.data.achievements.push(a.id);
        this.data.coins += a.reward;
        this.data.stats.totalCoins += a.reward;
        unlocked.push(a);
      }
    }
    if (unlocked.length) this.save();
    return unlocked;
  },

  highscore(mode, score) {
    if (score > (this.data.highscores[mode] || 0)) {
      this.data.highscores[mode] = score;
      this.save();
      return true;
    }
    return false;
  },

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT));
    this.save();
  },
};
