// ==================== LOOP, COMBATE Y PANTALLAS ====================

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

function setScreen(name) {
  screen = name;
  ['menu','over','level','shop','gal','lib','hud','bar','pad'].forEach(function(n){
    const el = document.getElementById(n);
    if (!el) return;
    const show = n === name || (name === 'play' && (n === 'hud' || n === 'bar' || n === 'pad'));
    el.classList.toggle('hidden', !show);
  });
}

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60);
}

function banner(text) {
  const el = document.getElementById('banner');
  el.textContent = text;
  el.classList.remove('hidden');
  bannerT = 2.2;
}

function hud() {
  document.getElementById('time').textContent = fmt(aliveTime);
  document.getElementById('hp').textContent = Math.max(0, Math.ceil(player ? player.hp : 0));
  document.getElementById('runGems').textContent = runGems;
  document.getElementById('lifeGems').textContent = save.gems;
  document.getElementById('xp').style.width = Math.min(100, (xp / xpNeed) * 100) + '%';
  refreshItems();
  if (bannerT > 0) bannerT -= 0.016;
  else document.getElementById('banner').classList.add('hidden');
}

function skin() {
  return save.skin === 'piel' ? { a:'#ff4fd8', b:'#39ff14' } : { a:'#7af7ff', b:'#1a3a55' };
}

function flashAt(x, y, r, color) {
  flashes.push({ x:x, y:y, r:r, life:0.16, color:color });
}
function hurt(n) {
  if (!player || player.ifr > 0) return;
  player.hp -= n;
  player.ifr = 0.6;
  player.hitFlash = 0.2;
  flashAt(player.x, player.y, 26, 'rgba(255,70,90,.95)');
  beep(140, 0.12, 'sawtooth', 0.06);
  if (player.hp <= 0) endRun();
}

function endRun() {
  setScreen('over');
  document.getElementById('fTime').textContent = fmt(aliveTime);
  document.getElementById('fRun').textContent = runGems;
  document.getElementById('fLife').textContent = save.gems;
  beep(90, 0.3, 'triangle', 0.07);
}

function shootAt(target) {
  const a = Math.atan2(target.y - player.y, target.x - player.x);
  const n = 1 + Math.min(2, spreadNow()) * 2;
  const step = 0.22;
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const aa = a + (i - mid) * step;
    shots.push({ x:player.x, y:player.y, vx:Math.cos(aa)*280, vy:Math.sin(aa)*280, r:4, dmg:dmgNow(), life:1.2, c:'#00ffff' });
  }
  unlock('shot');
  beep(480, 0.04, 'square', 0.03);
}

function nearest() {
  let best = null, bd = 1e9;
  enemies.forEach(function(e){
    const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    if (d < bd) { bd = d; best = e; }
  });
  return best;
}

function offerLevel() {
  const mods = player.mods;
  const pool = [
    { id:'mag', name:'Atracción', desc:'Imán de gemas esta partida' },
    { id:'heal', name:'Cura', desc:'Recupera 30 de vida' }
  ];
  if ((mods.dmg||0) + owned('dano') < dmgCap()) {
    pool.unshift({ id:'dmg', name:'Filo', desc:'Daño '+((mods.dmg||0)+1)+' / techo '+dmgCap() });
  }
  if ((mods.spread||0) < 2) {
    pool.splice(1, 0, { id:'spread', name:'Amplitud', desc:(mods.spread||0) === 0 ? 'Abre a 3, uno al centro' : 'Abre a 5, uno al centro' });
  }
  if ((mods.rate||0) < rateCap()) {
    pool.splice(1, 0, { id:'rate', name:'Cadencia', desc:'Más seguido. Techo '+rateCap() });
  }
  const picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]);
  const box = document.getElementById('picks');
  box.innerHTML = '';
  picks.forEach(function(p){
    const b = document.createElement('button');
    b.className = 'pick';
    b.innerHTML = '<b>'+p.name+'</b><br><span style="color:#9499c7">'+p.desc+'</span>';
    b.onclick = function(){ applyPick(p.id); };
    box.appendChild(b);
  });
  setScreen('level');
  beep(540, 0.1, 'square', 0.05);
}

function applyPick(id) {
  if (!player.mods) player.mods = { dmg:0, rate:0, mag:0, spread:0 };
  if (id === 'dmg' && owned('dano') + player.mods.dmg < dmgCap()) player.mods.dmg += 1;
  if (id === 'rate') player.mods.rate = Math.min(rateCap(), (player.mods.rate||0) + 1);
  if (id === 'spread') player.mods.spread = Math.min(2, (player.mods.spread||0) + 1);
  if (id === 'mag') player.mods.mag += 28;
  if (id === 'heal') player.hp = Math.min(player.maxHp, player.hp + 30);
  setScreen('play');
}

function startRun() {
  initAudio();
  player = {
    x:300, y:300, r:14, hp:maxHp(), maxHp:maxHp(),
    ang:0, ifr:0, shoot:0.25, cone:0.5,
    mods:{ dmg:0, rate:0, mag:0, spread:0 },
    heal:0, bombs:0, hitFlash:0, healFlash:0
  };
  flashes = [];
  gems = []; shots = []; particles = []; orbs = [];
  if (owned('orbe')) orbs = [{ a:0 }, { a:Math.PI }];
  resetEnemies();
  aliveTime = 0; spawnT = 0.5; lastTs = 0;
  runGems = 0; xp = 0; lvl = 1; xpNeed = 10;
  bannerT = 0;
  setScreen('play');
  refreshItems();
  hud();
  if (!raf) raf = requestAnimationFrame(loop);
}

function update(dt) {
  aliveTime += dt;
  if (aliveTime >= 30) unlock('oleada');
  if (aliveTime >= 60) unlock('acech');
  if (bannerT > 0) bannerT -= dt;

  spawnT -= dt;
  const cap = Math.min(28, 6 + Math.floor(aliveTime / 18));
  const every = Math.max(0.34, 1.2 - aliveTime * 0.0016);
  if (spawnT <= 0 && enemies.length < cap) {
    spawnEnemy();
    spawnT = every;
  }

  const mv = moveVector();
  const len = Math.hypot(mv.x, mv.y);
  if (len > 0.08) {
    player.x += (mv.x / len) * moveSpeed() * dt;
    player.y += (mv.y / len) * moveSpeed() * dt;
    player.ang = Math.atan2(mv.y, mv.x);
  }
  player.x = Math.max(18, Math.min(W - 18, player.x));
  player.y = Math.max(18, Math.min(H - 18, player.y));
  player.ifr = Math.max(0, player.ifr - dt);
  player.shoot -= dt;
  player.cone -= dt;

  const target = nearest();
  if (target && player.shoot <= 0) {
    shootAt(target);
    player.shoot = fireRate();
  }
  if (owned('cono') && target && player.cone <= 0) {
    const a = Math.atan2(target.y - player.y, target.x - player.x);
    for (let i = -1; i <= 1; i++) {
      const aa = a + i * 0.2;
      shots.push({ x:player.x, y:player.y, vx:Math.cos(aa)*230, vy:Math.sin(aa)*230, r:3, dmg:Math.max(1, dmgNow()-1), life:0.4, c:'#ffcc66' });
    }
    player.cone = 1.05;
  }

  orbs.forEach(function(o, i){
    o.a += dt * 2.2;
    o.x = player.x + Math.cos(o.a + i) * 36;
    o.y = player.y + Math.sin(o.a + i) * 36;
    enemies.slice().forEach(function(e){
      if ((e.orbT||0) > 0) return;
      if (Math.hypot(e.x - o.x, e.y - o.y) < e.r + 8) {
        e.orbT = 0.4;
        hitEnemy(e, dmgNow());
      }
    });
  });

  shots.forEach(function(s){ s.x += s.vx*dt; s.y += s.vy*dt; s.life -= dt; });
  shots = shots.filter(function(s){ return s.life > 0 && s.x > -20 && s.x < W+20 && s.y > -20 && s.y < H+20; });
  shots.forEach(function(s){
    enemies.slice().forEach(function(e){
      if (s.life > 0 && Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) {
        s.life = 0;
        hitEnemy(e, s.dmg);
      }
    });
  });

  updateEnemies(dt);

  const mag = magNow();
  gems.forEach(function(g){
    const d = Math.hypot(g.x - player.x, g.y - player.y);
    if ((g.kind||'gem') === 'gem' && d < mag && d > 1) {
      g.x += (player.x - g.x) / d * 160 * dt;
      g.y += (player.y - g.y) / d * 160 * dt;
    }
    if (d < player.r + g.r + 4) g.got = true;
  });
  gems.filter(function(g){ return g.got; }).forEach(collectPickup);
  gems = gems.filter(function(g){ return !g.got; });

  particles.forEach(function(p){ p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt; });
  particles = particles.filter(function(p){ return p.life > 0; });
  starsBg.forEach(function(s){ s.y += s.v*dt; if (s.y > H) s.y = 0; });
  hud();
}

function drawDrop(g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  if (g.kind === 'heal') {
    ctx.fillStyle = '#ff6688';
    ctx.fillRect(-3, -g.r, 6, g.r*2);
    ctx.fillRect(-g.r, -3, g.r*2, 6);
  } else if (g.kind === 'bomb') {
    ctx.fillStyle = '#ff6633';
    ctx.beginPath(); ctx.arc(0, 0, g.r, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.moveTo(0, -g.r-2); ctx.lineTo(g.r, 0); ctx.lineTo(0, g.r+2); ctx.lineTo(-g.r, 0);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function draw() {
  ctx.fillStyle = '#050518';
  ctx.fillRect(0, 0, W, H);
  starsBg.forEach(function(s){
    ctx.fillStyle = 'rgba(180,220,255,.7)';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  });
  if (!player) return;
  gems.forEach(drawDrop);
  enemies.forEach(function(e){
    if (e.kind === 'whip' && e.whip > 0) {
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      const reach = 58;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.quadraticCurveTo(
        e.x + Math.cos(a + 0.7) * 36,
        e.y + Math.sin(a + 0.7) * 36,
        e.x + Math.cos(a) * reach,
        e.y + Math.sin(a) * reach
      );
      ctx.stroke();
    }
    ctx.fillStyle = e.kind === 'boss' ? '#ffcc66' : (e.kind === 'shooter' ? '#66ffd1' : (e.kind === 'whip' ? '#ff9f43' : '#39ff14'));
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.r, e.r * (e.kind === 'boss' ? 0.9 : 0.86), 0, 0, Math.PI*2);
    ctx.fill();
    if (e.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.r, e.r * 0.86, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(e.x - e.r, e.y - e.r - 6, e.r*2, 3);
    ctx.fillStyle = e.kind === 'boss' ? '#ffcc66' : '#ff3366';
    ctx.fillRect(e.x - e.r, e.y - e.r - 6, e.r*2 * (e.hp / e.max), 3);
  });
  enemyShots.forEach(function(s){
    ctx.fillStyle = '#ff4466';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
  });
  shots.forEach(function(s){
    ctx.fillStyle = s.c;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
  });
  orbs.forEach(function(o){
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, Math.PI*2); ctx.fill();
  });
  const col = skin();
  ctx.save();
  ctx.globalAlpha = player.ifr > 0 && Math.floor(player.ifr * 16) % 2 === 0 ? 0.35 : 1;
  ctx.translate(player.x, player.y);
  ctx.rotate(player.ang);
  ctx.fillStyle = col.b;
  ctx.beginPath(); ctx.ellipse(-2, 2, 8, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = col.a;
  ctx.beginPath(); ctx.arc(6, 0, 7, 0, Math.PI*2); ctx.fill();
  if (player.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,60,80,.7)';
    ctx.beginPath(); ctx.arc(2, 0, 16, 0, Math.PI*2); ctx.fill();
  }
  if (player.healFlash > 0) {
    ctx.fillStyle = 'rgba(80,255,160,.7)';
    ctx.beginPath(); ctx.arc(2, 0, 18, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  particles.forEach(function(p){
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x, p.y, p.s || 3, p.s || 3);
    ctx.globalAlpha = 1;
  });
  flashes.forEach(function(f){
    ctx.globalAlpha = Math.max(0, f.life * 5);
    ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    f.life -= 0.016;
  });
  flashes = flashes.filter(function(f){ return f.life > 0; });
  if (player) {
    player.hitFlash = Math.max(0, (player.hitFlash||0) - 0.016);
    player.healFlash = Math.max(0, (player.healFlash||0) - 0.016);
  }
}

function loop(ts) {
  raf = requestAnimationFrame(loop);
  const now = ts / 1000;
  const dt = Math.min(0.033, lastTs ? now - lastTs : 0.016);
  lastTs = now;
  if (screen === 'play' && player && player.hp > 0) update(dt);
  draw();
}

function boot() {
  for (let i = 0; i < 50; i++) {
    starsBg.push({ x:Math.random()*W, y:Math.random()*H, s:Math.random()*1.8+0.4, v:Math.random()*12+6 });
  }
  bindInput();
  document.getElementById('startBtn').onclick = startRun;
  document.getElementById('retryBtn').onclick = startRun;
  document.getElementById('shopBtn').onclick = openShop;
  document.getElementById('shopBtn2').onclick = openShop;
  document.getElementById('galBtn').onclick = openGal;
  document.getElementById('galBtn2').onclick = openGal;
  if (document.getElementById('libBack')) document.getElementById('libBack').onclick = openGal;
  document.getElementById('galBack').onclick = function(){ setScreen(backScreen === 'over' ? 'over' : 'menu'); };
  document.getElementById('packBtn').onclick = pickPackZip;
  document.getElementById('packBtn2').onclick = pickPackZip;
  document.getElementById('packClear').onclick = clearPack;
  document.getElementById('shopBack').onclick = function(){ setScreen(backScreen === 'over' ? 'over' : 'menu'); };
  document.getElementById('fs').onclick = function(){ document.getElementById('fs').classList.add('hidden'); };
  document.getElementById('useHeal').onclick = function(ev){ ev.stopPropagation(); useHeal(); };
  document.getElementById('useBomb').onclick = function(ev){ ev.stopPropagation(); useBomb(); };
  document.getElementById('wipe').onclick = function(){ freshSave(); openShop(); };
  setScreen('menu');
  requestAnimationFrame(loop);
}

boot();
