// ==================== INPUT: TECLADO + ANALOG STICK ====================

function held(code) { return !!keys[code]; }

function moveVector() {
  let mx = 0, my = 0;
  if (held('ArrowLeft') || held('KeyA')) mx -= 1;
  if (held('ArrowRight') || held('KeyD')) mx += 1;
  if (held('ArrowUp') || held('KeyW')) my -= 1;
  if (held('ArrowDown') || held('KeyS')) my += 1;
  if (mx || my) return { x:mx, y:my };
  if (stick.on) return { x:stick.x, y:stick.y };
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
    knob.style.left = (r.width / 2 + dx - 21) + 'px';
    knob.style.top = (r.height / 2 + dy - 21) + 'px';
    stick.on = len > 8;
    stick.x = dx / max;
    stick.y = dy / max;
  }
  function resetKnob() {
    stick.on = false; stick.x = 0; stick.y = 0;
    knob.style.left = '33px';
    knob.style.top = '33px';
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
  stickEl.addEventListener('pointercancel', endStick);

  window.addEventListener('keydown', function(ev){
    if (screen !== 'play') return;
    const move = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].indexOf(ev.code) >= 0;
    if (move) ev.preventDefault();
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
  if (menu) menu.textContent = on ? 'SALIR DE PANTALLA' : 'PANTALLA COMPLETA';
  const icon = document.getElementById('fsBtn');
  if (icon) icon.textContent = on ? '⤢' : '⛶';
}

function fitLayout() {
  const land = window.matchMedia('(orientation: landscape)').matches && window.innerWidth > window.innerHeight;
  const short = window.innerHeight <= 520;
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  document.body.classList.toggle('land', !!(land && short && touch));
}
