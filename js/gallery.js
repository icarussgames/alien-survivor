// ==================== GALERÍA ====================
// Fotos propias se guardan en este navegador (IndexedDB), no en GitHub.

var customSrc = {};

function galDb() {
  return new Promise(function(resolve, reject) {
    const req = indexedDB.open('as_gallery', 1);
    req.onupgradeneeded = function() { req.result.createObjectStore('imgs'); };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function putCustom(slot, blob) {
  return galDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      const tx = db.transaction('imgs', 'readwrite');
      tx.objectStore('imgs').put(blob, slot);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
  });
}

function dropCustom(slot) {
  return galDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      const tx = db.transaction('imgs', 'readwrite');
      tx.objectStore('imgs').delete(slot);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
  });
}

function loadCustom(slot) {
  return galDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      const req = db.transaction('imgs').objectStore('imgs').get(slot);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { reject(req.error); };
    });
  }).then(function(blob) {
    if (!blob) {
      if (customSrc[slot]) URL.revokeObjectURL(customSrc[slot]);
      delete customSrc[slot];
      return null;
    }
    if (customSrc[slot]) URL.revokeObjectURL(customSrc[slot]);
    customSrc[slot] = URL.createObjectURL(blob);
    return customSrc[slot];
  });
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
  return customSrc[slot] || fallback;
}

function openGal() {
  if (screen === 'over') backScreen = 'over';
  else if (screen !== 'lib') backScreen = 'menu';
  syncPhotos();
  const char = CHARS[galIndex];
  const slots = [char.id+'_base', char.id+'_s1_outfit', char.id+'_s1_pose', char.id+'_s2_outfit', char.id+'_s2_pose'];
  Promise.all(slots.map(loadCustom)).then(function() {
    renderGal();
    setScreen('gal');
  }).catch(function() {
    renderGal();
    setScreen('gal');
  });
}

function renderGal() {
  document.getElementById('galHint').textContent = 'Gemas: ' + save.gems + ' · de por vida ' + (save.life|0) + ' · Tu foto queda solo en este navegador';
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
    const custom = !!customSrc[slot];
    const el = document.createElement('div');
    el.className = 'gal-item';
    const img = document.createElement('img');
    img.src = src;
    img.alt = label;
    const owned = buyKey ? cosmOn(buyKey) : true;
    if ((locked || (buyKey && !owned)) && !custom) img.style.filter = 'blur(18px)';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('b');
    title.textContent = label + (custom ? ' · tuya' : '');
    const sub = document.createElement('span');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn buy';
    if (locked && !custom) {
      sub.textContent = 'Se abre con ' + need + ' gemas de por vida';
      btn.textContent = 'Bloqueada';
      btn.disabled = true;
    } else if (!buyKey || owned || custom) {
      if (owned || custom) img.style.filter = 'none';
      sub.textContent = custom ? 'Foto local' : (buyKey ? 'Comprado' : 'Ya visible');
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

    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'btn ghost';
    pick.textContent = custom ? 'Cambiar' : 'Tu foto';
    pick.onclick = function(){
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = function(){
        const file = input.files && input.files[0];
        if (!file) return;
        putCustom(slot, file).then(function(){ return loadCustom(slot); }).then(function(){ renderGal(); });
      };
      input.click();
    };

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'btn ghost';
    clear.textContent = 'Quitar';
    clear.disabled = !custom;
    clear.onclick = function(){
      dropCustom(slot).then(function(){
        if (customSrc[slot]) URL.revokeObjectURL(customSrc[slot]);
        delete customSrc[slot];
        renderGal();
      });
    };

    meta.appendChild(title);
    meta.appendChild(sub);
    meta.appendChild(btn);
    meta.appendChild(pick);
    meta.appendChild(clear);
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
