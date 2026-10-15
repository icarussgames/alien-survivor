// ==================== STATS DE LA PARTIDA ====================
// Run buffs (Vampire Survivors-style) live on RUN.buffs.
// Legacy spd/def/atk/mag kept for compatibility; level-ups use buffs.

var RUN = { spd: 0, def: 0, atk: 0, mag: 0, fan: 0, specs:{}, buffs: emptyBuffsSafe() };

function emptyBuffsSafe() {
  if (typeof emptyBuffs === 'function') return emptyBuffs();
  return {
    rapid:0, heavy:0, twin:0, pierce:0, orbit:0, pulse:0,
    shield:0, thorns:0, magnet:0, vital:0, dash:0, missile:0
  };
}

function resetRunStats() {
  RUN = { spd: 0, def: 0, atk: 0, mag: 0, fan: 0, specs:{}, buffs: emptyBuffsSafe() };
  if (save && save.specs && save.specs.fan) {
    RUN.fan = 1;
    RUN.specs.fan = true;
  }
  if (typeof buffOrbs !== 'undefined') buffOrbs = [];
  if (typeof pulseRings !== 'undefined') pulseRings = [];
}

function bumpStat(id) {
  if (id === 'spd' || id === 'def' || id === 'atk' || id === 'mag') RUN[id] += 1;
}

function pilotShip() {
  if (!save || typeof shipById !== 'function') return null;
  return shipById(save.pilot);
}

function maxHp() {
  const ship = pilotShip();
  const bonus = ship && ship.hpBonus ? ship.hpBonus : 0;
  return 150 + (owned('vida') ? 20 : 0) + bonus;
}

function moveNow() {
  const base = owned('botas') ? 190 : 145;
  const ship = pilotShip();
  const mul = ship && ship.spdMul ? ship.spdMul : 1;
  return Math.round(base * (1 + RUN.spd * 0.06) * mul);
}

function fireNow() {
  const rapid = (typeof buffLv === 'function' ? buffLv('rapid') : 0);
  return Math.max(0.12, 0.50 * Math.pow(0.89, RUN.spd) * Math.pow(0.88, rapid));
}

function shotDmg() {
  const base = 1 + owned('dano');
  const heavy = (typeof buffLv === 'function' ? buffLv('heavy') : 0);
  const ship = pilotShip();
  const mul = ship && ship.atkMul ? ship.atkMul : 1;
  return Math.round(base * (1 + RUN.atk * 0.2 + heavy * 0.25) * mul * 10) / 10;
}

function takenDmg(n) {
  const mul = Math.max(0.55, 1 - RUN.def * 0.075);
  return Math.max(1, Math.round(n * mul));
}

function statLine(id) {
  if (id === 'spd') {
    return 'Move ' + moveNow() + ' · fire ' + fireNow().toFixed(2) + 's';
  }
  if (id === 'def') {
    return 'Take ' + Math.round(Math.max(0.55, 1 - RUN.def * 0.075) * 100) + '%';
  }
  if (id === 'mag') return 'Radius ' + magRadius();
  return 'Damage ' + shotDmg();
}

function nextStatLine(id) {
  const prev = RUN[id];
  RUN[id] = prev + 1;
  const line = statLine(id);
  RUN[id] = prev;
  return line;
}

function magRadius() {
  const magBuff = (typeof buffLv === 'function' ? buffLv('magnet') : 0);
  return Math.round(magnet() + RUN.mag * 8 + magBuff * 14);
}
function grantFan() { RUN.fan = 1; }

function fireRate() { return fireNow(); }
function moveSpeed() { return moveNow(); }
function dmgNow() { return shotDmg(); }
function magNow() { return magRadius(); }
function spreadNow() {
  const twin = (typeof buffLv === 'function' ? buffLv('twin') : 0);
  return Math.max((player && player.mods && player.mods.spread) || 0, RUN.fan || 0) + twin;
}

// Un upgrade especial por jefe. Los siguientes se agregan acá.
var BOSS_REWARDS = [
  { kind:'fan', face:'✳️', label:'Triple shot' }
];

function bossReward(n) {
  return BOSS_REWARDS[n] || null;
}

function ownsSpecial(kind) {
  return !!(RUN.specs && RUN.specs[kind]);
}

function takeSpecial(kind) {
  if (!RUN.specs) RUN.specs = {};
  if (RUN.specs[kind]) return false;
  RUN.specs[kind] = true;
  if (kind === 'fan') {
    RUN.fan = 1;
    if (save) {
      save.specs = save.specs || {};
      save.specs.fan = true;
      persist();
    }
  }
  for (var i = 0; i < BOSS_REWARDS.length; i++) {
    if (BOSS_REWARDS[i].kind === kind) {
      banner(BOSS_REWARDS[i].label);
      break;
    }
  }
  beep(640, 0.12, 'square', 0.05);
  return true;
}

function specialFace(kind) {
  for (var i = 0; i < BOSS_REWARDS.length; i++) {
    if (BOSS_REWARDS[i].kind === kind) return BOSS_REWARDS[i].face;
  }
  return '✳️';
}

// ==================== DASH DODGE ====================
// Base tuning. Dash Thrusters buff: -0.3s cooldown and +12% distance per level.
var DASH_CD = 2.5;        // seconds
var DASH_DIST = 110;      // px
var DASH_TIME = 0.16;     // burst duration
var DASH_IFR = 0.25;      // invulnerable window

function dashLv() { return typeof buffLv === 'function' ? buffLv('dash') : 0; }
function dashCooldown() { return Math.max(1, DASH_CD - 0.3 * dashLv()); }
function dashDistance() { return DASH_DIST * (1 + 0.12 * dashLv()); }

function tryDash() {
  if (screen !== 'play' || !player || player.dying || player.hp <= 0) return false;
  if ((player.dashCd || 0) > 0) return false;
  const mv = typeof moveVector === 'function' ? moveVector() : { x:0, y:0 };
  let len = Math.hypot(mv.x, mv.y);
  let nx, ny;
  if (len > 0.08) { nx = mv.x / len; ny = mv.y / len; }
  else { nx = Math.cos(player.ang || 0); ny = Math.sin(player.ang || 0); }
  player.dashDx = nx; player.dashDy = ny;
  player.dashT = DASH_TIME;
  player.dashIfr = DASH_IFR;
  player.dashCdMax = dashCooldown();
  player.dashCd = player.dashCdMax;
  player.dashTrail = player.dashTrail || [];
  player.ang = Math.atan2(ny, nx);
  if (typeof beep === 'function') beep(520, 0.08, 'triangle', 0.04);
  return true;
}

// Returns true while the dash owns movement this frame.
function tickDash(dt) {
  player.dashCd = Math.max(0, (player.dashCd || 0) - dt);
  player.dashIfr = Math.max(0, (player.dashIfr || 0) - dt);
  const trail = player.dashTrail || (player.dashTrail = []);
  for (let i = trail.length - 1; i >= 0; i--) { trail[i].life -= dt; if (trail[i].life <= 0) trail.splice(i, 1); }
  if (!(player.dashT > 0)) return false;
  const v = dashDistance() / DASH_TIME;
  player.vx = player.dashDx * v;
  player.vy = player.dashDy * v;
  player.dashT -= dt;
  player.dashTrailT = (player.dashTrailT || 0) - dt;
  if (player.dashTrailT <= 0) {
    player.dashTrailT = 0.045;
    trail.push({ x: player.x, y: player.y, ang: player.ang, life: 0.22 });
  }
  if (player.dashT <= 0) {
    const keep = moveSpeed();
    player.vx = player.dashDx * keep;
    player.vy = player.dashDy * keep;
  }
  return true;
}
