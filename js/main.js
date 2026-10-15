// ==================== LOOP, COMBATE Y PANTALLAS ====================

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

function setScreen(name) {
  screen = name;
  ['menu','over','level','stage','shop','gal','lib','itemMode','chrome','pad','ships'].forEach(function(n){
    const el = document.getElementById(n);
    if (!el) return;
    const show = n === name || (name === 'play' && (n === 'chrome' || n === 'pad'));
    el.classList.toggle('hidden', !show);
  });
  if (typeof fitLayout === 'function') fitLayout();
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

// Bars read --p: width in portrait, height in landscape (see css).
function setFill(el, pct) {
  if (el) el.style.setProperty('--p', pct + '%');
}

function hud() {
  document.getElementById('time').textContent = fmt(aliveTime);
  document.getElementById('hp').textContent = Math.max(0, Math.ceil(player ? player.hp : 0));
  document.getElementById('runGems').textContent = runGems;
  document.getElementById('lifeGems').textContent = save.gems;
  const stats = document.getElementById('stats');
  if (stats) stats.textContent = typeof buffHudLine === 'function' ? buffHudLine() : ('SPD ' + RUN.spd + '  DEF ' + RUN.def + '  ATK ' + RUN.atk + '  MAG ' + RUN.mag);
  setFill(document.getElementById('xp'), Math.min(100, (xp / xpNeed) * 100));
  const hpFill = document.getElementById('hpFill');
  if (hpFill) {
    const mh = typeof maxHp === 'function' ? maxHp() : 0;
    setFill(hpFill, player && mh > 0 ? Math.max(0, Math.min(100, (player.hp / mh) * 100)) : 0);
  }
  const bossHud = document.getElementById('bossHud');
  const bossFill = document.getElementById('bossHp');
  let boss = null;
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].kind === 'boss') { boss = enemies[i]; break; }
  }
  if (bossHud && bossFill) {
    if (boss) {
      bossHud.classList.remove('hidden');
      const bars = Math.max(1, boss.bars || 1);
      const per = boss.max / bars;
      const leftLayers = Math.max(1, Math.ceil(boss.hp / per - 1e-6));
      const fill = Math.max(0, Math.min(1, (boss.hp - (leftLayers - 1) * per) / per));
      setFill(bossFill, fill * 100);
      let color = '#ff3366';
      if (leftLayers > 1) color = (bars >= 3 && leftLayers === 2) ? '#c084fc' : '#ffcc66';
      bossFill.style.background = color;
    } else {
      bossHud.classList.add('hidden');
    }
  }
  const starHud = document.getElementById('starHud');
  const starFill = document.getElementById('starBar');
  if (starHud && starFill) {
    if (player && player.star > 0) {
      starHud.classList.remove('hidden');
      const max = player.starMax || 5;
      setFill(starFill, Math.max(0, Math.min(100, (player.star / max) * 100)));
    } else {
      starHud.classList.add('hidden');
    }
  }
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
  if (!player || player.dying || player.ifr > 0 || player.star > 0) return;
  if (typeof tryAbsorbShield === 'function' && tryAbsorbShield()) return;
  player.hp -= takenDmg(n);
  player.ifr = 0.6;
  player.hitFlash = 0.2;
  flashAt(player.x, player.y, 26, 'rgba(255,70,90,.95)');
  beep(140, 0.12, 'sawtooth', 0.06);
  if (player.hp <= 0) {
    player.hp = 0;
    beginShipBreak();
  }
}

var wreck = [];

function beginShipBreak() {
  if (!player || player.dying) return;
  player.dying = true;
  player.deathT = 1.05;
  player.ifr = 99;
  shots = [];
  enemyShots = [];
  const col = skin();
  const px = player.x, py = player.y, ang = player.ang || 0;
  wreck = [];
  const pieces = [
    { ox:1, oy:0, s:1.15, spin:2.2, kind:'hull' },
    { ox:-2, oy:-10, s:0.95, spin:-3.4, kind:'wing' },
    { ox:-2, oy:10, s:0.95, spin:3.1, kind:'wing' },
    { ox:-8, oy:-4, s:0.7, spin:-5, kind:'scrap' },
    { ox:-8, oy:4, s:0.7, spin:4.6, kind:'scrap' },
    { ox:8, oy:0, s:0.55, spin:1.2, kind:'scrap' }
  ];
  pieces.forEach(function(pc, i){
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const wx = px + pc.ox * ca - pc.oy * sa;
    const wy = py + pc.ox * sa + pc.oy * ca;
    const a = ang + (Math.random() - 0.5) * 1.2 + (i - 2.5) * 0.35;
    const spd = 80 + Math.random() * 160;
    wreck.push({
      x:wx, y:wy, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
      ang:ang + Math.random(), spin:pc.spin + (Math.random()-0.5)*2,
      life:player.deathT, max:player.deathT, s:pc.s,
      a:col.a, b:col.b, kind:pc.kind
    });
  });
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 40 + Math.random() * 220;
    particles.push({
      x:px, y:py,
      vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
      life:0.45 + Math.random()*0.55,
      c: i % 3 ? col.a : '#ff6688',
      s:2 + Math.random()*3
    });
  }
  flashAt(px, py, 48, 'rgba(255,120,60,.9)');
  beep(90, 0.28, 'sawtooth', 0.08);
  beep(55, 0.4, 'triangle', 0.06);
}

function tickShipBreak(dt) {
  if (!player || !player.dying) return;
  player.deathT -= dt;
  wreck.forEach(function(w){
    w.x += w.vx * dt;
    w.y += w.vy * dt;
    w.vx *= 0.98;
    w.vy *= 0.98;
    w.ang += w.spin * dt;
    w.life -= dt;
  });
  wreck = wreck.filter(function(w){ return w.life > 0; });
  particles.forEach(function(p){ p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt; });
  particles = particles.filter(function(p){ return p.life > 0; });
  if (player.deathT <= 0) {
    wreck = [];
    player.dying = false;
    endRun();
  }
}

function drawWreck() {
  wreck.forEach(function(w){
    const k = Math.max(0, w.life / (w.max || 1));
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.4);
    ctx.translate(w.x, w.y);
    ctx.rotate(w.ang);
    ctx.scale(w.s, w.s);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.5;
    if (w.kind === 'wing') {
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(4, 6);
      ctx.lineTo(-10, 4);
      ctx.lineTo(-12, 12);
      ctx.closePath();
    } else if (w.kind === 'hull') {
      ctx.beginPath();
      ctx.arc(1, 0, 5.2, 0, Math.PI * 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(6, -3);
      ctx.lineTo(4, 5);
      ctx.lineTo(-5, 4);
      ctx.lineTo(-6, -4);
      ctx.closePath();
    }
    ctx.fillStyle = w.b;
    ctx.strokeStyle = w.a;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

function endRun() {
  stopMusic();
  setScreen('over');
  document.getElementById('fTime').textContent = fmt(aliveTime);
  document.getElementById('fRun').textContent = runGems;
  document.getElementById('fLife').textContent = save.gems;
  beep(90, 0.3, 'triangle', 0.07);
}

function shootAt(target) {
  const a = Math.atan2(target.y - player.y, target.x - player.x);
  const twin = typeof buffLv === 'function' ? buffLv('twin') : 0;
  const fan = Math.max((player && player.mods && player.mods.spread) || 0, RUN.fan || 0);
  // Side pairs from fan/twin; always keep one bolt on the aim line.
  const pairs = Math.min(3, Math.min(2, fan) + twin);
  const step = pairs >= 3 ? 0.16 : 0.2;
  const pierce = typeof buffLv === 'function' ? buffLv('pierce') : 0;
  function fireBolt(aa) {
    const spd = 420;
    const range = Math.max(W, H) * 1.15;
    const lance = pilotEdge() === 'atk';
    shots.push({
      x:player.x, y:player.y, vx:Math.cos(aa)*spd, vy:Math.sin(aa)*spd,
      r:3.5, dmg:dmgNow(), life:range / spd, c: lance ? '#ffd2a8' : '#00ffff',
      pierceLeft:pierce, hit:[], shape:'line', len: lance ? 22 : 14
    });
  }
  fireBolt(a);
  for (let i = 1; i <= pairs; i++) {
    fireBolt(a + i * step);
    fireBolt(a - i * step);
  }
  unlock('shot');
  beep(480, 0.04, 'square', 0.03);
}

function nearest() {
  let best = null, bd = 1e9;
  enemies.forEach(function(e){
    if ((e.kind === 'rock' && !e.gold) || e.kind === 'mid') return;
    const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    if (d < bd) { bd = d; best = e; }
  });
  return best;
}

var levelPick = 0;

function paintLevelPick() {
  const nodes = document.querySelectorAll('#picks .pick');
  nodes.forEach(function(n, i){ n.classList.toggle('on', i === levelPick); });
  if (nodes[levelPick]) nodes[levelPick].scrollIntoView({ block:'nearest' });
}

function moveLevelPick(dir) {
  const n = document.querySelectorAll('#picks .pick').length;
  if (!n) return;
  levelPick = (levelPick + dir + n) % n;
  paintLevelPick();
}

function confirmLevelPick() {
  const nodes = document.querySelectorAll('#picks .pick');
  const el = nodes[levelPick];
  if (el) el.click();
}

function offerLevel() {
  const picks = typeof pickBuffOffers === 'function' ? pickBuffOffers(3) : [];
  const box = document.getElementById('picks');
  box.innerHTML = '';
  if (!picks.length) {
    const b = document.createElement('button');
    b.className = 'pick';
    b.innerHTML = '<b>All powers maxed</b><br><span style="color:#9499c7">Continue the run.</span>';
    b.onclick = function(){ setScreen('play'); };
    box.appendChild(b);
  } else {
    picks.forEach(function(p){
      const b = document.createElement('button');
      b.className = 'pick';
      const line = typeof buffOfferLine === 'function' ? buffOfferLine(p) : '';
      b.innerHTML = '<b>'+p.icon+' '+p.name+'</b> <span style="color:#7af7ff">'+line+'</span><br><span style="color:#9499c7">'+p.desc+'</span>';
      b.onclick = function(){ applyPick(p.id); };
      box.appendChild(b);
    });
  }
  levelPick = 0;
  paintLevelPick();
  setScreen('level');
  beep(540, 0.1, 'square', 0.05);
}

function applyPick(id) {
  if (typeof applyBuff === 'function') applyBuff(id);
  else bumpStat(id);
  setScreen('play');
}

function shipById(id) {
  for (let i = 0; i < CHARS.length; i++) {
    if (CHARS[i].id === id) return CHARS[i];
  }
  return null;
}

function renderShips() {
  const grid = document.getElementById('shipGrid');
  if (!grid) return;
  grid.innerHTML = '';
  CHARS.forEach(function(char) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ship-card' + (save.pilot === char.id ? ' on' : '');
    const img = document.createElement('img');
    img.src = char.base;
    img.alt = char.pilot;
    const name = document.createElement('b');
    name.textContent = char.pilot;
    const ship = document.createElement('span');
    ship.textContent = char.ship;
    const edge = document.createElement('span');
    edge.className = 'ship-edge';
    edge.textContent = char.edgeLabel || '';
    const preview = document.createElement('canvas');
    preview.className = 'ship-preview';
    preview.width = 132;
    preview.height = 60;
    const g = preview.getContext('2d');
    g.translate(58, 30);
    g.scale(1.45, 1.45);
    paintHull(g, char.edge, { a:'#7af7ff', b:'#16324a' }, 0);
    b.appendChild(img);
    b.appendChild(preview);
    b.appendChild(name);
    b.appendChild(ship);
    b.appendChild(edge);
    b.onclick = function(){ chooseShip(char.id); };
    grid.appendChild(b);
  });
}

function paintPilotChip() {
  const chip = document.getElementById('pilotChip');
  if (!chip) return;
  const char = shipById(save.pilot);
  chip.innerHTML = '';
  if (!char) {
    chip.textContent = 'Choose a ship';
    const blank = document.getElementById('pilotPortraitImg');
    if (blank) { blank.removeAttribute('src'); blank.alt = ''; }
    return;
  }
  const img = document.createElement('img');
  img.src = char.base;
  img.alt = '';
  const label = document.createElement('span');
  label.textContent = char.pilot + ' · ' + char.ship + (char.edgeLabel ? ' · ' + char.edgeLabel : '');
  chip.appendChild(img);
  chip.appendChild(label);
  const portrait = document.getElementById('pilotPortraitImg');
  if (portrait) {
    portrait.src = char.base;
    portrait.alt = char.pilot;
  }
}

function chooseShip(id) {
  const char = shipById(id);
  if (!char) return;
  save.pilot = id;
  const idx = CHARS.indexOf(char);
  if (idx >= 0) galIndex = idx;
  persist();
  paintPilotChip();
  setScreen('menu');
}

function openShips() {
  renderShips();
  setScreen('ships');
}

function openItemMode() {
  loadItemMode();
  ['modePickup','modeCritical','modeManual'].forEach(function(id){
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('on', (id === 'modePickup' && itemMode === 'pickup') ||
      (id === 'modeCritical' && itemMode === 'critical') ||
      (id === 'modeManual' && itemMode === 'manual'));
  });
  setScreen('itemMode');
}

function startRun() {
  initAudio();
  startMusic();
  player = {
    x:300, y:300, r:14, hp:maxHp(), maxHp:maxHp(),
    vx:0, vy:0, thrust:0,
    ang:0, ifr:0, shoot:0.25, cone:0.5,
    mods:{ dmg:0, rate:0, mag:0, spread:0 },
    heal: owned('cura0')|0, bombs: owned('bomba0')|0, hitFlash:0, healFlash:0, star:0, starMax:5,
    shieldCharges:0, shieldMax:0, shieldRegen:0,
    pulseT:2.5, missileT:3.0, thornsT:0
  };
  flashes = []; wreck = [];
  gems = []; shots = []; particles = []; exhaust = []; orbs = [];
  if (typeof buffOrbs !== 'undefined') buffOrbs = [];
  if (typeof pulseRings !== 'undefined') pulseRings = [];
  hyper = 0; stageClear = 0;
  if (owned('orbe')) orbs = [{ a:0 }, { a:Math.PI }];
  resetEnemies();
  resetRunStats();
  resetWaves();
  aliveTime = 0; spawnT = 0.5; lastTs = 0;
  runGems = 0; xp = 0; lvl = 1; xpNeed = 10;
  bannerT = 0;
  setScreen('play');
  refreshItems();
  hud();
  if (!raf) raf = requestAnimationFrame(loop);
}

function exitStageToMenu() {
  stopMusic();
  hyper = 0;
  stageClear = 0;
  setScreen('menu');
}

function beginStageClear(x, y) {
  enemies = [];
  enemyShots = [];
  shots = [];
  gems = [];
  boomRings.push({ x:x, y:y, reach:520, life:0.7, max:0.7 });
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 80 + Math.random() * 260;
    particles.push({ x:x, y:y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, life:0.7, c: i % 2 ? '#7af7ff' : '#ffcc66', s:4 });
  }
  hyper = 1;
  stageClear = 2.4;
  banner('STAGE 1');
  beep(70, 0.35, 'sawtooth', 0.08);
}

function tickStars(dt) {
  const cx = W / 2, cy = H / 2;
  starsBg.forEach(function(s){
    if (hyper > 0) {
      let dx = s.x - cx, dy = s.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const spd = (50 + s.v * 16) * (4 + hyper * 10) * dt;
      s.x += dx / dist * spd;
      s.y += dy / dist * spd;
      s.streak = 10 + hyper * 36;
      if (s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) {
        const a = Math.random() * Math.PI * 2;
        const r = 10 + Math.random() * 36;
        s.x = cx + Math.cos(a) * r;
        s.y = cy + Math.sin(a) * r;
      }
    } else {
      s.streak = 0;
      s.y += s.v * dt;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    }
  });
}

function update(dt) {
  if (stageClear > 0) {
    stageClear -= dt;
    hyper = 1 + (2.4 - Math.max(0, stageClear)) * 1.4;
    tickStars(dt);
    tickBoomRings(dt);
    particles.forEach(function(p){ p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt; });
    particles = particles.filter(function(p){ return p.life > 0; });
    if (stageClear <= 0) {
      const el = document.getElementById('stageGems');
      if (el) el.textContent = save.gems;
      setScreen('stage');
    }
    hud();
    return;
  }
  aliveTime += dt;
  if (aliveTime >= 30) unlock('oleada');
  if (aliveTime >= 60) unlock('acech');
  if (bannerT > 0) bannerT -= dt;

  tickWaves(dt);
  spawnT -= dt;
  const wave = waveSpawn();
  if (spawnT <= 0 && enemies.length < wave.cap) {
    spawnEnemy();
    spawnT = wave.every;
  }

  // Stick, keys, and pad add thrust. The ship keeps its speed and bleeds it off slowly.
  const mv = moveVector();
  const len = Math.hypot(mv.x, mv.y);
  const maxSpd = moveSpeed();
  let cap = maxSpd;
  if (len > 0.08) {
    const mag = Math.min(1, len);
    const nx = mv.x / len;
    const ny = mv.y / len;
    const accel = maxSpd * 2.6;
    player.vx += nx * mag * accel * dt;
    player.vy += ny * mag * accel * dt;
    player.ang = Math.atan2(ny, nx);
    player.thrust = mag;
    cap = maxSpd * mag;
  } else {
    const bleed = Math.exp(-0.7 * dt);
    player.vx *= bleed;
    player.vy *= bleed;
    player.thrust = 0;
    if (Math.hypot(player.vx, player.vy) < 18) {
      player.vx = 0;
      player.vy = 0;
    }
  }
  const spd = Math.hypot(player.vx, player.vy);
  if (spd > cap) {
    player.vx *= cap / spd;
    player.vy *= cap / spd;
  }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  if (player.x < 18) { player.x = 18; if (player.vx < 0) player.vx = 0; }
  if (player.x > W - 18) { player.x = W - 18; if (player.vx > 0) player.vx = 0; }
  if (player.y < 18) { player.y = 18; if (player.vy < 0) player.vy = 0; }
  if (player.y > H - 18) { player.y = H - 18; if (player.vy > 0) player.vy = 0; }
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
      shots.push({ x:player.x, y:player.y, vx:Math.cos(aa)*230, vy:Math.sin(aa)*230, r:3, dmg:Math.max(1, dmgNow()-1), life:0.4, c:'#ffcc66', pierceLeft:0, hit:[] });
    }
    player.cone = Math.max(0.42, 1.05 - (player.mods.rate||0) * 0.1);
  }

  orbs.forEach(function(o, i){
    o.a += dt * 2.2;
    o.x = player.x + Math.cos(o.a + i) * 36;
    o.y = player.y + Math.sin(o.a + i) * 36;
    enemies.slice().forEach(function(e){
      if ((e.kind === 'rock' && !e.gold) || e.kind === 'mid') return;
      if ((e.orbT||0) > 0) return;
      if (Math.hypot(e.x - o.x, e.y - o.y) < e.r + 8) {
        e.orbT = 0.4;
        hitEnemy(e, dmgNow());
      }
    });
  });

  shots.forEach(function(s){
    if (s.homing) {
      let t = s.target && enemies.indexOf(s.target) >= 0 ? s.target : null;
      if (!t) {
        let best = null, bd = 1e9;
        enemies.forEach(function(e){
          if ((e.kind === 'rock' && !e.gold) || e.kind === 'mid') return;
          const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
          if (d < bd) { bd = d; best = e; }
        });
        t = best;
        s.target = t;
      }
      if (t) {
        const desired = Math.atan2(t.y - s.y, t.x - s.x);
        const cur = Math.atan2(s.vy, s.vx);
        let diff = desired - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.max(-4 * dt, Math.min(4 * dt, diff));
        const na = cur + turn;
        const spd = Math.hypot(s.vx, s.vy) || 200;
        s.vx = Math.cos(na) * spd;
        s.vy = Math.sin(na) * spd;
      }
    }
    s.x += s.vx*dt; s.y += s.vy*dt; s.life -= dt;
  });
  shots = shots.filter(function(s){ return s.life > 0 && s.x > -20 && s.x < W+20 && s.y > -20 && s.y < H+20; });
  shots.forEach(function(s){
    enemies.slice().forEach(function(e){
      if (s.life <= 0) return;
      if (Math.hypot(e.x - s.x, e.y - s.y) >= e.r + s.r) return;
      if (!s.hit) s.hit = [];
      if (s.hit.indexOf(e) >= 0) return;
      s.hit.push(e);
      hitEnemy(e, s.dmg);
      if ((s.pierceLeft|0) > 0) s.pierceLeft--;
      else s.life = 0;
    });
  });

  updateEnemies(dt);

  if (player.star > 0) player.star = Math.max(0, player.star - dt);
  tickExhaust(dt);

  const mag = magNow();
  gems.forEach(function(g){
    const d = Math.hypot(g.x - player.x, g.y - player.y);
    const kind = g.kind || 'gem';
    const pull = (g.pull && kind !== 'magnet' && d > 1) || (kind === 'gem' && d < mag && d > 1);
    if (pull) {
      const spd = g.pull ? 520 : 160;
      g.x += (player.x - g.x) / d * spd * dt;
      g.y += (player.y - g.y) / d * spd * dt;
    }
    if (d < player.r + g.r + 4) g.got = true;
  });
  gems.filter(function(g){ return g.got; }).forEach(collectPickup);
  gems = gems.filter(function(g){ return !g.got; });

  tickBoomRings(dt);
  if (typeof tickBuffs === 'function') tickBuffs(dt);
  autoUseItems();
  particles.forEach(function(p){ p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt; });
  particles = particles.filter(function(p){ return p.life > 0; });
  tickStars(dt);
  hud();
}

function dropFace(g) {
  if (g.kind === 'heal') return '💖';
  if (g.kind === 'bomb') return '💣';
  if (g.kind === 'magnet') return '🧲';
  if (g.kind === 'star') return '⭐';
  if (g.special || g.kind === 'fan') return specialFace(g.kind);
  return '💎';
}

function drawDrop(g) {
  ctx.save();
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dropFace(g), g.x, g.y);
  ctx.restore();
}


function tickExhaust(dt) {
  if (!player) return;
  const thrust = player.thrust || 0;
  const back = player.ang + Math.PI;
  const every = 0.026;
  if (thrust > 0.05) player.exhaustAcc = (player.exhaustAcc || 0) + dt * thrust;
  else player.exhaustAcc = 0;
  while (thrust > 0.05 && player.exhaustAcc >= every) {
    player.exhaustAcc -= every;
    const spread = (Math.random() - 0.5) * 0.4;
    const a = back + spread;
    const ox = player.x + Math.cos(back) * 12 + (Math.random() - 0.5) * 3;
    const oy = player.y + Math.sin(back) * 12 + (Math.random() - 0.5) * 3;
    const spd = 170 + Math.random() * 190;
    exhaust.push({
      x:ox, y:oy, px:ox, py:oy,
      vx:Math.cos(a) * spd, vy:Math.sin(a) * spd,
      life:0.2 + Math.random() * 0.12, max:0.32
    });
  }
  exhaust.forEach(function(p){
    p.px = p.x; p.py = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  });
  if (exhaust.length > 90) exhaust.splice(0, exhaust.length - 90);
  exhaust = exhaust.filter(function(p){ return p.life > 0; });
}

function drawExhaust() {
  ctx.save();
  ctx.lineCap = 'round';
  exhaust.forEach(function(p){
    const k = Math.max(0, p.life / (p.max || 0.3));
    ctx.globalAlpha = k;
    ctx.strokeStyle = k > 0.55 ? '#fff4c4' : (k > 0.28 ? '#ffb347' : '#ff5a1f');
    ctx.lineWidth = 1.3 + k * 1.8;
    ctx.beginPath();
    ctx.moveTo(p.px, p.py);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  ctx.restore();
}

function gradeFrame() {
  ctx.save();
  const g = ctx.createRadialGradient(W * 0.5, H * 0.48, W * 0.16, W * 0.5, H * 0.5, W * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.7, 'rgba(4,0,16,0.1)');
  g.addColorStop(1, 'rgba(2,0,12,0.58)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'soft-light';
  const wash = ctx.createLinearGradient(0, 0, W, H);
  if (player && player.star > 0) {
    wash.addColorStop(0, 'rgba(255,214,70,.4)');
    wash.addColorStop(1, 'rgba(255,70,170,.24)');
  } else {
    wash.addColorStop(0, 'rgba(0,190,255,.28)');
    wash.addColorStop(0.55, 'rgba(16,8,32,.08)');
    wash.addColorStop(1, 'rgba(255,40,170,.22)');
  }
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}


function enemyPalette(kind, e) {
  if (e && e.gold) return { body:'#d4a017', edge:'#ffe566', glow:'#8a5a00', accent:'#fff3a8' };
  if (kind === 'shooter') return { body:'#3a6ea5', edge:'#9fd4ff', glow:'#224466', accent:'#cfefff' };
  if (kind === 'whip') return { body:'#a67c00', edge:'#ffe08a', glow:'#664400', accent:'#fff1a8' };
  if (kind === 'boss') return { body:'#7a1028', edge:'#ff6688', glow:'#440014', accent:'#ff88aa' };
  if (kind === 'mid') return { body:'#8a3a10', edge:'#ffaa55', glow:'#552200', accent:'#ffcc66' };
  if (kind === 'rock') return { body:'#5a564e', edge:'#b0aaa0', glow:'#2a2820', accent:'#8a8478' };
  return { body:'#1a5022', edge:'#7dff6a', glow:'#0a2810', accent:'#b6ff7a' };
}

// ---------- ship art helpers ----------
function shipPoly(g, pts) {
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) g.moveTo(pts[i][0], pts[i][1]); else g.lineTo(pts[i][0], pts[i][1]);
  }
  g.closePath();
}
function shipMirror(pts) {
  const out = pts.slice();
  for (let i = pts.length - 1; i >= 0; i--) if (pts[i][1] !== 0) out.push([pts[i][0], -pts[i][1]]);
  return out;
}
// Fill + edge, then a soft top-light gradient for depth (cheap, no blur).
function shipPlate(g, pts, fill, edge, shade) {
  shipPoly(g, pts);
  g.fillStyle = fill; g.fill();
  if (shade !== false) {
    const gr = g.createLinearGradient(0, -14, 0, 14);
    gr.addColorStop(0, 'rgba(255,255,255,.22)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    gr.addColorStop(1, 'rgba(0,0,0,.32)');
    g.fillStyle = gr; g.fill();
  }
  if (edge) { g.strokeStyle = edge; g.stroke(); }
}
function shipLines(g, segs, color, w) {
  g.save();
  g.strokeStyle = color; g.lineWidth = w || 0.7;
  g.beginPath();
  segs.forEach(function(s){ g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); });
  g.stroke();
  g.restore();
}
function shipCanopy(g, x, y, rx, ry, glass) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  const gr = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  gr.addColorStop(0, '#e8ffff');
  gr.addColorStop(0.35, glass || '#5fd8ff');
  gr.addColorStop(1, '#06243a');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 0.8; g.stroke();
  g.beginPath();
  g.ellipse(x + rx * 0.25, y - ry * 0.35, rx * 0.45, ry * 0.25, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
}
function shipNozzle(g, x, y, h, len, glow, t) {
  g.fillStyle = '#20262e';
  g.fillRect(x - len, y - h, len, h * 2);
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.6;
  g.strokeRect(x - len, y - h, len, h * 2);
  const f = 0.75 + 0.25 * Math.sin((t || 0) * 40 + y);
  const gr = g.createRadialGradient(x - len, y, 0, x - len, y, h * 2.6 * f);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.35, glow);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(x - len, y, h * 2.6 * f, 0, Math.PI * 2); g.fill();
}
function shipLight(g, x, y, color, on) {
  g.beginPath(); g.arc(x, y, on ? 1.5 : 0.9, 0, Math.PI * 2);
  g.fillStyle = on ? color : 'rgba(80,80,80,.8)'; g.fill();
  if (on) { g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.globalAlpha *= 0.35; g.fill(); g.globalAlpha /= 0.35; }
}

function pilotEdge() {
  const ship = (save && typeof shipById === 'function') ? shipById(save.pilot) : null;
  return (ship && ship.edge) || 'hp';
}

function hullPath(g, col, trace) {
  g.beginPath();
  trace();
  g.closePath();
  g.fillStyle = col.b;
  g.strokeStyle = col.a;
  g.fill();
  g.stroke();
}

// Scout: sturdy, wide armored hull, twin engines, side pods.
function paintScout(g, col, t) {
  shipNozzle(g, -15, -4.5, 2.4, 3, col.a, t);
  shipNozzle(g, -15, 4.5, 2.4, 3, col.a, t);
  [-1, 1].forEach(function(s) {
    shipPlate(g, [[3, s*6], [-1, s*13], [-9, s*12], [-7, s*5]], col.b, col.a);
    shipPoly(g, [[0, s*8], [-2, s*12], [-6, s*11.5], [-5, s*8]]);
    g.fillStyle = col.a; g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#20262e'; g.fillRect(-8, s*12.5 - 1.2, 6, 2.4);
  });
  shipPlate(g, shipMirror([[13,0],[5,8],[-13,8],[-16,0]]), col.b, col.a);
  shipPlate(g, shipMirror([[9,0],[4,5],[-10,5],[-12,0]]), col.b, 'rgba(255,255,255,.25)', true);
  shipLines(g, [[-3,-8,-3,8],[-9,-8,-9,8],[-12,-3,4,-3],[-12,3,4,3]], 'rgba(0,0,0,.4)', 0.6);
  g.fillStyle = col.a;
  [[-6,-6.3],[-6,6.3],[-11,-6.3],[-11,6.3]].forEach(function(p){ g.fillRect(p[0]-0.5, p[1]-0.5, 1, 1); });
  shipCanopy(g, 2, 0, 4.6, 3.2);
  const on = Math.floor((t || 0) * 2) % 2 === 0;
  shipLight(g, -8, -12.5, '#ff4455', on);
  shipLight(g, -8, 12.5, '#44ff88', on);
}

// Lance: long, pointed spear nose, narrow body, swept fins.
function paintLance(g, col, t) {
  shipNozzle(g, -14, 0, 2.6, 3, col.a, t);
  [-1, 1].forEach(function(s) {
    shipPlate(g, [[1, s*3], [-7, s*10], [-11, s*10.5], [-11, s*3]], col.b, col.a);
    shipLines(g, [[-1, s*4.5, -8, s*9.5]], col.a, 1.1);
    g.fillStyle = '#20262e'; g.fillRect(-12, s*9 - 0.8, 4, 1.6);
  });
  shipPlate(g, shipMirror([[5,0],[1,5],[-13,4],[-15,0]]), col.b, col.a);
  shipLines(g, [[-4,-4.5,-4,4.5],[-9,-4,-9,4]], 'rgba(0,0,0,.4)', 0.6);
  // spear
  shipPoly(g, [[22,0],[5,2.4],[3,0],[5,-2.4]]);
  const gr = g.createLinearGradient(3, 0, 22, 0);
  gr.addColorStop(0, col.a); gr.addColorStop(1, '#ffffff');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = col.a; g.stroke();
  shipLines(g, [[6,0,20,0]], 'rgba(0,0,0,.35)', 0.6);
  g.fillStyle = col.a; g.fillRect(4, -3, 1.6, 6);
  shipCanopy(g, -3, 0, 4, 2.3);
  const on = Math.floor((t || 0) * 3) % 3 === 0;
  shipLight(g, 21, 0, '#ffffff', on);
  shipLight(g, -10, -10, '#ff4455', !on);
  shipLight(g, -10, 10, '#44ff88', !on);
}

// Dart: sleek delta, thin needle body, long racing stripes.
function paintDart(g, col, t) {
  shipNozzle(g, -11, 0, 1.8, 3, col.a, t);
  [-1, 1].forEach(function(s) {
    shipPlate(g, [[1, s*2], [-16, s*16], [-12, s*9], [-7, s*2]], col.b, col.a);
    shipLines(g, [[-2, s*3, -14, s*14]], col.a, 1.2);
    shipLines(g, [[-6, s*5.5, -10, s*7.5]], 'rgba(255,255,255,.5)', 0.8);
  });
  shipPlate(g, shipMirror([[18,0],[-1,3],[-13,2],[-10,0]]), col.b, col.a);
  shipLines(g, [[16,0,-9,0]], col.a, 0.9);
  shipLines(g, [[-4,-2.6,-4,2.6]], 'rgba(0,0,0,.4)', 0.6);
  g.beginPath(); g.moveTo(-14, 0); g.lineTo(-9, 2.4); g.lineTo(-9, -2.4); g.closePath();
  g.fillStyle = col.a; g.fill();
  shipCanopy(g, 5, 0, 4.2, 1.7);
  const on = Math.floor((t || 0) * 4) % 2 === 0;
  shipLight(g, -15.5, -15.5, '#ff4455', on);
  shipLight(g, -15.5, 15.5, '#44ff88', on);
}

function paintHull(g, edge, col, t) {
  g.save();
  g.lineJoin = 'round';
  g.lineWidth = 1.6;
  if (edge === 'spd') paintDart(g, col, t);
  else if (edge === 'atk') paintLance(g, col, t);
  else paintScout(g, col, t);
  g.restore();
}

// Static enemy art is painted once per kind/palette into an offscreen sprite.
// Only blinking lights and hit flash are drawn per frame.
const ENEMY_SPRITES = {};
const ENEMY_SPRITE_RES = 3;

function paintEnemyArt(g, kind, pal) {
  g.lineJoin = 'round';
  g.lineWidth = 1.5;
  if (kind === 'mid') {
    // Seeker bomb: segmented sphere, fins, fuse cap.
    [-1, 1].forEach(function(s) {
      shipPlate(g, [[-4, s*8], [-13, s*12], [-11, s*5]], pal.accent, pal.edge, false);
    });
    g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2);
    const gr = g.createRadialGradient(-3, -3, 1, 0, 0, 10);
    gr.addColorStop(0, pal.accent); gr.addColorStop(0.45, pal.body); gr.addColorStop(1, pal.glow);
    g.fillStyle = gr; g.fill(); g.strokeStyle = pal.edge; g.stroke();
    g.beginPath(); g.arc(0, 0, 10, -1.2, 1.2); g.moveTo(-2, -9.8); g.lineTo(-2, 9.8);
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.8; g.stroke();
    g.fillStyle = pal.edge;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.fillRect(Math.cos(a) * 7 - 0.6, Math.sin(a) * 7 - 0.6, 1.2, 1.2); }
    g.beginPath(); g.arc(-3, -3, 3, 0, Math.PI * 2); g.fillStyle = 'rgba(255,230,160,.45)'; g.fill();
    g.lineWidth = 1.5;
    g.fillStyle = pal.accent; g.fillRect(-2, -14, 4, 6);
    g.strokeStyle = pal.edge; g.strokeRect(-2, -14, 4, 6);
    shipLines(g, [[-2, -12, 2, -12], [-2, -10, 2, -10]], 'rgba(0,0,0,.45)', 0.6);
  } else if (kind === 'normal') {
    // Box scout with four cone thrusters.
    [-1, 1].forEach(function(sign) {
      [-5, 5].forEach(function(fx) {
        shipPlate(g, [[fx - 3, sign*9], [fx + 3, sign*9], [fx, sign*17]], pal.accent, pal.edge, false);
        shipLines(g, [[fx, sign*10, fx, sign*15]], 'rgba(0,0,0,.35)', 0.6);
      });
    });
    shipPlate(g, [[-9,-9],[9,-9],[9,9],[-9,9]], pal.body, pal.edge);
    shipPlate(g, [[-7,-7],[6,-7],[6,7],[-7,7]], pal.body, 'rgba(255,255,255,.18)');
    shipLines(g, [[-7,-3.5,-4,-3.5],[-7,3.5,-4,3.5],[-5.5,-7,-5.5,7]], 'rgba(0,0,0,.45)', 0.6);
    g.fillStyle = pal.glow; g.fillRect(-3, -4, 8, 8);
    g.fillStyle = pal.edge; g.globalAlpha = 0.5; g.fillRect(-2, -3, 6, 2); g.globalAlpha = 1;
    g.fillStyle = pal.accent; g.fillRect(4, -3, 5, 6);
    g.fillStyle = pal.edge; g.fillRect(9, -3, 5, 6);
    g.fillStyle = '#20262e'; g.fillRect(12.5, -1.5, 1.5, 3);
    g.fillStyle = pal.edge;
    [[-8,-8],[8,-8],[-8,8],[8,8]].forEach(function(p){ g.fillRect(p[0]-0.6, p[1]-0.6, 1.2, 1.2); });
  } else if (kind === 'shooter') {
    // Gun platform: armored box, turret dome, long barrel, swept wings.
    [-1, 1].forEach(function(sign) {
      shipPlate(g, [[-4, sign*7], [-10, sign*12], [2, sign*7]], pal.body, pal.edge);
      shipLines(g, [[-3, sign*8, -8, sign*11]], pal.accent, 0.9);
    });
    shipPlate(g, [[-11,-7],[9,-7],[9,7],[-11,7]], pal.body, pal.edge);
    shipLines(g, [[-6,-7,-6,7],[-11,-3,-6,-3],[-11,3,-6,3]], 'rgba(0,0,0,.4)', 0.6);
    g.fillStyle = '#20262e'; g.fillRect(-13, -5, 2, 3); g.fillRect(-13, 2, 2, 3);
    g.fillStyle = pal.edge; g.fillRect(8, -2.5, 10, 5);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(8, -0.6, 10, 1.2);
    g.fillStyle = pal.accent; g.fillRect(15, -3.2, 2, 6.4);
    g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2);
    const gr = g.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 5);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, pal.accent); gr.addColorStop(1, pal.body);
    g.fillStyle = gr; g.fill(); g.strokeStyle = pal.edge; g.stroke();
  } else if (kind === 'whip') {
    // Arrow raider with crackling blade fins and prongs.
    [-1, 1].forEach(function(sign) {
      shipPlate(g, [[0, sign*2], [-2, sign*14], [6, sign*3]], pal.accent, pal.edge, false);
      shipLines(g, [[1, sign*4, -1, sign*11]], pal.glow, 0.8);
    });
    shipPlate(g, [[12,0],[2,7],[-10,4],[-8,0],[-10,-4],[2,-7]], pal.body, pal.edge);
    shipLines(g, [[-6,0,10,0],[2,-6,2,6]], 'rgba(0,0,0,.35)', 0.6);
    g.fillStyle = '#20262e'; g.fillRect(-11, -3.5, 2, 2); g.fillRect(-11, 1.5, 2, 2);
    shipPlate(g, [[10,0],[18,0],[12,3],[12,-3]], pal.accent, pal.edge, false);
    shipCanopy(g, 4, 0, 3, 1.8, '#ffd84a');
  } else if (kind === 'boss') {
    // Dreadnought: layered armor, twin wing blades, engine bank, red eye core.
    g.lineWidth = 2;
    [-1, 1].forEach(function(sign) {
      shipPlate(g, [[-4, sign*10], [-10, sign*22], [-13, sign*21], [6, sign*12]], pal.glow, pal.accent);
      shipLines(g, [[-5, sign*13, -10, sign*20], [-1, sign*12, -6, sign*19]], pal.edge, 0.7);
      g.fillStyle = '#20262e'; g.fillRect(-14, sign*20 - 1.4, 4, 2.8);
    });
    shipPlate(g, [[22,0],[8,12],[-16,10],[-20,0],[-16,-10],[8,-12]], pal.body, pal.edge);
    shipPlate(g, [[17,0],[6,8],[-12,7],[-15,0],[-12,-7],[6,-8]], pal.body, 'rgba(255,170,190,.35)');
    shipLines(g, [[-4,-9,-4,9],[-10,-8,-10,8],[12,-5,12,5],[-15,0,0,0]], 'rgba(0,0,0,.45)', 0.8);
    // engine bank
    [-6, 0, 6].forEach(function(y){ g.fillStyle = '#20262e'; g.fillRect(-23, y - 1.8, 4, 3.6); });
    [-1, 1].forEach(function(sign) {
      shipPlate(g, [[4, sign*6], [0, sign*16], [10, sign*8]], pal.accent, pal.edge, false);
      // gun pods
      g.fillStyle = pal.edge; g.fillRect(10, sign*9.5 - 1, 9, 2);
    });
    // spikes on nose
    g.fillStyle = pal.accent;
    [[18,-3],[18,3]].forEach(function(p){ g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + 7, p[1] * 1.8); g.lineTo(p[0] - 2, p[1] * 1.6); g.closePath(); g.fill(); });
    g.lineWidth = 1.5;
    g.fillStyle = pal.edge;
    [[-14,-7],[-14,7],[0,-9],[0,9],[12,-7],[12,7]].forEach(function(p){ g.beginPath(); g.arc(p[0], p[1], 0.9, 0, Math.PI*2); g.fill(); });
    // eye core
    g.beginPath(); g.arc(6, 0, 6.5, 0, Math.PI * 2); g.fillStyle = '#2a0008'; g.fill(); g.strokeStyle = pal.edge; g.stroke();
    g.beginPath(); g.arc(6, 0, 5, 0, Math.PI * 2);
    const gr = g.createRadialGradient(7, -1, 0.5, 6, 0, 5);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#ff4466'); gr.addColorStop(1, '#5a0012');
    g.fillStyle = gr; g.fill();
  } else {
    g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2);
    g.fillStyle = pal.body; g.strokeStyle = pal.edge; g.fill(); g.stroke();
  }
}

function enemySprite(kind, pal, gold) {
  const key = kind + (gold ? ':g' : '');
  let spr = ENEMY_SPRITES[key];
  if (spr) return spr;
  const half = kind === 'boss' ? 30 : 20;
  const c = document.createElement('canvas');
  c.width = c.height = half * 2 * ENEMY_SPRITE_RES;
  const g = c.getContext('2d');
  g.scale(ENEMY_SPRITE_RES, ENEMY_SPRITE_RES);
  g.translate(half, half);
  paintEnemyArt(g, kind, pal);
  spr = ENEMY_SPRITES[key] = { c: c, half: half };
  return spr;
}

function drawRock(e, pal) {
  if (e.gold) {
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,200,60,.22)'; ctx.fill();
  }
  const pts = e.rockPts || [[10,0],[6,8],[-2,11],[-10,5],[-9,-6],[-1,-11],[8,-7]];
  shipPoly(ctx, pts);
  ctx.fillStyle = pal.body; ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.arc(2, 3, 9, 0, Math.PI * 2); ctx.save(); shipPoly(ctx, pts); ctx.clip();
  ctx.beginPath(); ctx.arc(3, 4, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  shipPoly(ctx, pts);
  ctx.strokeStyle = pal.edge; ctx.lineWidth = e.gold ? 2.2 : 1.5; ctx.stroke();
  [[-4, -4, 2.4], [4, 2, 1.8], [-3, 5, 1.4]].forEach(function(c){
    ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2);
    ctx.fillStyle = e.gold ? 'rgba(140,90,0,.5)' : 'rgba(0,0,0,.35)'; ctx.fill();
    ctx.beginPath(); ctx.arc(c[0] - 0.4, c[1] - 0.4, c[2], Math.PI, Math.PI * 1.6);
    ctx.strokeStyle = e.gold ? 'rgba(255,240,160,.7)' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 0.7; ctx.stroke();
  });
  if (e.gold) { ctx.fillStyle = '#fff8c0'; ctx.fillRect(5, -5, 1.5, 1.5); ctx.fillRect(-7, 1, 1.2, 1.2); }
}

function drawEnemyLights(e, pal) {
  const t = aliveTime || 0;
  const ph = (e.x * 0.013 + e.y * 0.007);
  const on = Math.sin(t * 6 + ph * 10) > 0.2;
  if (e.kind === 'normal') { shipLight(ctx, 12, 0, pal.accent, on); }
  else if (e.kind === 'shooter') { shipLight(ctx, -9, -10, '#ff4455', on); shipLight(ctx, -9, 10, '#44ff88', on); }
  else if (e.kind === 'whip') { shipLight(ctx, -1, -13, '#fff1a8', on); shipLight(ctx, -1, 13, '#fff1a8', !on); }
  else if (e.kind === 'mid') { shipLight(ctx, 0, -14.5, '#ff5522', on); }
  else if (e.kind === 'boss') {
    const p = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.globalAlpha = 0.35 + 0.4 * p;
    ctx.fillStyle = '#ff6a3a';
    [-6, 0, 6].forEach(function(y){ ctx.beginPath(); ctx.arc(-24, y, 2.4 + p, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#ff2244';
    ctx.beginPath(); ctx.arc(6, 0, 7 + p * 2, 0, Math.PI * 2); ctx.globalAlpha = 0.15 + 0.2 * p; ctx.fill();
    ctx.globalAlpha = 1;
    shipLight(ctx, -12, -21, '#ff4455', on);
    shipLight(ctx, -12, 21, '#44ff88', on);
    shipLight(ctx, 22, 0, '#ffffff', !on);
  }
}

function drawEnemyShip(e) {
  const pal = enemyPalette(e.kind, e);
  const s = Math.max(0.75, (e.r || 13) / 13);
  let ang = e.ang;
  if (ang == null) {
    if (e.kind === 'rock') ang = (e.spin || 1) * (aliveTime || 0);
    else if (player) ang = Math.atan2(player.y - e.y, player.x - e.x);
    else ang = 0;
  }
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.5;
  if (e.kind === 'rock') drawRock(e, pal);
  else {
    const spr = enemySprite(e.kind, pal, !!e.gold);
    ctx.drawImage(spr.c, -spr.half, -spr.half, spr.half * 2, spr.half * 2);
    drawEnemyLights(e, pal);
  }
  if (e.flash > 0) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, e.kind === 'boss' ? 18 : 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function draw() {
  ctx.fillStyle = '#050518';
  ctx.fillRect(0, 0, W, H);
  starsBg.forEach(function(s){
    if (s.streak) {
      const cx = W / 2, cy = H / 2;
      const dx = s.x - cx, dy = s.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = 'rgba(190,235,255,.9)';
      ctx.lineWidth = Math.max(1, s.s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - dx / dist * s.streak, s.y - dy / dist * s.streak);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(180,220,255,.7)';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
  });
  if (!player) return;
  gems.forEach(drawDrop);
  enemies.forEach(function(e){
    if ((e.kind === 'whip' || e.kind === 'boss') && e.whip > 0) {
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      const reach = e.kind === 'boss' ? 78 : 58;
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
    if (e.tell > 0) {
      ctx.fillStyle = e.tellColor || '#fff';
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(e.tell * 18);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawEnemyShip(e);
    if (e.kind === 'mid') {
      const fm = e.fuseMax || 15;
      const fill = Math.max(0.04, Math.min(1, (e.fuse == null ? fm : e.fuse) / fm));
      const left = e.fuse == null ? fm : e.fuse;
      const rate = left > 4 ? 2.2 : (left > 1.2 ? 7 : 18);
      const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((aliveTime || 0) * rate * Math.PI * 2));
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,140,40,' + (0.35 + 0.45 * blink) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill);
      ctx.strokeStyle = 'rgba(255,200,80,' + (0.7 + 0.3 * blink) + ')';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  });
  enemyShots.forEach(function(s){
    ctx.fillStyle = '#ff4466';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
  });
  shots.forEach(function(s){
    if (s.shape === 'line') {
      const ang = Math.atan2(s.vy, s.vx);
      const half = (s.len || 14) * 0.5;
      const c = Math.cos(ang), sn = Math.sin(ang);
      ctx.strokeStyle = s.c;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x - c * half, s.y - sn * half);
      ctx.lineTo(s.x + c * half, s.y + sn * half);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(180,255,255,.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(s.x - c * half * 0.7, s.y - sn * half * 0.7);
      ctx.lineTo(s.x + c * half * 0.7, s.y + sn * half * 0.7);
      ctx.stroke();
    } else {
      ctx.fillStyle = s.c;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }
  });
  drawBoomRings();
  drawExhaust();
  orbs.forEach(function(o){
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, Math.PI*2); ctx.fill();
  });
  if (typeof drawBuffFx === 'function') drawBuffFx();
  if (player && player.dying) {
    drawWreck();
  } else if (player) {
  const col = skin();
  ctx.save();
  if (player.star > 0) {
    ctx.strokeStyle = 'rgba(255,210,70,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20 + Math.sin(aliveTime * 14) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = player.ifr > 0 && !(player.star > 0) && Math.floor(player.ifr * 16) % 2 === 0 ? 0.35 : 1;
  ctx.translate(player.x, player.y);
  ctx.rotate(player.ang);
  paintHull(ctx, pilotEdge(), col, aliveTime || 0);
  if (player.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,60,80,.55)';
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
  }
  if (player.healFlash > 0) {
    ctx.fillStyle = 'rgba(80,255,160,.55)';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
  }
  if (player.star > 0) {
    ctx.fillStyle = 'rgba(255,214,70,.35)';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  }
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
  gradeFrame();
  if (player) {
    player.hitFlash = Math.max(0, (player.hitFlash||0) - 0.016);
    player.healFlash = Math.max(0, (player.healFlash||0) - 0.016);
  }
}

function loop(ts) {
  raf = requestAnimationFrame(loop);
  pollGamepad();
  const now = ts / 1000;
  const dt = Math.min(0.033, lastTs ? now - lastTs : 0.016);
  lastTs = now;
  if (screen === 'play' && player) {
    if (player.dying) tickShipBreak(dt);
    else if (player.hp > 0) update(dt);
  }
  draw();
}

function boot() {
  for (let i = 0; i < 50; i++) {
    starsBg.push({ x:Math.random()*W, y:Math.random()*H, s:Math.random()*1.8+0.4, v:Math.random()*12+6 });
  }
  bindInput();
  document.getElementById('pilotChip').onclick = openShips;
  document.getElementById('startBtn').onclick = openItemMode;
  document.getElementById('retryBtn').onclick = openItemMode;
  document.getElementById('itemModeBack').onclick = function(){ setScreen('menu'); };
  document.getElementById('modePickup').onclick = function(){ setItemMode('pickup'); startRun(); };
  document.getElementById('modeCritical').onclick = function(){ setItemMode('critical'); startRun(); };
  document.getElementById('modeManual').onclick = function(){ setItemMode('manual'); startRun(); };
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
  bindPress(document.getElementById('useHeal'), useHeal);
  bindPress(document.getElementById('useBomb'), useBomb);
  bindPress(document.getElementById('fullBtn'), toggleFullscreen);
  bindPress(document.getElementById('fsBtn'), toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFsLabel);
  document.addEventListener('webkitfullscreenchange', syncFsLabel);
  fitLayout();
  window.addEventListener('resize', fitLayout);
  window.addEventListener('orientationchange', fitLayout);
  document.getElementById('wipe').onclick = function(){ freshSave(); openShop(); };
  const stageMenu = document.getElementById('stageMenu');
  if (stageMenu) stageMenu.onclick = exitStageToMenu;
  paintPilotChip();
  openShips();
  requestAnimationFrame(loop);
}

boot();
