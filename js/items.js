// ==================== ITEMS CONSUMIBLES ====================
// Curas y bombas se guardan y se usan con el panel, no al recogerlas.

const ITEM_MAX = 4;

function addItem(kind) {
  if (!player) return false;
  if (kind === 'heal') {
    if (player.heal >= ITEM_MAX) return false;
    player.heal++;
    return true;
  }
  if (kind === 'bomb') {
    if (player.bombs >= ITEM_MAX) return false;
    player.bombs++;
    return true;
  }
  return false;
}

function useHeal() {
  if (!player || screen !== 'play' || player.heal <= 0) return;
  if (player.hp >= player.maxHp) return;
  player.heal--;
  player.hp = Math.min(player.maxHp, player.hp + 3);
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

function refreshItems() {
  const h = document.getElementById('healN');
  const b = document.getElementById('bombN');
  if (h) h.textContent = player ? player.heal : 0;
  if (b) b.textContent = player ? player.bombs : 0;
}
