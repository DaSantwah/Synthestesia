/**
 * Synthestesia — Main App
 *
 * New features vs v1:
 *  - Photosensitivity warning gate (must accept before app loads)
 *  - Microphone live input
 *  - Seek bar (scrub through audio)
 *  - PNG snapshot export
 *  - Web MIDI API integration (CC1 → colorH, CC2 → colorS, CC7 → colorL)
 *  - Hydra live-code editor panel
 *  - Extended audio globals: audioSub / audioLowMid / audioPresence / audioBrilliance
 *
 * Audio globals (window.*):
 *   audioBass / audioMid / audioHigh / audioVol
 *   audioSub / audioLowMid / audioPresence / audioBrilliance
 *
 * Color globals (window.*):
 *   colorH / colorS / colorL
 */

import { AudioAnalyzer }  from './audio-analyzer.js';
import { HydraController } from './hydra-controller.js';
import { VideoRecorder }   from './recorder.js';

// ── Audio globals ───────────────────────────────────────────────────
window.audioBass       = 0;
window.audioMid        = 0;
window.audioHigh       = 0;
window.audioVol        = 0;
window.audioSub        = 0;
window.audioLowMid     = 0;
window.audioPresence   = 0;
window.audioBrilliance = 0;

// ── Color globals ───────────────────────────────────────────────────
window.colorH = 270;
window.colorS = 85;
window.colorL = 50;

// ── Module instances ────────────────────────────────────────────────
let analyzer;
let hydraCtrl;
let recorder;

// ── DOM refs ────────────────────────────────────────────────────────
const $warningScreen   = document.getElementById('warning-screen');
const $app             = document.getElementById('app');
const $btnWarningAccept= document.getElementById('btn-warning-accept');

const $hydraCanvas     = document.getElementById('hydra-canvas');
const $specCanvas      = document.getElementById('spectrum-canvas');
const $uploadScreen    = document.getElementById('upload-screen');
const $controlBar      = document.getElementById('control-bar');
const $colorPanel      = document.getElementById('color-panel');
const $customPanel     = document.getElementById('custom-preset-panel');
const $dropZone        = document.getElementById('drop-zone');
const $fileInput       = document.getElementById('file-input');
const $btnMicStart     = document.getElementById('btn-mic-start');
const $trackName       = document.getElementById('track-name');
const $trackTime       = document.getElementById('track-time');
const $micIndicator    = document.getElementById('mic-indicator');
const $btnPlay         = document.getElementById('btn-play');
const $btnStop         = document.getElementById('btn-stop');
const $btnRecord       = document.getElementById('btn-record');
const $recLabel        = document.getElementById('rec-label');
const $btnDownload     = document.getElementById('btn-download');
const $btnReset        = document.getElementById('btn-reset');
const $btnToggleColor  = document.getElementById('btn-toggle-color');
const $btnSnapshot     = document.getElementById('btn-snapshot');
const $btnMidi         = document.getElementById('btn-midi');
const $btnCustomPreset = document.getElementById('btn-custom-preset');
const $btnScreen       = document.getElementById('btn-screen');
const $btnCpClose      = document.getElementById('btn-cp-close');
const $btnCpRun        = document.getElementById('btn-cp-run');
const $cpCode          = document.getElementById('custom-preset-code');
const $cpError         = document.getElementById('cp-error');
const $recIndicator    = document.getElementById('rec-indicator');
const $midiIndicator   = document.getElementById('midi-indicator');
const $presetBtns      = document.querySelectorAll('.preset-btn');
const $colorPreview    = document.getElementById('color-preview');
const $sliderHue       = document.getElementById('slider-hue');
const $sliderSat       = document.getElementById('slider-sat');
const $sliderLum       = document.getElementById('slider-lum');
const $hueValue        = document.getElementById('hue-value');
const $satValue        = document.getElementById('sat-value');
const $lumValue        = document.getElementById('lum-value');
const $colorPresetBtns = document.querySelectorAll('.color-preset-btn');
const $seekBar         = document.getElementById('seek-bar');
const $seekFill        = document.getElementById('seek-bar-fill');
const $sensSlider      = document.getElementById('sens-slider');

const specCtx = $specCanvas.getContext('2d');
let animFrameId = null;
let spectrumFrameCount = 0;
let _onEndedRef = null;   // stored for seek re-use

// ════════════════════════════════════════════════════════════════════
// PHOTOSENSITIVITY WARNING GATE
// ════════════════════════════════════════════════════════════════════
$btnWarningAccept.addEventListener('click', () => {
  $warningScreen.style.transition = 'opacity 0.6s ease';
  $warningScreen.style.opacity = '0';
  setTimeout(() => {
    $warningScreen.style.display = 'none';
    $app.classList.remove('hidden');
    
    // Instanciar aquí para evitar bloqueos de autoplay
    analyzer  = new AudioAnalyzer();
    hydraCtrl = new HydraController();
    recorder  = new VideoRecorder();
    
    initHydra();
  }, 600);
});

// ════════════════════════════════════════════════════════════════════
// INIT HYDRA (deferred until warning accepted)
// ════════════════════════════════════════════════════════════════════
function getOptimizedDimensions() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = window.innerWidth * dpr;
  let h = window.innerHeight * dpr;
  const maxW = 1600; // Balanced for pixel-perfect quality and stable 60 FPS
  if (w > maxW) {
    h = Math.round(h * (maxW / w));
    w = maxW;
  }
  return { w, h };
}

function initHydra() {
  const { w, h } = getOptimizedDimensions();
  $hydraCanvas.width  = w;
  $hydraCanvas.height = h;
  hydraCtrl.init($hydraCanvas);

  window.addEventListener('resize', () => {
    const { w, h } = getOptimizedDimensions();
    $hydraCanvas.width  = w;
    $hydraCanvas.height = h;
    hydraCtrl.setResolution(w, h);
  });
}

// ════════════════════════════════════════════════════════════════════
// ANIMATION LOOP
// ════════════════════════════════════════════════════════════════════
function loop() {
  animFrameId = requestAnimationFrame(loop);

  analyzer.update();

  const sens = $sensSlider ? parseFloat($sensSlider.value) : 1.2;

  // Core bands scaled by sensitivity
  window.audioBass = analyzer.bass * sens;
  window.audioMid  = analyzer.mid * sens;
  window.audioHigh = analyzer.high * sens;
  window.audioVol  = analyzer.overall * sens;

  // Extended bands scaled by sensitivity
  window.audioSub        = analyzer.sub * sens;
  window.audioLowMid     = analyzer.lowMid * sens;
  window.audioPresence   = analyzer.presence * sens;
  window.audioBrilliance = analyzer.brilliance * sens;

  // Beat transient triggers (not directly scaled to preserve 0.0 - 1.0 normalization)
  window.audioBeat       = analyzer.bassBeat;
  window.audioBeatMid    = analyzer.midBeat;

  drawSpectrum();
  updateTime();
  updateSeekBar();
}

// ════════════════════════════════════════════════════════════════════
// SPECTRUM
// ════════════════════════════════════════════════════════════════════
function drawSpectrum() {
  spectrumFrameCount++;
  if (spectrumFrameCount % 2 !== 0) return;

  const data = analyzer.getFullSpectrum();
  if (!data) return;

  const W = $specCanvas.width;
  const H = $specCanvas.height;
  specCtx.clearRect(0, 0, W, H);

  const sens = $sensSlider ? parseFloat($sensSlider.value) : 1.2;
  const BAR_COUNT = 60;
  const step  = Math.floor(data.length / BAR_COUNT);
  const barW  = W / BAR_COUNT;

  for (let i = 0; i < BAR_COUNT; i++) {
    const val  = (data[i * step] / 255) * sens;
    const barH = val * H;
    const hueShift = (window.colorH + i * 0.9) % 360;
    const sat  = window.colorS - i * 0.45;
    const lum  = window.colorL + i * 0.22;
    specCtx.fillStyle = `hsla(${hueShift}, ${sat}%, ${lum}%, 0.85)`;
    specCtx.fillRect(i * barW, H / 2 - barH / 2, Math.max(barW - 1, 1), barH);
  }
}

// ════════════════════════════════════════════════════════════════════
// TIME & SEEK BAR
// ════════════════════════════════════════════════════════════════════
function updateTime() {
  if (!analyzer.duration || analyzer.isMic) return;
  $trackTime.textContent = `${fmt(analyzer.currentTime)} / ${fmt(analyzer.duration)}`;
}

function updateSeekBar() {
  if (!analyzer.duration || analyzer.isMic) return;
  const pct = (analyzer.currentTime / analyzer.duration) * 1000;
  $seekBar.value = pct;
  $seekFill.style.width = `${(pct / 1000) * 100}%`;
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Seek interaction
let _seeking = false;
$seekBar.addEventListener('mousedown', () => { _seeking = true; });
$seekBar.addEventListener('touchstart', () => { _seeking = true; }, { passive: true });

$seekBar.addEventListener('input', () => {
  if (!analyzer.duration || analyzer.isMic) return;
  const t = (parseInt($seekBar.value, 10) / 1000) * analyzer.duration;
  $seekFill.style.width = `${($seekBar.value / 1000) * 100}%`;
  $trackTime.textContent = `${fmt(t)} / ${fmt(analyzer.duration)}`;
});

$seekBar.addEventListener('change', () => {
  _seeking = false;
  if (!analyzer.duration || analyzer.isMic) return;
  const t = (parseInt($seekBar.value, 10) / 1000) * analyzer.duration;
  analyzer.seek(t, onAudioEnded);
  if (recorder.isRecording) stopRecording();
});

// ════════════════════════════════════════════════════════════════════
// FILE LOADING
// ════════════════════════════════════════════════════════════════════
const AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a|aac|aiff|opus|weba|caf|au|wma|mp4)$/i;

async function handleFile(file) {
  if (!file) return;

  if (!file.type.startsWith('audio/') && !AUDIO_EXT.test(file.name)) {
    showError('Por favor selecciona un archivo de audio válido.');
    return;
  }

  try {
    const duration = await analyzer.loadFile(file);
    const name = file.name.replace(/\.[^.]+$/, '');
    $trackName.textContent = name.length > 32 ? name.slice(0, 30) + '…' : name;
    $trackTime.textContent = `0:00 / ${fmt(duration)}`;

    showPlayer(false);
    setPlayState(false);
    if (!animFrameId) loop();
  } catch (err) {
    console.error('[Synthestesia] Error loading audio:', err);
    showError('No se pudo decodificar el archivo. Intenta con otro formato.');
  }
}

// ════════════════════════════════════════════════════════════════════
// MICROPHONE
// ════════════════════════════════════════════════════════════════════
$btnMicStart.addEventListener('click', async () => {
  try {
    await analyzer.initMic();
    $trackName.textContent = 'MICRÓFONO EN VIVO';
    $trackTime.textContent = '—';
    $seekBar.disabled = true;
    $seekFill.style.width = '0%';
    showPlayer(true);
    setPlayState(true);
    if (!animFrameId) loop();
  } catch (err) {
    showError('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    console.error('[Synthestesia] Mic error:', err);
  }
});

function showPlayer(isMic) {
  $uploadScreen.classList.add('hidden');
  $controlBar.classList.remove('hidden');
  $specCanvas.classList.add('visible');
  $colorPanel.classList.add('hidden');
  $btnPlay.disabled = isMic;
  $btnStop.disabled = false;

  if (isMic) {
    $micIndicator.classList.remove('hidden');
    $trackTime.textContent = '—';
  } else {
    $micIndicator.classList.add('hidden');
    $seekBar.disabled = false;
  }
}

// ════════════════════════════════════════════════════════════════════
// PLAYBACK CONTROLS
// ════════════════════════════════════════════════════════════════════
$btnPlay.addEventListener('click', () => {
  _onEndedRef = onAudioEnded;
  analyzer.play(_onEndedRef);
  setPlayState(true);
});

$btnStop.addEventListener('click', () => {
  analyzer.stop();
  setPlayState(false);
  if (recorder.isRecording) stopRecording();
});

function onAudioEnded() {
  setPlayState(false);
  $seekBar.value = 0;
  $seekFill.style.width = '0%';
  if (recorder.isRecording) stopRecording();
}

function setPlayState(playing) {
  $btnPlay.disabled  = playing || analyzer.isMic;
  $btnStop.disabled  = !playing;
  resetHideTimer();
}

// ════════════════════════════════════════════════════════════════════
// SNAPSHOT (PNG export)
// ════════════════════════════════════════════════════════════════════
$btnSnapshot.addEventListener('click', () => {
  const link = document.createElement('a');
  const safeName = ($trackName.textContent || 'synthestesia')
    .replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
  link.download = `${safeName}_frame_${Date.now()}.png`;
  link.href = $hydraCanvas.toDataURL('image/png');
  link.click();
});

// ════════════════════════════════════════════════════════════════════
// WEB MIDI
// ════════════════════════════════════════════════════════════════════
let midiAccess = null;

$btnMidi.addEventListener('click', async () => {
  if (!navigator.requestMIDIAccess) {
    showError('Web MIDI no está soportado en este navegador. Prueba con Chrome.');
    return;
  }

  try {
    midiAccess = await navigator.requestMIDIAccess();
    attachMidiListeners();
    $midiIndicator.classList.remove('hidden');
    $btnMidi.classList.add('active');

    midiAccess.onstatechange = () => attachMidiListeners();

    const count = [...midiAccess.inputs.values()].length;
    if (count === 0) showError('MIDI conectado — no se detectaron dispositivos.');
    else showToast(`MIDI: ${count} dispositivo(s) detectado(s)`);
  } catch (err) {
    showError('No se pudo acceder a MIDI: ' + err.message);
  }
});

function attachMidiListeners() {
  if (!midiAccess) return;
  midiAccess.inputs.forEach(input => {
    input.onmidimessage = handleMidiMessage;
  });
}

function handleMidiMessage({ data }) {
  const [status, cc, value] = data;
  const norm = value / 127;

  // CC 1  → Hue      (modwheel)
  // CC 2  → Sat
  // CC 7  → Lum      (volume fader on most controllers)
  // CC 74 → Hue      (filter on many synths)
  if (cc === 1 || cc === 74) {
    window.colorH = Math.round(norm * 360);
    $sliderHue.value = window.colorH;
    $hueValue.textContent = `${window.colorH}°`;
    updateColorPreview();
  } else if (cc === 2) {
    window.colorS = Math.round(norm * 100);
    $sliderSat.value = window.colorS;
    $satValue.textContent = `${window.colorS}%`;
    updateColorPreview();
  } else if (cc === 7) {
    window.colorL = Math.round(norm * 100);
    $sliderLum.value = window.colorL;
    $lumValue.textContent = `${window.colorL}%`;
    updateColorPreview();
  }

  // Program Change (0xC0) → switch preset
  if ((status & 0xF0) === 0xC0) {
    const idx = value % hydraCtrl.numPresets;
    hydraCtrl.applyPreset(idx);
    $presetBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
  }
}

// ════════════════════════════════════════════════════════════════════
// LIVE CODE EDITOR
// ════════════════════════════════════════════════════════════════════
$btnCustomPreset.addEventListener('click', () => {
  $customPanel.classList.toggle('hidden');
  $colorPanel.classList.add('hidden');
});

// ════════════════════════════════════════════════════════════════════
// SCREEN SHARING (DJS LIVE SCREEN FEED IN HYDRA)
// ════════════════════════════════════════════════════════════════════
async function startScreenShareSession() {
  const stream = await hydraCtrl.toggleScreenCapture();
  if (!stream) return;

  $btnScreen.classList.add('active');
  
  // Extraer track de audio si existe
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length > 0) {
    // Si hay audio, ruteamos el stream al analizador
    const audioStream = new MediaStream(audioTracks);
    await analyzer.initSystemAudio(audioStream);
    
    $trackName.textContent = 'AUDIO DE VENTANA COMPARTIDA';
    $trackTime.textContent = '—';
    $seekBar.disabled = true;
    $seekFill.style.width = '0%';
    
    showPlayer(true);
    setPlayState(true);
    
    showToast('¡Reactividad por audio de ventana activa!');
  } else {
    // Si no hay audio, informamos al usuario
    showToast('Visual de ventana activa. Sin audio de ventana (marcar "Compartir audio").');
  }

  if (!animFrameId) loop();

  // Escuchar el evento final (por si cancela desde la barra flotante del navegador)
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.onended = () => {
      stopScreenShareSession();
    };
  }
}

async function stopScreenShareSession() {
  hydraCtrl.stopScreenCapture();
  $btnScreen.classList.remove('active');
  
  // Si el analizador estaba usando el audio de la ventana compartida, volver al estado anterior
  if (analyzer.isMic && $trackName.textContent === 'AUDIO DE VENTANA COMPARTIDA') {
    analyzer.stop();
    setPlayState(false);
    
    // Restaurar si había un archivo cargado
    if (analyzer.audioBuffer) {
      const name = $fileInput.files[0]?.name.replace(/\.[^.]+$/, '') || 'Archivo de audio';
      $trackName.textContent = name.length > 32 ? name.slice(0, 30) + '…' : name;
      $trackTime.textContent = `0:00 / ${fmt(analyzer.duration)}`;
      showPlayer(false);
    } else {
      // Si no, reiniciar al estado de subida
      $btnReset.click();
    }
  }
}

$btnScreen.addEventListener('click', async () => {
  try {
    if (hydraCtrl.screenActive) {
      await stopScreenShareSession();
    } else {
      await startScreenShareSession();
    }
  } catch (err) {
    console.error('[Synthestesia] Screen share error:', err);
    showError('No se pudo iniciar la captura de pantalla. Asegúrate de marcar "Compartir audio" en el diálogo.');
  }
});

$btnCpClose.addEventListener('click', () => {
  $customPanel.classList.add('hidden');
});

$btnCpRun.addEventListener('click', () => {
  const code = $cpCode.value.trim();
  if (!code) return;
  try {
    // eslint-disable-next-line no-eval
    eval(code);
    $cpError.classList.add('hidden');
    $cpError.textContent = '';
    // Deactivate all preset buttons since we're in custom mode
    $presetBtns.forEach(b => b.classList.remove('active'));
  } catch (err) {
    $cpError.textContent = err.message;
    $cpError.classList.remove('hidden');
  }
});

// Ctrl+Enter to run
$cpCode.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    $btnCpRun.click();
  }
});

// ════════════════════════════════════════════════════════════════════
// COLOR CONTROLS
// ════════════════════════════════════════════════════════════════════
function updateColorPreview() {
  $colorPreview.style.background = `hsl(${window.colorH}, ${window.colorS}%, ${window.colorL}%)`;
}

$btnToggleColor.addEventListener('click', () => {
  $colorPanel.classList.toggle('hidden');
  $customPanel.classList.add('hidden');
});

$sliderHue.addEventListener('input', (e) => {
  window.colorH = parseInt(e.target.value, 10);
  $hueValue.textContent = `${window.colorH}°`;
  updateColorPreview();
  hydraCtrl.applyPreset(hydraCtrl.currentPreset);
});
$sliderSat.addEventListener('input', (e) => {
  window.colorS = parseInt(e.target.value, 10);
  $satValue.textContent = `${window.colorS}%`;
  updateColorPreview();
  hydraCtrl.applyPreset(hydraCtrl.currentPreset);
});
$sliderLum.addEventListener('input', (e) => {
  window.colorL = parseInt(e.target.value, 10);
  $lumValue.textContent = `${window.colorL}%`;
  updateColorPreview();
  hydraCtrl.applyPreset(hydraCtrl.currentPreset);
});

const evaColorPresets = {
  'eva-purple': { h: 270, s: 85, l: 50 },
  'lcl-green':  { h: 130, s: 75, l: 45 },
  'ui-amber':   { h: 38,  s: 95, l: 55 },
  'at-cyan':    { h: 190, s: 80, l: 50 },
  'blood-red':  { h: 0,   s: 100, l: 45 },
};

$colorPresetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const p = evaColorPresets[btn.dataset.color];
    if (!p) return;
    window.colorH = p.h; window.colorS = p.s; window.colorL = p.l;
    $sliderHue.value = p.h; $sliderSat.value = p.s; $sliderLum.value = p.l;
    $hueValue.textContent = `${p.h}°`;
    $satValue.textContent = `${p.s}%`;
    $lumValue.textContent = `${p.l}%`;
    updateColorPreview();
    hydraCtrl.applyPreset(hydraCtrl.currentPreset);
  });
});

updateColorPreview();

// ════════════════════════════════════════════════════════════════════
// PRESET SELECTOR
// ════════════════════════════════════════════════════════════════════
$presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const idx = parseInt(btn.dataset.preset, 10);
    hydraCtrl.applyPreset(idx);
    $presetBtns.forEach(b => b.classList.toggle('active', b === btn));
    // Clear custom editor error when switching to a built-in preset
    $cpError.classList.add('hidden');
  });
});

// ════════════════════════════════════════════════════════════════════
// RECORDING
// ════════════════════════════════════════════════════════════════════
$btnRecord.addEventListener('click', async () => {
  if (recorder.isRecording) await stopRecording();
  else await startRecording();
});

async function startRecording() {
  $btnDownload.classList.add('hidden');
  $btnDownload.href = '';
  $colorPanel.classList.add('hidden');

  if (!analyzer.isMic) {
    analyzer.replay(async () => {
      await stopRecording();
      setPlayState(false);
    });
    setPlayState(true);
  }

  const audioStream = analyzer.getAudioStream();
  await recorder.start($hydraCanvas, audioStream);

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
    const safeName = ($trackName.textContent || 'synthestesia')
      .replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
    $btnDownload.download = `${safeName}_synthestesia.webm`;
    $btnDownload.href = url;
    $btnDownload.classList.remove('hidden');
  }
}

// ════════════════════════════════════════════════════════════════════
// RESET
// ════════════════════════════════════════════════════════════════════
$btnReset.addEventListener('click', () => {
  analyzer.unload();
  hydraCtrl.stopScreenCapture();
  $btnScreen.classList.remove('active');
  if (recorder.isRecording) recorder.stop();

  window.audioBass = window.audioMid = window.audioHigh = window.audioVol = 0;
  window.audioSub  = window.audioLowMid = window.audioPresence = window.audioBrilliance = 0;

  $uploadScreen.classList.remove('hidden');
  $controlBar.classList.add('hidden');
  $colorPanel.classList.add('hidden');
  $customPanel.classList.add('hidden');
  $specCanvas.classList.remove('visible');
  $btnDownload.classList.add('hidden');
  $recIndicator.classList.add('hidden');
  $midiIndicator.classList.add('hidden');
  $micIndicator.classList.add('hidden');
  $btnRecord.classList.remove('recording');
  $recLabel.textContent = 'REC';
  $seekBar.value = 0;
  $seekFill.style.width = '0%';
  $seekBar.disabled = false;
  $fileInput.value = '';

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
$fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

// ════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════
function showError(msg) {
  _toast(msg, '#ff3f3f', 'rgba(26,0,0,0.95)', 4500);
}

function showToast(msg) {
  _toast(msg, '#00ff55', 'rgba(0,20,8,0.95)', 3000);
}

function _toast(msg, color, bg, duration) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; top:20px; left:50%; transform:translateX(-50%);
    background:${bg}; border:1px solid ${color}; color:${color};
    font-family:'Space Mono',monospace; font-size:11px; letter-spacing:0.08em;
    padding:10px 22px; border-radius:2px; z-index:999;
    animation:fadeIn 0.2s ease; white-space:nowrap;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ════════════════════════════════════════════════════════════════════
// IMMERSIVE CONTROL AUTO-HIDE
// ════════════════════════════════════════════════════════════════════
let hideTimeout = null;

function resetHideTimer() {
  if (hideTimeout) clearTimeout(hideTimeout);
  
  if ($controlBar) $controlBar.classList.remove('hide-ui');
  document.body.classList.remove('nocursor');
  
  if (analyzer && analyzer.isPlaying) {
    const isPanelOpen = ($colorPanel && !$colorPanel.classList.contains('hidden')) || 
                        ($customPanel && !$customPanel.classList.contains('hidden'));
    if (isPanelOpen) return;
    
    hideTimeout = setTimeout(() => {
      if ($controlBar) $controlBar.classList.add('hide-ui');
      document.body.classList.add('nocursor');
    }, 3000);
  }
}

document.addEventListener('mousemove', resetHideTimer);
document.addEventListener('keydown', resetHideTimer);
document.addEventListener('click', resetHideTimer);
