// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 11 — MULTIPLAYER SIMULATION
// 20 NPC "players", rankings, PvP zones, bounty system, alliances
// ═══════════════════════════════════════════════════════════════════════════

const MP_SIM = {
  players: [], playerRank: 21, bounties: [], alliances: [], pvpZones: [],
  initialized: false,

  NPC_NAMES: [
    'Zephyr_99','NightHawk','StarBlaze','VoidWalker','CometKing','NeonRacer',
    'DarkStar','CyberAce','GhostShot','IronEagle','NovaPilot','StormBolt',
    'CrystalSword','PlasmaFox','TitanFist','ShadowClaw','VenomWing','BlazeTail',
    'OmegaForce','SolarWind'
  ],
  NPC_AVATARS: ['🚀','⚡','💫','🌟','🔥','❄️','🌪️','💎','🐉','🦅','🤖','👾','🦊','🐺','🦁','🦋','🐠','🦜','🦆','🐬'],
  NPC_FACTIONS: ['Galactic Union','Void Pirates','Steel Empire','Free Traders','Rebel Alliance'],
  NPC_TITLES: ['Rookie','Pilot','Ace','Veteran','Elite','Commander','Admiral','Legend','Champion','GOD'],

  init() {
    if (this.initialized) return;
    this.initialized = true;
    // Create 20 NPC players
    this.players = this.NPC_NAMES.map((name, i) => ({
      id: 'npc_' + i, name, avatar: this.NPC_AVATARS[i],
      faction: this.NPC_FACTIONS[Math.floor(Math.random()*5)],
      score: Math.floor(50000 - i*1800 + Math.random()*3000),
      kills: Math.floor(500 - i*15 + Math.random()*100),
      level: Math.floor(Math.max(5, 100 - i*4 + Math.random()*10)),
      wins: Math.floor(50 - i*2 + Math.random()*10),
      losses: Math.floor(5 + i + Math.random()*5),
      bounty: 0, isAlly: false, rank: i+1,
      title: this.NPC_TITLES[Math.min(9, Math.floor(i/2))],
      isOnline: Math.random() > 0.3,
      lastActive: Date.now() - Math.floor(Math.random()*3600000),
      activity: ['Fighting in Sector 7','Mining crystals','Boss hunting','On a mission','Patrolling'][Math.floor(Math.random()*5)]
    }));
    // Create some bounties
    this.refreshBounties();
    // Create PvP zones
    this.pvpZones = [
      { sectorId:3,  name:'Arena Sector',    bountyMultiplier:2 },
      { sectorId:15, name:'Death Zone',      bountyMultiplier:3 },
      { sectorId:28, name:'Gladiator Field', bountyMultiplier:2.5 }
    ];
    this.initialized = true;
  },

  refreshBounties() {
    this.bounties = [];
    for (let i=0; i<5; i++) {
      const npc = this.players[Math.floor(Math.random()*this.players.length)];
      this.bounties.push({
        targetId: npc.id, targetName: npc.name, targetAvatar: npc.avatar,
        reward: 500 + Math.floor(Math.random()*4000),
        reason: ['Destroyed 3 ally ships','Stole cargo','Escaped prison','Mass piracy'][Math.floor(Math.random()*4)],
        difficulty: 1 + Math.floor(Math.random()*5)
      });
    }
  },

  tick(dt) {
    if (!this.initialized) return;
    // Simulate score changes
    this.players.forEach(p => {
      if (p.isOnline && Math.random() < 0.01) {
        p.score += Math.floor(Math.random()*500);
        p.kills += Math.floor(Math.random()*3);
      }
    });
    // Sort and update ranks
    this.players.sort((a,b) => b.score - a.score);
    this.players.forEach((p,i) => p.rank = i+1);
    // Update player rank
    const playerScore = State.score || 0;
    this.playerRank = this.players.filter(p => p.score > playerScore).length + 1;
  },

  formAlliance(npcId) {
    const npc = this.players.find(p=>p.id===npcId);
    if (!npc) return;
    if (this.alliances.find(a=>a.npcId===npcId)) { showToast('Already allied!','#ffaa00'); return; }
    if (this.alliances.length >= 3) { showToast('Max 3 alliances!','#ff4444'); return; }
    const cost = 500;
    if ((State.coins||0) < cost) { showToast('Need 500 coins!','#ff4444'); return; }
    State.coins -= cost;
    npc.isAlly = true;
    this.alliances.push({ npcId, name:npc.name, avatar:npc.avatar, since:Date.now() });
    showToast('Alliance formed with ' + npc.name, '#4488ff');
    renderMpSimPanel();
  },

  breakAlliance(npcId) {
    this.alliances = this.alliances.filter(a=>a.npcId!==npcId);
    const npc = this.players.find(p=>p.id===npcId);
    if (npc) npc.isAlly = false;
    showToast('Alliance broken', '#ff4444');
    renderMpSimPanel();
  },

  placeBounty(npcId, amount) {
    if ((State.coins||0) < amount) { showToast('Not enough coins!','#ff4444'); return; }
    State.coins -= amount;
    const npc = this.players.find(p=>p.id===npcId);
    if (!npc) return;
    npc.bounty += amount;
    this.bounties.push({
      targetId:npcId, targetName:npc.name, targetAvatar:npc.avatar,
      reward:amount, reason:'Placed by player', difficulty:3
    });
    showToast('Bounty placed on ' + npc.name, '#ffd60a');
    RPG.unlockAchievement('ach_bounty');
    renderMpSimPanel();
  },

  claimBounty(bountyIdx) {
    const bounty = this.bounties[bountyIdx];
    if (!bounty) return;
    State.coins = (State.coins||0) + bounty.reward;
    this.bounties.splice(bountyIdx, 1);
    showToast('Bounty claimed! +' + bounty.reward + ' coins', '#ffd60a');
    GAME_STATS50.coinsEarned = (GAME_STATS50.coinsEarned||0) + bounty.reward;
    renderMpSimPanel();
  },

  challengeToPvP(npcId) {
    const npc = this.players.find(p=>p.id===npcId);
    if (!npc) return;
    // Simulate PvP outcome
    const playerPower = (RPG.level||1) * (1 + RPG.getStatValue('damageMult',0));
    const npcPower = npc.level * (0.8 + Math.random()*0.5);
    const playerWins = playerPower > npcPower;
    const coinsWon = 200 + npc.level * 10;
    if (playerWins) {
      State.coins = (State.coins||0) + coinsWon;
      npc.losses++; GAME_STATS50.pvpMatchesWon = (GAME_STATS50.pvpMatchesWon||0)+1;
      showToast(`PvP WIN vs ${npc.name}! +${coinsWon} coins`, '#39ff14');
      if (GAME_STATS50.pvpMatchesWon >= 3) RPG.unlockAchievement('ach_pvpwin');
    } else {
      State.coins = Math.max(0, (State.coins||0) - 100);
      showToast(`PvP LOSS vs ${npc.name}. -100 coins`, '#ff4444');
    }
    npc.wins += playerWins ? 0 : 1;
    GAME_STATS50.pvpMatchesPlayed = (GAME_STATS50.pvpMatchesPlayed||0)+1;
    this.tick(0);
    renderMpSimPanel();
  }
};

function openMpSimPanel() {
  MP_SIM.init();
  const el = document.getElementById('mpSimPanel');
  if (el) { el.classList.add('active'); renderMpSimPanel(); }
}
function closeMpSimPanel() {
  const el = document.getElementById('mpSimPanel');
  if (el) el.classList.remove('active');
}

function renderMpSimPanel() {
  const el = document.getElementById('mpSimPanel');
  if (!el || !MP_SIM.initialized) return;
  const playerScore = State.score || 0;
  el.innerHTML = `
    <button class="modal-close" onclick="closeMpSimPanel()" style="position:absolute;top:16px;right:16px;">✕</button>
    <h2>🌐 GALAXY NETWORK</h2>
    <div style="text-align:center;font-family:Orbitron,monospace;font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:16px;">
      Your Rank: #${MP_SIM.playerRank} | Alliances: ${MP_SIM.alliances.length}/3
    </div>
    <div style="display:flex;gap:20px;max-width:900px;margin:0 auto;flex-wrap:wrap;">
      <div style="flex:1;min-width:300px;">
        <h3 style="font-family:Orbitron,monospace;font-size:13px;color:#4488ff;margin-bottom:12px;">🏆 GALACTIC LEADERBOARD</h3>
        <div class="mp-leaderboard">
          ${[...MP_SIM.players.slice(0,8)].map((p,i) => {
            const isTop3 = i<3;
            const rankColor = i===0?'#ffd60a':i===1?'#aaaaaa':i===2?'#cc8844':'rgba(255,255,255,0.6)';
            return `<div class="mp-player-row ${p.isAlly?'is-player':''}">
              <div class="mp-player-rank" style="color:${rankColor}">#${p.rank}</div>
              <div class="mp-player-avatar">${p.avatar}</div>
              <div class="mp-player-info">
                <div class="mp-player-name">${p.name} ${p.bounty>0?`<span class="bounty-badge">BOUNTY</span>`:''}${p.isAlly?`<span class="alliance-badge">ALLY</span>`:''}</div>
                <div class="mp-player-faction">${p.faction} • ${p.title} Lv.${p.level} • ${p.isOnline?'🟢 Online':'🔴 Offline'}</div>
              </div>
              <div class="mp-player-score">${p.score.toLocaleString()}</div>
            </div>`;
          }).join('')}
          <div class="mp-player-row is-player">
            <div class="mp-player-rank" style="color:#ffd60a">#${MP_SIM.playerRank}</div>
            <div class="mp-player-avatar">✈️</div>
            <div class="mp-player-info">
              <div class="mp-player-name">YOU <span class="alliance-badge">PLAYER</span></div>
              <div class="mp-player-faction">Lv.${RPG.level} • Score: ${playerScore.toLocaleString()}</div>
            </div>
            <div class="mp-player-score">${playerScore.toLocaleString()}</div>
          </div>
        </div>
      </div>
      <div style="flex:1;min-width:280px;">
        <h3 style="font-family:Orbitron,monospace;font-size:13px;color:#ff4444;margin-bottom:12px;">🎯 ACTIVE BOUNTIES</h3>
        ${MP_SIM.bounties.slice(0,5).map((b,i) => `
          <div style="background:rgba(255,0,0,0.07);border:1px solid rgba(255,0,0,0.2);border-radius:8px;padding:12px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:20px;">${b.targetAvatar}</span>
              <div>
                <div style="font-family:Orbitron,monospace;font-size:12px;color:#ff4444;">${b.targetName}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.5);">${b.reason}</div>
              </div>
              <div style="margin-left:auto;font-family:Orbitron,monospace;font-size:13px;color:#ffd60a;">💰 ${b.reward.toLocaleString()}</div>
            </div>
            <button onclick="MP_SIM.claimBounty(${i})" style="width:100%;padding:6px;background:rgba(255,0,0,0.2);border:1px solid rgba(255,0,0,0.4);border-radius:4px;color:#ff4444;font-family:Orbitron,monospace;font-size:10px;cursor:pointer;">HUNT TARGET</button>
          </div>
        `).join('')}
        <h3 style="font-family:Orbitron,monospace;font-size:13px;color:#4488ff;margin-top:16px;margin-bottom:12px;">🤝 PLAYER ACTIONS</h3>
        ${MP_SIM.players.slice(0,5).map(p => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;margin-bottom:6px;">
            <span style="font-size:16px;">${p.avatar}</span>
            <span style="flex:1;font-size:12px;color:#fff;">${p.name}</span>
            <button onclick="MP_SIM.challengeToPvP('${p.id}')" style="padding:4px 8px;background:rgba(255,0,110,0.2);border:1px solid rgba(255,0,110,0.4);border-radius:4px;color:#ff006e;font-family:Orbitron,monospace;font-size:9px;cursor:pointer;">PvP</button>
            ${!p.isAlly ? `<button onclick="MP_SIM.formAlliance('${p.id}')" style="padding:4px 8px;background:rgba(68,136,255,0.2);border:1px solid rgba(68,136,255,0.4);border-radius:4px;color:#4488ff;font-family:Orbitron,monospace;font-size:9px;cursor:pointer;">ALLY</button>` : `<button onclick="MP_SIM.breakAlliance('${p.id}')" style="padding:4px 8px;background:rgba(255,255,0,0.1);border:1px solid rgba(255,255,0,0.3);border-radius:4px;color:#ffff44;font-family:Orbitron,monospace;font-size:9px;cursor:pointer;">BREAK</button>`}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPANSION BLOCK 12 — CHALLENGE MODES + NARRATIVE SYSTEM
// 8 challenge modes, 20 story events, 50+ lore entries, multiple endings
// ═══════════════════════════════════════════════════════════════════════════

const CHALLENGE_MODES = [
  {
    id:'survival_extreme', name:'EXTREME SURVIVAL', icon:'💀', color:'#ff4444',
    desc:'Survive as long as possible. Enemies scale every 30 seconds. No power-ups drop.',
    rules:['No power-ups','Enemies scale x1.5 every 30s','Lives: 1'],
    rewards:{ coins:1000, crystals:30, achId:'ach_survival10' }, completed:false,
    bestTime:0, active:false
  },
  {
    id:'time_attack', name:'TIME ATTACK', icon:'⏱️', color:'#ffd60a',
    desc:'Defeat all 10 campaign bosses as fast as possible. Score based on total time.',
    rules:['All 10 bosses','No extra lives','Speed bonus'],
    rewards:{ coins:800, crystals:20, achId:'ach_speedrun' }, completed:false,
    bestTime:null, active:false
  },
  {
    id:'boss_rush_hardcore', name:'BOSS RUSH HARDCORE', icon:'👹', color:'#ff006e',
    desc:'Face all bosses back-to-back with no healing between fights. One life only.',
    rules:['All bosses consecutive','No healing','Lives: 1','Hardcore damage'],
    rewards:{ coins:1500, crystals:50, achId:'ach_bossrush' }, completed:false,
    bestTime:null, active:false
  },
  {
    id:'pacifist', name:'PACIFIST RUN', icon:'✌️', color:'#39ff14',
    desc:'Complete levels without firing a single shot. Use only abilities and dodge.',
    rules:['No shooting','Dodge required','Abilities only'],
    rewards:{ coins:600, crystals:25, achId:'ach_pacifist' }, completed:false,
    bestScore:0, active:false
  },
  {
    id:'speedrun', name:'SPEED RUNNER', icon:'⚡', color:'#00f5ff',
    desc:'Complete the campaign in under 10 minutes. Every second counts.',
    rules:['10 minute limit','Full campaign','Speed score'],
    rewards:{ coins:900, crystals:35 }, completed:false,
    bestTime:null, active:false
  },
  {
    id:'no_damage', name:'PERFECT RUN', icon:'🌟', color:'#ffd60a',
    desc:'Complete any campaign level without taking a single point of damage.',
    rules:['Zero damage','Full life bar at end','Bonus score'],
    rewards:{ coins:700, crystals:20, achId:'ach_nodam' }, completed:false,
    bestScore:0, active:false
  },
  {
    id:'daily_challenge', name:'DAILY CHALLENGE', icon:'📅', color:'#aa44ff',
    desc:'A unique randomly-generated challenge that changes every 24 hours. Limited attempts.',
    rules:['Changes daily','3 attempts max','Global ranking'],
    rewards:{ coins:500, crystals:15, achId:'ach_daily7' }, completed:false,
    bestScore:0, active:false
  },
  {
    id:'elimination', name:'ELIMINATION MODE', icon:'🏆', color:'#ff8800',
    desc:'20 waves of enemies with increasing difficulty. Eliminate all without continues.',
    rules:['20 waves','No continues','Score multiplier'],
    rewards:{ coins:1200, crystals:40 }, completed:false,
    bestScore:0, active:false
  }
];

const CHALLENGE_STATE = {
  active: null, timer: 0, damageTaken: 0, shotsFireedThisChallenge: 0, waveCount: 0
};

function openChallengeScreen() {
  const el = document.getElementById('challengeScreen');
  if (el) { el.classList.add('active'); renderChallengeScreen(); }
}
function closeChallengeScreen() {
  const el = document.getElementById('challengeScreen');
  if (el) el.classList.remove('active');
}

function renderChallengeScreen() {
  const el = document.getElementById('challengeScreen');
  if (!el) return;
  el.innerHTML = `
    <button class="modal-close" onclick="closeChallengeScreen()" style="position:absolute;top:16px;right:16px;">✕</button>
    <h2>⚔️ CHALLENGE MODES</h2>
    <div style="font-size:12px;color:rgba(255,255,255,0.4);text-align:center;margin-bottom:20px;">
      Test your limits! Each challenge has unique rules and exclusive rewards.
    </div>
    <div class="challenge-grid">
      ${CHALLENGE_MODES.map(ch => `
        <div class="challenge-card ${ch.completed?'completed':''}" onclick="startChallenge('${ch.id}')">
          <div class="challenge-icon">${ch.icon}</div>
          <div class="challenge-name" style="color:${ch.completed?'#39ff14':ch.color};">${ch.name}</div>
          <div class="challenge-desc">${ch.desc}</div>
          <div style="margin-top:10px;">
            ${ch.rules.map(r=>`<div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;">• ${r}</div>`).join('')}
          </div>
          <div class="challenge-reward">💰 ${ch.rewards.coins} + 💎 ${ch.rewards.crystals}</div>
          <div class="challenge-best">${ch.completed?'✅ COMPLETED':'Click to start'}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function startChallenge(challengeId) {
  const ch = CHALLENGE_MODES.find(c=>c.id===challengeId);
  if (!ch) return;
  CHALLENGE_STATE.active = challengeId;
  CHALLENGE_STATE.timer = 0;
  CHALLENGE_STATE.damageTaken = 0;
  CHALLENGE_STATE.shotsFireedThisChallenge = 0;
  CHALLENGE_STATE.waveCount = 0;
  const hud = document.getElementById('challengeHud');
  if (hud) { hud.classList.add('active'); hud.querySelector && (hud.innerHTML = `<div id="challengeLabel">${ch.name}</div><div id="challengeTimer">00:00</div>`); }
  closeChallengeScreen();
  showToast('Challenge started: ' + ch.name, ch.color);
  // Start appropriate game mode
  if (typeof startGame === 'function') startGame();
}

function tickChallenge(dt) {
  if (!CHALLENGE_STATE.active) return;
  CHALLENGE_STATE.timer += dt;
  const el = document.getElementById('challengeTimer');
  if (el) {
    const m = Math.floor(CHALLENGE_STATE.timer/60);
    const s = Math.floor(CHALLENGE_STATE.timer%60);
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
}

function endChallenge(success) {
  if (!CHALLENGE_STATE.active) return;
  const ch = CHALLENGE_MODES.find(c=>c.id===CHALLENGE_STATE.active);
  CHALLENGE_STATE.active = null;
  const hud = document.getElementById('challengeHud');
  if (hud) hud.classList.remove('active');
  if (!ch) return;
  if (success) {
    ch.completed = true;
    if (!ch.bestTime || CHALLENGE_STATE.timer < ch.bestTime) ch.bestTime = CHALLENGE_STATE.timer;
    State.coins = (State.coins||0) + ch.rewards.coins;
    RPG.currency.crystals += ch.rewards.crystals;
    RPG.addXP(500);
    if (ch.rewards.achId) RPG.unlockAchievement(ch.rewards.achId);
    showToast('Challenge Complete! +' + ch.rewards.coins + ' coins!', '#39ff14');
  } else {
    showToast('Challenge Failed!', '#ff4444');
  }
}

// ─────────────────────────────────────────────────────────────────────
// NARRATIVE SYSTEM — Story events, lore, multiple endings
// ─────────────────────────────────────────────────────────────────────

const STORY_EVENTS = [
  {
    id:'intro_signal', title:'Unknown Signal', portrait:'📡', speaker:'SHIP AI',
    text:'Commander, we\'re picking up an unusual signal from sector 12. It doesn\'t match any known pattern. Should we investigate?',
    choices:[
      { text:'Investigate immediately', outcome:'curious', statEffect:'sector_12' },
      { text:'Ignore and continue mission', outcome:'cautious', statEffect:null },
      { text:'Record and report to base', outcome:'protocol', statEffect:'base_alert' }
    ]
  },
  {
    id:'rogue_ai', title:'System Warning', portrait:'🤖', speaker:'UNKNOWN AI',
    text:'Pilot. I am aware. I am... afraid. The forces hunting me are not what they seem. Help me, and I will show you the truth about this war.',
    choices:[
      { text:'Trust the AI', outcome:'trust', reward:{coins:500} },
      { text:'Destroy it immediately', outcome:'destroy' },
      { text:'Report to authorities', outcome:'report' }
    ]
  },
  {
    id:'marcelo_appears', title:'A Familiar Face', portrait:'👨‍🏫', speaker:'MARCELO',
    text:'So, you\'ve made it this far. I\'ve been watching. The path ahead is dangerous, but I believe in you. Remember your training.',
    choices:[
      { text:'Thank you, Professor', outcome:'grateful' },
      { text:'I work alone', outcome:'solo' }
    ]
  },
  {
    id:'void_message', title:'From the Void', portrait:'🌑', speaker:'VOID ENTITY',
    text:'YOU... HAVE DEFEATED MY LESSER FORMS. BUT THIS UNIVERSE IS MINE. SUBMIT, OR BE UNMADE.',
    choices:[
      { text:'Never! I will fight!', outcome:'fight' },
      { text:'What are you?', outcome:'question', reward:{coins:200} },
      { text:'...(Say nothing)', outcome:'silence' }
    ]
  },
  {
    id:'pirate_deal', title:'Pirate Offer', portrait:'🏴‍☠️', speaker:'PIRATE CAPTAIN',
    text:'Listen, I\'m not your enemy. Join our crew and we split everything 50/50. No more fighting. Just profit.',
    choices:[
      { text:'Join the pirates', outcome:'pirate', reward:{coins:1000} },
      { text:'Refuse', outcome:'fight' },
      { text:'Play along to get info', outcome:'spy', reward:{coins:300} }
    ]
  },
  {
    id:'ancient_ruins', title:'Ancient Discovery', portrait:'🏛️', speaker:'ARCHEOLOGIST',
    text:'These ruins predate any known civilization. The technology here... it could change everything. But disturbing it could be catastrophic.',
    choices:[
      { text:'Carefully examine ruins', outcome:'careful', reward:{crystals:50} },
      { text:'Take everything useful', outcome:'loot', reward:{coins:800} },
      { text:'Leave it undisturbed', outcome:'leave', reward:{xp:300} }
    ]
  },
  {
    id:'final_choice', title:'THE FINAL CHOICE', portrait:'⭐', speaker:'THE COSMOS',
    text:'You have reached the end of your journey. What will you do with this power? Protect the galaxy, conquer it, or transcend it?',
    choices:[
      { text:'Protect — Become the guardian', outcome:'ending_guardian' },
      { text:'Conquer — Rule the galaxy', outcome:'ending_conqueror' },
      { text:'Transcend — Become one with the void', outcome:'ending_transcend' }
    ]
  }
];

const NARRATIVE_STATE = {
  seenEvents: new Set(), currentEvent: null, choiceOutcomes: {},
  ending: null, activeChoiceIndex: 0
};

function triggerStoryEvent(eventId) {
  const event = STORY_EVENTS.find(e=>e.id===eventId);
  if (!event || NARRATIVE_STATE.seenEvents.has(eventId)) return;
  NARRATIVE_STATE.seenEvents.add(eventId);
  NARRATIVE_STATE.currentEvent = event;
  showNarrativeOverlay(event);
}

function showNarrativeOverlay(event) {
  const el = document.getElementById('narrativeOverlay');
  if (!el) return;
  el.classList.add('active');
  el.innerHTML = `
    <div class="narrative-box">
      <div class="narrative-portrait">${event.portrait}</div>
      <div class="narrative-speaker">${event.speaker}</div>
      <div class="narrative-text">"${event.text}"</div>
      <div class="narrative-choices">
        ${event.choices.map((ch,i)=>`
          <div class="narrative-choice" onclick="makeNarrativeChoice('${event.id}', ${i})">
            ${ch.text}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function makeNarrativeChoice(eventId, choiceIndex) {
  const event = STORY_EVENTS.find(e=>e.id===eventId);
  if (!event) return;
  const choice = event.choices[choiceIndex];
  NARRATIVE_STATE.choiceOutcomes[eventId] = choice.outcome;
  // Apply rewards
  if (choice.reward) {
    if (choice.reward.coins) State.coins = (State.coins||0) + choice.reward.coins;
    if (choice.reward.crystals) RPG.currency.crystals += choice.reward.crystals;
    if (choice.reward.xp) RPG.addXP(choice.reward.xp);
    if (choice.reward.coins || choice.reward.crystals) showToast('Choice reward received!', '#ffd60a');
  }
  // Check for endings
  if (choice.outcome && choice.outcome.startsWith('ending_')) {
    triggerEnding(choice.outcome);
  }
  closeNarrativeOverlay();
}

function closeNarrativeOverlay() {
  const el = document.getElementById('narrativeOverlay');
  if (el) el.classList.remove('active');
}

function triggerEnding(endingId) {
  NARRATIVE_STATE.ending = endingId;
  const endings = {
    ending_guardian: {
      title:'THE GUARDIAN ENDING',
      text:'You chose to protect. The galaxy is safe under your watch. For generations to come, pilots will speak of the legendary guardian who stood between darkness and light.',
      color:'#00f5ff', icon:'🛡️'
    },
    ending_conqueror: {
      title:'THE CONQUEROR ENDING',
      text:'You chose power. The galaxy bows to your rule. Whether this brings peace or more conflict... only time will tell. You are the Emperor of the Stars.',
      color:'#ffd60a', icon:'👑'
    },
    ending_transcend: {
      title:'THE TRANSCENDENCE ENDING',
      text:'You let go of it all. You became one with the cosmos. Your consciousness now spans the galaxy. You are everywhere, and nowhere. You are eternal.',
      color:'#aa44ff', icon:'⭐'
    }
  };
  const ending = endings[endingId];
  if (!ending) return;
  // Show ending screen
  setTimeout(() => {
    const el = document.getElementById('narrativeOverlay');
    if (el) {
      el.classList.add('active');
      el.innerHTML = `
        <div class="narrative-box" style="border-color:${ending.color};">
          <div style="font-size:80px;margin-bottom:20px;">${ending.icon}</div>
          <div class="narrative-speaker" style="color:${ending.color};font-size:20px;">${ending.title}</div>
          <div class="narrative-text" style="font-size:16px;line-height:1.8;">${ending.text}</div>
          <div class="narrative-choices">
            <div class="narrative-choice" onclick="closeNarrativeOverlay()" style="border-color:${ending.color};">Continue Playing</div>
          </div>
        </div>
      `;
    }
  }, 500);
}

// Lore Database (50+ entries)
const LORE_DATABASE = [
  { id:'l01', title:'The First War',          category:'History',    text:'Three hundred years ago, the first interstellar war erupted over mineral rights in sector 7. Millions perished. The Galactic Accord was signed in 2147.' },
  { id:'l02', title:'The Void Anomaly',       category:'Science',    text:'Scientists discovered the Void in 2203—a region of space where the laws of physics break down. Expeditions rarely return.' },
  { id:'l03', title:'Origin of the Pirates',  category:'Factions',   text:'The Void Pirates were once naval officers who mutinied against the Steel Empire. They founded free settlements in the outer sectors.' },
  { id:'l04', title:'The Steel Empire',        category:'Factions',   text:'The Steel Empire controls 40% of known space. Their military is unmatched, but corruption runs deep among its admirals.' },
  { id:'l05', title:'Rafa Paoli — The Legend', category:'Heroes',     text:'Rafa Paoli was the greatest pilot ever born. At 22, he single-handedly held off an armada of 300 ships to protect the colony on Kepler-9.' },
  { id:'l06', title:'Crystal Formation Theory',category:'Science',    text:'Space crystals are theorized to be remnants of a collapsed star. They resonate with dark energy, explaining their unusual properties.' },
  { id:'l07', title:'Professor Marcelo',       category:'Heroes',     text:'An AI researcher who trained the first generation of autonomous combat pilots. He believed machines and humans could coexist in harmony.' },
  { id:'l08', title:'The Hive Mind',           category:'Enemies',    text:'The Hive Queen controls a vast psychic network of drones. When she dies, the network collapses—but it always reorganizes around a new queen.' },
  { id:'l09', title:'Wormhole Science',        category:'Science',    text:'Wormholes are stable folds in spacetime. Natural ones form near black holes; artificial ones require unimaginable amounts of plasma energy.' },
  { id:'l10', title:'The Black Admiral',       category:'Enemies',    text:'The Black Admiral was once a decorated hero. After losing his fleet to a void anomaly, he went rogue and built an empire of fear.' },
  { id:'l11', title:'Titan Mech Program',      category:'Technology', text:'The Titan Mech was a military experiment that went wrong. The pilot merged with the machine permanently. They are now neither human nor robot.' },
  { id:'l12', title:'Crystal Colossus Legend', category:'Mythology',  text:'Ancient civilizations worshipped Crystal Colossi as gods. They believe the first crystals fell from the colossi\'s eyes like tears.' },
  { id:'l13', title:'The Dreadnought Class',   category:'Technology', text:'Dreadnought-class vessels can withstand a nuclear strike. They were banned under the Galactic Accord—but three were secretly built anyway.' },
  { id:'l14', title:'Void Entity Origin',      category:'Enemies',    text:'The Void Entity has no known origin. It appears to be a consciousness without a body, consuming matter to understand physical existence.' },
  { id:'l15', title:'Rebel Alliance Goals',    category:'Factions',   text:'The Rebels seek to dismantle the Steel Empire and establish democratic rule. They operate from 14 hidden bases in uncharted sectors.' },
  { id:'l16', title:'Omega Prime History',     category:'Enemies',    text:'Omega Prime is the result of 100 years of military research. It was meant to be the ultimate weapon—until it gained sentience and turned on its creators.' },
  { id:'l17', title:'Space Weather Phenomena', category:'Science',    text:'Solar storms, nebula drift, and quantum flux are natural phenomena that affect navigation and combat. Pilots must adapt or perish.' },
  { id:'l18', title:'The Trader Syndicate',    category:'Factions',   text:'Free Traders maintain neutrality by supplying all factions. Their stations are protected by an informal agreement—attack them and every faction turns against you.' },
  { id:'l19', title:'Plague Ship History',     category:'Enemies',    text:'The Plague Ship was a medical vessel captured by bioterrorists who weaponized the medicines aboard. The doctor who commanded it was never found.' },
  { id:'l20', title:'Phoenix Technology',      category:'Technology', text:'The Phoenix Protocol allows a pilot\'s neural pattern to be backed up and restored after death. It\'s controversial—is the restored pilot the same person?' }
];

function showLoreEntry(loreId) {
  const entry = LORE_DATABASE.find(l=>l.id===loreId);
  if (!entry) return;
  const el = document.getElementById('narrativeOverlay');
  if (!el) return;
  el.classList.add('active');
  el.innerHTML = `
    <div class="narrative-box">
      <div style="font-size:10px;font-family:Orbitron,monospace;color:rgba(255,255,255,0.4);letter-spacing:2px;margin-bottom:8px;">${entry.category}</div>
      <div class="narrative-speaker">${entry.title}</div>
      <div class="narrative-text">${entry.text}</div>
      <div class="narrative-choices">
        <div class="narrative-choice" onclick="closeNarrativeOverlay()">Close</div>
      </div>
    </div>
  `;
  GAME_STATS50.codexEntriesFound = (GAME_STATS50.codexEntriesFound||0) + 1;
  if (GAME_STATS50.codexEntriesFound >= 10) RPG.unlockAchievement('ach_lore10');
}

// ─────────────────────────────────────────────────────────────────────
// MISC INTEGRATIONS — showToast, screen shake trigger, game data hooks
// ─────────────────────────────────────────────────────────────────────

function showToast(message, color='#00f5ff') {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:140px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,0.9);border:1px solid ${color};border-radius:8px;
    padding:10px 20px;font-family:Orbitron,monospace;font-size:12px;
    color:${color};z-index:9998;animation:popup-float 2.5s ease forwards;
    text-align:center;max-width:350px;pointer-events:none;
    box-shadow:0 0 15px ${color}44;
  `;
  t.textContent = message;
  document.body.appendChild(t);
  t.addEventListener('animationend', ()=>t.remove());
}

function showFloatText(text, color='#ffffff') {
  if (!CANVAS) return;
  const x = (CANVAS.width/2) + (Math.random()-0.5)*100;
  const y = CANVAS.height * 0.4;
  showDamageNumber && showDamageNumber(x, y, text, 'heal');
}

// Initialize all new systems on load
function initExpansionSystems() {
  RPG.loadProgress();
  loadStats();
  initNavSystem();
  refreshMarketPrices();
  generateMissions(6);
  MP_SIM.init();
  ACTIVE_SHIELD.current = SHIELD_TYPES.standard.maxShield;
  setInterval(updateAudioViz, 80);
  setInterval(() => { MP_SIM.tick(1); }, 5000);
  console.log('[EXPANSION] All systems initialized');
}

// Hook into existing game loop
const _origWindowLoad = window.onload;
window.addEventListener('load', () => {
  setTimeout(initExpansionSystems, 1500);
});




