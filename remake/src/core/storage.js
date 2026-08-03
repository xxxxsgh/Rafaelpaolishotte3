// ──────────────────────────────────────────────────────────────
// storage.js — persistent profile (localStorage), versioned
// ──────────────────────────────────────────────────────────────

const KEY = 'rafaPaoli.remake.v1';
const VERSION = 1;

function defaults() {
  return {
    version: VERSION,
    coins: 0,
    pilots: ['marcelo'],
    skins: ['default'],
    equippedSkin: 'default',
    lastPilot: 'marcelo',
    achievements: [],
    settings: {
      master: 0.7,
      sfx: 0.9,
      music: 0.5,
      shake: 1,
      particles: 1, // 0 low · 1 normal · 2 extra
      autofire: true,
      showFps: false,
    },
    best: { campaign: 0, endless: 0, bossrush: 0, daily: 0 },
    bestWave: 0,
    stats: {
      runs: 0,
      kills: 0,
      bosses: 0,
      deaths: 0,
      coinsEarned: 0,
      bestCombo: 0,
      playSeconds: 0,
      phaseReached: 0,
      levelsGained: 0,
      pilotsUsed: [],
      powerupsTaken: 0,
      damageTaken: 0,
      perfectPhases: 0,
      campaignClears: 0,
    },
  };
}

/** Recursively fill in anything a save from an older build is missing. */
function reconcile(target, source) {
  for (const k of Object.keys(source)) {
    if (target[k] === undefined || target[k] === null) {
      target[k] = Array.isArray(source[k])
        ? source[k].slice()
        : typeof source[k] === 'object'
          ? reconcile({}, source[k])
          : source[k];
    } else if (
      typeof source[k] === 'object' &&
      !Array.isArray(source[k]) &&
      typeof target[k] === 'object'
    ) {
      reconcile(target[k], source[k]);
    }
  }
  return target;
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaults();
    return reconcile(parsed, defaults());
  } catch {
    return defaults();
  }
}

export const profile = read();

let writeTimer = 0;
export function save() {
  // Coalesce bursts of writes (achievements often unlock several at once).
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
    } catch {
      /* quota or private mode — the run still works, it just won't persist */
    }
  }, 120);
}

export function saveNow() {
  clearTimeout(writeTimer);
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function resetProfile() {
  const fresh = defaults();
  for (const k of Object.keys(profile)) delete profile[k];
  Object.assign(profile, fresh);
  saveNow();
}

export function addCoins(n) {
  const amount = Math.max(0, Math.floor(n));
  profile.coins += amount;
  profile.stats.coinsEarned += amount;
  save();
}

export function spendCoins(n) {
  if (profile.coins < n) return false;
  profile.coins -= n;
  save();
  return true;
}

export function recordBest(mode, score) {
  const prev = profile.best[mode] ?? 0;
  if (score > prev) {
    profile.best[mode] = Math.floor(score);
    save();
    return true;
  }
  return false;
}
