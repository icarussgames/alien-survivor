// ==================== GALERÍA ====================
// Las fotos del pack van en pack/char1, pack/char2 y pack/char3.
// Si un archivo no está, se usa la imagen de assets/.

var packSrc = {};

var PACK_SLOTS = ['base', 's1_outfit', 's1_pose', 's2_outfit', 's2_pose'];
var PACK_EXT = ['jpg', 'jpeg', 'png', 'webp'];

function packFolder(char) {
  return 'pack/char' + char.level;
}

function probeImage(url) {
  return new Promise(function(resolve) {
    const img = new Image();
    img.onload = function() { resolve(url); };
    img.onerror = function() { resolve(null); };
    img.src = url;
  });
}

function findPackFile(folder, slot) {
  var chain = Promise.resolve(null);
  PACK_EXT.forEach(function(ext) {
    chain = chain.then(function(found) {
      if (found) return found;
      return probeImage(folder + '/' + slot + '.' + ext);
    });
  });
  return chain;
}

function loadPack(char) {
  const folder = packFolder(char);
  return Promise.all(PACK_SLOTS.map(function(slot) {
    const key = char.id + '_' + slot;
    return findPackFile(folder, slot).then(function(url) {
      if (url) packSrc[key] = url;
      else delete packSrc[key];
    });
  }));
}

function syncPhotos() {
  save.photo = save.photo|0 || 1;
  save.life = save.life|0;
  if (save.life >= 220) save.photo = 4;
  else if (save.life >= 90) save.photo = 3;
  else save.photo = 2;
}
function photoLocked(char) {
  if (char.level <= 1) return false;
  if (char.level === 2) return (save.life|0) < 90;
  return (save.life|0) < 220;
}
function cosmOn(key) { return !!(save.cosm && save.cosm[key]); }

function slotSrc(slot, fallback) {
  return packSrc[slot] || fallback;
}

function openGal() {
  if (screen === 'over') backScreen = 'over';
  else if (screen !== 'lib') backScreen = 'menu';
  syncPhotos();
  loadPack(CHARS[galIndex]).then(function() {
    renderGal();
    setScreen('gal');
  }).catch(function() {
    renderGal();
    setScreen('gal');
  });
}

function renderGal() {
  document.getElementById('galHint').textContent = 'Gemas: ' + save.gems + ' · de por vida ' + (save.life|0);
  const tabs = document.getElementById('galTabs');
  tabs.innerHTML = '';
  CHARS.forEach(function(char, i){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (i === galIndex ? '' : ' ghost');
    b.textContent = 'Foto ' + char.level;
    b.onclick = function(){ galIndex = i; openGal(); };
    tabs.appendChild(b);
  });

  const shop = document.getElementById('galShop');
  shop.innerHTML = '';
  const char = CHARS[galIndex];
  const locked = photoLocked(char);
  const need = char.level === 2 ? 90 : (char.level === 3 ? 220 : 0);

  function row(label, fallback, slot, buyKey, cost, prereq) {
    const src = slotSrc(slot, fallback);
    const el = document.createElement('div');
    el.className = 'gal-item';
    const img = document.createElement('img');
    img.src = src;
    img.alt = label;
    const owned = buyKey ? cosmOn(buyKey) : true;
    if (locked || (buyKey && !owned)) img.style.filter = 'blur(18px)';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('b');
    title.textContent = label;
    const sub = document.createElement('span');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn buy';
    if (locked) {
      sub.textContent = 'Se abre con ' + need + ' gemas de por vida';
      btn.textContent = 'Bloqueada';
      btn.disabled = true;
    } else if (!buyKey || owned) {
      img.style.filter = 'none';
      sub.textContent = buyKey ? 'Comprado' : 'Ya visible';
      btn.textContent = 'Ver';
      btn.onclick = function(){ showFs(src); };
    } else if (!prereq) {
      sub.textContent = 'Primero el outfit';
      btn.textContent = 'Comprar';
      btn.disabled = true;
    } else {
      sub.textContent = 'Cuesta ' + cost + ' gemas';
      btn.textContent = 'Comprar 💎' + cost;
      btn.onclick = function(){
        if (save.gems < cost) { alert('Te faltan ' + (cost - save.gems) + ' gemas.'); return; }
        save.gems -= cost;
        if (!save.cosm) save.cosm = {};
        save.cosm[buyKey] = true;
        persist();
        renderGal();
      };
    }

    meta.appendChild(title);
    meta.appendChild(sub);
    meta.appendChild(btn);
    el.appendChild(img);
    el.appendChild(meta);
    shop.appendChild(el);
  }

  row('Base', char.base, char.id+'_base', null, 0, true);
  row('Outfit 1', char.s1.outfit, char.id+'_s1_outfit', char.id+'_s1_outfit', COSM_COST.s1_outfit, true);
  row('Pose 1', char.s1.pose, char.id+'_s1_pose', char.id+'_s1_pose', COSM_COST.s1_pose, cosmOn(char.id+'_s1_outfit'));
  row('Outfit 2', char.s2.outfit, char.id+'_s2_outfit', char.id+'_s2_outfit', COSM_COST.s2_outfit, true);
  row('Pose 2', char.s2.pose, char.id+'_s2_pose', char.id+'_s2_pose', COSM_COST.s2_pose, cosmOn(char.id+'_s2_outfit'));
}

function openLib() { openGal(); }

function showFs(src) {
  document.getElementById('fsImg').src = src;
  document.getElementById('fs').classList.remove('hidden');
}
