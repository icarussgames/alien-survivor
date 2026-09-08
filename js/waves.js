// ==================== DIRECTOR DE OLEADAS ====================
// Elige fases al azar y suaviza la intensidad como una media móvil.
// El spawn sale de esa intensidad, no de un reloj fijo.

var WAVE_DIR = null;

var WAVE_PHASES = {
  relax:  { label:'Calma',    t:0.16, min:8,  max:14, next:['normal','relax','normal'] },
  normal: { label:'Normal',   t:0.42, min:16, max:32, next:['relax','hard','normal','hard'] },
  hard:   { label:'Intensa',  t:0.72, min:8,  max:14, next:['normal','spike','normal'] },
  spike:  { label:'Pico',     t:0.94, min:4,  max:7,  next:['hard','normal'] }
};

function resetWaves() {
  WAVE_DIR = { id:'normal', smooth:0.42, target:0.42, left:20, label:'Normal' };
}

function pickWave() {
  const cur = WAVE_PHASES[WAVE_DIR.id] || WAVE_PHASES.normal;
  const bag = cur.next;
  const id = bag[Math.floor(Math.random() * bag.length)];
  const phase = WAVE_PHASES[id];
  const span = phase.min + Math.random() * (phase.max - phase.min);
  const changed = id !== WAVE_DIR.id;
  WAVE_DIR.id = id;
  WAVE_DIR.target = phase.t;
  WAVE_DIR.left = span;
  WAVE_DIR.label = phase.label;
  if (changed && typeof banner === 'function') banner(phase.label);
}

function tickWaves(dt) {
  if (!WAVE_DIR) resetWaves();
  WAVE_DIR.left -= dt;
  if (WAVE_DIR.left <= 0) pickWave();
  const k = 1 - Math.exp(-dt / 1.7);
  WAVE_DIR.smooth += (WAVE_DIR.target - WAVE_DIR.smooth) * k;
}

function waveSpawn() {
  const heat = bossLive ? Math.min(WAVE_DIR.smooth, 0.4) : WAVE_DIR.smooth;
  const pressure = Math.min(1, (aliveTime || 0) / 480) + (bossesDown || 0) * 0.1;
  const every = Math.max(0.2, (1.18 - pressure * 0.28 - (bossesDown || 0) * 0.06) / (0.55 + heat * 1.45));
  const cap = Math.min(42, Math.round(5 + pressure * 7 + (bossesDown || 0) * 3 + heat * 11));
  return { every:every, cap:cap, heat:WAVE_DIR.smooth, label:WAVE_DIR.label };
}
