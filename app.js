/**
 * Synthestesia — Main App
 *
 * Orchestrates:
 *  - File drop / file input → AudioAnalyzer.loadFile()
 *  - Animation loop → analyzer.update() + spectrum draw + time display
 *  - Playback controls → play / stop
 *  - Preset selector → hydraCtrl.applyPreset()
 *  - Recording → recorder.start() / stop() + download link
 *  - Reset → return to upload screen
 *
 * Audio globals (written here, read by Hydra lambda functions):
 *   window.audioBass  [0, 1]
 *   window.audioMid   [0, 1]
 *   window.audioHigh  [0, 1]
 *   window.audioVol   [0, 1]
 */

import { AudioAnalyzer }  from './audio-analyzer.js';
import { HydraController } from './hydra-controller.js';
import { VideoRecorder }   from './recorder.js';

// ── Audio globals — read by Hydra's lambda functions ───────────────
window.audioBass = 0;
window.audioMid  = 0;
window.audioHigh = 0;
window.audioVol  = 0;

// ── Module instances ────────────────────────────────────────────────
const analyzer  = new AudioAnalyzer();
const hydraCtrl = new HydraController();
const recorder  = new VideoRecorder();

// ── DOM references ──────────────────────────────────────────────────
const $hydraCanvas    = document.getElementById('hydra-canvas');
const $specCanvas     = document.getElementById('spectrum-canvas');
const $uploadScreen   = document.getElementById('upload-screen');
const $controlBar     = document.getElementById('control-bar');
const $dropZone       = document.getElementById('drop-zone');
const $fileInput      = document.getElementById('file-input');
const $trackName      = document.getElementById('track-name');
const $trackTime      = document.getElementById('track-time');
const $btnPlay        = document.getElementById('btn-play');
const $btnStop        = document.getElementById('btn-stop');
const $btnRecord      = document.getElementById('btn-record');
const $recLabel       = document.getElementById('rec-label');
const $btnDownload    = document.getElementById('btn-download');
const $btnReset       = document.getElementById('btn-reset');
const $recIndicator   = document.getElementById('rec-indicator');
const $presetBtns     = document.querySelectorAll('.preset-btn');

const specCtx = $specCanvas.getContext('2d');

let animFrameId = null;

// ════════════════════════════════════════════════════════════════════
// INIT HYDRA
// ════════════════════════════════════════════════════════════════════
function resizeCanvas() {
  $hydraCanvas.width  = window.innerWidth;
  $hydraCanvas.height = window.innerHeight;
}
resizeCanvas();
hydraCtrl.init($hydraCanvas);

window.addEventListener('resize', () => {
  resizeCanvas();
  hydraCtrl.setResolution(window.innerWidth, window.innerHeight);
});

// ════════════════════════════════════════════════════════════════════
// ANIMATION LOOP
// ════════════════════════════════════════════════════════════════════
function loop() {
  animFrameId = requestAnimationFrame(loop);

  // 1. Pull fresh FFT data from the audio analyser
  analyzer.update();

  // 2. Push into global window vars (Hydra lambdas read these)
  window.audioBass = analyzer.bass;
  window.audioMid  = analyzer.mid;
  window.audioHigh = analyzer.high;
  window.audioVol  = analyzer.overall;

  // 3. Draw mini spectrum
  drawSpectrum();

  // 4. Sync time display
  updateTime();
}

// ════════════════════════════════════════════════════════════════════
// SPECTRUM VISUALIZER (mini canvas above control bar)
// ════════════════════════════════════════════════════════════════════
function drawSpectrum() {
  const data = analyzer.getFullSpectrum();
  if (!data) return;

  const W = $specCanvas.width;  // 480
  const H = $specCanvas.height; // 56

  specCtx.clearRect(0, 0, W, H);

  const BAR_COUNT = 90;
  const step  = Math.floor(data.length / BAR_COUNT);
  const barW  = W / BAR_COUNT;

  for (let i = 0; i < BAR_COUNT; i++) {
    const val  = data[i * step] / 255;     // normalize
    const barH = val * H;

    // Color shifts from amber (bass) through yellow (mid) to warm white (high)
    const hue  = 38 + i * 0.6;
    const sat  = 100 - i * 0.5;
    const lum  = 50 + i * 0.15;
    specCtx.fillStyle = `hsla(${hue}, ${sat}%, ${lum}%, 0.85)`;

    // Mirror: bottom half normal, top half mirrored (symmetric waveform)
    specCtx.fillRect(i * barW, H / 2 - barH / 2, Math.max(barW - 1, 1), barH);
  }
}

// ════════════════════════════════════════════════════════════════════
// TIME DISPLAY
// ════════════════════════════════════════════════════════════════════
function updateTime() {
  if (!analyzer.duration) return;
  $trackTime.textContent = `${fmt(analyzer.currentTime)} / ${fmt(analyzer.duration)}`;
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ════════════════════════════════════════════════════════════════════
// FILE LOADING
// ════════════════════════════════════════════════════════════════════
async function handleFile(file) {
  if (!file) return;

  if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a|aac|aiff)$/i)) {
    showError('Por favor selecciona un archivo de audio válido (MP3, WAV, FLAC, etc.)');
    return;
  }

  try {
    const duration = await analyzer.loadFile(file);

    // Strip file extension for display name
    const name = file.name.replace(/\.[^.]+$/, '');
    $trackName.textContent = name.length > 32 ? name.slice(0, 30) + '…' : name;
    $trackTime.textContent = `0:00 / ${fmt(duration)}`;

    // Transition to player UI
    $uploadScreen.classList.add('hidden');
    $controlBar.classList.remove('hidden');
    $specCanvas.classList.add('visible');

    // Reset playback buttons
    setPlayState(false);

    // Start animation loop if not already running
    if (!animFrameId) loop();

  } catch (err) {
    console.error('[HydraVis] Error loading audio:', err);
    showError('No se pudo decodificar el archivo. Intenta con otro formato.');
  }
}

// ════════════════════════════════════════════════════════════════════
// PLAYBACK CONTROLS
// ════════════════════════════════════════════════════════════════════
$btnPlay.addEventListener('click', () => {
  analyzer.play(onAudioEnded);
  setPlayState(true);
});

$btnStop.addEventListener('click', () => {
  analyzer.stop();
  setPlayState(false);
  if (recorder.isRecording) stopRecording();
});

function onAudioEnded() {
  setPlayState(false);
  if (recorder.isRecording) stopRecording();
}

/** Update play/stop button disabled states */
function setPlayState(playing) {
  $btnPlay.disabled = playing;
  $btnStop.disabled = !playing;
}

// ════════════════════════════════════════════════════════════════════
// PRESET SELECTOR
// ════════════════════════════════════════════════════════════════════
$presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const idx = parseInt(btn.dataset.preset, 10);
    hydraCtrl.applyPreset(idx);
    $presetBtns.forEach(b => b.classList.toggle('active', b === btn));
  });
});

// ════════════════════════════════════════════════════════════════════
// RECORDING
// ════════════════════════════════════════════════════════════════════
$btnRecord.addEventListener('click', async () => {
  if (recorder.isRecording) {
    await stopRecording();
  } else {
    await startRecording();
  }
});

async function startRecording() {
  // Reset download link from previous session
  $btnDownload.classList.add('hidden');
  $btnDownload.href = '';

  // Restart audio from the beginning so video and audio are in sync
  analyzer.replay(async () => {
    // Audio ended naturally → auto-stop recording
    await stopRecording();
    setPlayState(false);
  });
  setPlayState(true);

  // Start capturing
  const audioStream = analyzer.getAudioStream();
  await recorder.start($hydraCanvas, audioStream);

  // Update UI
  $recLabel.textContent = 'DETENER';
  $btnRecord.classList.add('recording');
  $recIndicator.classList.remove('hidden');
}

async function stopRecording() {
  const url = await recorder.stop();

  $recLabel.textContent = 'REC';
  $btnRecord.classList.remove('recording');
  $recIndicator.classList.add('hidden');

  if (url) {
    // Build a filename from the track name
    const safeName = ($trackName.textContent || 'hydravis')
      .replace(/[^a-z0-9_\-]/gi, '_')
      .toLowerCase();
    $btnDownload.download = `${safeName}_hydravis.webm`;
    $btnDownload.href = url;
    $btnDownload.classList.remove('hidden');
  }
}

// ════════════════════════════════════════════════════════════════════
// RESET
// ════════════════════════════════════════════════════════════════════
$btnReset.addEventListener('click', () => {
  // Stop everything
  analyzer.stop();
  if (recorder.isRecording) recorder.stop();

  // Reset audio globals
  window.audioBass = 0;
  window.audioMid  = 0;
  window.audioHigh = 0;
  window.audioVol  = 0;

  // Reset UI
  $uploadScreen.classList.remove('hidden');
  $controlBar.classList.add('hidden');
  $specCanvas.classList.remove('visible');
  $btnDownload.classList.add('hidden');
  $recIndicator.classList.add('hidden');
  $btnRecord.classList.remove('recording');
  $recLabel.textContent = 'REC';
  $fileInput.value = '';

  // Stop animation loop
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
});

// ════════════════════════════════════════════════════════════════════
// DRAG & DROP
// ════════════════════════════════════════════════════════════════════
$dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  $dropZone.classList.add('drag-over');
});

['dragleave', 'dragend'].forEach(evt =>
  $dropZone.addEventListener(evt, () => $dropZone.classList.remove('drag-over'))
);

$dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  $dropZone.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});

$fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
});

// ════════════════════════════════════════════════════════════════════
// UTILITY
// ════════════════════════════════════════════════════════════════════
function showError(msg) {
  // Simple non-blocking error — replace with a toast if desired
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: #1a0000; border: 1px solid #ff3f3f; color: #ff3f3f;
    font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.08em;
    padding: 12px 24px; border-radius: 2px; z-index: 999;
    animation: fadeIn 0.2s ease;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
