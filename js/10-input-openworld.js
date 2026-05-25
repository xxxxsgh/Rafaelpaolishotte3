// ═══════════════════════════════════════════════════════════════════
// SECTION 25 – SPAWN TRIGGER
// ═══════════════════════════════════════════════════════════════════
function trySpawnEnemiesOrBoss() {
  if(State.pvpMode||State.openWorldMode) return;
  if(!State.uniqueSpawned&&!State.infiniteMode&&!State.survivorMode&&State.scores[0]===0) {
    State.enemies.push(createEnemy('unique')); State.uniqueSpawned=true;
  }
  if(!State.bossSpawned&&(State.infiniteMode||State.survivorMode||State.scores[0]<State.gameLevel*100)) spawnEnemy();
  if(!State.bossSpawned&&!State.infiniteMode&&!State.survivorMode&&State.scores[0]>=State.gameLevel*100&&State.gameLevel<=BOSSES_DATA.length) {
    State.boss=new Boss(State.gameLevel); State.bossSpawned=true; playSound('levelUpSound');
    showWaveAnnounce('BOSS INCOMING!','#ff006e');
  }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 26 – GAMEPAD
// ═══════════════════════════════════════════════════════════════════
function updateGamepadControls() {
  const gamepads=navigator.getGamepads?.()??[];
  State.players.forEach((p,i)=>{
    const gp=gamepads[i]; if(!gp) return;
    p.isMovingLeft=gp.axes[0]<-0.2; p.isMovingRight=gp.axes[0]>0.2;
    if(gp.buttons[0]?.pressed) p.shoot();
    if(gp.buttons[1]?.pressed) { State.survivorMode?useSurvivorAbility(0):p.activateAbility(); }
  });
  if(gamepads[0]?.buttons[9]?.pressed) { State.paused?resumeGame():pauseGame(); }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 27 – KEYBOARD
// ═══════════════════════════════════════════════════════════════════
window.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if(key==='p' || key==='escape'){State.paused?resumeGame():pauseGame();return;}
  if(!State.running||State.paused) return;
  const p1=State.players[0], p2=State.players[1];
  if(e.key==='ArrowLeft'){if(p1)p1.isMovingLeft=true;}
  if(e.key==='ArrowRight'){if(p1)p1.isMovingRight=true;}
  if(State.openWorldMode) {
    if(e.key==='ArrowUp'||key==='w'){if(p1)p1.isMovingUp=true;}
    if(e.key==='ArrowDown'||key==='s'){if(p1)p1.isMovingDown=true;}
    if(e.key===' '){if(p1)p1.shoot();}
  } else {
    if(e.key===' '||e.key==='ArrowUp'){if(p1)p1.shoot();}
  }
  if(key==='a'&&!State.twoPlayer&&!State.openWorldMode){if(p1){State.survivorMode?useSurvivorAbility(0):p1.activateAbility();}}
  if(key==='a'&&State.openWorldMode){if(p1){p1.activateAbility();}}
  if(State.twoPlayer&&p2){
    if(key==='a')p2.isMovingLeft=true;
    if(key==='d')p2.isMovingRight=true;
    if(key==='s')p2.shoot();
    if(key==='f')p2.activateAbility();
  }
  if(State.infiniteMode){if(key==='1')useAbility('nuke');if(key==='2')useAbility('heal');if(key==='3')useAbility('shield');}
  if(State.survivorMode){if(key==='1')useSurvivorAbility(0);if(key==='2')useSurvivorAbility(1);if(key==='3')useSurvivorAbility(2);}
  // OPEN WORLD EXPANSION: keyboard shortcuts for Q/C/F/M
  if(State.openWorldMode) { if(handleOpenWorldKey(key)) return; }
  // IMPROVEMENT 18: arrow up also shoots
});
window.addEventListener('keyup',e=>{
  const key=e.key.toLowerCase();
  const p1=State.players[0], p2=State.players[1];
  if(e.key==='ArrowLeft'){if(p1)p1.isMovingLeft=false;}
  if(e.key==='ArrowRight'){if(p1)p1.isMovingRight=false;}
  if(State.openWorldMode) {
    if(e.key==='ArrowUp'||key==='w'){if(p1)p1.isMovingUp=false;}
    if(e.key==='ArrowDown'||key==='s'){if(p1)p1.isMovingDown=false;}
  }
  if(State.twoPlayer&&p2){if(key==='a')p2.isMovingLeft=false;if(key==='d')p2.isMovingRight=false;}
});

// ═══════════════════════════════════════════════════════════════════
// SECTION 28B – OPEN WORLD GALAXY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function generateGalaxy() {
  // Expand world to 18000x18000 with 36 sectors (6x6 grid)
  State.worldWidth = 18000;
  State.worldHeight = 18000;
  const W = State.worldWidth, H = State.worldHeight;
  State.galaxySectors = []; State.galaxyObjects = [];
  State._fortressBullets = []; State._allyBullets = []; State._sectorObjectiveProgress = {};
  State.activeEvents = []; State.allyFleet = [];
  State.spaceWeather = { type:'clear', timer:0, duration:0, lastCheck:Date.now() };
  const cols = 6, rows = 6;
  const sw = W/cols, sh = H/rows;
  const factionKeys = ['pirates','empire','rebels'];
  const objectiveTypes = ['kill','kill','collect','explore'];
  const planetColors = ['#ff6644','#4488ff','#44ff88','#ffaa00','#ff44ff','#44ffcc','#ffcc44','#cc44ff'];

  for(let r=0;r<rows;r++) {
    for(let c=0;c<cols;c++) {
      const idx = r*cols+c;
      const theme = OW_SECTOR_THEMES[idx % OW_SECTOR_THEMES.length];
      const faction = factionKeys[idx % 3];
      const objType = objectiveTypes[idx % objectiveTypes.length];
      const objTarget = objType==='kill'?8+idx:objType==='collect'?150:3;
      State.galaxySectors.push({
        x: c*sw, y: r*sh, w: sw, h: sh,
        themeIdx: idx,
        name: theme.name,
        theme: theme,
        faction: idx===0||idx===35 ? 'traders' : faction,
        bossDefeated: false,
        objectiveComplete: false,
        bossZone: { x:c*sw+sw*0.5-100, y:r*sh+sh*0.5-100, w:200, h:200 },
        sectorObjective: {
          type: objType,
          target: objTarget,
          progress: 0,
          completed: false,
          reward: { coins: 50+idx*5, xp: 100+idx*20 },
        },
      });

      // ─── Planets (2-3 per sector) ───
      const numPlanets = 2 + Math.floor(Math.random()*2);
      for(let p=0;p<numPlanets;p++) {
        const pRadius = 25+Math.random()*55;
        const pColor = planetColors[Math.floor(Math.random()*planetColors.length)];
        const numMoons = Math.floor(Math.random()*4);
        const moons = [];
        for(let m=0;m<numMoons;m++) {
          moons.push({ angle:Math.random()*Math.PI*2, distance:pRadius*1.8+m*30, radius:3+Math.random()*8, color:planetColors[Math.floor(Math.random()*planetColors.length)], speed:0.005+Math.random()*0.015 });
        }
        State.galaxyObjects.push({
          type:'planet',
          x: c*sw + sw*0.1 + Math.random()*sw*0.8,
          y: r*sh + sh*0.1 + Math.random()*sh*0.8,
          radius: pRadius,
          color: pColor,
          atmosphere: pColor,
          sectorIdx: idx,
          hasRing: Math.random()>0.6,
          moons: moons,
          rotation: Math.random()*Math.PI*2,
          rotSpeed: 0.001+Math.random()*0.004,
        });
      }

      // ─── Space Station ───
      State.galaxyObjects.push({
        type:'station', x:c*sw+sw*0.2+Math.random()*sw*0.3,
        y:r*sh+sh*0.2+Math.random()*sh*0.3, radius:20, sectorIdx:idx, used:false,
      });

      // ─── Wormhole every 4th sector ───
      if(idx%4===0) {
        State.galaxyObjects.push({
          type:'wormhole', x:c*sw+sw*0.7, y:r*sh+sh*0.7, radius:25, sectorIdx:idx,
          targetSector:(idx+7)%36,
        });
      }

      // ─── Asteroid Field ───
      if(idx%3===1 || Math.random()<0.4) {
        const numAsteroids = 4+Math.floor(Math.random()*5);
        const asteroids = [];
        for(let a=0;a<numAsteroids;a++) {
          const ar = 10+Math.random()*20;
          asteroids.push({
            relX:(Math.random()-0.5)*200, relY:(Math.random()-0.5)*200,
            radius:ar, angle:Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*0.04,
            color:['#aa7744','#887755','#995533','#bb8855'][Math.floor(Math.random()*4)],
            health:2+Math.floor(ar/5), maxHealth:2+Math.floor(ar/5),
          });
        }
        State.galaxyObjects.push({
          type:'asteroidField',
          x:c*sw+sw*0.3+Math.random()*sw*0.4,
          y:r*sh+sh*0.3+Math.random()*sh*0.4,
          radius:120, sectorIdx:idx, asteroids,
        });
      }

      // ─── Black Hole (every 6th sector, offset) ───
      if(idx%6===5) {
        State.galaxyObjects.push({
          type:'blackhole', x:c*sw+sw*0.5, y:r*sh+sh*0.5, radius:60, sectorIdx:idx,
        });
      }

      // ─── Space Fortress (every 5th sector) ───
      if(idx%5===3 && idx>0) {
        const hpVal = 200+idx*40;
        State.galaxyObjects.push({
          type:'fortress', x:c*sw+sw*0.6+Math.random()*sw*0.2, y:r*sh+sh*0.3+Math.random()*sh*0.2,
          radius:80, health:hpVal, maxHealth:hpVal, sectorIdx:idx, destroyed:false,
        });
      }

      // ─── Nebula Cloud ───
      if(idx%4===2 || Math.random()<0.3) {
        const nebulaColors=['#aa44ff','#4488ff','#44ffaa','#ff4488','#ffaa44'];
        State.galaxyObjects.push({
          type:'nebula', x:c*sw+sw*0.4+Math.random()*sw*0.2, y:r*sh+sh*0.4+Math.random()*sh*0.2,
          radius:150+Math.random()*150, color:nebulaColors[idx%nebulaColors.length],
          sectorIdx:idx,
        });
      }

      // ─── Trading Post (every 4th sector from 2) ───
      if((idx+2)%5===0 || idx===0) {
        State.galaxyObjects.push({
          type:'trader', x:c*sw+sw*0.35+Math.random()*sw*0.2, y:r*sh+sh*0.6+Math.random()*sh*0.2,
          radius:20, sectorIdx:idx, tradeOpen:false,
        });
      }

      // ─── Ancient Ruin ───
      if(idx%7===4) {
        State.galaxyObjects.push({
          type:'ruin', x:c*sw+sw*0.2+Math.random()*sw*0.5, y:r*sh+sh*0.7+Math.random()*sh*0.2,
          radius:30, sectorIdx:idx, used:false,
        });
      }

      // ─── Crystal Field ───
      if(idx%4===0 && idx>0) {
        const numCrystals = 5+Math.floor(Math.random()*6);
        const crystals = [];
        for(let k=0;k<numCrystals;k++) {
          crystals.push({
            relX:(Math.random()-0.5)*180, relY:(Math.random()-0.5)*180,
            width:6+Math.random()*10, height:20+Math.random()*30,
            color:['#44aaff','#44ffcc','#aa44ff','#44ff88'][Math.floor(Math.random()*4)],
            health:3, maxHealth:3,
          });
        }
        State.galaxyObjects.push({
          type:'crystal', x:c*sw+sw*0.5+Math.random()*sw*0.3, y:r*sh+sh*0.5+Math.random()*sh*0.3,
          radius:100, sectorIdx:idx, crystals,
        });
      }

      // ─── Distress Beacon ───
      if(idx%8===3) {
        State.galaxyObjects.push({
          type:'beacon', x:c*sw+sw*0.7+Math.random()*sw*0.15, y:r*sh+sh*0.2+Math.random()*sh*0.2,
          radius:25, sectorIdx:idx, triggered:false,
        });
      }

      // ─── Debris Field ───
      if(Math.random()<0.5) {
        State.galaxyObjects.push({
          type:'debris', x:c*sw+sw*0.25+Math.random()*sw*0.5, y:r*sh+sh*0.25+Math.random()*sh*0.5,
          radius:40, sectorIdx:idx, used:false, lootCoins:20+Math.floor(Math.random()*31),
        });
      }
    }
  }

  // ─── Nebula Gates at sector 0 and 35 ───
  const s0=State.galaxySectors[0], s35=State.galaxySectors[35];
  if(s0) State.galaxyObjects.push({ type:'gate', x:s0.x+s0.w*0.1, y:s0.y+s0.h*0.5, radius:60, sectorIdx:0, isStart:true, targetSector:35 });
  if(s35) State.galaxyObjects.push({ type:'gate', x:s35.x+s35.w*0.9, y:s35.y+s35.h*0.5, radius:60, sectorIdx:35, isStart:false, targetSector:0 });

  // ─── Spawn patrol enemies ───
  State.enemies = [];
  State.galaxySectors.forEach((sector, si)=>{
    const count = 3 + Math.floor(si/4);
    const pool = ['basic','ufo','tank','fast','spinner'];
    if(si>=6) pool.push('bomber');
    if(si>=12) pool.push('diver');
    if(si>=20) pool.push('ufo');
    for(let i=0;i<count;i++) {
      const type=pool[Math.floor(Math.random()*pool.length)];
      const enemy=createEnemy(type);
      enemy.worldX=sector.x+Math.random()*sector.w;
      enemy.worldY=sector.y+Math.random()*sector.h;
      enemy.homeX=enemy.worldX; enemy.homeY=enemy.worldY;
      enemy.sectorIdx=si; enemy._openWorld=true;
      enemy.x=enemy.worldX; enemy.y=enemy.worldY;
      enemy._origSpeed=enemy.speed||2;
      // Assign special roles
      if(i===0&&si%5===1) enemy._mining=true;
      if(i===1&&si%4===2) {
        enemy._patrol=true;
        enemy._waypoints=[
          {x:sector.x+sector.w*0.2,y:sector.y+sector.h*0.2},
          {x:sector.x+sector.w*0.8,y:sector.y+sector.h*0.2},
          {x:sector.x+sector.w*0.8,y:sector.y+sector.h*0.8},
          {x:sector.x+sector.w*0.2,y:sector.y+sector.h*0.8},
        ];
        enemy._waypointIdx=0;
      }
      State.enemies.push(enemy);
    }
    // Spawn V-formation every 6th sector
    if(si%6===3) {
      const cx=sector.x+sector.w*0.5;
      const cy=sector.y+sector.h*0.3;
      spawnFormationEnemies(cx,cy,si);
    }
  });

  // Generate galaxy stars for parallax
  generateGalaxyStars();
  // Initialize quest system
  generateQuests();
}


function updateCamera() {
  if(!State.openWorldMode||!State.players[0]) return;
  const p=State.players[0];
  const targetX=p.x+p.width/2-CANVAS.width/2;
  const targetY=p.y+p.height/2-CANVAS.height/2;
  State.camera.x+=(targetX-State.camera.x)*0.1;
  State.camera.y+=(targetY-State.camera.y)*0.1;
  State.camera.x=Math.max(0,Math.min(State.worldWidth-CANVAS.width,State.camera.x));
  State.camera.y=Math.max(0,Math.min(State.worldHeight-CANVAS.height,State.camera.y));
}

function getCurrentSector() {
  if(!State.openWorldMode||!State.players[0]) return 0;
  const p=State.players[0];
  for(let i=0;i<State.galaxySectors.length;i++) {
    const s=State.galaxySectors[i];
    if(p.x>=s.x&&p.x<s.x+s.w&&p.y>=s.y&&p.y<s.y+s.h) return i;
  }
  return 0;
}

function drawSectorBoundaries() {
  if(!State.openWorldMode) return;
  State.galaxySectors.forEach(s=>{
    CTX.strokeStyle='rgba(255,255,255,0.05)';
    CTX.lineWidth=2;
    CTX.strokeRect(s.x-State.camera.x, s.y-State.camera.y, s.w, s.h);
    const sx=s.x+s.w/2-State.camera.x;
    const sy=s.y+30-State.camera.y;
    if(sx>-100&&sx<CANVAS.width+100&&sy>0&&sy<CANVAS.height) {
      const secLabel=s.theme?s.theme.name:s.name;
      CTX.fillStyle=s.faction&&FACTIONS[s.faction]?FACTIONS[s.faction].color+'44':'rgba(255,255,255,0.08)';
      CTX.font='11px Orbitron, monospace'; CTX.textAlign='center'; CTX.fillText(secLabel,sx,sy);
    }
    // Boss zone marker
    if(!s.bossDefeated) {
      const bz=s.bossZone;
      CTX.strokeStyle='rgba(255,100,0,0.3)'; CTX.lineWidth=2;
      CTX.setLineDash([5,5]);
      CTX.strokeRect(bz.x-State.camera.x,bz.y-State.camera.y,bz.w,bz.h);
      CTX.setLineDash([]);
      CTX.fillStyle='rgba(255,100,0,0.5)'; CTX.font='10px Orbitron, monospace';
      CTX.textAlign='center';
      CTX.fillText('BOSS',bz.x+bz.w/2-State.camera.x,bz.y+bz.h/2-State.camera.y);
    }
  });
  CTX.textAlign='left';
}

function drawGalaxyObjects() {
  if(!State.openWorldMode) return;
  State.galaxyObjects.forEach(obj=>{
    const sx=obj.x-State.camera.x;
    const sy=obj.y-State.camera.y;
    if(sx<-350||sx>CANVAS.width+350||sy<-350||sy>CANVAS.height+350) return;
    // Skip types handled by drawNewGalaxyObjects (planet, asteroidField, etc.)
    // Only handle station and wormhole here (legacy objects)
    if(obj.type==='planet') {
      // Handled by drawNewGalaxyObjects (skip)
      return;
    } else if(obj.type==='station') {
      CTX.save(); CTX.translate(sx,sy); CTX.rotate(Date.now()/3000);
      CTX.strokeStyle=obj.used?'#444':'#00f5ff'; CTX.lineWidth=2;
      CTX.shadowColor='#00f5ff'; CTX.shadowBlur=10;
      CTX.strokeRect(-obj.radius,-obj.radius,obj.radius*2,obj.radius*2);
      CTX.beginPath(); CTX.arc(0,0,obj.radius*0.5,0,Math.PI*2); CTX.stroke();
      CTX.restore();
      // Proximity heal
      if(!obj.used&&State.players[0]) {
        const p=State.players[0];
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)<60) {
          obj.used=true;
          p.lives=Math.min(p.lives+1,5);
          showWaveAnnounce('+1 LIFE (STATION)','#ff69b4');
          addCoins(20);
        }
      }
    } else if(obj.type==='wormhole') {
      CTX.save(); CTX.translate(sx,sy);
      for(let i=3;i>=1;i--) {
        CTX.beginPath(); CTX.arc(0,0,obj.radius*i*0.6,0,Math.PI*2);
        CTX.strokeStyle=`rgba(123,47,255,${0.3/i})`; CTX.lineWidth=3; CTX.stroke();
      }
      CTX.fillStyle='rgba(80,0,200,0.4)'; CTX.beginPath(); CTX.arc(0,0,obj.radius,0,Math.PI*2); CTX.fill();
      CTX.restore();
      // Proximity teleport
      if(State.players[0]) {
        const p=State.players[0];
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)<50) {
          const target=State.galaxySectors[obj.targetSector];
          if(target) { p.x=target.x+target.w/2; p.y=target.y+target.h/2; showWaveAnnounce('WORMHOLE!','#7b2fff'); }
        }
      }
    }
  });
}

function checkBossZones() {
  if(!State.openWorldMode||State.openWorldBossActive||State.boss) return;
  const p=State.players[0]; if(!p) return;
  State.galaxySectors.forEach((sector,si)=>{
    if(sector.bossDefeated) return;
    const bz=sector.bossZone;
    if(p.x>bz.x&&p.x<bz.x+bz.w&&p.y>bz.y&&p.y<bz.y+bz.h) {
      State.openWorldBossActive=true;
      State.bossSpawned=true;
      const bossLevel=Math.min(si+1,BOSSES_DATA.length);
      State.boss=new Boss(bossLevel);
      // Place boss at world coordinates near player
      State.boss.x=p.x+200;
      State.boss.y=p.y-100;
      State._currentBossSector=si;
      playSound('levelUpSound');
      showWaveAnnounce('BOSS ZONE','#ff6600');
    }
  });
}

function processOpenWorldEnemies() {
  if(State.pvpMode) return;
  for(let i=State.enemies.length-1;i>=0;i--) {
    const e=State.enemies[i];
    if(e._openWorld&&State.players[0]) {
      const p=State.players[0];
      const dx=(p.x+p.width/2)-(e.x+e.width/2);
      const dy=(p.y+p.height/2)-(e.y+e.height/2);
      const dist=Math.hypot(dx,dy);
      if(dist<300&&dist>1) {
        const spd=e.speed||2;
        e.x+=(dx/dist)*spd;
        e.y+=(dy/dist)*spd;
      } else {
        const t=Date.now()/2000+(e.homeX||0)*0.001;
        e.x+=Math.cos(t)*0.5;
        e.y+=Math.sin(t)*0.5;
      }
      // Draw enemy at world position (camera already applied via CTX.translate)
      e.draw();
      // Collision with player
      for(const p2 of State.players) {
        if(p2.lives<=0||p2.invincible) continue;
        if(!detectCollision(e,p2)) continue;
        if(p2.hasShield()) {
          triggerExplosion(e.x+e.width/2,e.y+e.height/2,p2.shieldColor,25);
          State.enemies.splice(i,1); State.scores[p2.index]+=5; break;
        } else handlePlayerDamage(p2);
      }
    } else {
      // Non open world enemy, use standard processing
      e.update(); e.draw();
      for(const p of State.players) {
        if(p.lives<=0||p.invincible) continue;
        if(!detectCollision(e,p)) continue;
        if(p.hasShield()) {
          triggerExplosion(e.x+e.width/2,e.y+e.height/2,p.shieldColor,25);
          State.enemies.splice(i,1); State.scores[p.index]+=5; break;
        } else handlePlayerDamage(p);
      }
    }
  }
  // Enemy bullets
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

function autoShootOpenWorld(player) {
  if(!State.openWorldMode) return;
  const now=Date.now();
  if(now-player.lastShootTime<player.shootCooldown) return;
  let nearest=null, nearDist=400;
  State.enemies.forEach(e=>{
    const dx=(e.x+e.width/2)-(player.x+player.width/2);
    const dy=(e.y+e.height/2)-(player.y+player.height/2);
    const d=Math.hypot(dx,dy);
    if(d<nearDist){nearDist=d;nearest=e;}
  });
  if(!nearest) return;
  player.lastShootTime=now;
  const dx=(nearest.x+nearest.width/2)-(player.x+player.width/2);
  const dy=(nearest.y+nearest.height/2)-(player.y+player.height/2);
  const angle=Math.atan2(dy,dx);
  const b=new PlayerBullet(player.x+player.width/2,player.y+player.height/2,player.bulletColor,0,player.damageMultiplier,1);
  b.vx=Math.cos(angle)*8;
  b.vy=Math.sin(angle)*8;
  b._freeAim=true;
  b._originX=player.x+player.width/2;
  b._originY=player.y+player.height/2;
  player.bullets.push(b);
  playSound('shootSound');
}

function drawGalaxyMiniMap() {
  if(!State.openWorldMode) return;
  const mw=120, mh=90;
  const mx=CANVAS.width-mw-16, my=60;
  const scaleX=mw/State.worldWidth, scaleY=mh/State.worldHeight;
  CTX.save();
  CTX.fillStyle='rgba(0,0,0,0.6)'; CTX.fillRect(mx,my,mw,mh);
  CTX.strokeStyle='rgba(0,245,255,0.3)'; CTX.lineWidth=1; CTX.strokeRect(mx,my,mw,mh);
  State.galaxySectors.forEach((s,i)=>{
    CTX.fillStyle=s.bossDefeated?'rgba(0,255,0,0.15)':'rgba(255,255,255,0.05)';
    CTX.fillRect(mx+s.x*scaleX,my+s.y*scaleY,s.w*scaleX,s.h*scaleY);
    if(!s.bossDefeated) {
      CTX.fillStyle='rgba(255,100,0,0.8)';
      CTX.beginPath(); CTX.arc(mx+(s.x+s.w/2)*scaleX,my+(s.y+s.h/2)*scaleY,3,0,Math.PI*2); CTX.fill();
    }
  });
  // Draw grid lines (6x6)
  CTX.strokeStyle='rgba(255,255,255,0.06)'; CTX.lineWidth=0.5;
  for(let c=1;c<6;c++){CTX.beginPath();CTX.moveTo(mx+c*mw/6,my);CTX.lineTo(mx+c*mw/6,my+mh);CTX.stroke();}
  for(let r=1;r<6;r++){CTX.beginPath();CTX.moveTo(mx,my+r*mh/6);CTX.lineTo(mx+mw,my+r*mh/6);CTX.stroke();}
  if(State.players[0]) {
    const p=State.players[0];
    CTX.fillStyle='#39ff14';
    CTX.beginPath(); CTX.arc(mx+p.x*scaleX,my+p.y*scaleY,4,0,Math.PI*2); CTX.fill();
  }
  CTX.strokeStyle='rgba(0,245,255,0.3)'; CTX.lineWidth=0.5;
  CTX.strokeRect(mx+State.camera.x*scaleX,my+State.camera.y*scaleY,CANVAS.width*scaleX,CANVAS.height*scaleY);
  CTX.fillStyle='rgba(255,255,255,0.4)'; CTX.font='7px Orbitron, monospace'; CTX.textAlign='left';
  CTX.fillText('GALAXY MAP [M]',mx+3,my+9);
  CTX.restore();
}

function startOpenWorldMode() {
  hideAllOverlays();
  CANVAS.style.display='block';
  State.running=true; State.paused=false;
  State.openWorldMode=true;
  State.infiniteMode=false; State.survivorMode=false; State.bossRushMode=false;
  State.enemies=[]; State.boss=null; State.powerUps=[]; State.explosions=[]; State.xpOrbs=[]; State.scheduledEvents=[];
  State.floatingTexts=[]; State.scores=[0,0];
  State.gameLevel=1; State.wave=1; State.bossSpawned=false; State.uniqueSpawned=false;
  State.lastEnemySpawn=Date.now(); State.gameStartTime=Date.now();
  State.powerUpActive=false; State.shieldActive=false;
  State.stats.phaseDamageTaken=0; State.stats.currentCombo=0; State.stats.lastKillTime=0;
  State.screenShake=0; State.trauma=0;
  State.doubleDamage=false; State.phoenixUsed=false;
  State.runEquipment={weapon:null,armor:null,accessory:null,relic:null};
  State.activeSynergies=[];
  State.materialInventory={}; State.collectedItems=[]; State.onlineBossKillCount=0;
  State.openWorldBossActive=false;
  State.camera={x:0,y:0};
  State.currentSector=0; State.visitedSectors=[];
  State.xp=0; State.xpToNextLevel=100; State.level=1;
  State.magnetRadius=0; State.xpMultiplier=1;
  State.runUpgrades={};
  // ─── EXPANSION: init new state ───
  State.factionRep={ pirates:0, empire:0, rebels:0, traders:50 };
  State.activeQuests=[]; State.completedQuests=[]; State.questProgress={}; State.questLog=false;
  State.spaceWeather={ type:'clear', timer:0, duration:0, lastCheck:Date.now() };
  State.allyFleet=[];
  State.codex={ discoveries:[], totalExplored:0 };
  State.activeEvents=[];
  State.craftingMaterials={ crystals:0 };
  State.galaxyStars=[];
  State._nodalDamageTimer=0; State._craftEffects={};
  State._tradeMenuOpen=false; State._activeTradeObj=null;
  State._sectorObjectiveProgress={}; State._formationEnemyTimer=0;
  State._weatherParticles=[]; State._allyBullets=[];
  State._eventCheckTimer=Date.now(); State._fortressBullets=[];
  State._asteroidRainTimer=0; State._quantumTimer=0;
  // ─────────────────────────────────
  State.players=[new Player(State.selectedChar[0],0)];
  // Player starts at world center - but wait for generateGalaxy to set worldWidth
  generateGalaxy();
  // Place player at sector 0 center
  const s0=State.galaxySectors[0];
  if(s0){ State.players[0].x=s0.x+s0.w/2-15; State.players[0].y=s0.y+s0.h/2-15; }
  State.players.forEach(p=>applySkillBonuses(p));
  document.getElementById('xpBarWrap').style.display='block';
  document.getElementById('xpLevelLabel').textContent='LVL 1';
  document.getElementById('survivorAbilitiesHud').style.display='none';
  document.getElementById('infiniteAbilitiesHud').style.display='none';
  const owHud=document.getElementById('owHudPanel'); if(owHud) owHud.classList.add('visible');
  setHUDVisible(true); updateHUD(); initStars();
  updateCodexHUD();
  showWaveAnnounce('GALAXY EXPLORER','#7b2fff');
  initOpenWorldExpansion();
  gameLoop();
}

function openGalaxyMode() {
  State.openWorldMode=true; // flag so startGameWithSelectedCharacter knows
  hideAllOverlays();
  navigateMenu('characterSelect');
  document.getElementById('characterOptionsP1').innerHTML='';
  buildCharacterOptions('characterOptionsP1',0);
  const p2=document.getElementById('characterOptionsP2');
  if(p2) p2.style.display='none';
}

// ═══════════════════════════════════════════════════════════════════
// ═══ OPEN WORLD EXPANSION – SYSTEMS & FUNCTIONS ═══
// ═══════════════════════════════════════════════════════════════════

// ─── FACTION SYSTEM ───────────────────────────────────────────────

function getFactionForSector(sectorIdx) {
  const keys = ['pirates','empire','rebels'];
  return keys[sectorIdx % 3];
}

function updateFactionRep(sectorIdx, amount) {
  const faction = getFactionForSector(sectorIdx);
  State.factionRep[faction] = (State.factionRep[faction] || 0) + amount;
  State.factionRep[faction] = Math.max(-100, Math.min(100, State.factionRep[faction]));
}

function drawFactionHUD() {
  if(!State.openWorldMode) return;
  const sector = State.galaxySectors[State.currentSector];
  if(!sector || !sector.faction) return;
  const faction = FACTIONS[sector.faction];
  if(!faction) return;
  const rep = State.factionRep[sector.faction] || 0;
  const el = document.getElementById('factionHud');
  if(!el) return;
  el.classList.add('visible');
  const repPct = Math.max(0, Math.min(100, (rep+100)/2));
  el.innerHTML = `<div style="background:rgba(2,8,23,0.75);border:1px solid ${faction.color}30;padding:6px 8px;">
    <div style="font-family:Orbitron,monospace;font-size:8px;color:rgba(255,255,255,0.35);letter-spacing:1px;">FACTION</div>
    <div style="font-family:Orbitron,monospace;font-size:9px;color:${faction.color};font-weight:700;">${faction.name}</div>
    <div style="height:2px;background:rgba(255,255,255,0.1);border-radius:1px;margin-top:4px;overflow:hidden;">
      <div style="height:100%;width:${repPct}%;background:${faction.color};transition:width 0.3s;"></div>
    </div>
    <div style="font-family:Orbitron,monospace;font-size:8px;color:rgba(255,255,255,0.3);margin-top:2px;">REP: ${rep>0?'+':''}${rep}</div>
  </div>`;
}

// ─── QUEST SYSTEM ─────────────────────────────────────────────────

function generateQuests() {
  State.activeQuests = [];
  State.questProgress = {};
  const shuffled = [...QUEST_TEMPLATES].sort(()=>Math.random()-0.5);
  const picked = shuffled.slice(0, 3);
  picked.forEach(qt => {
    const q = Object.assign({}, qt, { progress: 0, startTime: Date.now() });
    State.activeQuests.push(q);
    State.questProgress[qt.id] = 0;
  });
}

function updateQuestProgress(type, amount) {
  if(!State.openWorldMode) return;
  amount = amount || 1;
  State.activeQuests.forEach(q => {
    if(q.type === type) {
      q.progress = (q.progress||0) + amount;
    }
    // Special time-based quests
    if(type==='kill' && q.type==='kill') { /* handled above */ }
  });
  checkQuestCompletion();
}

function checkQuestCompletion() {
  if(!State.openWorldMode) return;
  for(let i = State.activeQuests.length-1; i >= 0; i--) {
    const q = State.activeQuests[i];
    let done = false;
    if(q.type==='time' || q.type==='nodmg') {
      const elapsed = (Date.now() - q.startTime)/1000;
      q.progress = Math.floor(elapsed);
      if(elapsed >= q.target) done = true;
    } else if(q.progress >= q.target) {
      done = true;
    }
    if(done) {
      State.completedQuests.push(q);
      State.activeQuests.splice(i, 1);
      if(q.reward) {
        if(q.reward.coins) addCoins(q.reward.coins);
        if(q.reward.xp && State.players[0]) gainXP(q.reward.xp);
      }
      showWaveAnnounce('QUEST COMPLETE: '+q.name, '#ffaa00');
    }
  }
}

function gainXP(amount) {
  if(!State.players[0]) return;
  amount = Math.floor(amount * (getWeatherXPMult ? getWeatherXPMult() : 1));
  addXP(amount);
}

function toggleQuestLog() {
  const el = document.getElementById('questLogOverlay');
  if(!el) return;
  if(el.classList.contains('open')) {
    el.classList.remove('open');
    State.questLog = false;
    if(State.paused) resumeGame();
  } else {
    renderQuestLog();
    el.classList.add('open');
    State.questLog = true;
    if(State.running && !State.paused) pauseGame();
  }
}

function renderQuestLog() {
  const el = document.getElementById('questLogContent');
  if(!el) return;
  let html = '';
  if(State.activeQuests.length === 0) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:12px;">No active quests.</p>'; return; }
  State.activeQuests.forEach(q => {
    const pct = Math.min(100, Math.round((q.progress||0)/q.target*100));
    html += `<div class="quest-card">
      <h3>${q.name}</h3>
      <p>${q.desc}</p>
      <div class="quest-prog-track"><div class="quest-prog-fill" style="width:${pct}%"></div></div>
      <div style="font-family:Orbitron,monospace;font-size:9px;color:rgba(255,255,255,0.4);margin-top:4px;">${q.progress||0}/${q.target}</div>
      <div class="quest-reward">REWARD: ${q.reward.coins} coins + ${q.reward.xp} XP</div>
    </div>`;
  });
  if(State.completedQuests.length > 0) {
    html += '<div style="font-family:Orbitron,monospace;font-size:10px;color:#39ff14;margin-top:12px;letter-spacing:2px;">COMPLETED:</div>';
    State.completedQuests.slice(-3).forEach(q => {
      html += `<div class="quest-card quest-completed"><h3>${q.name}</h3><p>COMPLETED</p></div>`;
    });
  }
  el.innerHTML = html;
}

function drawQuestHUD() {
  if(!State.openWorldMode || State.activeQuests.length === 0) return;
  // Drawn via DOM, not canvas
}

// ─── SPACE WEATHER SYSTEM ─────────────────────────────────────────

function updateSpaceWeather() {
  if(!State.openWorldMode) return;
  const now = Date.now();
  if(State.spaceWeather.type !== 'clear') {
    if(now > State.spaceWeather.timer + State.spaceWeather.duration*1000) {
      State.spaceWeather.type = 'clear';
      State.spaceWeather.duration = 0;
      updateWeatherHUD();
    }
  }
  if(now - State.spaceWeather.lastCheck > 30000) {
    State.spaceWeather.lastCheck = now;
    if(State.spaceWeather.type === 'clear' && Math.random() < 0.20) {
      const types = WEATHER_TYPES.filter(t => t !== 'clear');
      const chosen = types[Math.floor(Math.random()*types.length)];
      const duration = 10 + Math.floor(Math.random()*11);
      State.spaceWeather = { type:chosen, timer:now, duration, lastCheck:now };
      updateWeatherHUD();
      showWaveAnnounce('WEATHER: '+(WEATHER_DISPLAY[chosen]||{name:chosen}).name, '#ffcc00');
    }
  }
  // Asteroid rain effect: spawn asteroids from edges
  if(State.spaceWeather.type === 'asteroid_rain') {
    if(now - (State._asteroidRainTimer||0) > 2000) {
      State._asteroidRainTimer = now;
      for(let i=0;i<3;i++) spawnRainAsteroid();
    }
  }
  // Quantum flux: teleport enemies randomly
  if(State.spaceWeather.type === 'quantum_flux') {
    if(now - (State._quantumTimer||0) > 5000) {
      State._quantumTimer = now;
      State.enemies.forEach(e => {
        if(Math.random()<0.3 && e._openWorld) {
          const sector = State.galaxySectors[State.currentSector];
          if(sector) { e.x = sector.x + Math.random()*sector.w; e.y = sector.y + Math.random()*sector.h; }
        }
      });
    }
  }
}

function spawnRainAsteroid() {
  const p = State.players[0]; if(!p) return;
  const side = Math.floor(Math.random()*4);
  let ax, ay;
  if(side===0){ ax=p.x-300+Math.random()*600; ay=p.y-400; }
  else if(side===1){ ax=p.x-300+Math.random()*600; ay=p.y+400; }
  else if(side===2){ ax=p.x-400; ay=p.y-300+Math.random()*600; }
  else { ax=p.x+400; ay=p.y-300+Math.random()*600; }
  State.galaxyObjects.push({
    type:'rainAsteroid',
    x: ax, y: ay,
    vx: (Math.random()-0.5)*3,
    vy: (Math.random()+0.5)*4,
    radius: 8+Math.random()*12,
    color: '#aa7744',
    health: 2, maxHealth: 2,
    life: 200,
  });
}

function updateWeatherHUD() {
  const el = document.getElementById('weatherHud');
  if(!el) return;
  if(State.spaceWeather.type === 'clear') {
    el.classList.remove('visible');
    return;
  }
  const wd = WEATHER_DISPLAY[State.spaceWeather.type] || { name: State.spaceWeather.type.toUpperCase(), color:'#fff' };
  const remaining = Math.max(0, Math.ceil(State.spaceWeather.duration - (Date.now()-State.spaceWeather.timer)/1000));
  el.classList.add('visible');
  el.style.color = wd.color;
  el.innerHTML = wd.name + ' — ' + remaining + 's';
}

function getWeatherSpeedMult() {
  if(!State.openWorldMode) return 1;
  if(State.spaceWeather.type === 'solar_storm') return 0.9;
  if(State.spaceWeather.type === 'nebula_surge') return 1;
  return 1;
}

function getWeatherEnemySpeedMult() {
  if(!State.openWorldMode) return 1;
  if(State.spaceWeather.type === 'solar_storm') return 1.3;
  return 1;
}

function getWeatherDamageMult() {
  if(!State.openWorldMode) return 1;
  return 1;
}

function drawWeatherEffects() {
  if(!State.openWorldMode) return;
  const type = State.spaceWeather.type;
  if(type === 'clear') return;
  CTX.save();
  if(type === 'solar_storm') {
    const grad = CTX.createRadialGradient(CANVAS.width/2, CANVAS.height/2, CANVAS.width*0.3, CANVAS.width/2, CANVAS.height/2, CANVAS.width);
    grad.addColorStop(0,'transparent');
    grad.addColorStop(1,'rgba(255,100,0,0.12)');
    CTX.fillStyle = grad;
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  } else if(type === 'nebula_surge') {
    CTX.globalAlpha = 0.08;
    CTX.fillStyle = '#8800ff';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
    // Draw purple particles on edges
    const t = Date.now()*0.001;
    for(let i=0;i<8;i++) {
      const px = Math.sin(t*1.3+i*0.8)*CANVAS.width/2 + CANVAS.width/2;
      const py = Math.cos(t*1.1+i)*CANVAS.height/2 + CANVAS.height/2;
      CTX.globalAlpha = 0.2;
      CTX.fillStyle = '#cc44ff';
      CTX.beginPath(); CTX.arc(px, py, 4+Math.sin(t*2+i)*3, 0, Math.PI*2); CTX.fill();
    }
    CTX.globalAlpha = 1;
  } else if(type === 'ion_storm') {
    // Electric arcs on screen edges
    CTX.strokeStyle = 'rgba(100,200,255,0.4)';
    CTX.lineWidth = 1;
    const t = Date.now()*0.005;
    for(let i=0;i<5;i++) {
      CTX.beginPath();
      CTX.moveTo(0, Math.sin(t+i)*CANVAS.height/2+CANVAS.height/2);
      CTX.lineTo(20+Math.random()*30, Math.sin(t+i*1.3)*CANVAS.height/2+CANVAS.height/2);
      CTX.stroke();
    }
  } else if(type === 'void_rift') {
    CTX.globalAlpha = 0.06;
    CTX.fillStyle = '#000000';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
    // Distortion lines
    CTX.globalAlpha = 0.3;
    CTX.strokeStyle = 'rgba(80,0,80,0.5)';
    CTX.lineWidth = 1;
    const t = Date.now()*0.002;
    for(let i=0;i<6;i++) {
      CTX.beginPath();
      CTX.moveTo(CANVAS.width/2, CANVAS.height/2);
      CTX.lineTo(
        CANVAS.width/2 + Math.cos(t+i)*200+Math.sin(t*2)*50,
        CANVAS.height/2 + Math.sin(t+i)*200+Math.cos(t*2)*50
      );
      CTX.stroke();
    }
    CTX.globalAlpha = 1;
  } else if(type === 'quantum_flux') {
    const t = Date.now()*0.003;
    CTX.strokeStyle = 'rgba(0,255,200,0.2)';
    CTX.lineWidth = 1;
    for(let i=0;i<10;i++) {
      CTX.beginPath();
      CTX.moveTo(Math.random()*CANVAS.width, 0);
      CTX.lineTo(Math.random()*CANVAS.width, CANVAS.height);
      CTX.stroke();
    }
  }
  CTX.restore();
}

// ─── ALLY FLEET SYSTEM ────────────────────────────────────────────

function recruitAllyAt(shipTypeName) {
  const cfg = ALLY_SHIP_TYPES.find(t=>t.type===shipTypeName);
  if(!cfg) return;
  if(State.coins < cfg.cost) { showWaveAnnounce('NOT ENOUGH COINS','#ff4444'); return; }
  if(State.allyFleet.length >= 5) { showWaveAnnounce('FLEET FULL (MAX 5)','#ff4444'); return; }
  addCoins(-cfg.cost);
  const ship = new AllyShip(cfg);
  const p = State.players[0];
  if(p) { ship.x = p.x + Math.random()*100-50; ship.y = p.y + Math.random()*100-50; }
  State.allyFleet.push(ship);
  showWaveAnnounce(cfg.label+' RECRUITED','#00ff88');
  updateFleetOverlay();
}

function processAllyFleet() {
  if(!State.openWorldMode) return;
  State.allyFleet = State.allyFleet.filter(s=>!s.dead);
  State.allyFleet.forEach(s=>{ s.update(); s.draw(); });
  // Process ally bullets
  for(let i=State._allyBullets.length-1;i>=0;i--) {
    const b = State._allyBullets[i];
    b.x += b.vx; b.y += b.vy; b.life--;
    if(b.life<=0){ State._allyBullets.splice(i,1); continue; }
    // Draw bullet
    CTX.fillStyle = b.color;
    CTX.shadowColor = b.color; CTX.shadowBlur = 6;
    CTX.beginPath(); CTX.arc(b.x,b.y,3,0,Math.PI*2); CTX.fill();
    CTX.shadowBlur = 0;
    // Check hit enemies
    let hit = false;
    for(let ei=State.enemies.length-1;ei>=0;ei--) {
      const e = State.enemies[ei];
      if(b.x>e.x&&b.x<e.x+e.width&&b.y>e.y&&b.y<e.y+e.height) {
        e.health -= b.damage;
        if(e.health<=0){
          State.scores[0] += 10;
          State.stats.enemiesKilled++;
          triggerExplosion(e.x+e.width/2,e.y+e.height/2,'#ff6644',15);
          addCoins(1+(State._runCoinMult||1)-1|0);
          State.xpOrbs.push(new XPOrb(e.x+e.width/2,e.y+e.height/2,10+e.maxHealth*3));
          State.enemies.splice(ei,1);
        }
        hit=true; break;
      }
    }
    if(hit||State.boss&&b.x>State.boss.x&&b.x<State.boss.x+State.boss.width&&b.y>State.boss.y&&b.y<State.boss.y+State.boss.height) {
      if(State.boss&&!hit){State.boss.health-=b.damage;}
      State._allyBullets.splice(i,1);
    }
  }
}

function updateFleetOverlay() {
  const el = document.getElementById('fleetContent');
  if(!el) return;
  let html = `<div style="font-family:Orbitron,monospace;font-size:10px;color:rgba(0,255,136,0.7);margin-bottom:12px;">ACTIVE FLEET: ${State.allyFleet.length}/5</div>`;
  State.allyFleet.forEach((ship,i)=>{
    const hpPct = Math.round(ship.health/ship.maxHealth*100);
    html += `<div class="fleet-card">
      <div class="fleet-ship-icon" style="background:${ship.color}22;border:1px solid ${ship.color};">${ship.icon||ship.label[0]}</div>
      <div class="fleet-info">
        <h3>${ship.label}</h3>
        <p>HP: ${ship.health}/${ship.maxHealth} | DMG: ${ship.damage}</p>
        <div style="height:3px;background:rgba(255,255,255,0.1);margin-top:4px;overflow:hidden;border-radius:2px;">
          <div style="height:100%;width:${hpPct}%;background:${hpPct>50?'#39ff14':'#ff4444'};"></div>
        </div>
      </div>
    </div>`;
  });
  html += '<div style="margin-top:16px;font-family:Orbitron,monospace;font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:8px;">RECRUIT (visit Trading Post)</div>';
  ALLY_SHIP_TYPES.forEach(cfg=>{
    const canAfford = State.coins >= cfg.cost;
    const fleetFull = State.allyFleet.length >= 5;
    html += `<div class="fleet-card" style="opacity:${canAfford&&!fleetFull?1:0.4};">
      <div class="fleet-ship-icon" style="background:${cfg.color}22;border:1px solid ${cfg.color};">${cfg.icon}</div>
      <div class="fleet-info">
        <h3>${cfg.label}</h3>
        <p>Speed:${cfg.speed} | Dmg:${cfg.damage} | HP:${cfg.health}</p>
      </div>
      <button class="fleet-recruit-btn" onclick="recruitAllyAt('${cfg.type}')" ${!canAfford||fleetFull?'disabled':''}>
        RECRUIT<br>${cfg.cost} coins
      </button>
    </div>`;
  });
  el.innerHTML = html;
}

function toggleFleetManager() {
  const el = document.getElementById('fleetOverlay');
  if(!el) return;
  if(el.classList.contains('open')) {
    el.classList.remove('open');
    if(State.paused) resumeGame();
  } else {
    updateFleetOverlay();
    el.classList.add('open');
    if(State.running && !State.paused) pauseGame();
  }
}

// ─── EXPLORATION CODEX ────────────────────────────────────────────

function discoverCodex(entryId) {
  if(State.codex.discoveries.includes(entryId)) return;
  State.codex.discoveries.push(entryId);
  State.codex.totalExplored = State.codex.discoveries.length;
  const entry = CODEX_ENTRIES.find(e=>e.id===entryId);
  if(entry) showWaveAnnounce('CODEX: '+entry.title,'#b57bff');
  updateCodexHUD();
}

function updateCodexHUD() {
  const el = document.getElementById('codexHud');
  if(!el) return;
  if(!State.openWorldMode) { el.classList.remove('visible'); return; }
  el.classList.add('visible');
  el.innerHTML = `CODEX: ${State.codex.discoveries.length}/${CODEX_ENTRIES.length}`;
}

// ─── DYNAMIC EVENTS ───────────────────────────────────────────────

function triggerGalaxyEvent(eventId) {
  const ev = GALAXY_EVENTS.find(e=>e.id===eventId);
  if(!ev) return;
  if(State.activeEvents.find(e=>e.id===eventId)) return;
  const activeEv = Object.assign({}, ev, { startTime: Date.now(), active:true });
  State.activeEvents.push(activeEv);
  showEventBanner(ev.name, ev.desc);
  const p = State.players[0];
  if(!p) return;
  if(ev.spawnCount > 0) {
    const sector = State.galaxySectors[State.currentSector] || State.galaxySectors[0];
    for(let i=0;i<ev.spawnCount;i++) {
      const types=['basic','fast','ufo','bomber'];
      const type = types[Math.floor(Math.random()*types.length)];
      const e = createEnemy(type);
      e.x = p.x + (Math.random()-0.5)*300;
      e.y = p.y + (Math.random()-0.5)*300;
      e.worldX = e.x; e.worldY = e.y;
      e.homeX = e.x; e.homeY = e.y;
      e._openWorld = true;
      e.sectorIdx = State.currentSector;
      State.enemies.push(e);
    }
  }
  if(ev.gives === 'xp') { gainXP(ev.amount||200); }
  if(ev.gives === 'powerup') {
    State.galaxyObjects.push({
      type:'debris', x:p.x+100, y:p.y+50, radius:20, sectorIdx:State.currentSector, used:false, lootCoins:50
    });
  }
  if(ev.gives === 'ally') {
    const cfg = ALLY_SHIP_TYPES[Math.floor(Math.random()*2)];
    if(State.allyFleet.length < 5) {
      const ship = new AllyShip(cfg);
      ship.x = p.x+60; ship.y = p.y;
      State.allyFleet.push(ship);
      showWaveAnnounce(cfg.label+' JOINS YOUR FLEET','#00ff88');
    }
  }
  if(ev.effect === 'teleport' && p) {
    const sector = State.galaxySectors[Math.floor(Math.random()*State.galaxySectors.length)];
    if(sector){ p.x=sector.x+sector.w/2; p.y=sector.y+sector.h/2; }
  }
}

function updateGalaxyEvents() {
  if(!State.openWorldMode) return;
  for(let i=State.activeEvents.length-1;i>=0;i--) {
    const ev = State.activeEvents[i];
    if(ev.duration && Date.now() - ev.startTime > ev.duration*1000) {
      State.activeEvents.splice(i,1);
    }
  }
}

function checkRandomEvents() {
  if(!State.openWorldMode) return;
  const now = Date.now();
  if(now - State._eventCheckTimer < 8000) return;
  State._eventCheckTimer = now;
  if(Math.random() < 0.15) {
    const randomEvents = ['pirate_raid','supply_drop','warp_storm','data_cache'];
    triggerGalaxyEvent(randomEvents[Math.floor(Math.random()*randomEvents.length)]);
  }
}

function showEventBanner(name, desc) {
  const el = document.getElementById('eventBanner');
  if(!el) return;
  el.innerHTML = name + '<br><span style="font-size:13px;color:rgba(255,255,255,0.6);">' + desc + '</span>';
  el.style.opacity = '1';
  setTimeout(()=>{ el.style.transition='opacity 1s'; el.style.opacity='0'; }, 3000);
  setTimeout(()=>{ el.style.transition=''; }, 4000);
}

// ─── PLANET DETAILS & ORBITING ───────────────────────────────────

function updatePlanets() {
  if(!State.openWorldMode) return;
  State.galaxyObjects.forEach(obj=>{
    if(obj.type !== 'planet') return;
    obj.rotation = (obj.rotation||0) + (obj.rotSpeed||0.003);
    if(obj.moons) {
      obj.moons.forEach(m=>{ m.angle += m.speed||0.01; });
    }
  });
}

function drawPlanetDetails(obj, sx, sy) {
  // Atmosphere
  if(obj.atmosphere) {
    const atGrad = CTX.createRadialGradient(sx,sy,obj.radius*0.85,sx,sy,obj.radius*1.3);
    atGrad.addColorStop(0, obj.atmosphere+'44');
    atGrad.addColorStop(1, 'transparent');
    CTX.fillStyle = atGrad;
    CTX.beginPath(); CTX.arc(sx,sy,obj.radius*1.3,0,Math.PI*2); CTX.fill();
  }
  // Planet body
  CTX.save(); CTX.translate(sx,sy); CTX.rotate(obj.rotation||0);
  const grad = CTX.createRadialGradient(-obj.radius*0.3,-obj.radius*0.3,0,0,0,obj.radius);
  grad.addColorStop(0,'#ffffff'); grad.addColorStop(0.3,obj.color); grad.addColorStop(1,'rgba(0,0,0,0.85)');
  CTX.fillStyle = grad; CTX.shadowColor = obj.color; CTX.shadowBlur = 15;
  CTX.beginPath(); CTX.arc(0,0,obj.radius,0,Math.PI*2); CTX.fill();
  CTX.shadowBlur = 0;
  // Surface bands
  CTX.save();
  CTX.globalAlpha = 0.12;
  CTX.fillStyle = '#ffffff';
  for(let b=0;b<3;b++) {
    const by = -obj.radius*0.4 + b*obj.radius*0.35;
    CTX.fillRect(-obj.radius, by, obj.radius*2, obj.radius*0.12);
  }
  CTX.restore();
  CTX.restore();
  // Ring
  if(obj.hasRing) {
    CTX.save(); CTX.translate(sx,sy);
    CTX.strokeStyle = obj.color+'88'; CTX.lineWidth = 6;
    CTX.shadowColor = obj.color; CTX.shadowBlur = 8;
    CTX.beginPath();
    CTX.ellipse(0, 0, obj.radius*1.8, obj.radius*0.4, Math.PI*0.1, 0, Math.PI*2);
    CTX.stroke();
    CTX.restore();
  }
  // Moons
  if(obj.moons) {
    obj.moons.forEach(m=>{
      const mx = sx + Math.cos(m.angle)*m.distance;
      const my = sy + Math.sin(m.angle)*m.distance*0.4;
      CTX.fillStyle = m.color||'#aaaaaa';
      CTX.shadowColor = m.color||'#aaaaaa'; CTX.shadowBlur = 5;
      CTX.beginPath(); CTX.arc(mx,my,m.radius,0,Math.PI*2); CTX.fill();
      CTX.shadowBlur = 0;
    });
  }
}

// ─── STAR FIELD PARALLAX ──────────────────────────────────────────

function generateGalaxyStars() {
  State.galaxyStars = [];
  const W = State.worldWidth, H = State.worldHeight;
  // Layer 1: tiny dim stars
  for(let i=0;i<800;i++) {
    State.galaxyStars.push({
      x: Math.random()*W, y: Math.random()*H,
      radius: 0.5+Math.random()*0.5,
      color: `rgba(255,255,255,${0.2+Math.random()*0.3})`,
      layer: 1,
    });
  }
  // Layer 2: medium stars
  for(let i=0;i<700;i++) {
    State.galaxyStars.push({
      x: Math.random()*W, y: Math.random()*H,
      radius: 1+Math.random()*1,
      color: `rgba(255,255,255,${0.4+Math.random()*0.3})`,
      layer: 2,
    });
  }
  // Layer 3: bright/colored stars
  for(let i=0;i<500;i++) {
    const colors = ['rgba(200,200,255,0.9)','rgba(255,220,180,0.9)','rgba(180,255,220,0.9)','rgba(255,180,180,0.9)'];
    State.galaxyStars.push({
      x: Math.random()*W, y: Math.random()*H,
      radius: 1.5+Math.random()*1.5,
      color: colors[Math.floor(Math.random()*colors.length)],
      layer: 3,
      pulse: Math.random()*Math.PI*2,
    });
  }
}

function drawGalaxyStarField() {
  if(!State.openWorldMode || !State.galaxyStars.length) return;
  const t = Date.now()*0.001;
  State.galaxyStars.forEach(s=>{
    const sx = s.x - State.camera.x;
    const sy = s.y - State.camera.y;
    if(sx<-5||sx>CANVAS.width+5||sy<-5||sy>CANVAS.height+5) return;
    let r = s.radius;
    if(s.pulse !== undefined) r *= 0.85 + 0.15*Math.sin(t*2+s.pulse);
    CTX.fillStyle = s.color;
    CTX.beginPath(); CTX.arc(sx,sy,r,0,Math.PI*2); CTX.fill();
  });
}

// ─── CRAFTING SYSTEM ──────────────────────────────────────────────

function toggleCraftingMenu() {
  const el = document.getElementById('craftingOverlay');
  if(!el) return;
  if(el.classList.contains('open')) {
    el.classList.remove('open');
    if(State.paused) resumeGame();
  } else {
    renderCraftingMenu();
    el.classList.add('open');
    if(State.running && !State.paused) pauseGame();
  }
}

function renderCraftingMenu() {
  const matsEl = document.getElementById('craftMatsDisplay');
  if(matsEl) matsEl.textContent = 'CRYSTALS: '+(State.craftingMaterials.crystals||0)+' | COINS: '+State.coins;
  const el = document.getElementById('craftingContent');
  if(!el) return;
  let html = '';
  CRAFT_RECIPES.forEach(r=>{
    const canCraft = (State.craftingMaterials.crystals||0)>=r.cost.crystals && State.coins>=r.cost.coins;
    const active = State._craftEffects[r.effect] && State._craftEffects[r.effect] > Date.now();
    html += `<div class="craft-card ${canCraft&&!active?'':'unavailable'}" onclick="craftItem('${r.id}')">
      <div class="craft-icon">${r.icon}</div>
      <div class="craft-info">
        <h3>${r.name} ${active?'(ACTIVE)':''}</h3>
        <p>${r.desc}</p>
      </div>
      <div class="craft-cost">${r.cost.crystals} crystals<br>${r.cost.coins} coins</div>
    </div>`;
  });
  el.innerHTML = html;
}

function craftItem(recipeId) {
  const recipe = CRAFT_RECIPES.find(r=>r.id===recipeId);
  if(!recipe) return;
  if((State.craftingMaterials.crystals||0) < recipe.cost.crystals) { showWaveAnnounce('NEED MORE CRYSTALS','#ff4444'); return; }
  if(State.coins < recipe.cost.coins) { showWaveAnnounce('NEED MORE COINS','#ff4444'); return; }
  State.craftingMaterials.crystals -= recipe.cost.crystals;
  addCoins(-recipe.cost.coins);
  applyCraftEffect(recipe.effect);
  showWaveAnnounce(recipe.name+' CRAFTED!','#b57bff');
  renderCraftingMenu();
}

function applyCraftEffect(effect) {
  const p = State.players[0]; if(!p) return;
  const now = Date.now();
  if(effect === 'tripleDamage5s') {
    State._craftEffects.tripleDamage5s = now + 5000;
    p.damageMultiplier *= 3;
    setTimeout(()=>{ if(p) p.damageMultiplier /= 3; }, 5000);
  } else if(effect === 'speedBoost10s') {
    State._craftEffects.speedBoost10s = now + 10000;
    p.speed = (p.speed||5)*3;
    setTimeout(()=>{ if(p) p.speed = Math.max(3, p.speed/3); }, 10000);
  } else if(effect === 'heal2lives') {
    p.lives = Math.min((p.lives||1)+2, 5);
    updateHUD();
  } else if(effect === 'stunAllEnemies') {
    State._craftEffects.stunAllEnemies = now + 3000;
    State.enemies.forEach(e=>{ e._stunned = now+3000; e.speed = 0.01; });
    setTimeout(()=>{ State.enemies.forEach(e=>{ if(e._openWorld) e.speed = e._origSpeed||2; }); }, 3000);
  } else if(effect === 'invincible8s') {
    State._craftEffects.invincible8s = now + 8000;
    p.invincible = true;
    setTimeout(()=>{ if(p) p.invincible = false; }, 8000);
  }
}

// ─── SECTOR OBJECTIVES ────────────────────────────────────────────

function getSectorObjective(sectorIdx) {
  const sector = State.galaxySectors[sectorIdx];
  if(!sector || !sector.sectorObjective) return null;
  return sector.sectorObjective;
}

function checkSectorObjective() {
  if(!State.openWorldMode) return;
  const sector = State.galaxySectors[State.currentSector];
  if(!sector || !sector.sectorObjective) return;
  const obj = sector.sectorObjective;
  if(obj.completed) return;
  let progress = State._sectorObjectiveProgress[State.currentSector] || 0;
  obj.progress = progress;
  if(progress >= obj.target) {
    obj.completed = true;
    if(obj.reward) {
      addCoins(obj.reward.coins||0);
      gainXP(obj.reward.xp||0);
    }
    showWaveAnnounce('SECTOR OBJECTIVE COMPLETE!','#39ff14');
    sector.objectiveComplete = true;
  }
  updateSectorObjectiveHUD();
}

function updateSectorObjectiveHUD() {
  const el = document.getElementById('sectorObjHud');
  if(!el) return;
  if(!State.openWorldMode) { el.classList.remove('visible'); return; }
  const sector = State.galaxySectors[State.currentSector];
  if(!sector || !sector.sectorObjective) { el.classList.remove('visible'); return; }
  const obj = sector.sectorObjective;
  if(obj.completed) {
    el.classList.add('visible');
    el.innerHTML = `<span style="color:#39ff14;font-family:Orbitron,monospace;font-size:9px;">OBJECTIVE COMPLETE!</span>`;
    return;
  }
  el.classList.add('visible');
  const pct = Math.min(100, Math.round((obj.progress||0)/obj.target*100));
  const typeLabel = {kill:'ELIMINATE',collect:'COLLECT',defend:'DEFEND',explore:'EXPLORE'}[obj.type]||obj.type.toUpperCase();
  el.innerHTML = `<div style="font-family:Orbitron,monospace;font-size:9px;color:rgba(0,245,255,0.8);letter-spacing:1px;">SECTOR OBJ: ${typeLabel} ${obj.progress||0}/${obj.target}</div>
  <div style="height:2px;background:rgba(255,255,255,0.1);margin-top:4px;overflow:hidden;border-radius:1px;">
    <div style="height:100%;width:${pct}%;background:#00f5ff;transition:width 0.3s;"></div>
  </div>`;
}

// ─── OPEN WORLD HUD PANEL ─────────────────────────────────────────

function updateOpenWorldHUDPanel() {
  if(!State.openWorldMode) return;
  const panel = document.getElementById('owHudPanel');
  if(!panel) return;
  panel.classList.add('visible');
  const sector = State.galaxySectors[State.currentSector] || {};
  const sectorName = sector.theme ? OW_SECTOR_THEMES[sector.themeIdx%OW_SECTOR_THEMES.length].name : (sector.name||'—');
  const snEl = document.getElementById('owSectorName');
  if(snEl) snEl.textContent = sectorName;
  const fn = document.getElementById('owFactionName');
  const fb = document.getElementById('owFactionBar');
  if(sector.faction && FACTIONS[sector.faction]) {
    const fac = FACTIONS[sector.faction];
    const rep = State.factionRep[sector.faction]||0;
    if(fn) { fn.textContent = fac.name; fn.style.color = fac.color; }
    if(fb) { fb.style.width = Math.max(0,Math.min(100,(rep+100)/2))+'%'; fb.style.background = fac.color; }
  }
  const wn = document.getElementById('owWeatherName');
  if(wn) {
    const wd = WEATHER_DISPLAY[State.spaceWeather.type]||{name:'CLEAR'};
    wn.textContent = wd.name;
  }
  const fc = document.getElementById('owFleetCrystals');
  if(fc) fc.textContent = `${State.allyFleet.length} allies | ${State.craftingMaterials.crystals||0} crystals`;
  const ex = document.getElementById('owExplored');
  const eb = document.getElementById('owExploredBar');
  const total = State.galaxySectors.length || 36;
  const visited = State.visitedSectors.length;
  if(ex) ex.textContent = `${visited} / ${total}`;
  if(eb) eb.style.width = Math.round(visited/total*100)+'%';
}

// drawOpenWorldHUD is an alias for updateOpenWorldHUDPanel (full HUD panel update)
function drawOpenWorldHUD() { updateOpenWorldHUDPanel(); }

// ─── GALAXY MAP OVERLAY ───────────────────────────────────────────

function toggleGalaxyMap() {
  const el = document.getElementById('galaxyMapOverlay');
  if(!el) return;
  if(el.classList.contains('open')) {
    el.classList.remove('open');
    if(State.paused) resumeGame();
  } else {
    el.classList.add('open');
    renderGalaxyMapCanvas();
    if(State.running && !State.paused) pauseGame();
  }
}

function renderGalaxyMapCanvas() {
  const canvas = document.getElementById('galaxyMapCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  ctx.clearRect(0,0,cw,ch);
  ctx.fillStyle = '#010810';
  ctx.fillRect(0,0,cw,ch);
  const cols = 6, rows = 6;
  const cw2 = cw/cols, ch2 = ch/rows;
  State.galaxySectors.forEach((s,i)=>{
    const col = i%cols, row = Math.floor(i/cols);
    const px = col*cw2, py = row*ch2;
    const theme = OW_SECTOR_THEMES[i%OW_SECTOR_THEMES.length];
    const visited = State.visitedSectors.includes(i);
    ctx.fillStyle = visited ? theme.bg+'cc' : 'rgba(0,0,0,0.8)';
    ctx.fillRect(px+1,py+1,cw2-2,ch2-2);
    if(s.objectiveComplete) {
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 2;
      ctx.strokeRect(px+2,py+2,cw2-4,ch2-4);
    }
    const faction = s.faction ? FACTIONS[s.faction] : null;
    if(faction) {
      ctx.fillStyle = faction.color+'44';
      ctx.fillRect(px+1,py+1,cw2-2,6);
    }
    ctx.fillStyle = visited ? theme.color : 'rgba(255,255,255,0.15)';
    ctx.font = `${Math.min(8, cw2/9)}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(visited ? theme.name : '???', px+cw2/2, py+ch2/2+4);
    if(!s.bossDefeated && visited) {
      ctx.fillStyle = 'rgba(255,100,0,0.8)';
      ctx.beginPath(); ctx.arc(px+cw2-8, py+8, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5; ctx.strokeRect(px,py,cw2,ch2);
  });
  // Player position
  if(State.players[0]) {
    const p = State.players[0];
    const px2 = (p.x/State.worldWidth)*cw;
    const py2 = (p.y/State.worldHeight)*ch;
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(px2,py2,5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.textAlign = 'left';
}

// ─── NEW GALAXY OBJECTS DRAWING ───────────────────────────────────

function drawNewGalaxyObjects() {
  if(!State.openWorldMode) return;
  const now = Date.now();
  State.galaxyObjects.forEach(obj=>{
    const sx = obj.x - State.camera.x;
    const sy = obj.y - State.camera.y;
    if(sx<-350||sx>CANVAS.width+350||sy<-350||sy>CANVAS.height+350) return;
    const p = State.players[0];

    if(obj.type === 'planet') {
      drawPlanetDetails(obj, sx, sy);
      return;
    }

    if(obj.type === 'asteroidField') {
      if(!obj.asteroids) return;
      obj.asteroids.forEach(a=>{
        if(a.health<=0) return;
        a.angle += a.rotSpeed;
        CTX.save(); CTX.translate(sx+a.relX, sy+a.relY); CTX.rotate(a.angle);
        CTX.fillStyle = a.color; CTX.strokeStyle = '#886644'; CTX.lineWidth = 1;
        CTX.beginPath();
        for(let v=0;v<6;v++) {
          const va = v/6*Math.PI*2, vr=a.radius*(0.7+0.3*Math.sin(v*3));
          v===0?CTX.moveTo(Math.cos(va)*vr,Math.sin(va)*vr):CTX.lineTo(Math.cos(va)*vr,Math.sin(va)*vr);
        }
        CTX.closePath(); CTX.fill(); CTX.stroke();
        CTX.restore();
      });
      return;
    }

    if(obj.type === 'blackhole') {
      CTX.save(); CTX.translate(sx,sy);
      const t = now*0.001;
      for(let ring=5;ring>=1;ring--) {
        const grad = CTX.createRadialGradient(0,0,0,0,0,obj.radius*ring*0.5);
        grad.addColorStop(0,'rgba(0,0,0,1)');
        grad.addColorStop(0.4,'rgba(40,0,80,0.7)');
        grad.addColorStop(1,'transparent');
        CTX.fillStyle = grad;
        CTX.globalAlpha = 0.3/ring;
        CTX.beginPath(); CTX.arc(0,0,obj.radius*ring*0.5,0,Math.PI*2); CTX.fill();
      }
      CTX.globalAlpha = 1;
      // Accretion spiral
      CTX.strokeStyle = 'rgba(180,0,255,0.6)'; CTX.lineWidth = 2;
      CTX.beginPath();
      for(let a=0;a<Math.PI*6;a+=0.1) {
        const r=(a/(Math.PI*6))*obj.radius*1.5;
        const ca=a+t;
        const x=Math.cos(ca)*r, y=Math.sin(ca)*r*0.4;
        a===0?CTX.moveTo(x,y):CTX.lineTo(x,y);
      }
      CTX.stroke();
      // Core
      CTX.fillStyle='#000'; CTX.beginPath(); CTX.arc(0,0,obj.radius*0.5,0,Math.PI*2); CTX.fill();
      CTX.strokeStyle='rgba(150,0,255,0.9)'; CTX.lineWidth=2;
      CTX.beginPath(); CTX.arc(0,0,obj.radius*0.55,0,Math.PI*2); CTX.stroke();
      CTX.restore();
      // Gravity pull
      if(p) {
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        const dist=Math.hypot(dx,dy);
        if(dist<obj.radius*3&&dist>1) {
          const force=800/(dist*dist);
          p.x-=(dx/dist)*force; p.y-=(dy/dist)*force;
        }
        if(dist<50&&!p.invincible) { handlePlayerDamage(p); p.invincible=true; setTimeout(()=>{if(p)p.invincible=false;},1500); }
      }
      // Pull enemies
      State.enemies.forEach(e=>{
        const dx=(e.x+e.width/2)-obj.x, dy=(e.y+e.height/2)-obj.y;
        const dist=Math.hypot(dx,dy);
        if(dist<obj.radius*3&&dist>1){const f=600/(dist*dist);e.x-=(dx/dist)*f;e.y-=(dy/dist)*f;}
      });
      return;
    }

    if(obj.type === 'fortress') {
      if(obj.health<=0) return;
      CTX.save(); CTX.translate(sx,sy);
      const hexPoints=6;
      CTX.strokeStyle='#ff4444'; CTX.lineWidth=3;
      CTX.shadowColor='#ff4444'; CTX.shadowBlur=20;
      CTX.fillStyle='rgba(80,0,0,0.7)';
      CTX.beginPath();
      for(let i=0;i<hexPoints;i++){
        const a=i/hexPoints*Math.PI*2-Math.PI/6;
        i===0?CTX.moveTo(Math.cos(a)*obj.radius,Math.sin(a)*obj.radius):CTX.lineTo(Math.cos(a)*obj.radius,Math.sin(a)*obj.radius);
      }
      CTX.closePath(); CTX.fill(); CTX.stroke();
      CTX.shadowBlur=0;
      // Health bar
      const bw=obj.radius*2;
      CTX.fillStyle='rgba(0,0,0,0.5)'; CTX.fillRect(-bw/2,-obj.radius-14,bw,6);
      CTX.fillStyle='#ff4444'; CTX.fillRect(-bw/2,-obj.radius-14,bw*(obj.health/obj.maxHealth),6);
      CTX.fillStyle='rgba(255,68,68,0.8)'; CTX.font='9px Orbitron,monospace'; CTX.textAlign='center';
      CTX.fillText('FORTRESS',0,obj.radius+16);
      CTX.restore();
      // Shoot at player
      if(p && !obj.destroyed) {
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        const dist=Math.hypot(dx,dy);
        if(dist < 600) {
          if(!obj.lastShot) obj.lastShot=0;
          if(now-obj.lastShot > 2000) {
            obj.lastShot=now;
            const ang=Math.atan2(dy,dx);
            const dummy={x:obj.x,y:obj.y,width:10,height:10,bullets:[],speed:0};
            const bull={x:obj.x,y:obj.y,vx:Math.cos(ang)*5,vy:Math.sin(ang)*5,width:8,height:8,color:'#ff4444'};
            // Simple: push to a fortress bullet array on State
            if(!State._fortressBullets) State._fortressBullets=[];
            State._fortressBullets.push(Object.assign(bull,{life:120}));
          }
        }
      }
      return;
    }

    if(obj.type === 'nebula') {
      CTX.save();
      for(let layer=0;layer<3;layer++) {
        const alpha=0.04+layer*0.03;
        CTX.globalAlpha=alpha;
        const grad=CTX.createRadialGradient(sx,sy,0,sx,sy,obj.radius*(1-layer*0.2));
        grad.addColorStop(0,obj.color+'ff'); grad.addColorStop(1,'transparent');
        CTX.fillStyle=grad;
        CTX.beginPath(); CTX.arc(sx+layer*15,sy-layer*10,obj.radius*(1-layer*0.15),0,Math.PI*2); CTX.fill();
      }
      CTX.globalAlpha=1; CTX.restore();
      // Effect on player inside
      if(p) {
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)<obj.radius) {
          p._nebulaSlowed=true; p._nebulaDmgReduce=true;
        } else {
          p._nebulaSlowed=false; p._nebulaDmgReduce=false;
        }
      }
      return;
    }

    if(obj.type === 'trader') {
      CTX.save(); CTX.translate(sx,sy); CTX.rotate(now*0.001);
      CTX.fillStyle='#00ff88'; CTX.shadowColor='#00ff88'; CTX.shadowBlur=15;
      CTX.beginPath();
      CTX.moveTo(0,-20); CTX.lineTo(14,0); CTX.lineTo(0,20); CTX.lineTo(-14,0);
      CTX.closePath(); CTX.fill(); CTX.shadowBlur=0;
      CTX.restore();
      CTX.fillStyle='rgba(0,255,136,0.6)'; CTX.font='8px Orbitron,monospace'; CTX.textAlign='center';
      CTX.fillText('TRADING POST',sx,sy+30);
      CTX.textAlign='left';
      // Proximity trigger
      if(p && !obj.tradeOpen) {
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)<80 && !State._tradeMenuOpen) {
          State._tradeMenuOpen=true; State._activeTradeObj=obj;
          obj.tradeOpen=true;
          openTradeMenu(obj);
        }
      } else if(p && obj.tradeOpen) {
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)>120) { obj.tradeOpen=false; }
      }
      return;
    }

    if(obj.type === 'ruin') {
      CTX.save(); CTX.translate(sx,sy);
      CTX.fillStyle=obj.used?'rgba(100,100,100,0.4)':'rgba(150,130,100,0.7)';
      CTX.shadowColor=obj.used?'#444':'#aa9966'; CTX.shadowBlur=8;
      CTX.beginPath();
      CTX.moveTo(0,-35); CTX.lineTo(28,15); CTX.lineTo(18,20); CTX.lineTo(-18,20); CTX.lineTo(-28,15);
      CTX.closePath(); CTX.fill();
      CTX.strokeStyle=obj.used?'#555':'#ccaa77'; CTX.lineWidth=1.5; CTX.stroke();
      CTX.shadowBlur=0;
      CTX.fillStyle=obj.used?'rgba(200,200,200,0.3)':'rgba(255,220,100,0.7)';
      CTX.font='8px Orbitron,monospace'; CTX.textAlign='center';
      CTX.fillText(obj.used?'EXPLORED':'ANCIENT RUIN',0,36); CTX.restore(); CTX.textAlign='left';
      if(p && !obj.used) {
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)<60) {
          obj.used=true;
          State.xpMultiplier = (State.xpMultiplier||1)*1.10;
          showWaveAnnounce('+10% XP (ANCIENT RUIN)','#ccaa77');
          discoverCodex('c7');
          updateQuestProgress('explore');
        }
      }
      return;
    }

    if(obj.type === 'crystal') {
      if(!obj.crystals) return;
      obj.crystals.forEach(c=>{
        if(c.health<=0) return;
        CTX.save(); CTX.translate(sx+c.relX, sy+c.relY);
        CTX.fillStyle=c.color||'#44aaff'; CTX.strokeStyle='#aaddff'; CTX.lineWidth=1;
        CTX.shadowColor=c.color||'#44aaff'; CTX.shadowBlur=10;
        CTX.beginPath();
        CTX.moveTo(0,-c.height); CTX.lineTo(c.width/2,0); CTX.lineTo(0,c.height*0.3); CTX.lineTo(-c.width/2,0);
        CTX.closePath(); CTX.fill(); CTX.stroke(); CTX.shadowBlur=0; CTX.restore();
      });
      return;
    }

    if(obj.type === 'beacon') {
      const pulse = (Math.sin(now*0.004)*0.5+0.5);
      CTX.save(); CTX.translate(sx,sy);
      CTX.strokeStyle=`rgba(255,220,0,${0.4+pulse*0.6})`; CTX.lineWidth=2;
      CTX.beginPath(); CTX.arc(0,0,15+pulse*10,0,Math.PI*2); CTX.stroke();
      CTX.fillStyle='rgba(255,220,0,0.8)'; CTX.shadowColor='#ffdd00'; CTX.shadowBlur=15;
      CTX.fillRect(-5,-25,10,30); CTX.fillRect(-12,-3,24,6);
      CTX.shadowBlur=0; CTX.restore();
      CTX.fillStyle='rgba(255,220,0,0.6)'; CTX.font='8px Orbitron,monospace'; CTX.textAlign='center';
      CTX.fillText('BEACON',sx,sy+32); CTX.textAlign='left';
      if(p && !obj.triggered) {
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)<80) {
          obj.triggered=true;
          updateQuestProgress('beacon');
          showWaveAnnounce('DISTRESS BEACON REACHED!','#ffdd00');
          triggerGalaxyEvent('crew_rescue');
          // Spawn enemies
          for(let i=0;i<6;i++){
            const e=createEnemy('basic');
            e.x=obj.x+(Math.random()-0.5)*200; e.y=obj.y+(Math.random()-0.5)*200;
            e.worldX=e.x; e.worldY=e.y; e._openWorld=true; e.sectorIdx=State.currentSector;
            State.enemies.push(e);
          }
          discoverCodex('c10');
        }
      }
      return;
    }

    if(obj.type === 'debris') {
      CTX.save(); CTX.translate(sx,sy);
      CTX.fillStyle='rgba(120,120,120,0.6)'; CTX.strokeStyle='#888'; CTX.lineWidth=1;
      for(let i=0;i<5;i++) {
        const rx=(i*37+11)%60-30, ry=(i*53+17)%50-25;
        CTX.fillRect(rx,ry,8+i*3,5+i*2); CTX.strokeRect(rx,ry,8+i*3,5+i*2);
      }
      CTX.restore();
      if(p && !obj.used) {
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)<50) {
          obj.used=true;
          const coins=20+Math.floor(Math.random()*31);
          addCoins(coins);
          showWaveAnnounce('+'+coins+' COINS (DEBRIS)','#aaaaaa');
        }
      }
      return;
    }

    if(obj.type === 'gate') {
      CTX.save(); CTX.translate(sx,sy);
      const t2=now*0.002;
      for(let ring=3;ring>=1;ring--) {
        CTX.strokeStyle=`rgba(0,245,255,${0.3*ring})`; CTX.lineWidth=ring*2;
        CTX.shadowColor='#00f5ff'; CTX.shadowBlur=20/ring;
        CTX.beginPath(); CTX.arc(0,0,50+ring*15,0,Math.PI*2); CTX.stroke();
      }
      CTX.fillStyle='rgba(0,150,255,0.15)'; CTX.beginPath(); CTX.arc(0,0,50,0,Math.PI*2); CTX.fill();
      CTX.shadowBlur=0; CTX.restore();
      CTX.fillStyle='rgba(0,245,255,0.7)'; CTX.font='9px Orbitron,monospace'; CTX.textAlign='center';
      CTX.fillText(obj.isStart?'ENTRY GATE':'OMEGA GATE',sx,sy+85); CTX.textAlign='left';
      if(p && obj.targetSector !== undefined) {
        const dx=(p.x+p.width/2)-obj.x, dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)<55) {
          const target=State.galaxySectors[obj.targetSector];
          if(target){ p.x=target.x+target.w/2; p.y=target.y+target.h/2; showWaveAnnounce('GATE ACTIVATED!','#00f5ff'); }
        }
      }
      return;
    }

    if(obj.type === 'rainAsteroid') {
      obj.x += obj.vx; obj.y += obj.vy;
      obj.life--;
      if(obj.life<=0) { obj.health=0; return; }
      CTX.save(); CTX.translate(obj.x-State.camera.x, obj.y-State.camera.y);
      CTX.fillStyle=obj.color; CTX.strokeStyle='#aa5500'; CTX.lineWidth=1;
      CTX.beginPath();
      for(let v=0;v<5;v++){const va=v/5*Math.PI*2,vr=obj.radius*(0.7+0.3*Math.sin(v*2));
        v===0?CTX.moveTo(Math.cos(va)*vr,Math.sin(va)*vr):CTX.lineTo(Math.cos(va)*vr,Math.sin(va)*vr);}
      CTX.closePath(); CTX.fill(); CTX.stroke(); CTX.restore();
      if(p){const dx=(p.x+p.width/2)-obj.x,dy=(p.y+p.height/2)-obj.y;
        if(Math.hypot(dx,dy)<obj.radius+20&&!p.invincible){handlePlayerDamage(p);obj.health=0;}}
      return;
    }
  });
  // Clean dead objects
  State.galaxyObjects = State.galaxyObjects.filter(o=>{
    if(o.type==='rainAsteroid'&&o.health<=0) return false;
    return true;
  });
}

// ─── FORTRESS BULLETS ─────────────────────────────────────────────

function processFortressBullets() {
  if(!State.openWorldMode) return;
  if(!State._fortressBullets) State._fortressBullets=[];
  const p = State.players[0];
  for(let i=State._fortressBullets.length-1;i>=0;i--) {
    const b=State._fortressBullets[i];
    b.x+=b.vx; b.y+=b.vy; b.life--;
    if(b.life<=0){State._fortressBullets.splice(i,1);continue;}
    CTX.fillStyle='#ff4444'; CTX.shadowColor='#ff4444'; CTX.shadowBlur=8;
    CTX.beginPath(); CTX.arc(b.x-State.camera.x,b.y-State.camera.y,4,0,Math.PI*2); CTX.fill();
    CTX.shadowBlur=0;
    if(p&&!p.invincible){const dx=(p.x+p.width/2)-b.x,dy=(p.y+p.height/2)-b.y;
      if(Math.hypot(dx,dy)<20){handlePlayerDamage(p);State._fortressBullets.splice(i,1);}}
  }
}

// ─── ASTEROID BULLET COLLISIONS ───────────────────────────────────

function checkAsteroidBulletCollisions() {
  if(!State.openWorldMode) return;
  const p = State.players[0]; if(!p) return;
  for(let oi=State.galaxyObjects.length-1;oi>=0;oi--) {
    const obj=State.galaxyObjects[oi];
    if(obj.type!=='asteroidField'&&obj.type!=='crystal') continue;
    const arr=obj.type==='asteroidField'?obj.asteroids:obj.crystals;
    if(!arr) continue;
    for(let ai=arr.length-1;ai>=0;ai--) {
      const a=arr[ai];
      if(a.health<=0) continue;
      const ax=obj.x+a.relX, ay=obj.y+a.relY;
      for(let bi=p.bullets.length-1;bi>=0;bi--) {
        const b=p.bullets[bi];
        const dx=b.x-ax, dy=b.y-ay;
        if(Math.hypot(dx,dy)<a.radius+5) {
          a.health-=(b.damage||1);
          p.bullets.splice(bi,1);
          if(a.health<=0) {
            triggerExplosion(ax,ay,obj.type==='crystal'?'#44aaff':'#aa7744',10);
            if(obj.type==='crystal') {
              const xpAmt=10+Math.floor(Math.random()*21);
              State.xpOrbs.push(new XPOrb(ax,ay,xpAmt));
              State.craftingMaterials.crystals=(State.craftingMaterials.crystals||0)+1;
              updateQuestProgress('crystal',xpAmt);
              discoverCodex('c8');
            } else {
              addCoins(3+Math.floor(Math.random()*8));
              State.xpOrbs.push(new XPOrb(ax,ay,15));
            }
          }
          break;
        }
      }
    }
  }
  // Fortress bullet collisions
  State.galaxyObjects.forEach((obj,oi)=>{
    if(obj.type!=='fortress'||obj.health<=0) return;
    for(let bi=p.bullets.length-1;bi>=0;bi--) {
      const b=p.bullets[bi];
      const dx=b.x-obj.x, dy=b.y-obj.y;
      if(Math.hypot(dx,dy)<obj.radius) {
        obj.health -= (b.damage||1)*(p.damageMultiplier||1);
        p.bullets.splice(bi,1);
        if(obj.health<=0) {
          obj.destroyed=true;
          triggerExplosion(obj.x,obj.y,'#ff4444',50);
          addCoins(200);
          gainXP(300);
          showWaveAnnounce('FORTRESS DESTROYED!','#ff4444');
          updateQuestProgress('fortress');
          updateSectorObjectiveProgress(State.currentSector,'kill',1);
        }
        break;
      }
    }
  });
}

function updateSectorObjectiveProgress(sectorIdx, type, amount) {
  if(!State._sectorObjectiveProgress) State._sectorObjectiveProgress={};
  const sector = State.galaxySectors[sectorIdx];
  if(!sector || !sector.sectorObjective) return;
  if(sector.sectorObjective.type === type) {
    State._sectorObjectiveProgress[sectorIdx] = (State._sectorObjectiveProgress[sectorIdx]||0)+amount;
    checkSectorObjective();
  }
}

// ─── FORMATION ENEMIES ────────────────────────────────────────────

function spawnFormationEnemies(x, y, sectorIdx) {
  const types=['basic','fast','ufo'];
  const type=types[Math.floor(Math.random()*types.length)];
  const angle = Math.random()*Math.PI*2;
  for(let i=0;i<5;i++) {
    const vOffset = (i-2)*40;
    const ex = x + Math.cos(angle+Math.PI/2)*vOffset;
    const ey = y + i*50*Math.cos(angle);
    const e=createEnemy(type);
    e.x=ex; e.y=ey; e.worldX=ex; e.worldY=ey; e.homeX=ex; e.homeY=ey;
    e._openWorld=true; e.sectorIdx=sectorIdx; e._formation=true;
    State.enemies.push(e);
  }
}

function updateOpenWorldEnemyBehaviors() {
  if(!State.openWorldMode) return;
  const p = State.players[0]; if(!p) return;
  const now = Date.now();
  const wMult = getWeatherEnemySpeedMult();
  State.enemies.forEach(e=>{
    if(!e._openWorld) return;
    if(!e._origSpeed) e._origSpeed = e.speed||2;
    e.speed = e._origSpeed * wMult;
    // Mining enemies patrol near asteroids
    if(e._mining) {
      const t2=now*0.0005+e.homeX*0.001;
      e.x=e.homeX+Math.cos(t2)*80; e.y=e.homeY+Math.sin(t2)*80;
      return;
    }
    // Faction patrol: follow waypoints
    if(e._patrol && e._waypoints && e._waypoints.length>0) {
      const wp = e._waypoints[e._waypointIdx||0];
      const dx=wp.x-e.x, dy=wp.y-e.y;
      const dist=Math.hypot(dx,dy);
      if(dist<20) { e._waypointIdx=((e._waypointIdx||0)+1)%e._waypoints.length; }
      else { e.x+=(dx/dist)*e.speed; e.y+=(dy/dist)*e.speed; }
      return;
    }
    // Standard: wander unless player nearby
    const dx2=(p.x+p.width/2)-(e.x+e.width/2);
    const dy2=(p.y+p.height/2)-(e.y+e.height/2);
    const dist2=Math.hypot(dx2,dy2);
    if(dist2<350&&dist2>1) {
      e.x+=(dx2/dist2)*e.speed;
      e.y+=(dy2/dist2)*e.speed;
    } else {
      const t3=now*0.002+(e.homeX||0)*0.001;
      e.x+=Math.cos(t3)*0.8; e.y+=Math.sin(t3)*0.8;
    }
    // Clamp to world
    e.x=Math.max(0,Math.min(State.worldWidth-e.width,e.x));
    e.y=Math.max(0,Math.min(State.worldHeight-e.height,e.y));
  });
}

// ─── TRADE MENU ───────────────────────────────────────────────────

function openTradeMenu(obj) {
  if(State.running && !State.paused) pauseGame();
  const el = document.getElementById('tradeOverlay');
  if(!el) return;
  const upgrades = RUN_UPGRADES_POOL.filter(u=>(State.runUpgrades[u.id]||0)<u.maxLevel);
  const shuffled = [...upgrades].sort(()=>Math.random()-0.5).slice(0,3);
  const prices = [50, 100, 150];
  let html = `<div style="font-family:Orbitron,monospace;font-size:10px;color:rgba(0,255,136,0.7);margin-bottom:12px;">COINS: <span style="color:#ffd60a;">${State.coins}</span></div>`;
  shuffled.forEach((up,i)=>{
    const price=prices[i];
    const canAfford=State.coins>=price;
    html+=`<div class="trade-item" onclick="buyTradeUpgrade('${up.id}',${price})" style="opacity:${canAfford?1:0.4}">
      <h3>${up.icon} ${up.name}</h3>
      <p>${up.desc}</p>
      <div class="trade-cost">${price} COINS</div>
    </div>`;
  });
  // Ally ship recruits
  html += '<div style="margin-top:12px;font-family:Orbitron,monospace;font-size:10px;color:rgba(0,255,136,0.5);">RECRUIT ALLIES:</div>';
  ALLY_SHIP_TYPES.slice(0,2).forEach(cfg=>{
    const canAfford=State.coins>=cfg.cost;
    html+=`<div class="trade-item" onclick="recruitAllyAt('${cfg.type}')" style="opacity:${canAfford?1:0.4}">
      <h3>${cfg.label}</h3>
      <p>Speed:${cfg.speed} | Dmg:${cfg.damage} | HP:${cfg.health}</p>
      <div class="trade-cost">${cfg.cost} COINS</div>
    </div>`;
  });
  document.getElementById('tradeContent').innerHTML = html;
  el.classList.add('open');
  updateQuestProgress('trade');
  discoverCodex('c11');
}

function buyTradeUpgrade(id, price) {
  const up = RUN_UPGRADES_POOL.find(u=>u.id===id); if(!up) return;
  if(State.coins < price) { showWaveAnnounce('NOT ENOUGH COINS','#ff4444'); return; }
  const p=State.players[0]; if(!p) return;
  const currentLevel=State.runUpgrades[id]||0;
  if(currentLevel>=up.maxLevel){showWaveAnnounce('ALREADY MAXED','#ff4444');return;}
  addCoins(-price);
  State.runUpgrades[id]=(State.runUpgrades[id]||0)+1;
  if(up.apply) up.apply(p);
  showWaveAnnounce(up.name+' UPGRADED!','#00ff88');
  openTradeMenu(State._activeTradeObj);
}

function closeTradeMenu() {
  const el=document.getElementById('tradeOverlay');
  if(el) el.classList.remove('open');
  State._tradeMenuOpen=false;
  if(State.paused) resumeGame();
}

// ─── KEYBOARD SHORTCUTS FOR NEW SYSTEMS ───────────────────────────

function handleOpenWorldKey(key) {
  if(!State.openWorldMode) return false;
  if(key==='q') { toggleQuestLog(); return true; }
  if(key==='c') { toggleCraftingMenu(); return true; }
  if(key==='f') {
    // Only toggle fleet if not in 2player mode
    if(!State.twoPlayer) { toggleFleetManager(); return true; }
  }
  if(key==='m') { toggleGalaxyMap(); return true; }
  return false;
}



