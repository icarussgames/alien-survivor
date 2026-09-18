// ==================== RUN BUFFS (Vampire Survivors-style) ====================

var BUFF_DEFS = [
  { id:'rapid',   name:'Rapid Fire',      icon:'⚡', max:5, desc:'Shorter fire cooldown.' },
  { id:'heavy',   name:'Heavy Shot',      icon:'💥', max:5, desc:'More bullet damage.' },
  { id:'twin',    name:'Twin Shot',       icon:'🔱', max:3, desc:'Extra projectiles in a small spread.' },
  { id:'pierce',  name:'Piercing',        icon:'🏹', max:3, desc:'Shots pass through enemies.' },
  { id:'orbit',   name:'Orbit Orbs',      icon:'🟣', max:5, desc:'Swirling damaging balls around you.' },
  { id:'pulse',   name:'Pulse Nova',      icon:'💫', max:5, desc:'Periodic shockwave nearby.' },
  { id:'shield',  name:'Shield',          icon:'🛡️', max:3, desc:'Absorbs hits; regenerates after a delay.' },
  { id:'thorns',  name:'Thorns Aura',     icon:'🌺', max:5, desc:'Damages enemies near you.' },
  { id:'magnet',  name:'Magnet Field',    icon:'🧲', max:5, desc:'Wider gem pull radius.' },
  { id:'vital',   name:'Vitality',        icon:'❤️', max:5, desc:'+max HP and heal a bit.' },
  { id:'dash',    name:'Dash Thrusters',  icon:'🚀', max:5, desc:'Move faster.' },
  { id:'missile', name:'Missile Barrage', icon:'🎯', max:5, desc:'Periodic homing side missiles.' }
];

var buffOrbs = [];
var pulseRings = [];

function emptyBuffs() {
  return {
    rapid:0, heavy:0, twin:0, pierce:0, orbit:0, pulse:0,
    shield:0, thorns:0, magnet:0, vital:0, dash:0, missile:0
  };
}

function buffLv(id) {
  return (RUN && RUN.buffs && RUN.buffs[id]) | 0;
}

function buffDef(id) {
  for (var i = 0; i < BUFF_DEFS.length; i++) {
    if (BUFF_DEFS[i].id === id) return BUFF_DEFS[i];
  }
  return null;
}

function eligibleBuffs() {
  return BUFF_DEFS.filter(function(b){ return buffLv(b.id) < b.max; });
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function pickBuffOffers(n) {
  return shuffleArray(eligibleBuffs()).slice(0, n);
}

function buffOfferLine(b) {
  const cur = buffLv(b.id);
  return 'Lv ' + cur + '→' + (cur + 1) + (cur + 1 >= b.max ? ' (max)' : '');
}

function applyBuff(id) {
  if (!RUN.buffs) RUN.buffs = emptyBuffs();
  const def = buffDef(id);
  if (!def || buffLv(id) >= def.max) return false;
  RUN.buffs[id] = buffLv(id) + 1;
  const lv = buffLv(id);

  if (id === 'vital' && player) {
    player.maxHp += 25;
    player.hp = Math.min(player.maxHp, player.hp + 20);
    player.healFlash = 0.28;
    flashAt(player.x, player.y, 24, 'rgba(80,255,160,.95)');
  }
  if (id === 'shield' && player) {
    player.shieldMax = lv;
    player.shieldCharges = Math.min(lv, (player.shieldCharges|0) + 1);
    player.shieldRegen = 0;
  }
  if (id === 'orbit') syncBuffOrbs();
  if (id === 'pulse' && player && (player.pulseT == null || player.pulseT > pulseCd())) {
    player.pulseT = Math.min(player.pulseT || pulseCd(), 0.6);
  }
  if (id === 'missile' && player && (player.missileT == null || player.missileT > missileCd())) {
    player.missileT = Math.min(player.missileT || missileCd(), 0.8);
  }
  if (id === 'thorns' && player) player.thornsT = player.thornsT || 0;
  beep(620, 0.1, 'square', 0.05);
  return true;
}

function syncBuffOrbs() {
  const lv = buffLv('orbit');
  if (lv <= 0) { buffOrbs = []; return; }
  const n = 1 + lv; // 2..6
  while (buffOrbs.length < n) {
    buffOrbs.push({ a: (buffOrbs.length / n) * Math.PI * 2, hit:{} });
  }
  while (buffOrbs.length > n) buffOrbs.pop();
  buffOrbs.forEach(function(o, i){
    o.a = (i / n) * Math.PI * 2;
  });
}

function pulseCd() {
  return Math.max(1.4, 3.6 - buffLv('pulse') * 0.4);
}
function pulseRadius() {
  return 52 + buffLv('pulse') * 18;
}
function pulseDmg() {
  return Math.round(dmgNow() * (0.85 + buffLv('pulse') * 0.2) * 10) / 10;
}

function thornsRadius() {
  return 30 + buffLv('thorns') * 8;
}
function thornsDmg() {
  return Math.round(dmgNow() * (0.35 + buffLv('thorns') * 0.12) * 10) / 10;
}

function missileCd() {
  return Math.max(1.2, 4.0 - buffLv('missile') * 0.45);
}
function missileCount() {
  const lv = buffLv('missile');
  return 1 + Math.floor((lv - 1) / 2);
}

function orbitRadius() {
  return 36 + buffLv('orbit') * 4;
}
function orbitSpeed() {
  return 2.0 + buffLv('orbit') * 0.35;
}
function orbitSize() {
  return 6 + buffLv('orbit') * 0.8;
}
function orbitDmg() {
  return Math.round(dmgNow() * (0.55 + buffLv('orbit') * 0.1) * 10) / 10;
}

function firePulseNova() {
  if (!player) return;
  const reach = pulseRadius();
  const dmg = pulseDmg();
  pulseRings.push({ x:player.x, y:player.y, reach:reach, life:0.38, max:0.38 });
  boomRings.push({ x:player.x, y:player.y, reach:reach, life:0.38, max:0.38 });
  enemies.slice().forEach(function(e){
    if (e.kind === 'rock') return;
    if (Math.hypot(e.x - player.x, e.y - player.y) >= reach + e.r) return;
    if (e.kind === 'mid') midExplode(e);
    else hitEnemy(e, dmg);
  });
  flashAt(player.x, player.y, reach * 0.35, 'rgba(122,247,255,.7)');
  beep(300, 0.1, 'triangle', 0.05);
}

function fireMissiles() {
  if (!player) return;
  const n = missileCount();
  const pool = enemies.filter(function(e){
    return e.kind !== 'rock' && e.kind !== 'mid';
  });
  for (let i = 0; i < n; i++) {
    let target = null;
    if (pool.length) {
      target = pool[Math.floor(Math.random() * pool.length)];
    } else {
      target = nearest();
    }
    let a = player.ang || 0;
    if (target) a = Math.atan2(target.y - player.y, target.x - player.x);
    else a += (i - (n - 1) / 2) * 0.4;
    const side = (i - (n - 1) / 2) * 0.55;
    const aa = a + side;
    const spd = 200;
    shots.push({
      x:player.x, y:player.y,
      vx:Math.cos(aa) * spd, vy:Math.sin(aa) * spd,
      r:5, dmg:Math.round(dmgNow() * 1.15 * 10) / 10,
      life:2.2, c:'#ff9f43',
      homing:true, target:target,
      pierceLeft:0, hit:[]
    });
  }
  beep(420, 0.06, 'square', 0.035);
}

function tickBuffs(dt) {
  if (!player) return;

  // Shield regen
  if (buffLv('shield') > 0) {
    player.shieldMax = buffLv('shield');
    if ((player.shieldCharges|0) < player.shieldMax) {
      player.shieldRegen = (player.shieldRegen || 0) - dt;
      if (player.shieldRegen <= 0) {
        player.shieldCharges = (player.shieldCharges|0) + 1;
        player.shieldRegen = (player.shieldCharges < player.shieldMax) ? 7.5 : 0;
        flashAt(player.x, player.y, 20, 'rgba(120,200,255,.85)');
        beep(700, 0.06, 'sine', 0.04);
      }
    }
  }

  // Orbit buff orbs
  if (buffLv('orbit') > 0) {
    if (buffOrbs.length !== 1 + buffLv('orbit')) syncBuffOrbs();
    const rad = orbitRadius();
    const spd = orbitSpeed();
    const sz = orbitSize();
    const dmg = orbitDmg();
    buffOrbs.forEach(function(o, i){
      o.a += dt * spd;
      o.x = player.x + Math.cos(o.a) * rad;
      o.y = player.y + Math.sin(o.a) * rad;
      o.r = sz;
      enemies.slice().forEach(function(e){
        if (e.kind === 'rock' || e.kind === 'mid') return;
        const key = e.x.toFixed(0) + ',' + e.y.toFixed(0) + ',' + (e.kind||'');
        // per-enemy cooldown via e.buffOrbT
        if ((e.buffOrbT||0) > 0) return;
        if (Math.hypot(e.x - o.x, e.y - o.y) < e.r + sz) {
          e.buffOrbT = 0.35;
          hitEnemy(e, dmg);
        }
      });
    });
  } else {
    buffOrbs = [];
  }

  // Decay buffOrbT on enemies
  enemies.forEach(function(e){
    if (e.buffOrbT > 0) e.buffOrbT -= dt;
  });

  // Pulse nova
  if (buffLv('pulse') > 0) {
    player.pulseT = (player.pulseT == null ? pulseCd() : player.pulseT) - dt;
    if (player.pulseT <= 0) {
      firePulseNova();
      player.pulseT = pulseCd();
    }
  }

  // Thorns aura
  if (buffLv('thorns') > 0) {
    player.thornsT = (player.thornsT || 0) - dt;
    if (player.thornsT <= 0) {
      player.thornsT = 0.42;
      const rad = thornsRadius();
      const dmg = thornsDmg();
      enemies.slice().forEach(function(e){
        if (e.kind === 'rock') return;
        if (Math.hypot(e.x - player.x, e.y - player.y) < rad + e.r) {
          if (e.kind === 'mid') return;
          hitEnemy(e, dmg);
        }
      });
    }
  }

  // Missiles
  if (buffLv('missile') > 0) {
    player.missileT = (player.missileT == null ? missileCd() : player.missileT) - dt;
    if (player.missileT <= 0) {
      fireMissiles();
      player.missileT = missileCd();
    }
  }

  // Pulse ring visuals
  pulseRings.forEach(function(b){ b.life -= dt; });
  pulseRings = pulseRings.filter(function(b){ return b.life > 0; });
}

function tryAbsorbShield() {
  if (!player || buffLv('shield') <= 0) return false;
  if ((player.shieldCharges|0) <= 0) return false;
  player.shieldCharges -= 1;
  player.ifr = 0.7;
  player.hitFlash = 0.15;
  player.shieldRegen = 7.5;
  flashAt(player.x, player.y, 28, 'rgba(120,200,255,.95)');
  beep(520, 0.1, 'triangle', 0.05);
  return true;
}

function drawBuffFx() {
  if (!player) return;

  // Thorns aura ring
  if (buffLv('thorns') > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,80,140,' + (0.25 + 0.15 * Math.sin(aliveTime * 6)) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, thornsRadius(), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Shield bubble
  if (buffLv('shield') > 0 && (player.shieldCharges|0) > 0) {
    ctx.save();
    const pulse = 0.45 + 0.2 * Math.sin(aliveTime * 5);
    ctx.strokeStyle = 'rgba(120,200,255,' + pulse + ')';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20 + player.shieldCharges * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,200,255,' + (0.08 * player.shieldCharges) + ')';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20 + player.shieldCharges * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Buff orbit orbs
  buffOrbs.forEach(function(o){
    if (o.x == null) return;
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r || 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Extra cyan pulse rings (on top of boom rings)
  pulseRings.forEach(function(b){
    const t = 1 - b.life / b.max;
    const r = 12 + (b.reach - 12) * t;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(122,247,255,' + (0.9 * (1 - t)) + ')';
    ctx.lineWidth = 5;
    ctx.stroke();
  });
}

function buffHudLine() {
  if (!RUN || !RUN.buffs) return '';
  const parts = [];
  BUFF_DEFS.forEach(function(b){
    const lv = buffLv(b.id);
    if (lv > 0) parts.push(b.icon + lv);
  });
  return parts.length ? parts.join(' ') : 'no buffs';
}
