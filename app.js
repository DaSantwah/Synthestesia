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
  const $btnScreen = document.getElementById('btn-screen');
  const $btnFullscreen = document.getElementById('btn-fullscreen');
  const $sensSlider = document.getElementById('sens-slider');
  const $hueSlider = document.getElementById('hue-slider');
  const $presetsContainer = document.getElementById('preset-buttons');
  const $warningScreen = document.getElementById('warning-screen');
  const $btnAccept = document.getElementById('btn-accept');

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
    if (!audio.isActive) {
      const ok = await audio.start();
      if (ok) {
        $btnMic.classList.add('active');
        $btnMic.style.color = 'var(--accent)';
      }
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
