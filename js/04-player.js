// ═══════════════════════════════════════════════════════════════════
// SECTION 8 – PLAYER CLASS
// ═══════════════════════════════════════════════════════════════════
class Player {
  constructor(characterId,playerIndex) {
    this.index=playerIndex;
    const cfg = CHARACTER_CFG[characterId]||CHARACTER_CFG.marcelo;
    this.x = playerIndex===0 ? CANVAS.width/4-25 : CANVAS.width*3/4-25;
    this.y = (State.pvpMode && playerIndex===1) ? 60 : CANVAS.height - 100;
    this.width=50; this.height=50;
    this.speed=cfg.speed;
    this.isMovingLeft=false; this.isMovingRight=false;
    this.isMovingUp=false; this.isMovingDown=false;
    this.character=characterId;
    this.shootCooldown=cfg.shootCooldown;
    this.baseCooldown=cfg.shootCooldown;
    this.damageMultiplier=cfg.dmgMult;
    this.bullets=[]; this.lastShootTime=0;
    this.lives=3;
    this.skin=State.equippedSkin;
    this.permanentShield=false; this.shieldRadius=0;
    this.bulletColor  = playerIndex===0 ? '#39ff14' : '#ff7700';
    this.shieldColor  = playerIndex===0 ? '#00f5ff' : '#ffff00';
    this.laserColor   = playerIndex===0 ? '#00f5ff' : '#ff7700';
    this.robotColor   = playerIndex===0 ? '#00b4d8' : '#ff7700';
    this.abilityActive=false; this.abilityCooldown=0; this.abilityEndTime=0;
    this.laserActive=false; this.laserEndTime=0;
    this.allyRobots=[];
    // IMPROVEMENT 6: invincibility frames
    this.invincible=false; this.invincibleEnd=0;
    // IMPROVEMENT 7: engine particle trail
    this.trailParticles=[];
    this.lastTrail=0;
  }

  hasShield() {
    if(this.permanentShield) return true;
    if(this.index===0 && State.shieldActive && Date.now()<State.shieldEndTime) return true;
    return false;
  }

  update() {
    if(State.openWorldMode) {
      if(this.isMovingLeft  && this.x>0)                              this.x-=this.speed;
      if(this.isMovingRight && this.x+this.width<State.worldWidth)    this.x+=this.speed;
      if(this.isMovingUp    && this.y>0)                              this.y-=this.speed;
      if(this.isMovingDown  && this.y+this.height<State.worldHeight)  this.y+=this.speed;
    } else {
      if(this.isMovingLeft  && this.x>0)                      this.x-=this.speed;
      if(this.isMovingRight && this.x+this.width<CANVAS.width) this.x+=this.speed;
    }
    // IMPROVEMENT 6: check invincibility
    if(this.invincible && Date.now()>this.invincibleEnd) this.invincible=false;
    // IMPROVEMENT 7: engine trail
    if(Date.now()-this.lastTrail>50) {
      const cx=this.x+this.width/2;
      const pvpFlip = State.pvpMode && this.index===1;
      const trailY = pvpFlip ? this.y : this.y+this.height;
      const trailDir = pvpFlip ? -1 : 1;
      const c=this.index===0?'rgba(0,245,255,0.4)':'rgba(255,119,0,0.4)';
      this.trailParticles.push({x:cx+rand(-5,5),y:trailY,a:0.6,vx:rand(-0.5,0.5),vy:rand(0.5,1.5)*trailDir,size:rand(2,5),color:c});
      this.lastTrail=Date.now();
    }
    this.trailParticles=this.trailParticles.filter(p=>{
      p.a-=0.04; p.x+=p.vx; p.y+=p.vy; return p.a>0;
    });
  }

  drawTrail() {
    this.trailParticles.forEach(p=>{
      CTX.globalAlpha=p.a; CTX.fillStyle=p.color;
      CTX.beginPath(); CTX.arc(p.x,p.y,p.size,0,Math.PI*2); CTX.fill();
    });
    CTX.globalAlpha=1;
  }

  shoot() {
    const now=Date.now();
    if(now-this.lastShootTime<=this.shootCooldown) return;
    this.lastShootTime=now;
    // Phase 1.5: muzzle flash + recoil (visual only)
    this._muzzle = performance.now();
    this._recoil = 2;
    // Phase 4: run-stats tracking
    if(State.runStats) State.runStats.shotsFired++;
    const cx=this.x+this.width/2;
    // PvP: P2 shoots downward; bullets origin from bottom of ship
    const pvpFlip = State.pvpMode && this.index===1;
    const dir = pvpFlip ? 1 : -1;
    const sy = pvpFlip ? this.y+this.height : this.y;
    const _b=(x,y,ao,dm)=>new PlayerBullet(x,y,this.bulletColor,ao,dm,dir);
    switch(this.character) {
      case 'takeshi':
        [-0.5,0,0.5].forEach(off=>this.bullets.push(_b(cx,sy,off,this.damageMultiplier)));
        break;
      case 'deepseek':
        if(!this.laserActive){ this.laserActive=true; this.laserEndTime=now+1000; playSound('laserSound'); }
        break;
      case 'robos':
        [-15,0,15].forEach(off=>this.bullets.push(_b(cx+off,sy,0,this.damageMultiplier)));
        break;
      case 'omega':
        this.bullets.push(_b(cx,sy,0,this.damageMultiplier));
        break;
      case 'phantom': {
        const pb=_b(cx,sy,0,this.damageMultiplier); pb.width=8; this.bullets.push(pb); break;
      }
      case 'titan': {
        const tb=_b(cx-10,sy,0,this.damageMultiplier);
        tb.width=20; tb.height=20; tb.damage=this.damageMultiplier*3; this.bullets.push(tb); break;
      }
      default:
        this.bullets.push(_b(cx,sy,0,this.damageMultiplier));
        if(this.index===0 && State.powerUpActive && this.shootCooldown===100) {
          this.bullets.push(_b(cx-10,sy,0,this.damageMultiplier));
          this.bullets.push(_b(cx+10,sy,0,this.damageMultiplier));
        }
    }
    playSound('shootSound');
    if(_onlineMode) sendOnlineShoot();
  }

  activateAbility() {
    const now=Date.now();
    if(this.abilityActive||now<this.abilityCooldown) return;
    this.abilityActive=true;
    switch(this.character) {
      case 'marcelo':
        this.allyRobots=[new AllyRobot(this.x-100,this.y-50,this.robotColor),new AllyRobot(this.x+100,this.y-50,this.robotColor)];
        this.abilityEndTime=now+10000; this.abilityCooldown=now+20000; break;
      case 'felipe':
        this.abilityEndTime=now+5000; this.abilityCooldown=now+10000; break;
      case 'takeshi':
        for(let i=0;i<3;i++){const cx2=this.x+this.width/2;[-0.8,0,0.8].forEach(off=>this.bullets.push(new PlayerBullet(cx2,this.y,this.bulletColor,off,this.damageMultiplier*1.5)));}
        this.abilityActive=false; this.abilityCooldown=now+8000; return;
      case 'deepseek':
        this.laserActive=true; this.laserEndTime=now+2000; this.abilityCooldown=now+12000; this.abilityActive=false; return;
      case 'omega': {
        const cx3=this.x+this.width/2;
        for(let i=0;i<8;i++){const off=(i/7-0.5)*5; this.bullets.push(new PlayerBullet(cx3,this.y,this.bulletColor,off,this.damageMultiplier));}
        this.abilityActive=false; this.abilityCooldown=now+6000; return;
      }
      case 'phantom':
        this.y=Math.max(50,this.y-60); this.invincible=true; this.invincibleEnd=now+2000;
        this.abilityEndTime=now+2000; this.abilityCooldown=now+12000; break;
      case 'titan': {
        this.permanentShield=true;
        setTimeout(()=>{if(this)this.permanentShield=false;},3000);
        State.enemies.forEach(e=>{const dx=e.x-(this.x+this.width/2),dy=e.y-(this.y+this.height/2);const d=Math.hypot(dx,dy);if(d<120){e.x+=dx/d*60;e.y+=dy/d*60;}});
        this.abilityEndTime=now+3000; this.abilityCooldown=now+15000; break;
      }
      default:
        this.abilityActive=false; return;
    }
    playSound('abilitySound');
    triggerExplosion(this.x+25,this.y+25,'#ff00ff',20);
  }

  updateTimers() {
    const now=Date.now();
    if(this.abilityActive && now>this.abilityEndTime) {
      this.abilityActive=false;
      if(this.character==='marcelo') this.allyRobots=[];
    }
    if(this.laserActive && now>this.laserEndTime) this.laserActive=false;
  }

  draw() {
    this.drawTrail();
    // Phase 1.5: visible i-frame aura
    if(this.invincible){
      CTX.save();
      const _a = 0.35 + 0.25*Math.sin(Date.now()/60);
      CTX.strokeStyle = 'rgba(0,245,255,'+_a.toFixed(2)+')';
      CTX.lineWidth = 2;
      CTX.shadowColor = '#00f5ff'; CTX.shadowBlur = 12;
      CTX.beginPath();
      CTX.arc(this.x+this.width/2, this.y+this.height/2, this.width*0.72, 0, Math.PI*2);
      CTX.stroke();
      CTX.restore();
    }
    // IMPROVEMENT 6: flash when invincible
    if(this.invincible && Math.floor(Date.now()/100)%2===0) return;

    // Flip P2 vertically in PvP mode
    const pvpFlip = State.pvpMode && this.index===1;
    if(pvpFlip) {
      CTX.save();
      CTX.translate(this.x+this.width/2, this.y+this.height/2);
      CTX.scale(1,-1);
      CTX.translate(-(this.x+this.width/2), -(this.y+this.height/2));
    }

    // Shield ring
    if(this.hasShield()) {
      this.shieldRadius=clamp(this.shieldRadius+2,0,42);
      CTX.strokeStyle = this.permanentShield ? '#ff00ff' : this.shieldColor;
      CTX.lineWidth = 2;
      CTX.shadowColor = this.permanentShield ? '#ff00ff' : this.shieldColor;
      CTX.shadowBlur = 15;
      CTX.globalAlpha = 0.7;
      CTX.beginPath(); CTX.arc(this.x+this.width/2,this.y+this.height/2,this.shieldRadius,0,Math.PI*2); CTX.stroke();
      CTX.globalAlpha = 1; CTX.shadowBlur = 0;
    } else {
      this.shieldRadius=clamp(this.shieldRadius-2,0,42);
    }

    const skin = SKINS_DATA.find(s=>s.id===this.skin)||SKINS_DATA[0];
    const cx=this.x+this.width/2, top=this.y, bot=this.y+this.height;
    const skinColor = skin.color==='animated'?`hsl(${Date.now()/20%360},100%,55%)`:skin.color;
    if(this.skin==='rainbow') { State.stats.rainbowUsed=true; }
    CTX.shadowColor=skinColor; CTX.shadowBlur=12;
    CTX.fillStyle=skinColor;

    const sc = skinColor;
    switch(this.character) {
      case 'marcelo': {
        // Body – wide fighter with AI core
        CTX.beginPath();
        CTX.moveTo(cx,top+2);
        CTX.lineTo(cx-14,this.y+22); CTX.lineTo(cx-20,bot);
        CTX.lineTo(cx,bot-8); CTX.lineTo(cx+20,bot);
        CTX.lineTo(cx+14,this.y+22); CTX.closePath(); CTX.fill();
        // Wings
        CTX.fillStyle=sc; CTX.globalAlpha=0.55;
        CTX.beginPath(); CTX.moveTo(cx-14,this.y+22); CTX.lineTo(this.x-10,bot); CTX.lineTo(cx-20,bot); CTX.closePath(); CTX.fill();
        CTX.beginPath(); CTX.moveTo(cx+14,this.y+22); CTX.lineTo(this.x+this.width+10,bot); CTX.lineTo(cx+20,bot); CTX.closePath(); CTX.fill();
        CTX.globalAlpha=1;
        // AI core glow
        CTX.fillStyle='#00f5ff'; CTX.shadowColor='#00f5ff'; CTX.shadowBlur=10;
        CTX.beginPath(); CTX.arc(cx,this.y+this.height*0.45,6,0,Math.PI*2); CTX.fill();
        CTX.shadowBlur=0;
        break;
      }
      case 'robos': {
        // Blocky mech
        CTX.fillRect(cx-18,top+6,36,this.height-6);
        // Head
        CTX.fillStyle=sc; CTX.globalAlpha=0.8;
        CTX.fillRect(cx-10,top,20,10);
        CTX.globalAlpha=1;
        // Arm cannons
        CTX.fillStyle=sc; CTX.globalAlpha=0.6;
        CTX.fillRect(this.x,this.y+14,10,22);
        CTX.fillRect(this.x+this.width-10,this.y+14,10,22);
        CTX.globalAlpha=1;
        // Eyes
        CTX.fillStyle='#ff3333'; CTX.shadowColor='#ff4444'; CTX.shadowBlur=8;
        CTX.fillRect(cx-9,top+8,6,5); CTX.fillRect(cx+3,top+8,6,5);
        CTX.shadowBlur=0;
        break;
      }
      case 'felipe': {
        // Sleek speedster – elongated teardrop
        CTX.beginPath();
        CTX.moveTo(cx,top);
        CTX.bezierCurveTo(cx+20,top+14, cx+22,bot-10, cx,bot);
        CTX.bezierCurveTo(cx-22,bot-10, cx-20,top+14, cx,top);
        CTX.closePath(); CTX.fill();
        // Speed fins
        CTX.fillStyle=sc; CTX.globalAlpha=0.5;
        CTX.beginPath(); CTX.moveTo(cx-16,this.y+28); CTX.lineTo(this.x-8,bot+10); CTX.lineTo(cx-8,bot); CTX.closePath(); CTX.fill();
        CTX.beginPath(); CTX.moveTo(cx+16,this.y+28); CTX.lineTo(this.x+this.width+8,bot+10); CTX.lineTo(cx+8,bot); CTX.closePath(); CTX.fill();
        CTX.globalAlpha=1;
        // Cockpit
        CTX.fillStyle='rgba(200,240,255,0.35)';
        CTX.beginPath(); CTX.ellipse(cx,this.y+16,6,9,0,0,Math.PI*2); CTX.fill();
        break;
      }
      case 'takeshi': {
        // Ninja blade ship – diamond body
        CTX.beginPath();
        CTX.moveTo(cx,top); CTX.lineTo(cx+22,this.y+this.height*0.55);
        CTX.lineTo(cx,bot); CTX.lineTo(cx-22,this.y+this.height*0.55);
        CTX.closePath(); CTX.fill();
        // Inner blade
        CTX.fillStyle='rgba(255,255,255,0.18)';
        CTX.beginPath();
        CTX.moveTo(cx,top+8); CTX.lineTo(cx+10,this.y+this.height*0.5);
        CTX.lineTo(cx,bot-8); CTX.lineTo(cx-10,this.y+this.height*0.5);
        CTX.closePath(); CTX.fill();
        // Core gem
        CTX.fillStyle='#ff006e'; CTX.shadowColor='#ff006e'; CTX.shadowBlur=12;
        CTX.beginPath(); CTX.arc(cx,this.y+this.height*0.4,5,0,Math.PI*2); CTX.fill();
        CTX.shadowBlur=0;
        break;
      }
      case 'deepseek': {
        // Cannon ship – heavy front-mounted beam
        CTX.beginPath();
        CTX.moveTo(cx,top);
        CTX.lineTo(cx-8,top+12); CTX.lineTo(cx-18,bot);
        CTX.lineTo(cx,bot-6); CTX.lineTo(cx+18,bot);
        CTX.lineTo(cx+8,top+12); CTX.closePath(); CTX.fill();
        // Cannon barrel
        CTX.fillStyle='#00f5ff'; CTX.shadowColor='#00f5ff'; CTX.shadowBlur=12;
        CTX.fillRect(cx-4,top-6,8,18);
        // Energy cells
        CTX.fillStyle='rgba(0,245,255,0.4)';
        CTX.fillRect(cx-14,this.y+20,8,14); CTX.fillRect(cx+6,this.y+20,8,14);
        CTX.shadowBlur=0;
        break;
      }
      case 'omega': {
        // Circular chaingun ship
        CTX.beginPath(); CTX.arc(cx,this.y+this.height/2,20,0,Math.PI*2); CTX.fill();
        CTX.fillStyle='rgba(255,255,255,0.6)';
        CTX.beginPath(); CTX.arc(cx,this.y+this.height/2,10,0,Math.PI*2); CTX.fill();
        // Rotating mini-cannons
        const rot=Date.now()/500;
        for(let i=0;i<4;i++){const a=rot+i*Math.PI/2; CTX.fillStyle=sc; CTX.fillRect(cx+Math.cos(a)*18-3,this.y+this.height/2+Math.sin(a)*18-8,6,10);}
        break;
      }
      case 'phantom': {
        // Ghost/translucent ship
        CTX.globalAlpha=0.55+0.2*Math.sin(Date.now()/300);
        CTX.beginPath(); CTX.moveTo(cx,top); CTX.lineTo(cx-16,this.y+18); CTX.lineTo(cx-10,bot); CTX.lineTo(cx,bot-6); CTX.lineTo(cx+10,bot); CTX.lineTo(cx+16,this.y+18); CTX.closePath(); CTX.fill();
        // Ghost trail dots
        CTX.fillStyle='rgba(255,255,255,0.5)';
        for(let i=0;i<3;i++){CTX.beginPath();CTX.arc(cx+(i-1)*12,bot+8+i*4,3-i,0,Math.PI*2);CTX.fill();}
        CTX.globalAlpha=1; break;
      }
      case 'titan': {
        // Massive armored square
        CTX.fillRect(cx-22,top+4,44,this.height-4);
        // Armor plating details
        CTX.fillStyle='rgba(255,255,255,0.25)';
        CTX.fillRect(cx-20,top+6,18,8); CTX.fillRect(cx+2,top+6,18,8);
        CTX.fillRect(cx-20,top+20,18,8); CTX.fillRect(cx+2,top+20,18,8);
        // Core
        CTX.fillStyle=sc; CTX.shadowBlur=20;
        CTX.beginPath(); CTX.arc(cx,this.y+this.height*0.5,8,0,Math.PI*2); CTX.fill();
        break;
      }
      default: {
        CTX.beginPath(); CTX.moveTo(cx,top); CTX.lineTo(cx-20,bot); CTX.lineTo(cx,bot-8); CTX.lineTo(cx+20,bot); CTX.closePath(); CTX.fill();
        CTX.fillStyle=this.index===0?'#00f5ff':'#ffff00'; CTX.fillRect(cx-4,this.y+this.height*0.4,8,this.height*0.4);
      }
    }
    CTX.shadowBlur=0;
    // Restore canvas transform for PvP P2 flip
    if(pvpFlip) CTX.restore();
    // PvP: draw player label
    if(State.pvpMode) {
      CTX.fillStyle=this.index===0?'rgba(0,245,255,0.8)':'rgba(255,119,0,0.8)';
      CTX.font='bold 10px Orbitron, monospace'; CTX.textAlign='center';
      const labelY = this.index===0 ? this.y-8 : this.y+this.height+16;
      CTX.fillText(this.index===0?'P1':'P2', this.x+this.width/2, labelY);
    }
  }
}

