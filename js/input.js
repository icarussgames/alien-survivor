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
  stickEl.addEventListener('pointerdown', function(ev){
    ev.preventDefault();
    stickEl.setPointerCapture(ev.pointerId);
    initAudio();
    setKnob(ev.clientX, ev.clientY);
  });
  stickEl.addEventListener('pointermove', function(ev){
    if (!stickEl.hasPointerCapture(ev.pointerId)) return;
    setKnob(ev.clientX, ev.clientY);
  });
  stickEl.addEventListener('pointerup', resetKnob);
  stickEl.addEventListener('pointercancel', resetKnob);

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
