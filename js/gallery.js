// ==================== GALERÍA ====================

function syncPhotos() {
  save.photo = save.photo|0 || 1;
  save.life = save.life|0;
  while (save.photo <= 3 && save.life >= PHOTO_AT[save.photo - 1]) save.photo++;
}
function photoLocked(char) { return char.level >= (save.photo|0 || 1); }
function cosmOn(key) { return save.cosm && save.cosm[key] === true; }

function openGal() {
  if (screen === 'over') backScreen = 'over';
  else if (screen !== 'lib') backScreen = 'menu';
  syncPhotos();
  const char = CHARS[galIndex];
  const locked = photoLocked(char);
  const img = document.getElementById('galImg');
  img.src = char.base;
  img.style.filter = locked ? 'blur(35px)' : 'blur(0px)';
  let stars = locked ? 0 : 1;
  if (!locked) ['s1_outfit','s1_pose','s2_outfit','s2_pose'].forEach(function(k){ if (cosmOn(char.id+'_'+k)) stars++; });
  let html = '';
  for (let i = 0; i < 5; i++) html += '<span style="color:'+(i<stars?'#fbbf24':'#334155')+'">★</span>';
  document.getElementById('galStars').innerHTML = html;
  const need = save.photo <= 3 ? PHOTO_AT[save.photo - 1] : null;
  document.getElementById('galHint').textContent = need
    ? 'Gemas de por vida '+save.life+' / '+need+' para la siguiente foto.'
    : 'Fotos reveladas. Los sets se compran con gemas.';
  const btn = document.getElementById('galBuy');
  btn.textContent = locked ? 'Foto bloqueada' : 'Comprar outfits y poses';
  document.getElementById('galPrev').disabled = galIndex === 0;
  document.getElementById('galNext').disabled = galIndex === CHARS.length - 1;
  setScreen('gal');
}

function openLib() {
  const char = CHARS[galIndex];
  if (photoLocked(char)) return;
  document.getElementById('libGems').textContent = save.gems;
  const grid = document.getElementById('libGrid');
  grid.innerHTML = '';
  const base = document.createElement('div');
  base.className = 'cosm';
  base.innerHTML = '<img src="'+char.base+'" alt=""><button type="button">Base</button>';
  base.querySelector('button').style.background = '#0f766e';
  base.querySelector('img').onclick = function(){ showFs(char.base); };
  grid.appendChild(base);
  const items = [
    ['s1_outfit', char.s1.outfit, true],
    ['s1_pose', char.s1.pose, cosmOn(char.id+'_s1_outfit')],
    ['s2_outfit', char.s2.outfit, true],
    ['s2_pose', char.s2.pose, cosmOn(char.id+'_s2_outfit')]
  ];
  items.forEach(function(it){
    const key = char.id+'_'+it[0];
    const on = cosmOn(key);
    const cost = COSM_COST[it[0]];
    const box = document.createElement('div');
    box.className = 'cosm';
    const im = document.createElement('img');
    im.src = it[1];
    im.style.filter = on ? 'none' : 'blur(35px)';
    im.onclick = function(){ if (on) showFs(it[1]); };
    const b = document.createElement('button');
    if (on) { b.textContent = 'Comprado'; b.style.background = '#16a34a'; b.disabled = true; }
    else if (!it[2]) { b.textContent = 'Falta el outfit'; b.style.background = '#334155'; b.disabled = true; }
    else {
      b.textContent = 'Comprar 💎'+cost;
      b.className = 'buy';
      b.style.background = '#2563eb';
      b.onclick = function(){
        if (save.gems < cost) { alert('Te faltan '+(cost-save.gems)+' gemas.'); return; }
        save.gems -= cost;
        save.cosm[key] = true;
        persist();
        openLib();
      };
    }
    box.appendChild(im);
    box.appendChild(b);
    grid.appendChild(box);
  });
  setScreen('lib');
}

function showFs(src) {
  document.getElementById('fsImg').src = src;
  document.getElementById('fs').classList.remove('hidden');
}
