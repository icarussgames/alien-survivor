// ==================== NIVELES / TECHOS ====================
// Cada 3 minutos sube un poco el techo de cadencia y daño, y las stats enemigas.

function tier() { return Math.floor((aliveTime || 0) / WAVE); }
function rateCap() { return 2 + tier(); }
function dmgCap() { return 3 + tier() * 2; }

function maxHp() { return 7 + (owned('vida') ? 2 : 0); }
function moveSpeed() { return owned('botas') ? 190 : 145; }
function magnet() { return owned('iman') ? 78 : 26; }

function basicHit() { return 1 + owned('dano'); }
function dmgNow() {
  const raw = basicHit() + ((player && player.mods && player.mods.dmg) || 0);
  return Math.min(dmgCap(), raw);
}
function fireRate() {
  const r = Math.min(rateCap(), (player && player.mods && player.mods.rate) || 0);
  return Math.max(0.22, 0.52 - r * 0.045 - tier() * 0.015);
}
function spreadNow() { return (player && player.mods && player.mods.spread) || 0; }
function magNow() { return magnet() + ((player && player.mods && player.mods.mag) || 0); }

function enemyScale() {
  const t = tier();
  return { hp: 1 + t * 0.16, spd: 1 + t * 0.08, dmg: 1 + t * 0.12 };
}

function nextBossIn() {
  const n = Math.floor(aliveTime / WAVE) + 1;
  return n * WAVE - aliveTime;
}
