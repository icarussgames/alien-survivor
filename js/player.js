// ==================== STATS DE LA PARTIDA ====================
// Cada nivel sube una: Speed, Def o Atk.

var RUN = { spd: 0, def: 0, atk: 0 };

function resetRunStats() {
  RUN = { spd: 0, def: 0, atk: 0 };
}

function bumpStat(id) {
  if (id === 'spd' || id === 'def' || id === 'atk') RUN[id] += 1;
}

function moveNow() {
  const base = owned('botas') ? 190 : 145;
  return Math.round(base * (1 + RUN.spd * 0.06));
}

function fireNow() {
  return Math.max(0.18, 0.50 * Math.pow(0.89, RUN.spd));
}

function shotDmg() {
  const base = 1 + owned('dano');
  return Math.round(base * (1 + RUN.atk * 0.2) * 10) / 10;
}

function takenDmg(n) {
  const mul = Math.max(0.55, 1 - RUN.def * 0.075);
  return Math.max(1, Math.round(n * mul));
}

function statLine(id) {
  if (id === 'spd') {
    return 'Mov ' + moveNow() + ' · disparo ' + fireNow().toFixed(2) + 's';
  }
  if (id === 'def') {
    return 'Recibes ' + Math.round(Math.max(0.55, 1 - RUN.def * 0.075) * 100) + '%';
  }
  return 'Daño ' + shotDmg();
}

function nextStatLine(id) {
  const prev = RUN[id];
  RUN[id] = prev + 1;
  const line = statLine(id);
  RUN[id] = prev;
  return line;
}

function fireRate() { return fireNow(); }
function moveSpeed() { return moveNow(); }
function dmgNow() { return shotDmg(); }
