// ═══════════════════════════════════════════════════════════════════
// SECTION 28 – MAIN GAME LOOP (IMPROVEMENT 2: screen shake)
// ═══════════════════════════════════════════════════════════════════
// ─── Phase 1.1: delta-time + fixed-timestep driver ───
const FIXED_DT = 1000/60;
let _lastFrameTime = 0, _accumulator = 0;

function gameLoop(ts) {
  if(!State.running || State.paused) { _lastFrameTime = 0; return; }
  if(typeof ts !== 'number') ts = performance.now();
  if(!_lastFrameTime) { _lastFrameTime = ts; _accumulator = 0; }
  let frameTime = ts - _lastFrameTime;
  _lastFrameTime = ts;
  if(frameTime > 250) frameTime = 250;          // clamp after tab stalls
  // Phase 1.1: slow-motion with smooth release back to 1.0
  if(State.slowmoUntil > ts) State.timeScale = State.slowmoScale;
  else if(State.timeScale < 1) State.timeScale = Math.min(1, State.timeScale + frameTime/250);
  if(ts < State.hitstopUntil) { requestAnimationFrame(gameLoop); return; }  // hitstop
  _accumulator += frameTime * State.timeScale;  // timeScale<1 = slowmo
  let ticks = 0;
  while(_accumulator >= FIXED_DT && ticks < 5) {  // cap 5 = no spiral of death
    gameTick();
    _accumulator -= FIXED_DT;
    ticks++;
    if(!State.running || State.paused) break;
  }
  requestAnimationFrame(gameLoop);
}

function gameTick() {
  if(!State.running||State.paused) return;

  // Online multiplayer sync
  if(_onlineMode) sendNetworkUpdate();

  // PvP center divider
  if(State.pvpMode) {
    const mid=CANVAS.height/2;
    CTX.strokeStyle='rgba(255,255,255,0.15)'; CTX.lineWidth=1; CTX.setLineDash([10,10]);
    CTX.beginPath(); CTX.moveTo(0,mid); CTX.lineTo(CANVAS.width,mid); CTX.stroke();
    CTX.setLineDash([]);
    // PvP score display
    const p0=State.players[0], p1=State.players[1];
    CTX.fillStyle='rgba(0,245,255,0.8)'; CTX.font='bold 14px Orbitron, monospace'; CTX.textAlign='left';
    CTX.fillText('P1: '+(p0?p0.lives:0)+'♥  '+State.scores[0].toLocaleString(), 16, mid-8);
    CTX.fillStyle='rgba(255,119,0,0.8)'; CTX.textAlign='right';
    CTX.fillText('P2: '+(p1?p1.lives:0)+'♥  '+State.scores[1].toLocaleString(), CANVAS.width-16, mid+22);
  }

  // Screen shake
  let sx=0, sy=0;
  if(SETTINGS_EXTENDED.screenShakeEnabled !== false && State.trauma>0) {
    const _amt=State.trauma*State.trauma*16;        // trauma-squared = chunky shake
    sx=(Math.random()*2-1)*_amt;
    sy=(Math.random()*2-1)*_amt;
    State.trauma=Math.max(0,State.trauma-0.025);     // ~1.5/s linear decay
    State.screenShake=_amt;
    CTX.save(); CTX.translate(sx,sy);
  } else { State.screenShake=0; }

  CTX.clearRect(-10,-10,CANVAS.width+20,CANVAS.height+20);
  drawStars();

  updateGamepadControls();
  updateTimersPerFrame();
  processScheduledEvents();

  if(State.openWorldMode) {
    // Update camera and sector
    updateCamera();
    const newSector=getCurrentSector();
    if(newSector!==State.currentSector) {
      State.currentSector=newSector;
      if(!State.visitedSectors.includes(newSector)) {
        State.visitedSectors.push(newSector);
        const secTheme=State.galaxySectors[newSector]&&State.galaxySectors[newSector].theme?State.galaxySectors[newSector].theme.name:(PHASE_THEMES[newSector%PHASE_THEMES.length]||{name:'SECTOR'}).name;
        showWaveAnnounce(secTheme,'#7b2fff');
        updateQuestProgress('explore');
        discoverCodex('c'+(newSector%20));
      }
      // Update sector objective tracking
      updateSectorObjectiveHUD();
    }
    // ─── EXPANSION: Update all new systems ───
    updateSpaceWeather();
    updateGalaxyEvents();
    checkRandomEvents();
    updatePlanets();
    updateOpenWorldEnemyBehaviors();
    checkQuestCompletion();
    updateOpenWorldHUDPanel();
    updateWeatherHUD();
    drawFactionHUD();
    // ─────────────────────────────────────────
    // Auto-shoot at nearest enemy
    State.players.forEach(p=>autoShootOpenWorld(p));
    // Apply camera transform for world drawing
    CTX.save();
    CTX.translate(-State.camera.x, -State.camera.y);
    // ─── Galaxy star parallax ───
    drawGalaxyStarField();
    drawSectorBoundaries();
    // ─── Old galaxy objects (stations, wormholes) ───
    drawGalaxyObjects();
    // ─── New expanded galaxy objects ───
    drawNewGalaxyObjects();
    State.players.forEach(p=>{p.update();drawPlayer(p);});
    processLasers();
    processBullets();
    processAllyRobots();
    // ─── EXPANSION: Ally fleet ───
    processAllyFleet();
    processOpenWorldEnemies();
    processBoss();
    // ─── EXPANSION: Fortress bullets ───
    processFortressBullets();
    processExplosions();
    processXPOrbs();
    processFloatingTexts();
    CTX.restore();
    // ─── EXPANSION: Bullet-asteroid/crystal/fortress collisions ───
    checkAsteroidBulletCollisions();
    // HUD elements (not translated)
    checkBossZones();
    // drawGalaxyMiniMap() replaced by drawExtendedMiniMap() below
    // ─── EXPANSION: Weather visual effects ───
    drawWeatherEffects();
    // Sector name in HUD top center
    CTX.fillStyle='rgba(180,120,255,0.6)'; CTX.textAlign='center';
    CTX.font='11px Orbitron, monospace';
    const owSecName=State.galaxySectors[State.currentSector]&&State.galaxySectors[State.currentSector].theme?State.galaxySectors[State.currentSector].theme.name:(OW_SECTOR_THEMES[State.currentSector%OW_SECTOR_THEMES.length].name);
    CTX.fillText(owSecName, CANVAS.width/2, 56);
    CTX.textAlign='left';
    // ─── EXPANSION: check sector objective & all expansion systems ───
    checkSectorObjective();
    updateCodexHUD();
    updateOpenWorldExpansion();
    drawOpenWorldExpansionHUD();
    drawEnhancedBossZones();
    drawPlanetOrbits();
    drawExtendedMiniMap();
    drawOpenWorldFullFrame();
  } else {
    State.players.forEach(p=>{p.update();drawPlayer(p);});
    processLasers();
    processBullets();
    processAllyRobots();
    processEnemies();
    processBoss();
    processPowerUps();
    processExplosions();
    processXPOrbs();
    processFloatingTexts(); // IMPROVEMENT 15
    trySpawnEnemiesOrBoss();
    // IMPROVEMENT 19: infinite wave label with style
    if(State.infiniteMode) {
      CTX.fillStyle='rgba(0,245,255,0.25)'; CTX.textAlign='center';
      CTX.font='bold 18px Orbitron, monospace';
      CTX.fillText(`◆ WAVE ${State.wave} ◆`, CANVAS.width/2, 36);
      CTX.textAlign='left';
    }
    // Mini radar for Infinite/Boss Rush
    if(State.infiniteMode||State.bossRushMode) drawMiniRadar();
    else { const rc=document.getElementById('miniRadar'); if(rc) rc.classList.remove('visible'); }
    // Phase 1.3: spawn warning triangles
    drawSpawnWarnings();
  }

  updateScoreDisplay();

  if(State.screenShake>0) CTX.restore();

  // Boss Rush: keep spawning if no boss and bossRushMode
  if(State.bossRushMode&&!State.boss&&!State.bossSpawned) {
    State.bossSpawned=true;
    const lvl=State.bossRushIndex+1;
    if(lvl<=BOSSES_DATA.length){State.boss=new Boss(lvl);playSound('levelUpSound');}
  }
}


// ═══════════════════════════════════════════════════════════════════
// OPEN WORLD EXPANSION – ADDITIONAL SYSTEMS & ENHANCEMENTS
// ═══════════════════════════════════════════════════════════════════

// ─── ENHANCED OPEN WORLD ENEMY AI WITH BEHAVIORS ──────────────────

/**
 * Processes open world enemies with:
 * - Formation-aware movement
 * - Mining enemy patrol
 * - Faction patrol with waypoints
 * - Weather speed modifier
 */
function processOpenWorldEnemyAI() {
  if(!State.openWorldMode) return;
  const now = Date.now();
  const wMult = getWeatherEnemySpeedMult();
  State.enemies.forEach(e=>{
    if(!e._openWorld) return;
    if(!e._aiInit) {
      e._aiInit = true;
      e._aiState = 'wander';
      e._aiTimer = now + Math.random()*3000;
      e._origSpeed = e.speed || 2;
      e._wanderAngle = Math.random()*Math.PI*2;
    }
    // Apply weather speed modifier
    const spd = (e._origSpeed||2)*wMult;
    // State transitions
    if(now > e._aiTimer) {
      const roll = Math.random();
      if(roll < 0.3) e._aiState='wander';
      else if(roll < 0.6) e._aiState='patrol';
      else e._aiState='idle';
      e._aiTimer = now + 2000 + Math.random()*5000;
      e._wanderAngle = Math.random()*Math.PI*2;
    }
    const p = State.players[0];
    if(p) {
      const dx=(p.x+p.width/2)-(e.x+e.width/2);
      const dy=(p.y+p.height/2)-(e.y+e.height/2);
      const dist=Math.hypot(dx,dy);
      if(dist < 280) {
        // Chase player
        e.x += (dx/dist)*spd;
        e.y += (dy/dist)*spd;
        e._aiState = 'chase';
      } else {
        if(e._aiState==='wander') {
          e.x += Math.cos(e._wanderAngle)*spd*0.5;
          e.y += Math.sin(e._wanderAngle)*spd*0.5;
        } else if(e._aiState==='patrol') {
          const t2=now*0.0008+(e.homeX||0)*0.001;
          e.x = (e.homeX||e.x) + Math.cos(t2)*120;
          e.y = (e.homeY||e.y) + Math.sin(t2)*120;
        }
        // idle: don't move
      }
    }
    // Clamp to world bounds
    e.x = Math.max(0, Math.min(State.worldWidth-(e.width||30), e.x));
    e.y = Math.max(0, Math.min(State.worldHeight-(e.height||30), e.y));
  });
}

// ─── HUD HELPERS ──────────────────────────────────────────────────

function hideOpenWorldHUDs() {
  ['owHudPanel','weatherHud','factionHud','sectorObjHud','codexHud'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.remove('visible');
  });
}

function showOpenWorldHUDs() {
  if(!State.openWorldMode) return;
  const owHud=document.getElementById('owHudPanel');
  if(owHud) owHud.classList.add('visible');
  updateCodexHUD();
}

// ─── EXTENDED MINIMAP WITH FACTION COLORS ─────────────────────────

function drawExtendedMiniMap() {
  if(!State.openWorldMode) return;
  const mw=140, mh=140;
  const mx=CANVAS.width-mw-16, my=60;
  const scaleX=mw/State.worldWidth, scaleY=mh/State.worldHeight;
  CTX.save();
  CTX.fillStyle='rgba(0,0,0,0.75)'; CTX.fillRect(mx,my,mw,mh);
  CTX.strokeStyle='rgba(0,245,255,0.3)'; CTX.lineWidth=1; CTX.strokeRect(mx,my,mw,mh);
  // Draw sectors with faction tint
  State.galaxySectors.forEach((s,i)=>{
    const visited = State.visitedSectors.includes(i);
    const faction = s.faction && FACTIONS[s.faction];
    let fillColor = 'rgba(255,255,255,0.04)';
    if(visited && faction) {
      fillColor = faction.color+'22';
    } else if(s.objectiveComplete) {
      fillColor = 'rgba(57,255,20,0.15)';
    } else if(s.bossDefeated) {
      fillColor = 'rgba(0,255,100,0.1)';
    }
    CTX.fillStyle=fillColor;
    CTX.fillRect(mx+s.x*scaleX,my+s.y*scaleY,s.w*scaleX,s.h*scaleY);
    // Current sector highlight
    if(i===State.currentSector) {
      CTX.strokeStyle='rgba(0,245,255,0.5)'; CTX.lineWidth=1;
      CTX.strokeRect(mx+s.x*scaleX,my+s.y*scaleY,s.w*scaleX,s.h*scaleY);
    }
    if(!s.bossDefeated && visited) {
      CTX.fillStyle='rgba(255,100,0,0.9)';
      CTX.beginPath();
      CTX.arc(mx+(s.x+s.w/2)*scaleX,my+(s.y+s.h/2)*scaleY,2,0,Math.PI*2);
      CTX.fill();
    }
  });
  // Grid lines
  CTX.strokeStyle='rgba(255,255,255,0.05)'; CTX.lineWidth=0.5;
  for(let c=1;c<6;c++){CTX.beginPath();CTX.moveTo(mx+c*mw/6,my);CTX.lineTo(mx+c*mw/6,my+mh);CTX.stroke();}
  for(let r=1;r<6;r++){CTX.beginPath();CTX.moveTo(mx,my+r*mh/6);CTX.lineTo(mx+mw,my+r*mh/6);CTX.stroke();}
  // Player blip
  if(State.players[0]) {
    const p=State.players[0];
    CTX.fillStyle='#39ff14'; CTX.shadowColor='#39ff14'; CTX.shadowBlur=6;
    CTX.beginPath(); CTX.arc(mx+p.x*scaleX,my+p.y*scaleY,4,0,Math.PI*2); CTX.fill();
    CTX.shadowBlur=0;
  }
  // Ally fleet blips
  State.allyFleet.forEach(a=>{
    CTX.fillStyle=a.color;
    CTX.beginPath(); CTX.arc(mx+a.x*scaleX,my+a.y*scaleY,2,0,Math.PI*2); CTX.fill();
  });
  // Camera viewport rect
  CTX.strokeStyle='rgba(0,245,255,0.25)'; CTX.lineWidth=0.5;
  CTX.strokeRect(mx+State.camera.x*scaleX,my+State.camera.y*scaleY,CANVAS.width*scaleX,CANVAS.height*scaleY);
  // Labels
  CTX.fillStyle='rgba(0,245,255,0.5)'; CTX.font='7px Orbitron, monospace'; CTX.textAlign='left';
  CTX.fillText('MAP [M]',mx+3,my+9);
  CTX.fillStyle='rgba(255,255,255,0.25)'; CTX.font='6px monospace';
  CTX.fillText(State.visitedSectors.length+'/'+State.galaxySectors.length+' sectors',mx+3,my+mh-4);
  CTX.restore();
}

// ─── BOSS DEFEAT IN OPEN WORLD (ENHANCED) ─────────────────────────

function onOpenWorldBossDefeated() {
  if(!State.openWorldMode) return;
  const si = State._currentBossSector;
  if(si !== undefined && State.galaxySectors[si]) {
    State.galaxySectors[si].bossDefeated = true;
    // Update quest progress
    updateQuestProgress('boss');
    updateSectorObjectiveProgress(si, 'kill', 5);
    // Big reward
    addCoins(100 + si*20);
    gainXP(500 + si*50);
    showWaveAnnounce('SECTOR BOSS DEFEATED!','#ff6600');
    State.stats.bossesDefeated++;
    // Codex discovery
    discoverCodex('c'+(si%20));
    // Check if it's the final sector boss
    if(si===35) {
      updateQuestProgress('omega');
      showWaveAnnounce('OMEGA DIMENSION CLEARED!','#00ffff');
    }
    // Spawn power-up at boss location
    if(State.boss) {
      State.galaxyObjects.push({
        type:'debris',
        x: State.boss.x, y: State.boss.y,
        radius:30, sectorIdx:si, used:false, lootCoins:200+si*10,
      });
    }
  }
  State.openWorldBossActive = false;
}

// ─── OPEN WORLD STATUS: ON ENEMY KILL ─────────────────────────────

function onOpenWorldEnemyKilled(enemy) {
  if(!State.openWorldMode) return;
  // Update faction rep
  const sectorIdx = enemy.sectorIdx !== undefined ? enemy.sectorIdx : State.currentSector;
  updateFactionRep(sectorIdx, -1);
  // Update kill quest
  updateQuestProgress('kill');
  // Update sector objective
  updateSectorObjectiveProgress(sectorIdx, 'kill', 1);
  // No damage quest: reset timer
  if(!State._lastDamageTime) State._lastDamageTime = Date.now();
}

// ─── PLAYER DAMAGE HOOK FOR NO-DAMAGE QUEST ───────────────────────

function onOpenWorldPlayerDamaged() {
  if(!State.openWorldMode) return;
  State._lastDamageTime = Date.now();
  // Fail no-damage quests
  State.activeQuests.forEach(q=>{
    if(q.type==='nodmg') {
      q.startTime = Date.now(); // reset timer
    }
  });
}

// ─── FULL PLANET ORBIT VISUAL EFFECTS ─────────────────────────────

function drawPlanetOrbits() {
  if(!State.openWorldMode) return;
  State.galaxyObjects.forEach(obj=>{
    if(obj.type!=='planet'||!obj.moons||obj.moons.length===0) return;
    const sx=obj.x-State.camera.x, sy=obj.y-State.camera.y;
    if(sx<-400||sx>CANVAS.width+400||sy<-400||sy>CANVAS.height+400) return;
    // Draw orbit paths
    obj.moons.forEach(m=>{
      CTX.beginPath();
      CTX.ellipse(sx,sy,m.distance,m.distance*0.4,0,0,Math.PI*2);
      CTX.strokeStyle='rgba(255,255,255,0.04)'; CTX.lineWidth=0.5; CTX.stroke();
    });
  });
}

// ─── WEATHER PARTICLE SYSTEM ──────────────────────────────────────

function updateWeatherParticles() {
  if(!State.openWorldMode) return;
  const weather = State.spaceWeather.type;
  if(weather==='clear') { State._weatherParticles=[]; return; }
  const now=Date.now();
  // Spawn new particles based on weather
  if(weather==='nebula_surge' && State._weatherParticles.length<50) {
    State._weatherParticles.push({
      x: Math.random()*CANVAS.width, y: Math.random()*CANVAS.height,
      vx:(Math.random()-0.5)*1.5, vy:(Math.random()-0.5)*1.5,
      radius:2+Math.random()*4, color:'#cc44ff', alpha:0.6+Math.random()*0.4,
      life:120+Math.floor(Math.random()*80),
    });
  }
  if(weather==='ion_storm' && State._weatherParticles.length<60) {
    State._weatherParticles.push({
      x: Math.random()<0.5?0:CANVAS.width, y: Math.random()*CANVAS.height,
      vx:(Math.random()-0.5)*3, vy:(Math.random()-0.5)*0.5,
      radius:1+Math.random()*2, color:'#44aaff', alpha:0.7, life:80,
    });
  }
  // Update & draw existing particles
  for(let i=State._weatherParticles.length-1;i>=0;i--) {
    const pt=State._weatherParticles[i];
    pt.x+=pt.vx; pt.y+=pt.vy; pt.life--;
    if(pt.life<=0||(pt.x<-10||pt.x>CANVAS.width+10||pt.y<-10||pt.y>CANVAS.height+10)){
      State._weatherParticles.splice(i,1); continue;
    }
    const fadeAlpha=pt.alpha*(pt.life/100);
    CTX.fillStyle=pt.color; CTX.globalAlpha=Math.min(1,fadeAlpha);
    CTX.shadowColor=pt.color; CTX.shadowBlur=6;
    CTX.beginPath(); CTX.arc(pt.x,pt.y,pt.radius,0,Math.PI*2); CTX.fill();
    CTX.shadowBlur=0; CTX.globalAlpha=1;
  }
}

// ─── OPEN WORLD SCORE/EXPLORATION STATS ───────────────────────────

function getOpenWorldStats() {
  const totalSectors = State.galaxySectors.length || 36;
  const visited = State.visitedSectors.length;
  const bossesDefeated = State.galaxySectors.filter(s=>s.bossDefeated).length;
  const objectivesComplete = State.galaxySectors.filter(s=>s.objectiveComplete).length;
  return { totalSectors, visited, bossesDefeated, objectivesComplete };
}

// ─── DRAW OPEN WORLD SCORE OVERLAY (on canvas) ────────────────────

function drawOpenWorldStatusBar() {
  if(!State.openWorldMode) return;
  const stats = getOpenWorldStats();
  // Draw a status bar at top-right area (below minimap)
  const barX = CANVAS.width - 156;
  const barY = 210;
  CTX.save();
  CTX.fillStyle='rgba(2,8,23,0.7)';
  CTX.fillRect(barX-4, barY-4, 152, 60);
  CTX.strokeStyle='rgba(0,245,255,0.15)'; CTX.lineWidth=1;
  CTX.strokeRect(barX-4, barY-4, 152, 60);
  CTX.fillStyle='rgba(0,245,255,0.5)'; CTX.font='7px Orbitron, monospace'; CTX.textAlign='left';
  CTX.fillText('SECTORS:  '+stats.visited+'/'+stats.totalSectors, barX, barY+10);
  CTX.fillStyle='rgba(255,100,0,0.7)';
  CTX.fillText('BOSSES:   '+stats.bossesDefeated+'/'+stats.totalSectors, barX, barY+22);
  CTX.fillStyle='rgba(57,255,20,0.7)';
  CTX.fillText('OBJ DONE: '+stats.objectivesComplete, barX, barY+34);
  CTX.fillStyle='rgba(0,255,136,0.7)';
  CTX.fillText('FLEET:    '+State.allyFleet.length+'/5', barX, barY+46);
  CTX.restore();
}

// ─── ADVANCED SECTOR TRANSITION ANIMATION ─────────────────────────

let _sectorTransitionAlpha = 0;
let _sectorTransitionTimer = 0;
let _sectorTransitionName = '';

function triggerSectorTransitionFX(sectorName, color) {
  _sectorTransitionAlpha = 0.6;
  _sectorTransitionTimer = Date.now();
  _sectorTransitionName = sectorName;
  State._sectorTransitionColor = color || '#7b2fff';
}

function drawSectorTransitionFX() {
  if(_sectorTransitionAlpha <= 0) return;
  const elapsed = (Date.now()-_sectorTransitionTimer)/1000;
  _sectorTransitionAlpha = Math.max(0, 0.6 - elapsed*0.4);
  if(_sectorTransitionAlpha > 0) {
    CTX.save();
    CTX.globalAlpha = _sectorTransitionAlpha;
    CTX.fillStyle = State._sectorTransitionColor||'#7b2fff';
    CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
    CTX.globalAlpha = Math.min(1, _sectorTransitionAlpha*2.5);
    CTX.fillStyle='#ffffff'; CTX.font='bold 20px Orbitron, monospace';
    CTX.textAlign='center'; CTX.textBaseline='middle';
    CTX.fillText(_sectorTransitionName, CANVAS.width/2, CANVAS.height/2);
    CTX.textAlign='left'; CTX.textBaseline='alphabetic';
    CTX.restore();
  }
}

// ─── POWER-UP DROPS IN OPEN WORLD ────────────────────────────────

function spawnOpenWorldPowerUp(x, y) {
  if(!State.openWorldMode) return;
  // Add a special debris object that acts as a power-up
  State.galaxyObjects.push({
    type:'debris',
    x: x + (Math.random()-0.5)*40,
    y: y + (Math.random()-0.5)*40,
    radius:20, sectorIdx:State.currentSector,
    used:false, lootCoins:30+Math.floor(Math.random()*70),
  });
}

// ─── WARP EFFECT WHEN USING WORMHOLE / GATE ───────────────────────

function triggerWarpEffect(targetX, targetY, color) {
  addTrauma(0.5);
  triggerExplosion(targetX, targetY, color||'#7b2fff', 40);
  for(let i=0;i<8;i++) {
    const angle=i/8*Math.PI*2;
    State.xpOrbs.push(new XPOrb(targetX+Math.cos(angle)*50, targetY+Math.sin(angle)*50, 5));
  }
}

// ─── DYNAMIC SECTOR NAME DISPLAY ──────────────────────────────────

function drawCurrentSectorInfo() {
  if(!State.openWorldMode) return;
  const sector = State.galaxySectors[State.currentSector];
  if(!sector) return;
  const theme = sector.theme || OW_SECTOR_THEMES[State.currentSector%OW_SECTOR_THEMES.length];
  const faction = sector.faction ? FACTIONS[sector.faction] : null;
  CTX.save();
  // Sector name in top-center
  CTX.fillStyle = theme.color||'rgba(180,120,255,0.6)';
  CTX.globalAlpha=0.8; CTX.font='bold 12px Orbitron, monospace'; CTX.textAlign='center';
  CTX.fillText(theme.name, CANVAS.width/2, 56);
  // Faction below sector name
  if(faction) {
    CTX.fillStyle=faction.color; CTX.font='9px Orbitron, monospace';
    CTX.globalAlpha=0.6;
    CTX.fillText('CONTROLLED BY: '+faction.name, CANVAS.width/2, 72);
  }
  // Current sector index
  CTX.fillStyle='rgba(255,255,255,0.25)'; CTX.font='8px monospace'; CTX.globalAlpha=0.5;
  CTX.fillText('SECTOR '+(State.currentSector+1)+'/36', CANVAS.width/2, 85);
  CTX.textAlign='left'; CTX.globalAlpha=1; CTX.restore();
}

// ─── ENHANCED BOSS ZONE DISPLAY ───────────────────────────────────

function drawEnhancedBossZones() {
  if(!State.openWorldMode) return;
  const now = Date.now();
  CTX.save();
  State.galaxySectors.forEach(s=>{
    if(s.bossDefeated) return;
    const bz=s.bossZone;
    const bsx=bz.x-State.camera.x, bsy=bz.y-State.camera.y;
    if(bsx<-300||bsx>CANVAS.width+300||bsy<-300||bsy>CANVAS.height+300) return;
    const pulse=Math.sin(now*0.002)*0.3+0.7;
    CTX.strokeStyle=`rgba(255,80,0,${0.25*pulse})`; CTX.lineWidth=2;
    CTX.setLineDash([8,8]);
    CTX.strokeRect(bsx,bsy,bz.w,bz.h);
    CTX.setLineDash([]);
    // Boss zone label
    CTX.fillStyle=`rgba(255,100,0,${0.6*pulse})`;
    CTX.font='10px Orbitron, monospace'; CTX.textAlign='center';
    CTX.fillText('BOSS ZONE',bsx+bz.w/2,bsy+bz.h/2);
    // Warning skull indicator
    CTX.font='20px Arial'; CTX.globalAlpha=0.4*pulse;
    CTX.fillText('💀',bsx+bz.w/2-10,bsy+bz.h/2+25);
    CTX.globalAlpha=1;
  });
  CTX.textAlign='left'; CTX.restore();
}

// ─── ADVANCED XP/COIN NOTIFICATION SYSTEM ─────────────────────────

function showGalaxyNotification(text, subText, color, duration) {
  duration = duration || 3000;
  const el = document.getElementById('waveAnnounce');
  if(!el) return;
  el.style.opacity='1';
  el.style.color=color||'#00f5ff';
  el.innerHTML=text+(subText?'<br><span style="font-size:14px;opacity:0.7;">'+subText+'</span>':'');
  clearTimeout(el._notifTimeout);
  el._notifTimeout=setTimeout(()=>{
    el.style.transition='opacity 0.5s';
    el.style.opacity='0';
    setTimeout(()=>{el.style.transition='';},600);
  }, duration);
}

// ─── LORE TEXT SYSTEM ────────────────────────────────────────────

const LORE_MESSAGES = [
  'Ancient transmissions echo through the void...',
  'The empire\'s reach extends to the outer arms.',
  'Pirates have been spotted near sector 7.',
  'Merchant convoys depart at solar noon.',
  'Crystal formations predate the known galaxy.',
  'Wormholes were discovered by the Precursors.',
  'Black holes are portals to nothing and everything.',
  'The Rebel Fleet fights for freedom across all sectors.',
  'The Omega Dimension holds the final truth.',
  'Space fortresses were built during the Great War.',
];

let _loreMessageTimer = 0;
let _currentLoreMsg = '';
let _loreMsgAlpha = 0;

function updateLoreMessages() {
  if(!State.openWorldMode) return;
  const now = Date.now();
  if(now - _loreMessageTimer > 45000) {
    _loreMessageTimer = now;
    _currentLoreMsg = LORE_MESSAGES[Math.floor(Math.random()*LORE_MESSAGES.length)];
    _loreMsgAlpha = 1;
  }
  if(_loreMsgAlpha > 0) _loreMsgAlpha -= 0.003;
}

function drawLoreMessage() {
  if(!State.openWorldMode || _loreMsgAlpha <= 0 || !_currentLoreMsg) return;
  CTX.save();
  CTX.globalAlpha = Math.max(0, _loreMsgAlpha);
  CTX.fillStyle='rgba(180,120,255,0.8)';
  CTX.font='italic 12px Rajdhani, sans-serif';
  CTX.textAlign='center';
  CTX.fillText(_currentLoreMsg, CANVAS.width/2, CANVAS.height-40);
  CTX.textAlign='left'; CTX.restore();
}

// ─── MISSION OBJECTIVE TICKER ─────────────────────────────────────

function drawMissionObjectiveTicker() {
  if(!State.openWorldMode) return;
  if(State.activeQuests.length===0) return;
  const q = State.activeQuests[0];
  if(!q) return;
  CTX.save();
  CTX.fillStyle='rgba(2,8,23,0.75)';
  CTX.fillRect(12, CANVAS.height/2-20, 200, 48);
  CTX.strokeStyle='rgba(255,170,0,0.3)'; CTX.lineWidth=1;
  CTX.strokeRect(12, CANVAS.height/2-20, 200, 48);
  CTX.fillStyle='rgba(255,170,0,0.8)'; CTX.font='8px Orbitron, monospace';
  CTX.fillText('ACTIVE QUEST', 20, CANVAS.height/2-5);
  CTX.fillStyle='#ffffff'; CTX.font='9px Orbitron, monospace';
  CTX.fillText(q.name, 20, CANVAS.height/2+10);
  // Progress bar
  const pct=Math.min(1,(q.progress||0)/q.target);
  CTX.fillStyle='rgba(255,255,255,0.1)'; CTX.fillRect(20,CANVAS.height/2+18,180,4);
  CTX.fillStyle='#ffaa00'; CTX.fillRect(20,CANVAS.height/2+18,180*pct,4);
  CTX.fillStyle='rgba(255,255,255,0.4)'; CTX.font='8px monospace';
  CTX.fillText((q.progress||0)+'/'+q.target, 20, CANVAS.height/2+34);
  CTX.restore();
}

// ─── SPECIAL ENCOUNTER: VOID CREATURE ─────────────────────────────

function spawnVoidCreature(x, y) {
  const e=createEnemy('tank');
  e.x=x; e.y=y; e.worldX=x; e.worldY=y; e.homeX=x; e.homeY=y;
  e._openWorld=true; e.sectorIdx=State.currentSector;
  e.health*=5; e.maxHealth=e.health;
  e.speed=1.5; e._origSpeed=1.5;
  e._voidCreature=true;
  e.color='#330033'; e.borderColor='#8800ff';
  // Scale up size
  e.width=(e.width||30)*2; e.height=(e.height||30)*2;
  State.enemies.push(e);
  showWaveAnnounce('VOID ENTITY SPAWNED','#8800ff');
}

// ─── ZONE COMPLETION CELEBRATION ──────────────────────────────────

function celebrateSectorObjectiveComplete(sectorIdx) {
  const sector=State.galaxySectors[sectorIdx];
  if(!sector||!sector.sectorObjective||!sector.sectorObjective.completed) return;
  // Spawn XP burst
  const cx=sector.x+sector.w/2, cy=sector.y+sector.h/2;
  for(let i=0;i<8;i++) {
    State.xpOrbs.push(new XPOrb(cx+(Math.random()-0.5)*100, cy+(Math.random()-0.5)*100, 30));
  }
  // Trigger explosion burst
  triggerExplosion(cx,cy,'#39ff14',30);
  triggerExplosion(cx-40,cy,'#00f5ff',20);
  triggerExplosion(cx+40,cy,'#ffaa00',20);
}

// ─── CRYSTAL COLLECTION TRACKER ───────────────────────────────────

function trackCrystalCollection(amount) {
  State.craftingMaterials.crystals=(State.craftingMaterials.crystals||0)+amount;
  updateQuestProgress('crystal', amount*10);
}

// ─── AMBIENT SPACE SOUNDS CONTROLLER ─────────────────────────────

let _ambientTimer = 0;
function processAmbientEffects() {
  if(!State.openWorldMode) return;
  const now=Date.now();
  if(now-_ambientTimer > 8000) {
    _ambientTimer=now;
    // Occasional distant explosion ambiance
    if(Math.random()<0.2) {
      const p=State.players[0];
      if(p) triggerExplosion(
        p.x+(Math.random()-0.5)*800, p.y+(Math.random()-0.5)*800,
        '#ff4400', 5
      );
    }
  }
}

// ─── XP GAIN FROM ION STORM ───────────────────────────────────────

function getWeatherXPMult() {
  if(!State.openWorldMode) return 1;
  if(State.spaceWeather.type==='ion_storm') return 1.5;
  return 1;
}

function getWeatherCoinMult() {
  if(!State.openWorldMode) return 1;
  if(State.spaceWeather.type==='ion_storm') return 1.5;
  return 1;
}

// ─── VOID RIFT BLACK HOLE EXPANSION ───────────────────────────────

function getBlackHoleRadiusMult() {
  if(!State.openWorldMode) return 1;
  if(State.spaceWeather.type==='void_rift') return 1.5;
  return 1;
}

// ─── QUEST HUD MINI PANEL (canvas drawn) ─────────────────────────

function drawQuestMiniPanel() {
  if(!State.openWorldMode || State.activeQuests.length===0) return;
  const panelX=12, panelY=CANVAS.height-200;
  const panelW=200, qH=42;
  const show=Math.min(3,State.activeQuests.length);
  CTX.save();
  CTX.fillStyle='rgba(2,8,23,0.75)';
  CTX.fillRect(panelX,panelY,panelW,show*qH+24);
  CTX.strokeStyle='rgba(255,170,0,0.25)'; CTX.lineWidth=1;
  CTX.strokeRect(panelX,panelY,panelW,show*qH+24);
  CTX.fillStyle='rgba(255,170,0,0.7)'; CTX.font='8px Orbitron,monospace';
  CTX.fillText('ACTIVE QUESTS [Q]',panelX+8,panelY+14);
  for(let i=0;i<show;i++) {
    const q=State.activeQuests[i];
    const qy=panelY+20+i*qH;
    // Quest name
    CTX.fillStyle='rgba(255,255,255,0.8)'; CTX.font='8px Orbitron,monospace';
    CTX.fillText(q.name.substring(0,22),panelX+8,qy+14);
    // Progress bar
    const pct=Math.min(1,(q.progress||0)/q.target);
    CTX.fillStyle='rgba(255,255,255,0.1)'; CTX.fillRect(panelX+8,qy+18,panelW-16,3);
    CTX.fillStyle='#ffaa00'; CTX.fillRect(panelX+8,qy+18,(panelW-16)*pct,3);
    // Progress text
    CTX.fillStyle='rgba(255,255,255,0.4)'; CTX.font='7px monospace';
    CTX.fillText((q.progress||0)+'/'+q.target,panelX+8,qy+32);
  }
  CTX.restore();
}

// ─── OPEN WORLD INPUT CONTROLS (NEBULA SLOW) ─────────────────────

function getPlayerOpenWorldSpeedMult(player) {
  let mult=1;
  if(player._nebulaSlowed) mult*=0.7;
  mult*=getWeatherSpeedMult();
  // Crafting speed boost
  if(State._craftEffects&&State._craftEffects.speedBoost10s&&State._craftEffects.speedBoost10s>Date.now()) mult*=3;
  return mult;
}

// ─── BOSS KILL INTEGRATION WITH EXPANSION ─────────────────────────

// Called when boss is defeated (integration point)
function expandedBossDeathHook() {
  if(!State.openWorldMode) return;
  onOpenWorldBossDefeated();
}

// ─── FULL GALAXY MAP: DRAW LORE TEXT ─────────────────────────────

function renderGalaxyMapLore() {
  const canvas=document.getElementById('galaxyMapCanvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  // Draw legend
  const legendX=10, legendY=canvas.height-60;
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(legendX,legendY,280,55);
  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.5; ctx.strokeRect(legendX,legendY,280,55);
  ctx.font='8px Orbitron, monospace'; ctx.textAlign='left';
  const items=[
    {color:'rgba(255,68,68,0.8)',  label:'Pirate Territory'},
    {color:'rgba(68,136,255,0.8)', label:'Empire Space'},
    {color:'rgba(255,170,0,0.8)',  label:'Rebel Zone'},
    {color:'rgba(0,255,136,0.8)',  label:'Merchant Space'},
    {color:'rgba(255,100,0,0.9)',  label:'Active Boss'},
    {color:'#39ff14',              label:'Your Position'},
  ];
  items.forEach((item,i)=>{
    const col=i<3?0:3;
    const row=i%3;
    ctx.fillStyle=item.color;
    ctx.fillRect(legendX+8+col*90,legendY+8+row*14,8,8);
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.fillText(item.label,legendX+20+col*90,legendY+15+row*14);
  });
}

// ─── EXPLORATION REWARDS ──────────────────────────────────────────

function checkExplorationMilestones() {
  if(!State.openWorldMode) return;
  const visited=State.visitedSectors.length;
  const milestones=[
    {sectors:5,  reward:{coins:100,xp:200}, msg:'EXPLORER I: 5 Sectors!'},
    {sectors:10, reward:{coins:200,xp:400}, msg:'EXPLORER II: 10 Sectors!'},
    {sectors:18, reward:{coins:400,xp:800}, msg:'DEEP SPACE: 18 Sectors!'},
    {sectors:27, reward:{coins:600,xp:1200},msg:'VOID TRAVELER: 27 Sectors!'},
    {sectors:36, reward:{coins:1000,xp:2000},msg:'GALAXY MASTER: ALL SECTORS!'},
  ];
  milestones.forEach(m=>{
    const key='_milestone_'+m.sectors;
    if(visited>=m.sectors && !State[key]) {
      State[key]=true;
      addCoins(m.reward.coins);
      gainXP(m.reward.xp);
      showWaveAnnounce(m.msg,'#ffd60a');
    }
  });
}

// ─── OPEN WORLD GAME OVER INTEGRATION ────────────────────────────

function openWorldGameOverSummary() {
  if(!State.openWorldMode) return;
  const stats=getOpenWorldStats();
  return {
    sectors: stats.visited+'/'+stats.totalSectors,
    bosses: stats.bossesDefeated,
    objectives: stats.objectivesComplete,
    quests: State.completedQuests.length,
    codex: State.codex.discoveries.length+'/'+CODEX_ENTRIES.length,
    allies: State.allyFleet.length,
    crystals: State.craftingMaterials.crystals||0,
  };
}

// ─── SECTOR OBJECTIVE DISPLAY ON SECTOR ENTER ────────────────────

function announceSectorObjective(sectorIdx) {
  const sector=State.galaxySectors[sectorIdx]; if(!sector||!sector.sectorObjective) return;
  const obj=sector.sectorObjective;
  if(obj.completed) return;
  const typeLabel={kill:'ELIMINATE ENEMIES',collect:'COLLECT XP',defend:'SURVIVE',explore:'EXPLORE'}[obj.type]||'COMPLETE TASK';
  showWaveAnnounce(typeLabel+': '+obj.target,'rgba(0,245,255,0.8)');
}

// ─── OPEN WORLD CLEANUP ON GAME END ──────────────────────────────

function cleanupOpenWorldSystems() {
  hideOpenWorldHUDs();
  const overlays=['questLogOverlay','craftingOverlay','fleetOverlay','galaxyMapOverlay','tradeOverlay'];
  overlays.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove('open'); });
  State._weatherParticles=[];
  _sectorTransitionAlpha=0;
  _loreMsgAlpha=0;
}

// ─── ALLY FLEET DAMAGE FROM ENEMIES ──────────────────────────────

function checkAllyFleetDamage() {
  if(!State.openWorldMode||State.allyFleet.length===0) return;
  State.allyFleet.forEach(ship=>{
    if(ship.dead) return;
    // Check collision with enemies
    for(let i=State.enemies.length-1;i>=0;i--) {
      const e=State.enemies[i];
      const dx=(ship.x+ship.width/2)-(e.x+e.width/2);
      const dy=(ship.y+ship.height/2)-(e.y+e.height/2);
      if(Math.hypot(dx,dy)<(ship.width+e.width)/2+10) {
        ship.takeDamage(1);
        break;
      }
    }
    // Enemy bullets
    State.enemies.forEach(e=>{
      if(!e.bullets) return;
      for(let bi=e.bullets.length-1;bi>=0;bi--) {
        const b=e.bullets[bi];
        const dx=(ship.x+ship.width/2)-b.x, dy=(ship.y+ship.height/2)-b.y;
        if(Math.hypot(dx,dy)<ship.width) {
          ship.takeDamage(1);
          e.bullets.splice(bi,1);
          break;
        }
      }
    });
  });
}

// ─── GALAXY RENDERING OPTIMIZATIONS ──────────────────────────────

/**
 * Pre-calculate visibility for galaxy objects to skip off-screen rendering.
 * Returns true if the object at (x,y) with given radius is visible in viewport.
 */
function isInViewport(x, y, radius) {
  const sx=x-State.camera.x, sy=y-State.camera.y;
  return sx>-radius-50&&sx<CANVAS.width+radius+50&&sy>-radius-50&&sy<CANVAS.height+radius+50;
}

// ─── SPECIAL WARP TUNNEL VISUAL ──────────────────────────────────

function drawWarpTunnel() {
  if(!State.openWorldMode) return;
  // Only when void_rift weather is active
  if(State.spaceWeather.type!=='void_rift') return;
  const now=Date.now()*0.001;
  CTX.save();
  CTX.globalAlpha=0.05+0.02*Math.sin(now*3);
  const grad=CTX.createRadialGradient(CANVAS.width/2,CANVAS.height/2,0,CANVAS.width/2,CANVAS.height/2,CANVAS.width);
  grad.addColorStop(0,'rgba(100,0,150,0.8)');
  grad.addColorStop(0.5,'rgba(50,0,100,0.4)');
  grad.addColorStop(1,'transparent');
  CTX.fillStyle=grad;
  CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
  // Radial lines
  CTX.globalAlpha=0.06+0.02*Math.sin(now*2);
  CTX.strokeStyle='rgba(150,0,255,0.8)'; CTX.lineWidth=1;
  for(let a=0;a<Math.PI*2;a+=Math.PI/8) {
    const twist=a+now*0.3;
    CTX.beginPath();
    CTX.moveTo(CANVAS.width/2+Math.cos(twist)*20,CANVAS.height/2+Math.sin(twist)*20);
    CTX.lineTo(CANVAS.width/2+Math.cos(twist)*CANVAS.width,CANVAS.height/2+Math.sin(twist)*CANVAS.width);
    CTX.stroke();
  }
  CTX.restore();
}

// ─── ASTEROID FIELD RESPAWN TIMER ────────────────────────────────

function respawnAsteroidFields() {
  if(!State.openWorldMode) return;
  State.galaxyObjects.forEach(obj=>{
    if(obj.type!=='asteroidField') return;
    if(!obj.asteroids) return;
    const allDead=obj.asteroids.every(a=>a.health<=0);
    if(allDead) {
      if(!obj._respawnTimer) obj._respawnTimer=Date.now()+30000;
      if(Date.now()>obj._respawnTimer) {
        // Respawn asteroids
        obj.asteroids.forEach(a=>{a.health=a.maxHealth; a.angle=Math.random()*Math.PI*2;});
        obj._respawnTimer=null;
      }
    }
  });
}

// ─── CRYSTAL FIELD RESPAWN ────────────────────────────────────────

function respawnCrystalFields() {
  if(!State.openWorldMode) return;
  State.galaxyObjects.forEach(obj=>{
    if(obj.type!=='crystal'||!obj.crystals) return;
    const allDead=obj.crystals.every(c=>c.health<=0);
    if(allDead) {
      if(!obj._respawnTimer) obj._respawnTimer=Date.now()+60000;
      if(Date.now()>obj._respawnTimer) {
        obj.crystals.forEach(c=>{c.health=c.maxHealth;});
        obj._respawnTimer=null;
        showWaveAnnounce('CRYSTALS REGROWN','#44aaff');
      }
    }
  });
}

// ─── ALL EXPANSION UPDATE CALL ────────────────────────────────────

/**
 * Main entry point for all expansion update logic.
 * Call once per frame in the open world game loop.
 */
function updateOpenWorldExpansion() {
  if(!State.openWorldMode) return;
  processOpenWorldEnemyAI();
  updateLoreMessages();
  updateWeatherParticles();
  checkExplorationMilestones();
  checkAllyFleetDamage();
  respawnAsteroidFields();
  respawnCrystalFields();
  processAmbientEffects();
}

/**
 * Main entry point for all expansion draw calls.
 * Call once per frame (NOT inside camera transform) in open world.
 */
function drawOpenWorldExpansionHUD() {
  if(!State.openWorldMode) return;
  drawCurrentSectorInfo();
  drawOpenWorldStatusBar();
  drawLoreMessage();
  drawQuestMiniPanel();
  drawSectorTransitionFX();
  drawWarpTunnel();
  updateWeatherParticles();
}




// ═══════════════════════════════════════════════════════════════════
// OPEN WORLD EXPANSION – FINAL SYSTEMS & POLISH
// ═══════════════════════════════════════════════════════════════════

// ─── OPEN WORLD PAUSE MENU EXTENSION ────────────────────────────

function getOpenWorldPauseInfo() {
  if(!State.openWorldMode) return '';
  const stats = getOpenWorldStats();
  const sector = State.galaxySectors[State.currentSector];
  const theme = sector && sector.theme ? sector.theme.name : 'Unknown';
  const faction = sector && sector.faction ? FACTIONS[sector.faction].name : 'None';
  return `Sector: ${theme} | Faction: ${faction} | Explored: ${stats.visited}/${stats.totalSectors} | Quests: ${State.activeQuests.length}`;
}

// ─── CRYSTALS DISPLAY ON HUD ─────────────────────────────────────

function updateCrystalsDisplay() {
  if(!State.openWorldMode) return;
  const el = document.getElementById('coinDisplay');
  if(!el) return;
  const crystals = State.craftingMaterials.crystals || 0;
  // Append crystal count to coin display
  const coinPart = el.textContent.split('|')[0].trim();
  // Only show if we have crystals
  if(crystals > 0) {
    el.innerHTML = `${coinPart} | <span style="color:#44aaff">🔷 ${crystals}</span>`;
  }
}

// ─── FLEET DAMAGE INDICATOR ──────────────────────────────────────

function drawFleetHealthBars() {
  if(!State.openWorldMode || State.allyFleet.length === 0) return;
  const startX = CANVAS.width - 160;
  const startY = CANVAS.height - 30 - State.allyFleet.length * 18;
  CTX.save();
  CTX.fillStyle = 'rgba(2,8,23,0.7)';
  CTX.fillRect(startX-4, startY-4, 152, State.allyFleet.length*18+12);
  CTX.strokeStyle = 'rgba(0,255,136,0.2)'; CTX.lineWidth=1;
  CTX.strokeRect(startX-4, startY-4, 152, State.allyFleet.length*18+12);
  State.allyFleet.forEach((ship, i)=>{
    if(ship.dead) return;
    const y = startY + i*18;
    const pct = ship.health / ship.maxHealth;
    // Ship label
    CTX.fillStyle = ship.color; CTX.font='7px Orbitron,monospace';
    CTX.fillText(ship.label, startX, y+10);
    // Health bar
    CTX.fillStyle='rgba(255,255,255,0.1)'; CTX.fillRect(startX+50,y+3,90,6);
    CTX.fillStyle=pct>0.5?'#39ff14':pct>0.25?'#ffaa00':'#ff4444';
    CTX.fillRect(startX+50,y+3,90*pct,6);
  });
  CTX.restore();
}

// ─── BEACON TRIGGERED EVENT REWARD CHEST ─────────────────────────

function spawnEventRewardChest(x, y) {
  State.galaxyObjects.push({
    type:'debris', x, y, radius:25,
    sectorIdx: State.currentSector, used:false,
    lootCoins: 100 + Math.floor(Math.random()*100),
    isReward: true,
  });
  triggerExplosion(x, y, '#ffdd00', 20);
}

// ─── TRADING POST COOLDOWN SYSTEM ────────────────────────────────

function resetTradingPostCooldowns() {
  // Called periodically to allow trading posts to be reused
  State.galaxyObjects.forEach(obj=>{
    if(obj.type!=='trader') return;
    if(obj.tradeOpen && Date.now() - (obj._lastTradeTime||0) > 120000) {
      obj.tradeOpen = false; // Reset after 2 minutes
    }
  });
}

// ─── SPECIAL SECTOR: OMEGA DIMENSION ─────────────────────────────

function checkOmegaSector() {
  if(!State.openWorldMode) return;
  if(State.currentSector === 35) {
    updateQuestProgress('omega');
    if(!State._omegaDiscovered) {
      State._omegaDiscovered = true;
      discoverCodex('c19');
      showWaveAnnounce('OMEGA DIMENSION REACHED!','#00ffff');
      triggerGalaxyEvent('void_creature');
    }
  }
}

// ─── NEBULA SPEED REDUCTION VISUAL ───────────────────────────────

function drawNebulaSpeedEffect() {
  if(!State.openWorldMode) return;
  const p = State.players[0]; if(!p) return;
  if(!p._nebulaSlowed) return;
  CTX.save();
  CTX.globalAlpha=0.08+0.04*Math.sin(Date.now()*0.004);
  const nebColors = ['#aa44ff','#4488ff','#44ffaa'];
  const nc = nebColors[Math.floor(Date.now()/1000)%nebColors.length];
  CTX.fillStyle=nc;
  CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
  CTX.globalAlpha=1;
  CTX.fillStyle=nc; CTX.font='9px Orbitron,monospace'; CTX.textAlign='center';
  CTX.globalAlpha=0.6;
  CTX.fillText('NEBULA: -30% SPEED | -20% DAMAGE', CANVAS.width/2, CANVAS.height-25);
  CTX.textAlign='left'; CTX.globalAlpha=1; CTX.restore();
}

// ─── CRAFTING EFFECT INDICATORS ──────────────────────────────────

function drawCraftEffectIndicators() {
  if(!State.openWorldMode) return;
  const effects = State._craftEffects || {};
  const now = Date.now();
  const active = Object.entries(effects).filter(([k,v])=>v>now);
  if(active.length===0) return;
  CTX.save();
  const panelX=CANVAS.width/2-80, panelY=CANVAS.height-90;
  CTX.fillStyle='rgba(2,8,23,0.75)';
  CTX.fillRect(panelX, panelY, 160, active.length*20+10);
  CTX.strokeStyle='rgba(123,47,255,0.4)'; CTX.lineWidth=1;
  CTX.strokeRect(panelX, panelY, 160, active.length*20+10);
  active.forEach(([effect, endTime], i)=>{
    const remaining = ((endTime-now)/1000).toFixed(1);
    const effectNames={tripleDamage5s:'3x DAMAGE',speedBoost10s:'3x SPEED',invincible8s:'INVINCIBLE',stunAllEnemies:'STUN'};
    const label = effectNames[effect]||effect;
    CTX.fillStyle='rgba(180,120,255,0.9)'; CTX.font='8px Orbitron,monospace'; CTX.textAlign='center';
    CTX.fillText(label+' '+remaining+'s', panelX+80, panelY+15+i*20);
  });
  CTX.textAlign='left'; CTX.restore();
}

// ─── OPEN WORLD HELP TOOLTIP ─────────────────────────────────────

function drawOpenWorldHelp() {
  if(!State.openWorldMode) return;
  if(Date.now()-State.gameStartTime > 30000) return; // Only show for first 30s
  const helpText = [
    'WASD/ARROWS: Move',
    'SPACE: Shoot',
    'Q: Quest Log',
    'C: Crafting',
    'F: Fleet Manager',
    'M: Galaxy Map',
  ];
  CTX.save();
  CTX.fillStyle='rgba(2,8,23,0.8)';
  CTX.fillRect(CANVAS.width-200, CANVAS.height-helpText.length*16-20, 190, helpText.length*16+14);
  CTX.strokeStyle='rgba(0,245,255,0.2)'; CTX.lineWidth=1;
  CTX.strokeRect(CANVAS.width-200, CANVAS.height-helpText.length*16-20, 190, helpText.length*16+14);
  CTX.fillStyle='rgba(0,245,255,0.5)'; CTX.font='8px Orbitron,monospace';
  helpText.forEach((line,i)=>{
    const alpha = Math.max(0, 1 - (Date.now()-State.gameStartTime)/30000);
    CTX.globalAlpha=alpha;
    CTX.fillText(line, CANVAS.width-195, CANVAS.height-helpText.length*16-10+i*16);
  });
  CTX.globalAlpha=1; CTX.restore();
}

// ─── GALAXY OBJECT COUNT STATS ────────────────────────────────────

function getGalaxyObjectStats() {
  const counts = {};
  State.galaxyObjects.forEach(obj=>{
    counts[obj.type]=(counts[obj.type]||0)+1;
  });
  return counts;
}

// ─── SECTOR THEME COLOR OVERLAY ──────────────────────────────────

function drawSectorThemeOverlay() {
  if(!State.openWorldMode) return;
  const sector = State.galaxySectors[State.currentSector];
  if(!sector || !sector.theme) return;
  const theme = sector.theme;
  if(!theme.bg) return;
  // Very subtle background tint matching sector theme
  CTX.save();
  CTX.globalAlpha=0.04;
  CTX.fillStyle=theme.color||'#ffffff';
  CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
  CTX.globalAlpha=1; CTX.restore();
}

// ─── DRAW ALLY FLEET BULLETS TRAIL ───────────────────────────────

function drawAllyBulletTrails() {
  // Ally bullets already have their main rendering in processAllyFleet
  // This adds a subtle trail to them
  State._allyBullets.forEach(b=>{
    CTX.save();
    CTX.globalAlpha=0.3;
    CTX.fillStyle=b.color; CTX.shadowColor=b.color; CTX.shadowBlur=4;
    CTX.beginPath(); CTX.arc(b.x-State.camera.x-b.vx*2, b.y-State.camera.y-b.vy*2, 2, 0, Math.PI*2); CTX.fill();
    CTX.shadowBlur=0; CTX.globalAlpha=1; CTX.restore();
  });
}

// ─── SECTOR FACTION BORDER VISUAL ────────────────────────────────

function drawFactionBorderEffect() {
  if(!State.openWorldMode) return;
  const sector = State.galaxySectors[State.currentSector];
  if(!sector || !sector.faction) return;
  const faction = FACTIONS[sector.faction];
  if(!faction) return;
  CTX.save();
  CTX.strokeStyle=faction.color+'33'; CTX.lineWidth=6;
  // Draw glowing border at screen edges
  CTX.shadowColor=faction.color; CTX.shadowBlur=15;
  const m=3;
  CTX.strokeRect(m,m,CANVAS.width-m*2,CANVAS.height-m*2);
  CTX.shadowBlur=0;
  CTX.restore();
}

// ─── SPECIAL VISUAL: BOSS SECTOR WARNING ─────────────────────────

function drawBossProximityWarning() {
  if(!State.openWorldMode) return;
  const p = State.players[0]; if(!p) return;
  let nearBoss = false;
  State.galaxySectors.forEach(s=>{
    if(s.bossDefeated) return;
    const bz=s.bossZone;
    const bx=bz.x+bz.w/2, by=bz.y+bz.h/2;
    const dist=Math.hypot((p.x+p.width/2)-bx,(p.y+p.height/2)-by);
    if(dist<300) nearBoss=true;
  });
  if(!nearBoss) return;
  const pulse=Math.abs(Math.sin(Date.now()*0.003))*0.4;
  CTX.save();
  CTX.globalAlpha=pulse;
  CTX.fillStyle='rgba(255,60,0,0.15)';
  CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
  CTX.globalAlpha=pulse*2;
  CTX.fillStyle='rgba(255,80,0,0.7)'; CTX.font='bold 11px Orbitron,monospace'; CTX.textAlign='center';
  CTX.fillText('BOSS ZONE NEARBY', CANVAS.width/2, 120);
  CTX.textAlign='left'; CTX.globalAlpha=1; CTX.restore();
}

// ─── ACTIVE EVENT VISUAL INDICATORS ──────────────────────────────

function drawActiveEventIndicators() {
  if(!State.openWorldMode || State.activeEvents.length===0) return;
  CTX.save();
  State.activeEvents.forEach((ev,i)=>{
    const y=100+i*20;
    CTX.fillStyle='rgba(2,8,23,0.75)';
    CTX.fillRect(CANVAS.width/2-90, y, 180, 16);
    CTX.fillStyle='rgba(255,68,68,0.8)'; CTX.font='8px Orbitron,monospace'; CTX.textAlign='center';
    CTX.fillText('EVENT: '+ev.name, CANVAS.width/2, y+11);
  });
  CTX.textAlign='left'; CTX.restore();
}

// ─── OPEN WORLD COMPLETE DRAW PASS ───────────────────────────────

/**
 * The complete set of expansion draw calls for each frame.
 * This is called AFTER CTX.restore() (outside camera transform).
 */
function drawOpenWorldFullFrame() {
  if(!State.openWorldMode) return;
  drawSectorThemeOverlay();
  drawFactionBorderEffect();
  drawBossProximityWarning();
  drawActiveEventIndicators();
  drawCraftEffectIndicators();
  drawFleetHealthBars();
  drawNebulaSpeedEffect();
  checkOmegaSector();
  drawOpenWorldHelp();
  updateCrystalsDisplay();
  resetTradingPostCooldowns();
}

// ─── OPEN WORLD FINAL INIT HOOK ───────────────────────────────────

/**
 * Extra initialization called at the end of startOpenWorldMode.
 * Sets up additional expansion state.
 */
function initOpenWorldExpansion() {
  State._omegaDiscovered = false;
  State._lastDamageTime = Date.now();
  State._asteroidRainTimer = Date.now();
  State._quantumTimer = Date.now();
  _loreMessageTimer = Date.now();
  _loreMsgAlpha = 0;
  _sectorTransitionAlpha = 0;
  _ambientTimer = Date.now();
  // Show initial sector info
  const sector0=State.galaxySectors[0];
  if(sector0) {
    const theme0=sector0.theme||OW_SECTOR_THEMES[0];
    triggerSectorTransitionFX(theme0.name, theme0.color);
  }
  showOpenWorldHUDs();
}



// ═══════════════════════════════════════════════════════════════════
// SECTION 29 – RESIZE & INIT
// ═══════════════════════════════════════════════════════════════════
function resizeCanvas() {
  CANVAS.width=window.innerWidth; CANVAS.height=window.innerHeight;
  BGCANVAS.width=window.innerWidth; BGCANVAS.height=window.innerHeight;
  initStars();
  if(State.running) {
    if(!State.twoPlayer&&State.players[0]) State.players[0].x=CANVAS.width/2-25;
    if(State.twoPlayer) {
      if(State.players[0]) State.players[0].x=CANVAS.width/4-25;
      if(State.players[1]) State.players[1].x=CANVAS.width*3/4-25;
    }
  }
}
window.addEventListener('resize',resizeCanvas);

// IMPROVEMENT 20: animated background loop (runs always)
function bgLoop() { drawBackground(); requestAnimationFrame(bgLoop); }

// Phase 2.5: register service worker for offline PWA support
if('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(()=>{ /* http:// or file:// — silent */ });
  });
}

window.addEventListener('load',()=>{
  resizeCanvas();
  loadGameData();
  loadSettings();
  getPlayerName(); // pre-load player name from localStorage
  updateHUD();
  buildDifficultyOptions('difficultyOptions',setDifficulty);
  bgLoop();
  initTouchControls();
  runPreviewLoop();

  // Init preview char display
  const id=CHARACTER_IDS[0];
  const nameEl=document.getElementById('previewCharName');
  const abilEl=document.getElementById('previewCharAbility');
  if(nameEl) nameEl.textContent=id.toUpperCase();
  if(abilEl&&CHARACTER_CFG[id]) abilEl.textContent=CHARACTER_CFG[id].ability;

  // Loading animation
  const bar=document.getElementById('loadingProgress');
  const loadPct=document.getElementById('loadPct');
  let prog=0;
  if(bar) bar.style.width='0%';
  const iv=setInterval(()=>{
    prog+=2;
    if(bar) bar.style.width=prog+'%';
    if(loadPct) loadPct.textContent=prog+'%';
    if(prog>=100) {
      clearInterval(iv);
      const loadEl=document.getElementById('loading');
      if(loadEl) loadEl.classList.remove('active');
      updateTitleHighScores();
      updateTitleStats();
      navigateMenu('main');
    }
  },25);
});


