/**
 * Synthestesia V3.0 Orchestrator (app.js)
 * Clean, robust, and asynchronous module loader.
 */
import { AudioEngine }  from './audio-engine.js';
import { VisualEngine } from './visual-engine.js';

// Global context for Hydra
window.audioBass = 0;
window.audioMid = 0;
window.audioHigh = 0;
window.audioVol = 0;
window.audioBeat = 0;

// Color State
window.colorH = 150; // Neon Green base
window.colorS = 100;
window.colorL = 50;

document.addEventListener('DOMContentLoaded', () => {
  const audio = new AudioEngine();
  const visual = new VisualEngine();

  // Elements
  const $canvas = document.getElementById('hydra-canvas');
  const $btnMic = document.getElementById('btn-mic');
  const $btnUpload = document.getElementById('btn-upload');
  const $audioUpload = document.getElementById('audio-upload');
  const $btnRecord = document.getElementById('btn-record');
  const $btnScreen = document.getElementById('btn-screen');
  const $btnFullscreen = document.getElementById('btn-fullscreen');
  const $sensSlider = document.getElementById('sens-slider');
  const $hueSlider = document.getElementById('hue-slider');
  const $presetsContainer = document.getElementById('preset-buttons');
  const $warningScreen = document.getElementById('warning-screen');
  const $btnAccept = document.getElementById('btn-accept');

  const $playbackContainer = document.getElementById('playback-container');
  const $btnPlayPause = document.getElementById('btn-play-pause');
  const $timeCurrent = document.getElementById('time-current');
  const $timeTotal = document.getElementById('time-total');
  const $timelineSlider = document.getElementById('timeline-slider');

  // SVG Icons
  const iconPlay = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  const iconPause = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

  function formatTime(secs) {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  let isDraggingTimeline = false;
  if ($timelineSlider) {
    $timelineSlider.addEventListener('mousedown', () => isDraggingTimeline = true);
    $timelineSlider.addEventListener('mouseup', () => isDraggingTimeline = false);
    $timelineSlider.addEventListener('input', (e) => {
      audio.seek(parseFloat(e.target.value));
    });
  }

  if ($btnPlayPause) {
    $btnPlayPause.addEventListener('click', () => {
      const playing = audio.togglePlay();
      $btnPlayPause.innerHTML = playing ? iconPause : iconPlay;
    });
  }

  // Initialize UI (Presets)
  for (let i = 0; i < visual.numPresets; i++) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = i < 10 ? `0${i}` : i.toString();
    if (i === 0) btn.classList.add('active');
    
    btn.onclick = () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      visual.applyPreset(i);
    };
    $presetsContainer.appendChild(btn);
  }

  // Event: Accept Warning
  $btnAccept.addEventListener('click', () => {
    $warningScreen.style.opacity = '0';
    setTimeout(() => {
      $warningScreen.style.display = 'none';
      visual.init($canvas);
      loop();
    }, 500);
  });

  // Event: Mic
  $btnMic.addEventListener('click', async () => {
    const ok = await audio.startMic();
    if (ok) {
      $btnMic.classList.add('active');
      $btnMic.style.color = 'var(--accent)';
      $btnUpload.classList.remove('active');
      $btnUpload.style.color = '';
    }
  });

  // Event: File Upload
  $btnUpload.addEventListener('click', () => {
    $audioUpload.click();
  });

  $audioUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const ok = await audio.playFile(file);
      if (ok) {
        $btnUpload.classList.add('active');
        $btnUpload.style.color = 'var(--accent)';
        $btnMic.classList.remove('active');
        $btnMic.style.color = '';
        if ($playbackContainer) {
          $playbackContainer.style.display = 'block';
          $btnPlayPause.innerHTML = iconPause; // auto-plays on load
        }
      }
    }
  });

  // Event: Record
  let mediaRecorder = null;
  let recordedChunks = [];
  
  $btnRecord.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      $btnRecord.classList.remove('active');
      $btnRecord.style.color = '';
    } else {
      const stream = $canvas.captureStream(60);
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      }
      
      recordedChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `synthestesia_v3_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
      };
      
      mediaRecorder.start();
      $btnRecord.classList.add('active');
      $btnRecord.style.color = 'var(--danger)'; // Red for recording
    }
  });

  // Event: Screen Capture
  $btnScreen.addEventListener('click', async () => {
    try {
      await visual.toggleScreenCapture();
      if (visual.screenActive) {
        $btnScreen.classList.add('active');
        $btnScreen.style.color = 'var(--accent)';
      } else {
        $btnScreen.classList.remove('active');
        $btnScreen.style.color = '';
      }
    } catch (e) {
      console.warn("Screen capture failed:", e);
    }
  });

  // Event: Fullscreen
  $btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  // Event: Hue Slider
  if ($hueSlider) {
    $hueSlider.addEventListener('input', (e) => {
      window.colorH = parseInt(e.target.value);
    });
  }

  // Animation Loop
  function loop() {
    requestAnimationFrame(loop);

    const sens = $sensSlider ? parseFloat($sensSlider.value) : 1.0;
    
    // Update audio engine
    if (audio.isActive) {
      audio.update(sens);
      
      // Inject to globals
      window.audioBass = audio.bass;
      window.audioMid = audio.mid;
      window.audioHigh = audio.high;
      window.audioVol = audio.overall;
      window.audioBeat = audio.beat;

      // Update Timeline
      if (audio.fileAudio && $playbackContainer.style.display === 'block') {
        const t = audio.getAudioTime();
        const d = audio.getAudioDuration();
        if (!isDraggingTimeline && d > 0) {
          $timelineSlider.max = d;
          $timelineSlider.value = t;
          $timeCurrent.textContent = formatTime(t);
          $timeTotal.textContent = formatTime(d);
        }
      }
    }
  }

  // Resize handler
  window.addEventListener('resize', () => {
    const dpr = window.devicePixelRatio || 1;
    $canvas.width = window.innerWidth * dpr;
    $canvas.height = window.innerHeight * dpr;
    visual.setResolution($canvas.width, $canvas.height);
  });
});
