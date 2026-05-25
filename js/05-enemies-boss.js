// ═══════════════════════════════════════════════════════════════════
// SECTION 9 – ENEMIES (IMPROVEMENT 8: health bars on enemies)
// ═══════════════════════════════════════════════════════════════════
class Enemy {
  constructor() {
    this.x=Math.random()*(CANVAS.width-40); this.y=-50;
    this.width=40; this.height=40; this.speed=2+Math.random();
    this.health=1; this.maxHealth=1; this.type='basic';
    this.bullets=[]; this.lastShot=Date.now();
    this.shootInterval=2000+Math.random()*2000;
  }
  update() {
    this.y+=this.speed;
    if(Date.now()-this.lastShot>this.shootInterval) { this.shoot(); this.lastShot=Date.now(); }
    this.bullets=this.bullets.filter(b=>b.y<=CANVAS.height);
    this.bullets.forEach(b=>{b.update();b.draw();});
  }
  shoot() { this.bullets.push(new EnemyBullet(this.x+this.width/2,this.y+this.height)); }
  drawHealthBar() {
    if(this.health>=this.maxHealth) return;
    const pct=this.health/this.maxHealth;
    CTX.fillStyle='rgba(0,0,0,0.5)'; CTX.fillRect(this.x,this.y-8,this.width,4);
    CTX.fillStyle=pct>0.5?'#39ff14':'#ff006e';
    CTX.fillRect(this.x,this.y-8,this.width*pct,4);
  }
  draw() {
    // Basic enemy – angular invader shape
    const cx=this.x+this.width/2, cy=this.y+this.height/2;
    CTX.fillStyle='#cc2222'; CTX.shadowColor='#ff4444'; CTX.shadowBlur=10;
    CTX.beginPath();
    CTX.moveTo(cx,this.y+4); CTX.lineTo(this.x+this.width-4,this.y+8);
    CTX.lineTo(this.x+this.width,this.y+this.height-4); CTX.lineTo(this.x+this.width-8,this.y+this.height);
    CTX.lineTo(this.x+8,this.y+this.height); CTX.lineTo(this.x,this.y+this.height-4);
    CTX.lineTo(this.x+4,this.y+8); CTX.closePath(); CTX.fill();
    // Inner detail
    CTX.fillStyle='rgba(255,100,100,0.35)';
    CTX.beginPath(); CTX.arc(cx,cy,8,0,Math.PI*2); CTX.fill();
    CTX.fillStyle='#ff6666'; CTX.shadowBlur=6;
    CTX.beginPath(); CTX.arc(cx,cy,4,0,Math.PI*2); CTX.fill();
    CTX.shadowBlur=0; this.drawHealthBar();
  }
}

class UniqueEnemy extends Enemy {
  constructor() { super(); this.x=Math.random()*(CANVAS.width-60); this.y=-60; this.width=60; this.height=60; this.speed=1.5; this.type='unique'; this.maxHealth=1; this._angle=0; }
  draw() {
    this._angle=(this._angle||0)+0.02;
    const cx=this.x+this.width/2, cy=this.y+this.height/2;
    CTX.save(); CTX.translate(cx,cy); CTX.rotate(this._angle);
    CTX.fillStyle='#ffd700'; CTX.shadowColor='#ffcc00'; CTX.shadowBlur=16;
    // Star shape
    CTX.beginPath();
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4, r=i%2===0?26:14;
      i===0?CTX.moveTo(Math.cos(a)*r,Math.sin(a)*r):CTX.lineTo(Math.cos(a)*r,Math.sin(a)*r);
    }
    CTX.closePath(); CTX.fill();
    CTX.fillStyle='#ff8c00'; CTX.shadowBlur=8;
    CTX.beginPath(); CTX.arc(0,0,10,0,Math.PI*2); CTX.fill();
    CTX.restore();
    CTX.shadowBlur=0; this.drawHealthBar();
  }
}

class UFO extends Enemy {
  constructor() { super(); this.x=Math.random()*(CANVAS.width-60); this.width=60; this.height=28; this.speed=3+Math.random(); this.type='ufo'; }
  update() {
    this.x+=Math.sin(Date.now()/300)*2; this.y+=this.speed;
    if(Date.now()-this.lastShot>this.shootInterval) { this.shoot(); this.lastShot=Date.now(); }
    this.bullets=this.bullets.filter(b=>b.y<=CANVAS.height);
    this.bullets.forEach(b=>{b.update();b.draw();});
  }
  draw() {
    const cx=this.x+this.width/2, cy=this.y+this.height/2;
    // Saucer body
    CTX.fillStyle='#bb00bb'; CTX.shadowColor='#ff00ff'; CTX.shadowBlur=12;
    CTX.beginPath(); CTX.ellipse(cx,cy+4,this.width/2,this.height/2-2,0,0,Math.PI*2); CTX.fill();
    // Top dome
    CTX.fillStyle='#dd55dd'; CTX.shadowBlur=6;
    CTX.beginPath(); CTX.ellipse(cx,cy-2,this.width/3.5,this.height/2,0,Math.PI,Math.PI*2); CTX.fill();
    // Lights
    [-16,-8,0,8,16].forEach((ox,i)=>{
      CTX.fillStyle=i%2===0?'#ffff00':'#00ffff';
      CTX.beginPath(); CTX.arc(cx+ox,cy+8,3,0,Math.PI*2); CTX.fill();
    });
    CTX.shadowBlur=0; this.drawHealthBar();
  }
}

class TankEnemy extends Enemy {
  constructor() { super(); this.x=Math.random()*(CANVAS.width-70); this.y=-70; this.width=70; this.height=52; this.speed=1+Math.random()*0.5; this.type='tank'; this.health=3; this.maxHealth=3; }
  draw() {
    const cx=this.x+this.width/2;
    // Hull
    CTX.fillStyle='#4a3010'; CTX.shadowColor='#8b6030'; CTX.shadowBlur=8;
    CTX.fillRect(this.x+4,this.y+10,this.width-8,this.height-10);
    // Armor plates
    CTX.fillStyle='#2d5a1b';
    CTX.fillRect(this.x+8,this.y+14,this.width-16,this.height-22);
    CTX.fillRect(this.x+4,this.y+28,8,14); CTX.fillRect(this.x+this.width-12,this.y+28,8,14);
    // Turret
    CTX.fillStyle='#3a2a08'; CTX.shadowBlur=4;
    CTX.fillRect(cx-12,this.y,24,16);
    // Cannon
    CTX.fillStyle='#555'; CTX.fillRect(cx-4,this.y-10,8,16);
    CTX.shadowBlur=0; this.drawHealthBar();
  }
}

class FastEnemy extends Enemy {
  constructor() { super(); this.x=Math.random()*(CANVAS.width-32); this.y=-32; this.width=32; this.height=32; this.speed=5+Math.random()*2; this.type='fast'; }
  draw() {
    const cx=this.x+this.width/2;
    CTX.fillStyle='#0090cc'; CTX.shadowColor='#00f5ff'; CTX.shadowBlur=10;
    // Arrowhead
    CTX.beginPath();
    CTX.moveTo(cx,this.y); CTX.lineTo(this.x+this.width,this.y+this.height*0.7);
    CTX.lineTo(cx+6,this.y+this.height*0.55); CTX.lineTo(cx,this.y+this.height);
    CTX.lineTo(cx-6,this.y+this.height*0.55); CTX.lineTo(this.x,this.y+this.height*0.7);
    CTX.closePath(); CTX.fill();
    CTX.fillStyle='rgba(0,245,255,0.5)'; CTX.beginPath(); CTX.arc(cx,this.y+12,5,0,Math.PI*2); CTX.fill();
    CTX.shadowBlur=0; this.drawHealthBar();
  }
}

class SpinnerEnemy extends Enemy {
  constructor() { super(); this.x=Math.random()*(CANVAS.width-50); this.y=-50; this.width=50; this.height=50; this.speed=2; this.type='spinner'; this.health=2; this.maxHealth=2; this.shootInterval=1000; this.angle=0; this._rot=0; }
  draw() {
    this._rot=(this._rot||0)+0.04;
    const cx=this.x+this.width/2, cy=this.y+this.height/2;
    CTX.save(); CTX.translate(cx,cy); CTX.rotate(this._rot);
    CTX.fillStyle='#6600cc'; CTX.shadowColor='#aa00ff'; CTX.shadowBlur=12;
    // Spinning star
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      CTX.beginPath(); CTX.moveTo(0,0);
      CTX.arc(0,0,22,a,a+Math.PI/6); CTX.closePath(); CTX.fill();
    }
    CTX.fillStyle='#cc00ff'; CTX.shadowBlur=8;
    CTX.beginPath(); CTX.arc(0,0,10,0,Math.PI*2); CTX.fill();
    CTX.fillStyle='#ffff00'; CTX.shadowBlur=4;
    CTX.beginPath(); CTX.arc(0,0,5,0,Math.PI*2); CTX.fill();
    CTX.restore();
    CTX.shadowBlur=0; this.drawHealthBar();
  }
  shoot() {
    const cx=this.x+this.width/2, cy=this.y+this.height/2;
    for(let i=0;i<4;i++) { const a=this.angle+i*Math.PI/2; this.bullets.push(new EnemyBullet(cx,cy,Math.cos(a)*3,Math.sin(a)*3,'#aa00ff')); }
    this.angle+=Math.PI/8;
  }
}

class DiverEnemy extends Enemy {
  constructor(target) { super(); this.x=Math.random()*(CANVAS.width-40); this.y=-50; this.width=40; this.height=40; this.speed=3; this.type='diver'; this.target=target; this.isDiving=false; }
  update() {
    if(this.y<CANVAS.height/3&&!this.isDiving) { this.y+=this.speed; }
    else { this.isDiving=true; const tx=this.target.x+this.target.width/2, ty=this.target.y+this.target.height/2; const a=Math.atan2(ty-this.y,tx-this.x); this.x+=Math.cos(a)*this.speed*1.5; this.y+=Math.sin(a)*this.speed*1.5; }
  }
  draw() {
    const cx=this.x+this.width/2, cy=this.y+this.height/2;
    // Phase 1.3: dive trajectory telegraph (dashed line to target before diving)
    if(!this.isDiving && this.y > CANVAS.height/3 - 90 && this.target){
      const _tx = this.target.x + this.target.width/2;
      const _ty = this.target.y + this.target.height/2;
      CTX.save();
      CTX.strokeStyle='rgba(255,40,40,'+(0.4+0.4*Math.sin(Date.now()/90)).toFixed(2)+')';
      CTX.lineWidth=2; CTX.setLineDash([10,8]);
      CTX.beginPath(); CTX.moveTo(cx,cy); CTX.lineTo(_tx,_ty); CTX.stroke();
      CTX.setLineDash([]); CTX.restore();
    }
    const angle=this.isDiving&&this.target?Math.atan2((this.target.y-cy),(this.target.x-cx)):Math.PI/2;
    CTX.save(); CTX.translate(cx,cy); CTX.rotate(angle-Math.PI/2);
    CTX.fillStyle='#0000cc'; CTX.shadowColor='#4444ff'; CTX.shadowBlur=10;
    CTX.beginPath();
    CTX.moveTo(0,-18); CTX.lineTo(-14,16); CTX.lineTo(0,8); CTX.lineTo(14,16); CTX.closePath(); CTX.fill();
    CTX.fillStyle='rgba(100,100,255,0.4)';
    CTX.beginPath(); CTX.arc(0,-4,6,0,Math.PI*2); CTX.fill();
    CTX.restore();
    CTX.shadowBlur=0; this.drawHealthBar();
  }
}

class BomberEnemy extends Enemy {
  constructor() {
    super();
    this.width=44; this.height=44; this.health=2; this.maxHealth=2;
    this.type='bomber'; this.speed=2.5+Math.random();
  }
  update() { this.y+=this.speed; }
  draw() {
    const cx=this.x+this.width/2, cy=this.y+this.height/2;
    // Phase 1.3: blast-radius telegraph when near a player
    const _tp = nearestPlayer(cx,cy);
    if(_tp){
      const _d = Math.hypot((_tp.x+_tp.width/2)-cx,(_tp.y+_tp.height/2)-cy);
      if(_d < 210){
        const _p = 0.5 + 0.5*Math.sin(Date.now()/90);
        CTX.save();
        CTX.strokeStyle='rgba(255,50,30,'+(0.25+0.45*_p).toFixed(2)+')';
        CTX.lineWidth=2;
        CTX.beginPath(); CTX.arc(cx,cy,80,0,Math.PI*2); CTX.stroke();
        CTX.restore();
      }
    }
    CTX.fillStyle='#ff6600'; CTX.shadowColor='#ff4400'; CTX.shadowBlur=15;
    CTX.beginPath(); CTX.arc(cx,cy,18,0,Math.PI*2); CTX.fill();
    // Bomb fuse
    CTX.strokeStyle='#ffd700'; CTX.lineWidth=3;
    CTX.beginPath(); CTX.moveTo(cx+10,cy-12); CTX.quadraticCurveTo(cx+22,cy-28,cx+16,cy-36); CTX.stroke();
    // Fuse spark
    const spark=Date.now()/200%2>1;
    if(spark){CTX.fillStyle='#fff';CTX.beginPath();CTX.arc(cx+16,cy-36,4,0,Math.PI*2);CTX.fill();}
    CTX.fillStyle='rgba(0,0,0,0.6)'; CTX.font='bold 18px Arial'; CTX.textAlign='center'; CTX.textBaseline='middle';
    CTX.fillText('💣',cx,cy+1);
    CTX.shadowBlur=0; this.drawHealthBar();
  }
}

function createEnemy(type) {
  switch(type) {
    case 'ufo': return new UFO();
    case 'tank': return new TankEnemy();
    case 'fast': return new FastEnemy();
    case 'spinner': return new SpinnerEnemy();
    case 'unique': return new UniqueEnemy();
    case 'diver': return new DiverEnemy(pickLivePlayer());
    case 'bomber': return new BomberEnemy();
    default: return new Enemy();
  }
}

function pickLivePlayer() {
  const alive=State.players.filter(p=>p.lives>0);
  return alive[Math.floor(Math.random()*alive.length)]||State.players[0];
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 10 – XP ORB
// ═══════════════════════════════════════════════════════════════════
class XPOrb {
  constructor(x,y,value) {
    this.x=x; this.y=y; this.radius=5+value/5; this.value=value;
    this.color=`hsl(${value*20},100%,55%)`; this.pulse=0;
  }
  update() {
    this.pulse+=0.1;
    if(State.magnetRadius>0&&State.players[0]) {
      const p=State.players[0], dx=p.x+p.width/2-this.x, dy=p.y+p.height/2-this.y;
      if(Math.hypot(dx,dy)<State.magnetRadius) { const a=Math.atan2(dy,dx); this.x+=Math.cos(a)*4; this.y+=Math.sin(a)*4; return; }
    }
    this.y+=1;
  }
  draw() {
    const r=this.radius*(0.9+0.2*Math.sin(this.pulse));
    CTX.fillStyle=this.color; CTX.shadowColor=this.color; CTX.shadowBlur=12;
    CTX.globalAlpha=0.8; CTX.beginPath(); CTX.arc(this.x,this.y,r,0,Math.PI*2); CTX.fill();
    CTX.globalAlpha=1; CTX.shadowBlur=0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// OPEN WORLD EXPANSION: AllyShip Class
// ═══════════════════════════════════════════════════════════════════
class AllyShip {
  constructor(cfg) {
    this.type       = cfg.type;
    this.color      = cfg.color;
    this.speed      = cfg.speed;
    this.damage     = cfg.damage;
    this.health     = cfg.health;
    this.maxHealth  = cfg.health;
    this.fireRate   = cfg.fireRate;
    this.range      = cfg.range;
    this.label      = cfg.label;
    this.healsPlayer= cfg.healsPlayer || false;
    this.icon       = cfg.icon || 'A';
    this.x          = 0;
    this.y          = 0;
    this.width      = 24;
    this.height     = 24;
    this.lastShot   = 0;
    this.angle      = 0;
    this.offsetAngle= Math.random()*Math.PI*2;
    this.offsetDist = 60 + Math.random()*40;
    this.bullets    = [];
    this.stunned    = 0;
    this.dead       = false;
  }

  update() {
    if(this.dead) return;
    const p = State.players[0];
    if(!p) return;

    // Follow player in formation
    const t = Date.now()*0.001;
    this.offsetAngle += 0.005;
    const targetX = p.x + p.width/2 + Math.cos(this.offsetAngle)*this.offsetDist - this.width/2;
    const targetY = p.y + p.height/2 + Math.sin(this.offsetAngle)*this.offsetDist - this.height/2;
    this.x += (targetX - this.x)*0.08;
    this.y += (targetY - this.y)*0.08;

    // Heal player if healer type
    if(this.healsPlayer && p.lives < p.maxLives) {
      if(Date.now() - this.lastShot > 5000) {
        this.lastShot = Date.now();
        if(p.lives < 5) { p.lives = Math.min(p.lives+1, 5); showWaveAnnounce('+1 LIFE (HEALER)','#ff69b4'); }
      }
      return;
    }

    // Auto-shoot nearest enemy
    if(this.damage <= 0 || this.fireRate <= 0) return;
    if(Date.now() - this.lastShot < this.fireRate) return;
    if(this.stunned > Date.now()) return;

    let nearest = null, nearDist = this.range;
    State.enemies.forEach(e=>{
      const dx=(e.x+e.width/2)-(this.x+this.width/2);
      const dy=(e.y+e.height/2)-(this.y+this.height/2);
      const d=Math.hypot(dx,dy);
      if(d<nearDist){nearDist=d;nearest=e;}
    });
    if(State.boss) {
      const dx=(State.boss.x+State.boss.width/2)-(this.x+this.width/2);
      const dy=(State.boss.y+State.boss.height/2)-(this.y+this.height/2);
      const d=Math.hypot(dx,dy);
      if(d<this.range){nearest=State.boss;nearDist=d;}
    }
    if(!nearest) return;
    this.lastShot = Date.now();
    const dx=(nearest.x+nearest.width/2)-(this.x+this.width/2);
    const dy=(nearest.y+nearest.height/2)-(this.y+this.height/2);
    const ang = Math.atan2(dy,dx);
    State._allyBullets.push({
      x: this.x+this.width/2, y: this.y+this.height/2,
      vx: Math.cos(ang)*7, vy: Math.sin(ang)*7,
      damage: this.damage, color: this.color,
      width: 6, height: 6, life: 80,
    });
  }

  draw() {
    if(this.dead) return;
    const sx = this.x;
    const sy = this.y;
    CTX.save();
    CTX.translate(sx + this.width/2, sy + this.height/2);
    // Ship body
    CTX.fillStyle = this.color;
    CTX.shadowColor = this.color;
    CTX.shadowBlur = 12;
    CTX.beginPath();
    CTX.moveTo(0, -12);
    CTX.lineTo(-8, 8);
    CTX.lineTo(0, 4);
    CTX.lineTo(8, 8);
    CTX.closePath();
    CTX.fill();
    CTX.shadowBlur = 0;
    // Health bar
    const bw = 24, bh = 3;
    CTX.fillStyle = 'rgba(0,0,0,0.5)';
    CTX.fillRect(-bw/2, 14, bw, bh);
    CTX.fillStyle = this.health/this.maxHealth>0.5?'#39ff14':'#ff4444';
    CTX.fillRect(-bw/2, 14, bw*(this.health/this.maxHealth), bh);
    // Label
    CTX.fillStyle = 'rgba(255,255,255,0.5)';
    CTX.font = '7px Orbitron, monospace';
    CTX.textAlign = 'center';
    CTX.fillText(this.label, 0, 26);
    CTX.restore();
  }

  takeDamage(dmg) {
    this.health -= dmg;
    if(this.health <= 0) {
      this.dead = true;
      triggerExplosion(this.x+this.width/2, this.y+this.height/2, this.color, 20);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 11 – POWER-UP (IMPROVEMENT 9: better visuals)
// ═══════════════════════════════════════════════════════════════════
class PowerUp {
  constructor() {
    this.x=Math.random()*(CANVAS.width-36); this.y=-36;
    this.width=36; this.height=36; this.speed=2.5; this.anim=0;
    const r=Math.random();
    this.type=r<0.38?'life':r<0.75?'weapon':r<0.90?'shield':r<0.95?'double':'bomb';
    this.colors={life:'#ff006e',weapon:'#00f5ff',shield:'#39ff14',double:'#ff8800',bomb:'#cc00ff'};
    this.icons={life:'♥',weapon:'⚡',shield:'⛨',double:'✦',bomb:'💥'};
  }
  update() { this.y+=this.speed; this.anim+=0.08; }
  draw() {
    const cx=this.x+this.width/2, cy=this.y+this.height/2;
    const r=14+Math.sin(this.anim)*2;
    const c=this.colors[this.type];
    CTX.fillStyle=c; CTX.shadowColor=c; CTX.shadowBlur=20; CTX.globalAlpha=0.25;
    CTX.beginPath(); CTX.arc(cx,cy,r*1.4,0,Math.PI*2); CTX.fill();
    CTX.globalAlpha=0.9;
    CTX.beginPath(); CTX.arc(cx,cy,r,0,Math.PI*2); CTX.fill();
    CTX.globalAlpha=1; CTX.shadowBlur=0;
    CTX.fillStyle='#fff'; CTX.font='18px Arial'; CTX.textAlign='center'; CTX.textBaseline='middle';
    CTX.fillText(this.icons[this.type],cx,cy);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 12 – BOSS (IMPROVEMENT 10: rage mode at low HP)
// ═══════════════════════════════════════════════════════════════════
class Boss {
  constructor(level) {
    const data=BOSSES_DATA[level-1];
    this.level=level; this.name=data.name; this.subtitle=data.subtitle;
    this.x=CANVAS.width/2-(50+level*10); this.y=50;
    this.width=100+level*20; this.height=100+level*10;
    this.health=data.health; this.maxHealth=data.health;
    this.reward=data.reward; this.pattern=data.pattern;
    this.movement=data.movement; this.drawFn=data.draw;
    this.bullets=[]; this.lastShot=Date.now();
    this.shootInterval=Math.max(500,1500-level*100);
    this.animation=0; this.pulse=10;
    this.enraged=false; // IMPROVEMENT 10
    showBossIntro(level);
    // Show boss health bar
    document.getElementById('bossBarWrap').classList.add('visible');
    document.getElementById('bossNameEl').textContent=data.name;
    document.getElementById('bossFill').style.width='100%';
  }
  isEnraged() { return this.health/this.maxHealth < 0.3; }
  update() {
    this.animation+=0.05;
    if(this.isEnraged()&&!this.enraged) {
      this.enraged=true;
      // IMPROVEMENT 10: speed up when enraged
      this.shootInterval=Math.max(200,this.shootInterval*0.5);
      triggerExplosion(this.x+this.width/2,this.y+this.height/2,'#ff006e',40);
    }
    this.pulse=Math.sin(this.animation)*5+10;
    this._move();
    if(State.openWorldMode) {
      // In open world, clamp boss to a wider range around its spawn area
      const cw=CANVAS.width, ch=CANVAS.height;
      this.x=clamp(this.x,State.camera.x,State.camera.x+cw-this.width);
      this.y=clamp(this.y,State.camera.y,State.camera.y+ch/2-this.height);
    } else {
      this.x=clamp(this.x,0,CANVAS.width-this.width);
      this.y=clamp(this.y,0,CANVAS.height/2-this.height);
    }
    if(Date.now()-this.lastShot>this.shootInterval) { this.shoot(); this.lastShot=Date.now(); }
    // Phase 1.3: boss attack telegraph 800ms before next shot
    const _tt = this.shootInterval - (Date.now() - this.lastShot);
    if(_tt > 0 && _tt < 800){
      const _cx = this.x + this.width/2;
      const _by = this.y + this.height;
      const _k = 1 - _tt/800;
      CTX.save();
      CTX.strokeStyle='rgba(255,40,40,'+(0.2+0.5*_k).toFixed(2)+')';
      CTX.fillStyle  ='rgba(255,40,40,'+(0.05+0.12*_k).toFixed(2)+')';
      CTX.lineWidth=2; CTX.setLineDash([8,6]);
      CTX.beginPath();
      CTX.rect(_cx - 30 - 90*_k, _by, 60 + 180*_k, Math.max(40, CANVAS.height - _by));
      CTX.fill(); CTX.stroke();
      CTX.setLineDash([]); CTX.restore();
    }
    this.bullets=this.bullets.filter(b=>b.y<=CANVAS.height+State.camera.y);
    this.bullets.forEach(b=>{b.update();b.draw();});
    // Update health bar
    document.getElementById('bossFill').style.width=(this.health/this.maxHealth*100)+'%';
  }
  _move() {
    const now=Date.now(), rage=this.isEnraged()?1.8:1;
    switch(this.movement) {
      case 'horizontal': this.x+=Math.sin(now/500)*2*rage; break;
      case 'sinusoidal': this.x+=Math.sin(now/300)*3*rage; this.y+=Math.cos(now/800)*2; break;
      case 'teleport': if(now%3000<50) this.x=Math.random()*(CANVAS.width-this.width); this.x+=Math.sin(now/400)*2; break;
      case 'armored': if(this.health<this.maxHealth*0.3&&now%2000<100) this.y=100; this.x+=Math.sin(now/200)*3*rage; break;
      case 'chaotic': this.x+=(Math.random()-0.5)*4*rage; this.y+=Math.sin(now/500)*2; break;
      case 'zigzag': this.x+=Math.sin(now/250)*5*rage; this.y+=Math.sin(now/700)*2; break;
      case 'float_sink': this.y=50+Math.sin(now/1000)*30; break;
      case 'static_turret': this.x+=Math.sin(now/1500)*0.5; this.y+=Math.cos(now/1200)*0.5; break;
      case 'gravity': this.x+=(CANVAS.width/2-(this.x+this.width/2))*0.005*rage; this.y+=(CANVAS.height/4-(this.y+this.height/2))*0.005; break;
      case 'adaptive': { const t=pickLivePlayer(); if(t){const a=Math.atan2(t.y-this.y,t.x-this.x); this.x+=Math.cos(a)*2*rage; this.y+=Math.sin(a)*1.5; } break; }
      case 'genesis': { const t=pickLivePlayer(); if(t){const a=Math.atan2(t.y-this.y,t.x-this.x); this.x+=Math.cos(a)*3.5*rage; this.y+=Math.sin(a)*2.5; } this.x+=(Math.random()-0.5)*4*rage; break; }
    }
  }
  shoot() {
    const cx=this.x+this.width/2, bot=this.y+this.height, cy=this.y+this.height/2;
    const rage=this.isEnraged();
    switch(this.pattern) {
      case 'triple':
        [cx,this.x+20,this.x+this.width-20].forEach(x=>this.bullets.push(new EnemyBullet(x,bot,0,rage?6:4)));
        break;
      case 'fan':
        for(let i=0;i<(rage?7:5);i++) this.bullets.push(new EnemyBullet(cx,bot,(i-(rage?3:2))*1.5,4));
        break;
      case 'circle': {
        const base=Date.now()/500;
        for(let i=0;i<(rage?12:8);i++) { const a=(i/(rage?12:8))*Math.PI*2+base; this.bullets.push(new EnemyBullet(cx,cy,Math.cos(a)*3,Math.sin(a)*3)); }
        break;
      }
      case 'burst':
        for(let i=0;i<3;i++) scheduleEvent(i*300,()=>this.bullets.push(new EnemyBullet(cx,bot,(Math.random()-0.5)*2,rage?7:5)));
        break;
      case 'spiral': {
        const sa=Date.now()/200;
        for(let i=0;i<3;i++) { const a=sa+(i/3)*Math.PI*2; this.bullets.push(new EnemyBullet(cx,cy,Math.cos(a)*4,Math.sin(a)*4)); if(i%2===0){this.bullets.push(new EnemyBullet(cx,bot,0,rage?8:6));this.bullets.push(new EnemyBullet(cx,bot,-3,rage?8:6));this.bullets.push(new EnemyBullet(cx,bot,3,rage?8:6));} }
        break;
      }
      case 'fireball': { const count=3+Math.floor(this.level/2)+(rage?2:0); for(let i=0;i<count;i++){const a=Math.random()*Math.PI-Math.PI/2; this.bullets.push(new EnemyBullet(cx,cy,Math.cos(a)*5,Math.abs(Math.sin(a))*5,'#ff4500'));} break; }
      case 'ice_shard': { const count=4+Math.floor(this.level/2)+(rage?2:0); for(let i=0;i<count;i++) this.bullets.push(new EnemyBullet(cx,bot,(Math.random()-0.5)*2,3,'#00bfff')); break; }
      case 'laser_grid': { const count=3+Math.floor(this.level/3)+(rage?2:0); for(let i=0;i<count;i++) scheduleEvent(i*200,()=>this.bullets.push(new EnemyBullet(this.x+(this.width/(count+1))*(i+1),bot,0,5,'#39ff14'))); break; }
      case 'black_hole': this.bullets.push(new EnemyBullet(cx,cy,0,1.5,'#aa00ff')); break;
      case 'ultimate':
        ['spiral','fan','burst','triple'].forEach((p,i)=>scheduleEvent(i*400,()=>{this.pattern=p;})); break;
      case 'amalgam': {
        // Cycle through random existing patterns every 3 shots
        const patterns=['triple','fan','circle','burst','spiral','fireball','ice_shard','laser_grid','black_hole'];
        const chosen=patterns[Math.floor(Date.now()/2000)%patterns.length];
        const saved=this.pattern; this.pattern=chosen; this.shoot(); this.pattern=saved;
        break;
      }
      case 'genesis': {
        // Combo: circle + spiral bullets + spawn 2 extra enemies
        const cx2=this.x+this.width/2, cy2=this.y+this.height/2;
        const base=Date.now()/300;
        for(let i=0;i<16;i++){const a=(i/16)*Math.PI*2+base; this.bullets.push(new EnemyBullet(cx2,cy2,Math.cos(a)*4,Math.sin(a)*4,'#ff00ff'));}
        for(let i=0;i<4;i++){const a=base+(i/4)*Math.PI*2; this.bullets.push(new EnemyBullet(cx2,cy2,Math.cos(a)*6,Math.sin(a)*6,'#ffd700'));}
        if(State.enemies.length<10){State.enemies.push(createEnemy('ufo'));State.enemies.push(createEnemy('fast'));}
        break;
      }
    }
  }
  draw() {
    // IMPROVEMENT 10: red glow when enraged
    if(this.isEnraged()) {
      CTX.shadowColor='#ff006e'; CTX.shadowBlur=30;
    }
    if(this.drawFn) this.drawFn(this);
    CTX.shadowBlur=0;
    // Health bar ON canvas
    CTX.fillStyle='rgba(0,0,0,0.5)'; CTX.fillRect(this.x,this.y-15,this.width,8);
    CTX.fillStyle=this.isEnraged()?'#ff006e':'#39ff14';
    CTX.fillRect(this.x,this.y-15,(this.health/this.maxHealth)*this.width,8);
  }
}

// ─ Boss draw functions ─
function drawBossGuardian(b) { CTX.fillStyle='#6600bb'; CTX.beginPath(); CTX.roundRect(b.x,b.y,b.width,b.height,[b.pulse]); CTX.fill(); }
function drawBossCannon(b) { CTX.fillStyle='#8b0000'; CTX.beginPath(); CTX.arc(b.x+b.width/2,b.y+b.height/2,b.width/2,0,Math.PI*2); CTX.fill(); CTX.fillStyle='#cc2222'; CTX.beginPath(); CTX.arc(b.x+b.width/4,b.y+b.height/2,b.width/8,0,Math.PI*2); CTX.arc(b.x+b.width*3/4,b.y+b.height/2,b.width/8,0,Math.PI*2); CTX.fill(); }
function drawBossVortex(b) { CTX.fillStyle='#001a66'; CTX.beginPath(); CTX.roundRect(b.x,b.y,b.width,b.height,[b.pulse]); CTX.fill(); CTX.fillStyle='#0066ff'; CTX.fillRect(b.x+b.width/4,b.y+b.height/4,b.width/2,b.height/2); }
function drawBossTank(b) { CTX.fillStyle='#1a3d1a'; CTX.fillRect(b.x,b.y,b.width,b.height); CTX.fillStyle='#2d7a2d'; CTX.fillRect(b.x+b.width/8,b.y-10,b.width*3/4,20); CTX.fillStyle='#666'; CTX.fillRect(b.x,b.y+b.height-10,b.width,10); }
function drawBossWorld(b) { CTX.fillStyle='#cc4400'; CTX.beginPath(); CTX.arc(b.x+b.width/2,b.y+b.height/2,b.width/2,0,Math.PI*2); CTX.fill(); CTX.fillStyle='#ff3300'; CTX.beginPath(); CTX.ellipse(b.x+b.width/2,b.y+b.height/2,b.width/4,b.height/4,b.animation*2,0,Math.PI*2); CTX.fill(); }
function drawBossInferno(b) { CTX.fillStyle='#8b1a00'; CTX.fillRect(b.x,b.y,b.width,b.height); CTX.fillStyle='#ff6600'; CTX.beginPath(); CTX.moveTo(b.x+b.width/4,b.y+b.height); CTX.lineTo(b.x+b.width/2,b.y+b.height+20); CTX.lineTo(b.x+b.width*3/4,b.y+b.height); CTX.closePath(); CTX.fill(); }
function drawBossGlacier(b) { CTX.fillStyle='#4fc3f7'; CTX.beginPath(); CTX.moveTo(b.x,b.y+b.height); CTX.lineTo(b.x+b.width/2,b.y); CTX.lineTo(b.x+b.width,b.y+b.height); CTX.closePath(); CTX.fill(); CTX.fillStyle='rgba(255,255,255,0.4)'; CTX.fillRect(b.x+b.width/4,b.y+b.height/2,b.width/2,b.height/4); }
function drawBossCyber(b) { CTX.fillStyle='#333'; CTX.fillRect(b.x,b.y,b.width,b.height); CTX.fillStyle='#39ff14'; CTX.fillRect(b.x+b.width/4,b.y+b.height/4,b.width/2,b.height/2); CTX.fillStyle='#ff3333'; CTX.beginPath(); CTX.arc(b.x+b.width/2,b.y+b.height/2,b.width/8,0,Math.PI*2); CTX.fill(); }
function drawBossVoid(b) { CTX.fillStyle='#000'; CTX.beginPath(); CTX.arc(b.x+b.width/2,b.y+b.height/2,b.width/2,0,Math.PI*2); CTX.fill(); CTX.strokeStyle='#7b2fff'; CTX.lineWidth=3; CTX.beginPath(); CTX.arc(b.x+b.width/2,b.y+b.height/2,b.width/2-5,b.animation,b.animation+Math.PI*1.5); CTX.stroke(); }
function drawBossRafa(b) {
  const grad=CTX.createLinearGradient(b.x,b.y,b.x+b.width,b.y+b.height);
  grad.addColorStop(0,'#ffd700'); grad.addColorStop(1,'#ff8c00');
  CTX.fillStyle=grad; CTX.shadowColor='#ffd700'; CTX.shadowBlur=20;
  CTX.beginPath(); CTX.moveTo(b.x+b.width/2,b.y); CTX.lineTo(b.x,b.y+b.height); CTX.lineTo(b.x+b.width/2,b.y+b.height/2); CTX.lineTo(b.x+b.width,b.y+b.height); CTX.closePath(); CTX.fill();
  CTX.shadowBlur=0; CTX.fillStyle='#00f5ff'; CTX.font='bold 26px Orbitron,monospace';
  CTX.textAlign='center'; CTX.textBaseline='middle'; CTX.fillText('RP',b.x+b.width/2,b.y+b.height/2);
}
function drawBossAmalgam(b) {
  const cx=b.x+b.width/2, cy=b.y+b.height/2;
  // Multi-colored body sections from previous bosses
  const cols=['#6600bb','#8b0000','#001a66','#1a3d1a','#cc4400','#8b1a00','#4fc3f7','#333','#000','#ffd700'];
  const sw=b.width/5, sh=b.height/2;
  for(let i=0;i<5;i++){
    CTX.fillStyle=cols[i*2%cols.length];
    CTX.fillRect(b.x+i*sw, b.y, sw, sh);
    CTX.fillStyle=cols[(i*2+1)%cols.length];
    CTX.fillRect(b.x+i*sw, b.y+sh, sw, sh);
  }
  // Glowing center
  CTX.fillStyle='#fff'; CTX.shadowColor='#fff'; CTX.shadowBlur=20;
  CTX.beginPath(); CTX.arc(cx,cy,b.pulse+5,0,Math.PI*2); CTX.fill();
  CTX.shadowBlur=0;
  // Orbiting particles
  for(let i=0;i<6;i++){
    const a=b.animation*2+i*(Math.PI/3);
    CTX.fillStyle=cols[i]; CTX.beginPath();
    CTX.arc(cx+Math.cos(a)*b.width*0.45,cy+Math.sin(a)*b.height*0.35,6,0,Math.PI*2); CTX.fill();
  }
}
function drawBossGenesis(b) {
  const cx=b.x+b.width/2, cy=b.y+b.height/2;
  // Golden/purple gradient body
  const grad=CTX.createRadialGradient(cx,cy,10,cx,cy,b.width/2);
  grad.addColorStop(0,'#ffe066'); grad.addColorStop(0.5,'#aa00ff'); grad.addColorStop(1,'#220044');
  CTX.fillStyle=grad; CTX.shadowColor='#ff00ff'; CTX.shadowBlur=25;
  // Multi-pointed star shape
  CTX.beginPath();
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2+b.animation;
    const r=i%2===0?b.width/2:b.width/4;
    i===0?CTX.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):CTX.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
  }
  CTX.closePath(); CTX.fill();
  CTX.shadowBlur=0;
  // Chromatic glitch lines
  const glitch=Math.sin(Date.now()/200)*4;
  CTX.fillStyle='rgba(0,255,255,0.3)';
  CTX.fillRect(b.x+glitch,b.y+b.height/3,b.width,b.height/6);
  CTX.fillStyle='rgba(255,0,255,0.3)';
  CTX.fillRect(b.x-glitch,b.y+b.height/2,b.width,b.height/8);
  // Core eye
  CTX.fillStyle='#fff'; CTX.shadowColor='#fff'; CTX.shadowBlur=30;
  CTX.beginPath(); CTX.arc(cx,cy,b.pulse*0.7,0,Math.PI*2); CTX.fill();
  CTX.fillStyle='#000';
  CTX.beginPath(); CTX.arc(cx,cy,b.pulse*0.3,0,Math.PI*2); CTX.fill();
  CTX.shadowBlur=0;
}

