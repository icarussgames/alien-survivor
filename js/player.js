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

function moveNow() {
  const base = owned('botas') ? 190 : 145;
  const dash = (typeof buffLv === 'function' ? buffLv('dash') : 0);
  return Math.round(base * (1 + RUN.spd * 0.06 + dash * 0.08));
}

function fireNow() {
  const rapid = (typeof buffLv === 'function' ? buffLv('rapid') : 0);
  return Math.max(0.12, 0.50 * Math.pow(0.89, RUN.spd) * Math.pow(0.88, rapid));
}

function shotDmg() {
  const base = 1 + owned('dano');
  const heavy = (typeof buffLv === 'function' ? buffLv('heavy') : 0);
  return Math.round(base * (1 + RUN.atk * 0.2 + heavy * 0.25) * 10) / 10;
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
