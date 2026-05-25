// ═══════════════════════════════════════════════════════════════════
// SECTION 4 – BACKGROUND (IMPROVEMENT 3: animated neon grid)
// ═══════════════════════════════════════════════════════════════════
let gridOffset = 0;
function drawBackground() {
  BGCTX.clearRect(0,0,BGCANVAS.width,BGCANVAS.height);
  // Pick theme based on current mode
  const themeIdx = State.openWorldMode ? (State.currentSector||0) : Math.max(0,Math.min((State.gameLevel-1),PHASE_THEMES.length-1));
  const theme = PHASE_THEMES[themeIdx] || PHASE_THEMES[0];
  // Dark base
  BGCTX.fillStyle = theme.bg;
  BGCTX.fillRect(0,0,BGCANVAS.width,BGCANVAS.height);
  // Scrolling grid
  const gs = 60;
  gridOffset = (gridOffset + 0.3) % gs;
  BGCTX.strokeStyle = theme.grid;
  BGCTX.lineWidth = 1;
  for (let x=0; x<BGCANVAS.width; x+=gs) {
    BGCTX.beginPath(); BGCTX.moveTo(x,0); BGCTX.lineTo(x,BGCANVAS.height); BGCTX.stroke();
  }
  for (let y=-gs+gridOffset; y<BGCANVAS.height; y+=gs) {
    BGCTX.beginPath(); BGCTX.moveTo(0,y); BGCTX.lineTo(BGCANVAS.width,y); BGCTX.stroke();
  }
  // Nebula effect
  const grad = BGCTX.createRadialGradient(BGCANVAS.width*0.7, BGCANVAS.height*0.3, 0, BGCANVAS.width*0.7, BGCANVAS.height*0.3, 300);
  grad.addColorStop(0, theme.accent);
  grad.addColorStop(1,'transparent');
  BGCTX.fillStyle = grad;
  BGCTX.fillRect(0,0,BGCANVAS.width,BGCANVAS.height);
}

// ─ Stars (on game canvas)
function initStars() {
  State.stars = Array.from({length:180},()=>({
    x:Math.random()*CANVAS.width, y:Math.random()*CANVAS.height,
    size:Math.random()*2+0.5, speed:Math.random()*0.6+0.1,
    alpha:Math.random()*0.6+0.2,
    twinkle:Math.random()*Math.PI*2,
  }));
}
function drawStars() {
  const themeIdx = State.openWorldMode ? (State.currentSector||0) : Math.max(0,Math.min((State.gameLevel-1),PHASE_THEMES.length-1));
  const theme = PHASE_THEMES[themeIdx] || PHASE_THEMES[0];
  const starColor = theme.star || '#ffffff';
  State.stars.forEach(s => {
    s.twinkle += 0.02;
    const a = s.alpha * (0.7 + 0.3*Math.sin(s.twinkle));
    CTX.globalAlpha = a;
    CTX.fillStyle = starColor;
    CTX.beginPath(); CTX.arc(s.x,s.y,s.size,0,Math.PI*2); CTX.fill();
    if (!State.openWorldMode) {
      s.y += s.speed;
      if (s.y > CANVAS.height) { s.y=0; s.x=Math.random()*CANVAS.width; }
    }
  });
  CTX.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 5 – PARTICLES (IMPROVEMENT 4: colored trail particles)
// ═══════════════════════════════════════════════════════════════════
class Particle {
  constructor(x,y,color) {
    this.x=x; this.y=y;
    this.size = rand(2,6);
    this.vx = (Math.random()-0.5)*9;
    this.vy = (Math.random()-0.5)*9;
    this.color = color; this.alpha = 1;
  }
  update() { this.x+=this.vx; this.y+=this.vy; this.vx*=0.97; this.vy*=0.97; this.alpha-=0.018; }
  draw() {
    CTX.globalAlpha = this.alpha;
    CTX.fillStyle = this.color;
    CTX.shadowColor = this.color; CTX.shadowBlur = 6;
    CTX.beginPath(); CTX.arc(this.x,this.y,this.size,0,Math.PI*2); CTX.fill();
    CTX.shadowBlur = 0; CTX.globalAlpha = 1;
  }
  get alive() { return this.alpha > 0; }
}

class Explosion {
  constructor(x,y,color='#ff6600',count=25) {
    this.particles = Array.from({length:count},()=>new Particle(x,y,color));
  }
  update() { this.particles.forEach(p=>p.update()); this.particles=this.particles.filter(p=>p.alive); }
  draw()   { this.particles.forEach(p=>p.draw()); }
  get alive() { return this.particles.length > 0; }
}

function triggerExplosion(x,y,color='#ff6600',count=25) {
  const c = fxHighQuality ? count : Math.max(6, Math.floor(count * 0.4));
  // Phase 2.2: cap concurrent legacy Explosion objects (~200 particles ceiling)
  if(State.explosions.length >= 24) State.explosions.shift();
  State.explosions.push(new Explosion(x,y,color,c));
  playSound('explosionSound');
  // IMPROVEMENT 2: screen shake
  addTrauma(0.15);
}

// ─ Floating text (Phase 1.6: size-aware + ease-out)
class FloatingText {
  constructor(x,y,text,color='#ffd60a') {
    this.x=x; this.y=y; this.text=text; this.color=color;
    this.alpha=1; this.vy=-1.8; this.size=16; this.life=1;
  }
  update() { this.y+=this.vy; this.vy*=0.94; this.life-=0.022; this.alpha=Math.min(1,this.life*this.life*1.7); }
  draw() {
    CTX.globalAlpha = this.alpha;
    CTX.fillStyle = this.color;
    CTX.font = 'bold '+this.size+'px Orbitron, monospace';
    CTX.textAlign = 'center';
    CTX.shadowColor = this.color; CTX.shadowBlur = 8;
    CTX.fillText(this.text, this.x, this.y);
    CTX.shadowBlur = 0; CTX.globalAlpha = 1;
  }
  get alive() { return this.life > 0; }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 6 – BULLETS
// ═══════════════════════════════════════════════════════════════════
class PlayerBullet {
  constructor(x,y,color='#39ff14',angleOffset=0,dmgMult=1,direction=-1) {
    this.x=x; this.y=y;
    this.width=5; this.height=16;
    this.speed=11; this.color=color;
    this.angleOffset=angleOffset; this.damage=1*dmgMult;
    this.direction=direction; // -1=up (normal), +1=down (PvP P2)
    this.vx=0; this.vy=0; this._freeAim=false;
    this._originX=x; this._originY=y;
  }
  update() {
    if(this._freeAim) { this.x+=this.vx; this.y+=this.vy; }
    else { this.y+=this.direction*this.speed; this.x+=this.angleOffset*3; }
  }
  draw() {
    // glowing bullets with gradient; flip gradient for downward bullets
    const y0 = this.direction>0 ? this.y : this.y+this.height;
    const y1 = this.direction>0 ? this.y+this.height : this.y;
    const grad = CTX.createLinearGradient(this.x,y0,this.x,y1);
    grad.addColorStop(0,'transparent'); grad.addColorStop(1,this.color);
    CTX.fillStyle = grad;
    CTX.shadowColor = this.color; CTX.shadowBlur = 8;
    CTX.fillRect(this.x,this.y,this.width,this.height);
    CTX.fillStyle = '#fff'; CTX.globalAlpha = 0.8;
    CTX.fillRect(this.x+1,this.direction>0?this.y+this.height-4:this.y,2,4);
    CTX.globalAlpha = 1; CTX.shadowBlur = 0;
  }
}

class EnemyBullet {
  constructor(x,y,vx=0,vy=4,color='#ffff00') {
    this.x=x; this.y=y; this.width=5; this.height=10;
    this.vx=vx; this.vy=vy; this.color=color;
  }
  update() { this.x+=this.vx; this.y+=this.vy; }
  draw() {
    CTX.fillStyle = this.color;
    CTX.shadowColor = this.color; CTX.shadowBlur = 5;
    CTX.fillRect(this.x,this.y,this.width,this.height);
    CTX.shadowBlur = 0;
  }
}

function drawLaser(cx,c1,c2,c3) {
  const grad = CTX.createLinearGradient(cx,CANVAS.height,cx,0);
  grad.addColorStop(0,c1); grad.addColorStop(0.5,c2); grad.addColorStop(1,c3);
  CTX.fillStyle = grad; CTX.fillRect(cx-5,0,10,CANVAS.height);
  CTX.fillStyle = 'rgba(255,255,255,0.2)'; CTX.fillRect(cx-12,0,24,CANVAS.height);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 7 – ALLY ROBOT
// ═══════════════════════════════════════════════════════════════════
class AllyRobot {
  constructor(x,y,bulletColor) {
    this.x=x; this.y=y; this.width=28; this.height=36;
    this.speed=3; this.dir=Math.random()>0.5?1:-1;
    this.bullets=[]; this.lastShot=Date.now(); this.bulletColor=bulletColor;
  }
  update() {
    this.x+=this.speed*this.dir;
    if(this.x<=0||this.x+this.width>=CANVAS.width) this.dir*=-1;
    if(Date.now()-this.lastShot>900) { this.shoot(); this.lastShot=Date.now(); }
    this.bullets=this.bullets.filter(b=>b.y+b.height>=0);
    this.bullets.forEach(b=>{b.update();b.draw();});
  }
  draw() {
    const cx=this.x+this.width/2;
    // Body
    CTX.fillStyle='#7a8fa8'; CTX.shadowColor=this.bulletColor; CTX.shadowBlur=8;
    CTX.fillRect(this.x+3,this.y+6,this.width-6,this.height-6);
    // Head
    CTX.fillStyle='#5a6e84';
    CTX.fillRect(this.x+5,this.y,this.width-10,10);
    // Dual cannons
    CTX.fillStyle=this.bulletColor; CTX.shadowBlur=6;
    CTX.fillRect(this.x+4,this.y-8,5,10);
    CTX.fillRect(this.x+this.width-9,this.y-8,5,10);
    // Eye
    CTX.fillStyle='#fff'; CTX.fillRect(cx-4,this.y+2,8,5);
    CTX.fillStyle=this.bulletColor; CTX.beginPath(); CTX.arc(cx,this.y+4.5,2.5,0,Math.PI*2); CTX.fill();
    CTX.shadowBlur=0;
  }
  shoot() {
    this.bullets.push(new PlayerBullet(this.x+this.width/2,this.y,this.bulletColor));
    playSound('shootSound');
  }
}

