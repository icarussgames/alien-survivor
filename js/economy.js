// ==================== ECONOMÍA / TIENDA ====================

function price(u) {
  if (u.id === 'dano') return u.cost + owned('dano') * 8;
  return u.cost;
}
function nextIndex() {
  for (let i = 0; i < TREE.length; i++) {
    if (owned(TREE[i].id) < TREE[i].max) return i;
  }
  return TREE.length;
}

function openShop() {
  backScreen = screen === 'over' ? 'over' : 'menu';
  document.getElementById('shopGems').textContent = save.gems;
  const list = document.getElementById('shopList');
  list.innerHTML = '';
  const ni = nextIndex();
  TREE.forEach(function(u, i){
    const have = owned(u.id);
    const open = i <= ni && have < u.max;
    const row = document.createElement('div');
    row.className = 'row' + (open ? '' : ' lock');
    const left = document.createElement('div');
    left.innerHTML = '<b>'+u.icon+' '+u.name+'</b><span>'+u.desc+' · '+have+'/'+u.max+'</span>';
    row.appendChild(left);
    const b = document.createElement('button');
    b.className = 'btn buy';
    b.textContent = have >= u.max ? 'Listo' : (open ? 'Comprar 💎'+price(u) : 'Bloqueada');
    b.onclick = function(){
      if (!open || have >= u.max) return;
      const c = price(u);
      if (save.gems < c) { alert('Te faltan '+(c - save.gems)+' gemas.'); return; }
      save.gems -= c;
      save.up[u.id] = have + 1;
      if (u.id === 'piel') save.skin = 'piel';
      persist();
      openShop();
    };
    row.appendChild(b);
    list.appendChild(row);
  });
  setScreen('shop');
}

function collectGem(g) {
  runGems += g.v;
  save.gems += g.v;
  save.life = (save.life|0) + g.v;
  unlock('gema');
  syncPhotos();
  persist();
  xp += g.v;
  beep(720, 0.07, 'square', 0.04);
  particles.push({ x:g.x, y:g.y, vx:0, vy:-30, life:0.4, c:'#ff00ff', s:4 });
  if (xp >= xpNeed) {
    xp -= xpNeed;
    lvl += 1;
    xpNeed = 10 + lvl * 4;
    offerLevel();
  }
}

function collectPickup(g) {
  const kind = g.kind || 'gem';
  if (kind === 'heal' || kind === 'bomb') {
    if (!addItem(kind)) return;
    refreshItems();
    beep(500, 0.06, 'square', 0.04);
    return;
  }
  collectGem(g);
}
