// ==================== AUDIO ====================
// SFX beeps + a tiny Web Audio chiptune. OGG/MP3 files also work via <audio>;
// MIDI needs an extra synth library — we skip that and generate notes here.

let audioCtx = null;
let musicOn = false;
let musicTimer = null;
let musicStep = 0;
let musicGain = null;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function beep(freq, dur, type, vol) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  g.gain.setValueAtTime(vol || 0.05, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}

// A minor / C pentatonic-ish loop (Hz).
const MUSIC_LEAD = [
  220, 0, 261.63, 0, 293.66, 261.63, 220, 0,
  174.61, 0, 196, 220, 261.63, 0, 246.94, 220,
  196, 0, 220, 246.94, 261.63, 293.66, 261.63, 0,
  220, 196, 174.61, 0, 196, 220, 0, 174.61
];
const MUSIC_BASS = [
  110, 110, 0, 110, 87.31, 87.31, 0, 87.31,
  98, 98, 0, 98, 110, 110, 0, 82.41
];

function musicTone(freq, dur, type, vol) {
  if (!audioCtx || !freq) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(musicGain || audioCtx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function musicTick() {
  if (!musicOn || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const i = musicStep % MUSIC_LEAD.length;
  const lead = MUSIC_LEAD[i];
  const bass = MUSIC_BASS[i % MUSIC_BASS.length];
  musicTone(bass, 0.18, 'triangle', 0.028);
  musicTone(lead, 0.14, 'square', 0.018);
  // soft hat
  if (i % 2 === 0) musicTone(900 + (i % 4) * 80, 0.03, 'square', 0.008);
  musicStep++;
}

function startMusic() {
  initAudio();
  if (musicOn) return;
  musicOn = true;
  musicStep = 0;
  if (!musicGain) {
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.55;
    musicGain.connect(audioCtx.destination);
  }
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = setInterval(musicTick, 180);
  musicTick();
}

function stopMusic() {
  musicOn = false;
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
