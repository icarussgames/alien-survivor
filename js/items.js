// ==================== CONSUMABLE ITEMS ====================
// Heals/bombs: mode-dependent. Magnet and star are always use-on-pickup.

function healCap() { return 3 + (owned('capCura')|0); }
function bombCap() { return 3 + (owned('capBomba')|0); }

/** @type {'pickup'|'critical'|'manual'} */
var itemMode = 'manual';
var bombReady = true;

function setItemMode(mode) {
  if (mode === 'pickup' || mode === 'critical' || mode === 'manual') itemMode = mode;
  else itemMode = 'manual';
  try { localStorage.setItem('as_item_mode', itemMode); } catch (e) {}
  bombReady = true;
}

function loadItemMode() {
  try {
    const m = localStorage.getItem('as_item_mode');
    if (m === 'pickup' || m === 'critical' || m === 'manual') itemMode = m;
  } catch (e) {}
}

function addItem(kind) {
  if (!player) return false;
  if (kind === 'heal') {
    if (player.heal >= healCap()) return false;
    player.heal++;
    return true;
  }
  if (kind === 'bomb') {
    if (player.bombs >= bombCap()) return false;
    player.bombs++;
    return true;
  }
  return false;
}

function useHeal() {
  if (!player || screen !== 'play' || player.heal <= 0) return;
  if (player.hp >= player.maxHp) return;
  player.heal--;
  player.hp = Math.min(player.maxHp, player.hp + 40);
  player.healFlash = 0.28;
  flashAt(player.x, player.y, 22, 'rgba(80,255,160,.95)');
  beep(640, 0.1, 'sine', 0.05);
  refreshItems();
}

function useBomb() {
  if (!player || screen !== 'play' || player.bombs <= 0) return;
  player.bombs--;
  boom(player.x, player.y);
  refreshItems();
}

function applyHealPickup() {
  if (!player) return;
  player.hp = Math.min(player.maxHp, player.hp + 40);
  player.healFlash = 0.28;
  flashAt(player.x, player.y, 22, 'rgba(80,255,160,.95)');
  beep(640, 0.1, 'sine', 0.05);
}

function applyBombPickup() {
  if (!player) return;
  boom(player.x, player.y);
}

function takeHealOrBomb(kind) {
  if (itemMode === 'pickup') {
    if (kind === 'heal') applyHealPickup();
    else applyBombPickup();
    return true;
  }
  if (!addItem(kind)) return false;
  refreshItems();
  return true;
}

function refreshItems() {
  const h = document.getElementById('healN');
  const b = document.getElementById('bombN');
  if (h) h.textContent = player ? player.heal : 0;
  if (b) b.textContent = player ? player.bombs : 0;
}

function autoUseItems() {
  if (itemMode !== 'critical' || !player || screen !== 'play') return;
  while (player.hp < 50 && player.heal > 0 && player.hp < player.maxHp) useHeal();
  const near = enemies.filter(function(e) {
    if (e.kind === 'rock') return false;
    return Math.hypot(e.x - player.x, e.y - player.y) < WHIP_REACH;
  }).length;
  if (near < 6) bombReady = true;
  else if (bombReady && player.bombs > 0) {
    bombReady = false;
    useBomb();
  }
}
