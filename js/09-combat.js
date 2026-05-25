// ═══════════════════════════════════════════════════════════════════
// SECTION 22 – DAMAGE / DEATH
// ═══════════════════════════════════════════════════════════════════
const ENEMY_COINS={basic:5,ufo:8,tank:15,fast:10,unique:20,spinner:12,diver:10,bomber:18};
const ENEMY_SCORE={basic:10,ufo:15,tank:25,fast:20,unique:30,spinner:18,diver:15,bomber:22};

function handleEnemyDeath(enemy,eIdx,killerPlayer) {
  if(State.runStats) trackKill(enemy.type);          // Phase 4 run stats
  triggerExplosion(enemy.x+enemy.width/2,enemy.y+enemy.height/2);
  if(State.survivorMode||State.openWorldMode) State.xpOrbs.push(new XPOrb(enemy.x+enemy.width/2,enemy.y+enemy.height/2,10+enemy.maxHealth*5));

  if(enemy.type==='bomber') {
    State.stats.bombersKilled++;
    triggerExplosion(enemy.x+enemy.width/2,enemy.y+enemy.height/2,'#ff6600',60);
    addTrauma(0.35);
    State.players.forEach(p=>{
      const dx=(p.x+p.width/2)-(enemy.x+enemy.width/2);
      const dy=(p.y+p.height/2)-(enemy.y+enemy.height/2);
      if(Math.hypot(dx,dy)<80&&!p.invincible) handlePlayerDamage(p);
    });
  }
  // Phase 1.1: brief freeze frame when a heavy enemy dies
  if(enemy.type==='tank'||enemy.type==='bomber') { triggerHitstop(55); haptic([30,20,30]); }

  const now=Date.now();
  // Phase 1.6: combo timeout 5s -> 2.5s (more aggressive)
  if(now-State.stats.lastKillTime<2500) State.stats.currentCombo++;
  else State.stats.currentCombo=1;
  State.stats.lastKillTime=now;
  State.stats.maxCombo=Math.max(State.stats.maxCombo,State.stats.currentCombo);
  State.stats.enemiesKilled++;
  // ─── EXPANSION: open world kill hook ───
  if(State.openWorldMode) onOpenWorldEnemyKilled(enemy);
  // sp2: combo bonus coins
  if(State.stats.currentCombo>=3 && (State.unlockedSkills.sp2||0)>=1) {
    const bonus=Math.floor(State.stats.currentCombo*(State.unlockedSkills.sp2||1)*0.5);
    if(bonus>0) addCoins(bonus);
  }

  // IMPROVEMENT 14: combo display
  updateComboDisplay();
  if(State.runStats) State.runStats.bestCombo = Math.max(State.runStats.bestCombo, State.stats.currentCombo);

  // Phase 1.6: multi-kill tracking (Unreal-style chain)
  if(now - FEEL.mkLast < 1000) FEEL.mkCount++; else FEEL.mkCount = 1;
  FEEL.mkLast = now;
  if(FEEL.mkCount === 3)      announceMultiKill('TRIPLE KILL', '#ffd60a');
  else if(FEEL.mkCount === 5) announceMultiKill('MEGA KILL',   '#ff8c00');
  else if(FEEL.mkCount === 7) announceMultiKill('ULTRA KILL',  '#ff006e');
  else if(FEEL.mkCount >= 9 && FEEL.mkCount % 2 === 1) announceMultiKill('GODLIKE', '#ff006e');

  const pIdx=killerPlayer?State.players.indexOf(killerPlayer):0;
  const score=ENEMY_SCORE[enemy.type]||10;
  // Phase 1.6: exponential combo multiplier (asymptote 5x)
  const finalScore=score*comboMultiplier(State.stats.currentCombo);
  const safeIdx=pIdx>=0?pIdx:0;
  State.scores[safeIdx]+=Math.floor(finalScore);
  addCoins(ENEMY_COINS[enemy.type]||5);

  // IMPROVEMENT 15: floating score text
  State.floatingTexts.push(new FloatingText(enemy.x+enemy.width/2,enemy.y,'+'+Math.floor(finalScore),State.stats.currentCombo>5?'#ff006e':'#ffd60a'));

  // Material drops (Scavenger skill ut4)
  if((State.unlockedSkills.ut4||0)>=1 && Math.random()<0.12) {
    const materials=['scrap_metal','energy_cell','nano_fiber','void_crystal','chaos_shard'];
    const drop=materials[Math.floor(Math.random()*materials.length)];
    State.materialInventory[drop]=(State.materialInventory[drop]||0)+1;
    State.floatingTexts.push(new FloatingText(enemy.x+enemy.width/2,enemy.y,drop.replace(/_/g,' ').toUpperCase(),'#b57bff'));
    updateMatHud();
  }

  State.enemies.splice(eIdx,1);

  if(State.infiniteMode&&State.enemies.length===0&&!State.boss) {
    // Phase 1.6: Perfect Wave bonus (no damage taken this wave)
    if(!State._hitThisWave && State.wave>=1){
      State.scores[0] += 500;
      const _pwft = new FloatingText(CANVAS.width/2, CANVAS.height/2, 'PERFECT WAVE +500', '#39ff14');
      _pwft.size = 28; _pwft.vy = -0.7;
      State.floatingTexts.push(_pwft);
      playSound('levelup');
    }
    State._hitThisWave = false;
    State.wave++;
    State.stats.maxInfiniteWave=Math.max(State.stats.maxInfiniteWave,State.wave);
    checkAchievements();
    showWaveAnnounce('WAVE '+State.wave,'#00f5ff');
    if(State.wave%5===0) { const bLevel=Math.min(Math.floor(State.wave/5),BOSSES_DATA.length); State.boss=new Boss(bLevel); State.bossSpawned=true; playSound('levelUpSound'); }
  }
}

// Phase 1.6: combo display scales with multiplier, color escalates with combo
function updateComboDisplay() {
  const el=document.getElementById('comboDisplay');
  const num=document.getElementById('comboNum');
  const c = State.stats.currentCombo;
  if(c>=3) {
    el.classList.add('active');
    const m = comboMultiplier(c);
    num.textContent = '×'+c+'  '+m.toFixed(1)+'×';
    num.style.fontSize = Math.min(38 + c*2.4, 96) + 'px';
    num.style.color = c>=15 ? '#ff006e' : c>=8 ? '#ff8c00' : '#ffd60a';
  } else {
    el.classList.remove('active');
  }
}

function pvpVictory(winnerIdx) {
  State.running=false;
  State.pvpWinner=winnerIdx;
  const color=winnerIdx===0?'#00f5ff':'#ff7700';
  const label=winnerIdx===0?'PLAYER 1 WINS!':'PLAYER 2 WINS!';
  showWaveAnnounce(label,color);
  addCoins(winnerIdx===0?100:60);
  if(winnerIdx===0) State.stats.multiplayerWins++;
  saveGameData(); checkAchievements();
  if(_onlineMode) endOnlineSession();
  setTimeout(()=>{
    setHUDVisible(false);
    const titleEl=document.getElementById('pvpWinnerTitle');
    const scoresEl=document.getElementById('pvpScores');
    if(titleEl) { titleEl.textContent=label; titleEl.style.color=color; }
    if(scoresEl) scoresEl.textContent=`P1: ${State.scores[0].toLocaleString()} pts  |  P2: ${State.scores[1].toLocaleString()} pts`;
    navigateMenu('pvpOver');
  }, 2800);
}

function handlePlayerDamage(player) {
  if(player.invincible) return; // IMPROVEMENT 6
  // Phoenix revive
  if(player.lives<=1&&(State.unlockedSkills.df2||0)>=1&&!State.phoenixUsed) {
    State.phoenixUsed=true;
    player.invincible=true; player.invincibleEnd=Date.now()+3000;
    triggerExplosion(player.x+player.width/2,player.y+player.height/2,'#ff8800',40);
    showWaveAnnounce('PHOENIX REVIVE!','#ff8800');
    return;
  }
  State.stats.phaseDamageTaken++;
  if(State.runStats) State.runStats.damageTaken++;  // Phase 4 run stats
  State._hitThisWave = true;                       // Phase 1.6 perfect-wave tracking
  haptic(CONFIG.HAPTIC.playerHit);                  // Phase 1.8 / Phase 3 (config)
  player.lives--;
  // ─── EXPANSION: open world damage hook ───
  if(State.openWorldMode) onOpenWorldPlayerDamaged();
  triggerExplosion(player.x+player.width/2,player.y+player.height/2,'#ffffff',20);
  // IMPROVEMENT 6: invincibility frames after hit
  player.invincible=true; player.invincibleEnd=Date.now()+1500;
  // IMPROVEMENT 16: damage vignette
  const vig=document.getElementById('vignette');
  vig.style.opacity='1';
  setTimeout(()=>{vig.style.transition='opacity 0.5s'; vig.style.opacity='0';},150);
  // IMPROVEMENT 2: strong screen shake on hit
  addTrauma(0.6);
  if(State.pvpMode) {
    // Draw PvP divider line and life counters on canvas
    if(player.lives<=0) {
      const winnerIdx=player.index===0?1:0;
      pvpVictory(winnerIdx);
    }
    return;
  }
  // Phase 1.5: death sequence on final death (slowmo + fragment burst)
  if(State.players.every(p=>p.lives<=0)) startDeathSequence();
}

function handleBossDefeat() {
  // Phase 4: skip-intro flag + run-stats
  if(State.boss){ markBossSeen(State.boss.level); }
  if(State.runStats) State.runStats.bossesKilled = (State.runStats.bossesKilled||0)+1;
  // Phase 1.1: boss death = freeze frame + fullscreen white flash
  triggerHitstop(CONFIG.HITSTOP.boss);
  flashScreen(120);
  addTrauma(CONFIG.SHAKE.bossDeath);
  haptic(CONFIG.HAPTIC.bossDeath);                 // Phase 1.8 / Phase 3 (config)
  // Open world boss defeat handling
  if(State.openWorldMode) {
    State.stats.bossesDefeated++;
    const bossLootMult = 1 + 0.25*(State.unlockedSkills.sp3||0);
    addCoins(Math.floor(State.boss.reward * bossLootMult));
    triggerExplosion(State.boss.x+State.boss.width/2,State.boss.y+State.boss.height/2,'#ffd700',80);
    for(let i=0;i<5;i++) setTimeout(()=>triggerExplosion(State.boss?.x??200+rand(-100,100),State.boss?.y??100+rand(-50,50),'#ff4500',30),i*200);
    document.getElementById('bossBarWrap').classList.remove('visible');
    State.openWorldBossActive=false;
    if(State._currentBossSector!==undefined && State.galaxySectors[State._currentBossSector]) {
      State.galaxySectors[State._currentBossSector].bossDefeated=true;
    }
    addXP(500);
    // ─── EXPANSION: expanded boss defeat hook ───
    if(State.openWorldMode) { expandedBossDeathHook(); }
    State.boss=null; State.bossSpawned=false;
    showWaveAnnounce('BOSS DEFEATED!','#ffd60a');
    return;
  }
  State.stats.bossesDefeated++;
  // sp3: Boss Loot +25% per level
  const bossLootMult = 1 + 0.25*(State.unlockedSkills.sp3||0);
  addCoins(Math.floor(State.boss.reward * bossLootMult));
  // sp9: Mastery — +5% all stats per boss kill
  if((State.unlockedSkills.sp9||0)>=1) {
    State.players.forEach(p => {
      p.damageMultiplier *= 1 + 0.05*(State.unlockedSkills.sp9||1);
      p.speed = Math.min(p.speed+0.3, 18);
    });
  }
  if(State.stats.phaseDamageTaken===0){State.stats.perfectLevels++;addCoins(100);showWaveAnnounce('PERFECT!','#ffd60a');}
  triggerExplosion(State.boss.x+State.boss.width/2,State.boss.y+State.boss.height/2,'#ffd700',80);
  // IMPROVEMENT 17: multi-explosion on boss death
  for(let i=0;i<5;i++) setTimeout(()=>triggerExplosion(State.boss?.x??200+rand(-100,100),State.boss?.y??100+rand(-50,50),'#ff4500',30),i*200);
  State.scores.forEach((_,i)=>{State.scores[i]+=i===0?State.boss.reward:Math.floor(State.boss.reward*0.7);});
  document.getElementById('bossBarWrap').classList.remove('visible');
  if(State.bossRushMode) {
    State.bossRushIndex++;
    if(State.bossRushIndex>=BOSSES_DATA.length) {
      State.stats.bossRushDone=true; checkAchievements(); saveGameData();
      State.boss=null; finalEnding();
    } else {
      State.boss=null; State.bossSpawned=true;
      const nextLevel=State.bossRushIndex+1;
      State.players.forEach(p=>{if(p.lives<p.maxLives)p.lives=Math.min(p.lives+1,p.maxLives||5);});
      setTimeout(()=>{
        if(State.running&&State.bossRushMode){
          State.boss=new Boss(nextLevel); playSound('levelUpSound');
          showWaveAnnounce('BOSS '+(State.bossRushIndex+1)+': '+BOSSES_DATA[State.bossRushIndex].name,'#ff6600');
        }
      },2000);
    }
  } else if(!State.infiniteMode&&!State.survivorMode) {
    if(State.boss.level>=BOSSES_DATA.length) {
      if(State.difficulty==='extreme'){State.stats.finalBossOnExtreme++;checkAchievements();}
      State.boss=null; finalEnding();
    } else {
      State.boss=null; State.gameLevel++;
      State.stats.maxPhase=Math.max(State.stats.maxPhase,State.gameLevel);
      State.stats.phaseDamageTaken=0; checkAchievements();
      showPhaseLoading(State.gameLevel);
    }
  } else { State.boss=null; State.bossSpawned=false; }
}

function handlePowerupCollection(power,pIdx,collector) {
  State.stats.powerupsCollected++;
  switch(power.type) {
    case 'life': collector.lives=Math.min(collector.lives+1,5); showWaveAnnounce('+1 LIFE','#ff69b4'); break;
    case 'weapon':
      collector.shootCooldown=100;
      if(collector.index===0){State.powerUpActive=true;State.powerUpEndTime=Date.now()+5000;}
      else{setTimeout(()=>{collector.shootCooldown=collector.baseCooldown;},5000);}
      showWaveAnnounce('RAPID FIRE','#00f5ff'); break;
    case 'shield':
      if(collector.index===0){State.shieldActive=true;State.shieldEndTime=Date.now()+8000;}
      else{collector.permanentShield=true;setTimeout(()=>{collector.permanentShield=false;},8000);}
      showWaveAnnounce('SHIELD UP','#39ff14'); break;
    case 'double': {
      // ut10: Fortune — +15% double damage duration per level
      const ddDuration = 6000 * (1 + 0.15*(State.unlockedSkills.ut10||0));
      State.doubleDamage=true; State.doubleDamageEnd=Date.now()+ddDuration;
      State.stats.ddCollected++;
      const ddEl=document.getElementById('ddIndicator');
      if(ddEl){ddEl.style.display='block';setTimeout(()=>{ddEl.style.display='none';},ddDuration);}
      showWaveAnnounce('DOUBLE DAMAGE!','#ff8800'); break;
    }
    case 'bomb':
      for(let bi=State.enemies.length-1;bi>=0;bi--){
        const be=State.enemies[bi];
        triggerExplosion(be.x+be.width/2,be.y+be.height/2,'#cc00ff',20);
        handleEnemyDeath(be,bi,collector);
      }
      showWaveAnnounce('BOMB! ALL CLEARED','#cc00ff');
      addTrauma(0.7); break;
  }
  playSound('powerupSound'); State.powerUps.splice(pIdx,1); checkAchievements();
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 23 – TIMER UPDATES
// ═══════════════════════════════════════════════════════════════════
function updateTimersPerFrame() {
  const now=Date.now();
  if(State.gameStartTime) { const surv=Math.floor((now-State.gameStartTime)/1000); State.stats.longestSurvival=Math.max(State.stats.longestSurvival,surv); }

  // Power-up bar
  const puWrap=document.getElementById('powerupBarWrap');
  if(State.powerUpActive||State.shieldActive) {
    puWrap.style.display='flex';
    const active=State.powerUpActive?{end:State.powerUpEndTime,total:5000,label:'RAPID FIRE'}:{end:State.shieldEndTime,total:8000,label:'SHIELD'};
    document.getElementById('puLabel').textContent=active.label;
    document.getElementById('puFill').style.width=Math.max(0,((active.end-now)/active.total)*100)+'%';
    if(State.powerUpActive&&now>State.powerUpEndTime) { State.powerUpActive=false; if(State.players[0]) State.players[0].shootCooldown=State.players[0].baseCooldown; }
    if(State.shieldActive&&now>State.shieldEndTime) State.shieldActive=false;
    if(!State.powerUpActive&&!State.shieldActive) puWrap.style.display='none';
  } else puWrap.style.display='none';

  // Infinite cooldowns
  if(State.infiniteMode) { let chg=false; Object.keys(State.infiniteCooldowns).forEach(k=>{if(State.infiniteCooldowns[k]>0){State.infiniteCooldowns[k]=Math.max(0,State.infiniteCooldowns[k]-16);chg=true;}}); if(chg) updateInfiniteAbilityBar(); }

  // Survivor
  if(State.survivorMode) {
    State.survivorAbilities.forEach(ab=>{if(ab.cooldown>0) ab.cooldown=Math.max(0,ab.cooldown-16);});
    if(now%1000<16) updateSurvivorAbilityBar();
    State.survivorElapsed=Math.floor((now-State.survivorStartTime)/1000);
    document.getElementById('survivorTimer').textContent=formatTime(State.survivorElapsed);
    State.stats.maxSurvivorTime=Math.max(State.stats.maxSurvivorTime,State.survivorElapsed);
  }
  State.players.forEach(p=>p.updateTimers());

  // Double damage expiry
  if(State.doubleDamage && now>State.doubleDamageEnd) {
    State.doubleDamage=false;
    const ddEl=document.getElementById('ddIndicator');
    if(ddEl) ddEl.style.display='none';
  }

  // Combo reset timer (Phase 1.6: 5s -> 2.5s)
  if(State.stats.currentCombo>0&&now-State.stats.lastKillTime>2500) {
    State.stats.currentCombo=0; updateComboDisplay();
  }
  // Phase 1.5: low-HP danger vignette
  const _lh = document.getElementById('lowHpVig');
  if(_lh){
    const _lowHp = State.players.some(p => p && p.lives>0 && p.lives<=1);
    if(_lowHp) _lh.style.opacity = (0.32 + 0.32*Math.sin(now/200)).toFixed(2);
    else if(_lh.style.opacity !== '0') _lh.style.opacity = '0';
  }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 24 – COLLISION PASSES
// ═══════════════════════════════════════════════════════════════════
function processBullets() {
  State.players.forEach((p,pi)=>{
    // Filter out-of-bounds bullets (direction-aware or freeAim)
    p.bullets=p.bullets.filter(b=>{
      if(b._freeAim) {
        const dist=Math.hypot(b.x-b._originX, b.y-b._originY);
        return dist<600 && b.x>-100 && b.x<State.worldWidth+100 && b.y>-100 && b.y<State.worldHeight+100;
      }
      return b.direction>0 ? b.y<=CANVAS.height : b.y+b.height>=0;
    });
    for(let i=p.bullets.length-1;i>=0;i--) {
      const b=p.bullets[i]; b.update(); b.draw();

      // ── PvP: check against opponent player ──
      if(State.pvpMode) {
        const opponent=State.players[1-pi];
        // In online: only the attacking side detects its own bullet hits
        const shouldCheck = !_onlineMode || pi===(_isHost?0:1);
        if(opponent&&!opponent.invincible&&shouldCheck&&p.bullets[i]&&detectCollision(p.bullets[i],opponent)) {
          triggerExplosion(b.x,b.y,p.bulletColor,10);
          p.bullets.splice(i,1);
          handlePlayerDamage(opponent);
          State.scores[pi]+=50;
          if(_onlineMode&&_conn&&_conn.open) _conn.send({type:'pvphit',target:1-pi,score:State.scores[pi]});
          continue;
        }
        continue; // No enemy/boss in PvP
      }

      // ── Normal mode: enemies ──
      for(let e=State.enemies.length-1;e>=0;e--) {
        if(!detectCollision(b,State.enemies[e])) continue;
        if(State.runStats) State.runStats.shotsHit++;
        triggerExplosion(b.x,b.y,'#ffff00',6);
        p.bullets.splice(i,1);
        // Phase 1.4: central hit (crit + flash + knockback + damage number)
        hitEnemy(State.enemies[e], b.damage*(State.doubleDamage?2:1));
        if(State.enemies[e].health<=0) handleEnemyDeath(State.enemies[e],e,p);
        break;
      }
      // Boss bullet hit — check item boss_dmg multiplier
      if(State.boss&&p.bullets[i]&&detectCollision(p.bullets[i],State.boss)) {
        if(State.runStats) State.runStats.shotsHit++;
        triggerExplosion(b.x,b.y,'#ffff00',6);
        p.bullets.splice(i,1);
        const bossDmgMult = p._bossDmgMult || 1;
        // Phase 1.4: boss crit + hit flash + shake + haptic
        const _crit = Math.random() < CONFIG.CRIT.rate;
        const _dmg = b.damage * bossDmgMult * (_crit?CONFIG.CRIT.multiplier:1);
        State.boss.health -= _dmg;
        State.boss._hitFlash = 2;
        addTrauma(0.4);
        haptic([30,20,30]);
        const _bft = new FloatingText(b.x, b.y, (_crit?'CRIT ':'') + Math.round(_dmg), _crit?'#ffe000':'#ff5050');
        _bft.size = _crit?22:15; State.floatingTexts.push(_bft);
        if(_crit) playSound('crit');
        if(State.boss.health<=0){handleBossDefeat();return;}
      }
    }
  });
}

function processAllyRobots() {
  State.players.forEach(p=>{
    if(p.character!=='marcelo'||!p.abilityActive) return;
    p.allyRobots.forEach(robot=>{
      robot.update(); robot.draw();
      for(let bi=robot.bullets.length-1;bi>=0;bi--) {
        for(let ei=State.enemies.length-1;ei>=0;ei--) {
          if(!detectCollision(robot.bullets[bi],State.enemies[ei])) continue;
          triggerExplosion(robot.bullets[bi].x,robot.bullets[bi].y,p.robotColor,8);
          robot.bullets.splice(bi,1);
          hitEnemy(State.enemies[ei], 1);
          if(State.enemies[ei].health<=0) handleEnemyDeath(State.enemies[ei],ei,p);
          break;
        }
      }
    });
  });
}

function processLasers() {
  State.players.forEach(p=>{
    if(!p.laserActive) return;
    const cx=p.x+p.width/2;
    if(p.index===0) drawLaser(cx,'#00f5ff','#fff','#0000ff');
    else drawLaser(cx,'#ff7700','#fff','#cc0000');
    for(let i=State.enemies.length-1;i>=0;i--) {
      const e=State.enemies[i];
      if(e.x+e.width>=cx-5&&e.x<=cx+5) {
        triggerExplosion(e.x+e.width/2,e.y+e.height/2,p.laserColor,20);
        e.health-=(e.type==='tank'?3:e.health);
        e._hitFlash = 1;
        if(e.health<=0) handleEnemyDeath(e,i,p);
      }
    }
    if(State.boss&&State.boss.x+State.boss.width>=cx-5&&State.boss.x<=cx+5) {
      State.boss.health-=2; if(State.boss.health<=0){handleBossDefeat();return;}
    }
  });
}

function processEnemies() {
  if(State.pvpMode) return;
  for(let i=State.enemies.length-1;i>=0;i--) {
    const e=State.enemies[i]; e.update(); e.draw(); drawHitFlash(e);
    for(const p of State.players) {
      if(p.lives<=0||p.invincible) continue; // IMPROVEMENT 6
      if(!detectCollision(e,p)) continue;
      if(p.hasShield()) {
        triggerExplosion(e.x+e.width/2,e.y+e.height/2,p.shieldColor,25);
        State.enemies.splice(i,1); State.scores[p.index]+=5; break;
      } else handlePlayerDamage(p);
    }
    if(e.y>CANVAS.height) State.enemies.splice(i,1);
  }
  State.enemies.forEach(e=>{
    for(let bi=e.bullets.length-1;bi>=0;bi--) {
      for(const p of State.players) {
        if(p.lives<=0||p.invincible) continue;
        if(!detectCollision(e.bullets[bi],p)) { checkNearMiss(e.bullets[bi], p); continue; }
        e.bullets.splice(bi,1);
        if(p.hasShield()) triggerExplosion(p.x+p.width/2,p.y,'#00f5ff',10);
        else handlePlayerDamage(p);
        break;
      }
    }
  });
}

function processBoss() {
  if(State.pvpMode||!State.boss) return;
  State.boss.update(); State.boss.draw(); drawHitFlash(State.boss);
  for(let bi=State.boss.bullets.length-1;bi>=0;bi--) {
    const bullet=State.boss.bullets[bi];
    for(const p of State.players) {
      if(p.lives<=0||p.invincible) continue;
      if(!detectCollision(bullet,p)) { checkNearMiss(bullet, p); continue; }
      State.boss.bullets.splice(bi,1);
      if(p.hasShield()) triggerExplosion(bullet.x,bullet.y,p.shieldColor,10);
      else handlePlayerDamage(p);
      break;
    }
  }
}

function processPowerUps() {
  if(Math.random()<0.005) State.powerUps.push(new PowerUp());
  for(let i=State.powerUps.length-1;i>=0;i--) {
    const pw=State.powerUps[i]; pw.update(); pw.draw();
    for(const p of State.players) {
      if(detectCollision(pw,p)){handlePowerupCollection(pw,i,p);break;}
    }
    if(State.powerUps[i]&&State.powerUps[i].y>CANVAS.height) State.powerUps.splice(i,1);
  }
}

function processXPOrbs() {
  if(!State.survivorMode&&!State.openWorldMode) return;
  for(let i=State.xpOrbs.length-1;i>=0;i--) {
    const orb=State.xpOrbs[i]; orb.update(); orb.draw();
    const p=State.players[0];
    const hb={x:orb.x-orb.radius,y:orb.y-orb.radius,width:orb.radius*2,height:orb.radius*2};
    if(detectCollision(hb,p)){playSound('xpSound');addXP(orb.value);State.xpOrbs.splice(i,1);}
    else if(!State.openWorldMode&&orb.y>CANVAS.height) State.xpOrbs.splice(i,1);
    else if(State.openWorldMode&&Math.hypot(orb.x-(p.x+p.width/2),orb.y-(p.y+p.height/2))>2000) State.xpOrbs.splice(i,1);
  }
}

function processExplosions() {
  for(let i=State.explosions.length-1;i>=0;i--) {
    State.explosions[i].update(); State.explosions[i].draw();
    if(!State.explosions[i].alive) State.explosions.splice(i,1);
  }
}

function processFloatingTexts() {
  // Phase 2.2: cap floating texts (Phase 1 added hit-numbers, can spike fast)
  if(State.floatingTexts.length > 36) State.floatingTexts.splice(0, State.floatingTexts.length-36);
  for(let i=State.floatingTexts.length-1;i>=0;i--) {
    State.floatingTexts[i].update(); State.floatingTexts[i].draw();
    if(!State.floatingTexts[i].alive) State.floatingTexts.splice(i,1);
  }
}

