// ==================== ENEMIGOS, DISPAROS Y JEFES ====================

var enemies = [];
var enemyShots = [];
var bossLive = false;
var lastBossTier = -1;
var boomRings = [];
var WHIP_REACH = 64;

function resetEnemies() {
  enemies = [];
  enemyShots = [];
  bossLive = false;
  lastBossTier = -1;
  boomRings = [];
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (edge === 0) { x = Math.random() * W; y = -18; }
  if (edge === 1) { x = W + 18; y = Math.random() * H; }
  if (edge === 2) { x = Math.random() * W; y = H + 18; }
  if (edge === 3) { x = -18; y = Math.random() * H; }
  const sc = enemyScale();
  const roll = Math.random();
  const hit = basicHit();
  let kind = 'normal';
  if (roll < 0.272) kind = 'shooter';
  else if (roll < 0.552) kind = 'whip';
  const mult = kind === 'whip' ? 1.2 : (kind === 'shooter' ? 1.8 : 1.6);
  const hp = mult * hit * sc.hp;
  const spd = (kind === 'whip' ? 96 : (kind === 'shooter' ? 44 : 34)) * sc.spd;
  enemies.push({
    x:x, y:y,
    r: kind === 'whip' ? 10 : (kind === 'shooter' ? 13 : 12),
    hp:hp, max:hp, spd:spd, kind:kind,
    shoot: 0.45 + Math.random() * 0.4, dmg: sc.dmg, flash:0, whip:0
  });
}

function spawnBoss() {
  if (bossLive) return;
  const sc = enemyScale();
  const hp = Math.round(26 * sc.hp);
  enemies.push({
    x: W / 2, y: -30, r: 28, hp:hp, max:hp,
    spd: 36 * sc.spd, kind: 'boss', shoot: 0.6, dmg: 1.4 * sc.dmg, big: true
  });
  bossLive = true;
  banner('JEFE');
  beep(90, 0.28, 'sawtooth', 0.07);
}

function maybeBoss() {
  const t = tier();
  if (aliveTime >= WAVE && t > lastBossTier) {
    lastBossTier = t;
    spawnBoss();
  }
}

function enemyFire(e, spread) {
  const a = Math.atan2(player.y - e.y, player.x - e.x);
  const n = spread || 1;
  const step = 0.18;
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const aa = a + (i - mid) * step;
    enemyShots.push({
      x:e.x, y:e.y,
      vx: Math.cos(aa) * (e.kind === 'boss' ? 150 : 170),
      vy: Math.sin(aa) * (e.kind === 'boss' ? 150 : 170),
      r: e.kind === 'boss' ? 6 : 4,
      dmg: e.dmg,
      life: 2.2
    });
  }
}

function updateEnemies(dt) {
  maybeBoss();
  enemies.forEach(function(e){
    const dx = player.x - e.x, dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    let want = e.spd;
    if (e.kind === 'shooter' && dist < 170) want = dist < 120 ? -e.spd * 0.4 : 0;
    if (e.kind === 'boss' && dist < 140) want = 0;
    if (e.kind === 'whip' && dist < WHIP_REACH - 14) want = 0;
    e.x += (dx / dist) * want * dt;
    e.y += (dy / dist) * want * dt;
    e.shoot -= dt;
    e.flash = Math.max(0, (e.flash||0) - dt);
    e.whip = Math.max(0, (e.whip||0) - dt);
    if (e.kind === 'shooter' && e.shoot <= 0 && dist < 280) {
      e.shoot = 1.55;
      enemyFire(e, 1);
    }
    if (e.kind === 'boss' && e.shoot <= 0) {
      e.shoot = 1.15;
      enemyFire(e, 3);
    }
    if (e.kind === 'whip' && dist < WHIP_REACH && e.shoot <= 0) {
      e.shoot = 0.85;
      e.whip = 0.16;
      hurt(20);
    }
    if (e.kind !== 'whip' && Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r - 2) hurt(e.kind === 'boss' ? 20 : 10);
  });

  enemyShots.forEach(function(s){
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (Math.hypot(s.x - player.x, s.y - player.y) < s.r + player.r - 2) {
      s.life = 0;
      hurt(10);
    }
  });
  enemyShots = enemyShots.filter(function(s){
    return s.life > 0 && s.x > -30 && s.x < W + 30 && s.y > -30 && s.y < H + 30;
  });
}

function hitEnemy(e, dmg) {
  e.hp -= dmg;
  e.flash = 0.12;
  flashAt(e.x, e.y, e.r + 6, 'rgba(255,255,255,.9)');
  particles.push({ x:e.x, y:e.y, vx:(Math.random()-0.5)*40, vy:(Math.random()-0.5)*40, life:0.25, c:'#fff', s:3 });
  if (e.hp > 0) return;
  unlock('alien');
  if (e.kind === 'boss') {
    bossLive = false;
    unlock('acech');
    for (let i = 0; i < 6; i++) gems.push({ kind:'gem', x:e.x + (Math.random()-0.5)*20, y:e.y, v:1, r:7 });
    if (Math.random() < 0.35) gems.push(rollDrop(e.x, e.y));
  } else if (Math.random() < 0.88) {
    gems.push(rollDrop(e.x, e.y));
  }
  enemies.splice(enemies.indexOf(e), 1);
}

function rollDrop(x, y) {
  const roll = Math.random();
  if (roll < 0.05) return { kind:'heal', x:x, y:y, v:0, r:8 };
  if (roll < 0.09) return { kind:'bomb', x:x, y:y, v:0, r:8 };
  if (roll < 0.12) return { kind:'magnet', x:x, y:y, v:0, r:8 };
  return { kind:'gem', x:x, y:y, v:1, r:6 };
}

function boom(x, y) {
  const boomDmg = Math.max(1, dmgNow() * 1.5);
  const reach = 260;
  boomRings.push({ x:x, y:y, reach:reach, life:0.42, max:0.42 });
  enemies.slice().forEach(function(en){
    if (Math.hypot(en.x - x, en.y - y) < reach) hitEnemy(en, boomDmg);
  });
  for (let i = 0; i < 16; i++) {
    particles.push({ x:x, y:y, vx:(Math.random()-0.5)*320, vy:(Math.random()-0.5)*320, life:0.55, c:'#ff8844', s:6 });
  }
  beep(90, 0.18, 'sawtooth', 0.07);
}

function tickBoomRings(dt) {
  boomRings.forEach(function(b){ b.life -= dt; });
  boomRings = boomRings.filter(function(b){ return b.life > 0; });
}

function drawBoomRings() {
  boomRings.forEach(function(b){
    const t = 1 - b.life / b.max;
    const r = 16 + (b.reach - 16) * t;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,136,50,' + (0.95 * (1 - t)) + ')';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x, b.y, Math.max(8, r * 0.7), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,220,120,' + (0.7 * (1 - t)) + ')';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}
