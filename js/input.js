// ==================== INPUT: TECLADO + ANALOG STICK ====================

function held(code) { return !!keys[code]; }

var padMove = { x:0, y:0 };
var padPrev = {};

function pollGamepad() {
  padMove = { x:0, y:0 };
  if (!navigator.getGamepads) return;
  const list = navigator.getGamepads();
  let gp = null;
  for (let i = 0; i < list.length; i++) {
    if (list[i]) { gp = list[i]; break; }
  }
  if (!gp) return;
  const pressed = function(i) {
    return !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
  };
  let x = gp.axes[0] || 0;
  let y = gp.axes[1] || 0;
  if (Math.hypot(x, y) < 0.22) { x = 0; y = 0; }
  if (pressed(14)) x -= 1;
  if (pressed(15)) x += 1;
  if (pressed(12)) y -= 1;
  if (pressed(13)) y += 1;
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  padMove = { x:x, y:y };
  function edge(id, on) {
    const was = !!padPrev[id];
    padPrev[id] = on;
    return on && !was;
  }
  if (screen === 'stage') {
    if (edge('stageOk', pressed(0))) exitStageToMenu();
    return;
  }
  if (screen === 'level') {
    if (edge('lvUp', pressed(12) || pressed(14))) moveLevelPick(-1);
    if (edge('lvDown', pressed(13) || pressed(15))) moveLevelPick(1);
    if (edge('lvOk', pressed(0))) confirmLevelPick();
    return;
  }
  if (screen === 'play') {
    // A / Cross or RT dash. Square / X or L1 heal. Circle / B or R1 bomb.
    if (edge('dash', pressed(0) || pressed(7))) tryDash();
    if (edge('heal', pressed(2) || pressed(4))) useHeal();
    if (edge('bomb', pressed(1) || pressed(5))) useBomb();
  }
}

function moveVector() {
  let mx = 0, my = 0;
  if (held('ArrowLeft') || held('KeyA')) mx -= 1;
  if (held('ArrowRight') || held('KeyD')) mx += 1;
  if (held('ArrowUp') || held('KeyW')) my -= 1;
  if (held('ArrowDown') || held('KeyS')) my += 1;
  if (mx || my) return { x:mx, y:my };
  if (stick.on) return { x:stick.x, y:stick.y };
  if (padMove.x || padMove.y) return padMove;
  return { x:0, y:0 };
}

function bindInput() {
  const stickEl = document.getElementById('stick');
  const knob = document.getElementById('knob');
  function setKnob(px, py) {
    const r = stickEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = px - cx, dy = py - cy;
    const max = r.width * 0.34;
    const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(max, len);
    dx = dx / len * cl;
    dy = dy / len * cl;
    knob.style.left = (r.width / 2 + dx - knob.offsetWidth / 2) + 'px';
    knob.style.top = (r.height / 2 + dy - knob.offsetHeight / 2) + 'px';
    stick.on = len > 8;
    stick.x = dx / max;
    stick.y = dy / max;
  }
  function resetKnob() {
    stick.on = false; stick.x = 0; stick.y = 0;
    const w = stickEl.clientWidth || 108;
    const h = stickEl.clientHeight || 108;
    const kw = knob.offsetWidth || 42;
    const kh = knob.offsetHeight || 42;
    knob.style.left = ((w - kw) / 2) + 'px';
    knob.style.top = ((h - kh) / 2) + 'px';
  }
  let stickPointer = null;
  stickEl.addEventListener('pointerdown', function(ev){
    if (stickPointer != null && stickPointer !== ev.pointerId) return;
    ev.preventDefault();
    stickPointer = ev.pointerId;
    try { stickEl.setPointerCapture(ev.pointerId); } catch (e) {}
    initAudio();
    setKnob(ev.clientX, ev.clientY);
  });
  stickEl.addEventListener('pointermove', function(ev){
    if (ev.pointerId !== stickPointer) return;
    setKnob(ev.clientX, ev.clientY);
  });
  function endStick(ev) {
    if (stickPointer != null && ev.pointerId !== stickPointer) return;
    stickPointer = null;
    resetKnob();
  }
  stickEl.addEventListener('pointerup', endStick);
  const dashBtn = document.getElementById('useDash');
  if (dashBtn) dashBtn.addEventListener('pointerdown', function(ev){ ev.preventDefault(); initAudio(); tryDash(); });
  stickEl.addEventListener('pointercancel', endStick);

  window.addEventListener('keydown', function(ev){
    if (screen === 'stage') {
      if (ev.code === 'Enter' || ev.code === 'Space') { ev.preventDefault(); if (!ev.repeat) exitStageToMenu(); }
      return;
    }
    if (screen === 'level') {
      if (ev.code === 'ArrowUp' || ev.code === 'ArrowLeft') { ev.preventDefault(); if (!ev.repeat) moveLevelPick(-1); return; }
      if (ev.code === 'ArrowDown' || ev.code === 'ArrowRight') { ev.preventDefault(); if (!ev.repeat) moveLevelPick(1); return; }
      if (ev.code === 'Enter' || ev.code === 'Space') { ev.preventDefault(); if (!ev.repeat) confirmLevelPick(); return; }
      return;
    }
    if (screen !== 'play') return;
    const move = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].indexOf(ev.code) >= 0;
    if (move) ev.preventDefault();
    if ((ev.code === 'Space' || ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') && !ev.repeat) { ev.preventDefault(); tryDash(); }
    if (ev.code === 'Digit1' || ev.key === 'q' || ev.key === 'Q') useHeal();
    if (ev.code === 'Digit2' || ev.key === 'e' || ev.key === 'E') useBomb();
    keys[ev.code] = true;
    initAudio();
  });
  window.addEventListener('keyup', function(ev){ keys[ev.code] = false; });
  window.addEventListener('blur', function(){ keys = {}; stick.on = false; });
}


function bindPress(el, fn) {
  if (!el) return;
  el.addEventListener('pointerdown', function(ev) {
    if (ev.button != null && ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    fn();
  });
}

function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function toggleFullscreen() {
  const root = document.documentElement;
  if (isFullscreen()) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
    return;
  }
  const req = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!req) return;
  const p = req.call(root);
  if (p && p.catch) p.catch(function(){});
}

function syncFsLabel() {
  const on = isFullscreen();
  const menu = document.getElementById('fullBtn');
  if (menu) menu.textContent = on ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
  const icon = document.getElementById('fsBtn');
  if (icon) icon.textContent = on ? '⤢' : '⛶';
}

function fitApkArena() {
  const wrap = document.getElementById('wrap');
  const shell = document.getElementById('shell');
  if (!wrap || !shell) return;
  if (!document.body.classList.contains('apk-land') && !document.body.classList.contains('land')) {
    wrap.style.width = '';
    wrap.style.height = '';
    return;
  }
  const cs = getComputedStyle(shell);
  const cols = cs.gridTemplateColumns.split(' ').map(function(n){ return parseFloat(n) || 0; });
  const rows = cs.gridTemplateRows.split(' ').map(function(n){ return parseFloat(n) || 0; });
  const availW = cols.length >= 5 ? cols[2] : (cols[0] || shell.clientWidth);
  const availH = rows[0] || shell.clientHeight;
  const size = Math.max(64, Math.floor(Math.min(availW, availH)));
  wrap.style.width = size + 'px';
  wrap.style.height = size + 'px';
}

function fitLayout() {
  const apk = document.documentElement.classList.contains('android-apk');
  const land = window.matchMedia('(orientation: landscape)').matches && window.innerWidth > window.innerHeight;
  const short = window.innerHeight <= 520;
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  document.body.classList.toggle('apk-land', apk);
  document.body.classList.toggle('land', !apk && !!(land && short && touch));
  const phone = !apk && window.innerHeight > window.innerWidth && window.innerWidth <= 900;
  document.body.classList.toggle('phone-ui', phone && !document.body.classList.contains('land'));
  placeFieldHud();
  fitApkArena();
}

// Landscape: boss/star bars live in their own column beside the field.
// Portrait: they overlay the top of the field as before.
function placeFieldHud() {
  const fh = document.getElementById('fieldHud');
  const wrap = document.getElementById('wrap');
  if (!fh || !wrap) return;
  const side = document.body.classList.contains('apk-land') || document.body.classList.contains('land');
  if (side && fh.parentNode === wrap) wrap.parentNode.insertBefore(fh, wrap.nextSibling);
  else if (!side && fh.parentNode !== wrap) wrap.insertBefore(fh, document.getElementById('banner'));
}
