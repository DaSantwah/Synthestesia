/**
 * HydraController
 *
 * Manages Hydra Synth initialization and audio-reactive preset switching.
 * 14 presets total with smooth, ethereal, psychedelic liquid vibes.
 * Now equipped with live screen capture blending for DJs and performers.
 */

// Translation function: Converts UI HSL to RGB for Hydra
function hsl2rgb(h, s, l) {
  s /= 100; 
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

export class HydraController {
  constructor() {
    this.hydra         = null;
    this.currentPreset = 0;
    this.numPresets    = 16;
    this.screenActive  = false; // Live desktop/window capture status
  }

  // ── Color Helper ──────────────────────────────────────────────────
  // Applies global HSL converted to RGB to Hydra and modulates with audio
  _c(modFunc = () => 1) {
    return [
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[0] * modFunc(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[1] * modFunc(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[2] * modFunc()
    ];
  }

  // Rotated HSL color helper for differentiating frequencies
  _cRot(offset, modFunc = () => 1) {
    return [
      () => hsl2rgb((window.colorH + offset) % 360, window.colorS, window.colorL)[0] * modFunc(),
      () => hsl2rgb((window.colorH + offset) % 360, window.colorS, window.colorL)[1] * modFunc(),
      () => hsl2rgb((window.colorH + offset) % 360, window.colorS, window.colorL)[2] * modFunc()
    ];
  }

  // ── Screen Feed Helper ────────────────────────────────────────────
  // Dynamically blends/modulates screen capture s0 when screenActive is true
  _s(chain) {
    if (this.screenActive) {
      return chain.blend(
        src(s0)
          .scale(() => 1.0 + audioBeat * 0.05)
          .colorama(() => audioBrilliance * 0.03)
          .modulate(osc(() => audioBass * 5).rotate(Math.PI / 2), () => audioMid * 0.1),
        () => 0.4 + audioBass * 0.2 // higher blend weight on bass drops!
      );
    }
    return chain;
  }

  // ── Screen Capture Lifecycle ──────────────────────────────────────
  async toggleScreenCapture() {
    if (this.screenActive) {
      this.stopScreenCapture();
      this.applyPreset(this.currentPreset);
      return null;
    } else {
      try {
        // Solicitar de forma activa video y audio interno de la ventana/pestaña
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        
        // Crear un puente de elemento video en memoria para alimentar a s0 de Hydra
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true; // Muteado para no retroalimentar sonido en las bocinas del DJ
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().catch(e => console.error('[Synthestesia] Error reproduciendo video de pantalla:', e));
        };

        s0.init({ src: video, dynamic: true });
        
        this.screenStream = stream;
        this.screenVideo = video;
        this.screenActive = true;
        this.applyPreset(this.currentPreset);
        
        return stream;
      } catch (err) {
        console.error('[Synthestesia] Screen capture initiation failed:', err);
        this.screenActive = false;
        throw err;
      }
    }
  }

  stopScreenCapture() {
    this.screenActive = false;
    try {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }
      if (this.screenVideo) {
        this.screenVideo.srcObject = null;
        this.screenVideo.remove();
        this.screenVideo = null;
      }
      if (s0 && s0.src) {
        s0.src = null;
      }
    } catch (err) {
      console.warn('[Synthestesia] Error stopping screen tracks:', err);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────
  init(canvas) {
    this.hydra = new Hydra({
      canvas,
      detectAudio:         false,
      enableStreamCapture: false,
      makeGlobal:          true,
      width:               canvas.width,
      height:              canvas.height,
    });
    this.playIdleVisuals();
  }

  // Visuales de reposo / HUD inactivo (Mecha/EVA-01) sin audio.
  playIdleVisuals() {
    solid(0.015, 0.004, 0.03) // Dark purple background
      .layer(
        shape(4, 0.01, 0)
          .scale(1, 100)
          .repeat(20, 20)
          .color(0.32, 1.0, 0.0) // Neon green grid
          .modulate(noise(2, 0.1).scrollX(0.5, 0.1))
          .mult(osc(10, 0.05, 0.5).color(0.48, 0.01, 0.92)) // Purple scanning lines
      )
      .layer(
        osc(20, -0.05, 0.8)
          .color(1.0, 0.34, 0.13) // Orange warning stripes
          .mask(shape(4, 0.8, 0.001).scrollX(0.2, 0.1))
          .luma(0.1)
      )
      .out();
  }

  setResolution(w, h) {
    if (this.hydra) {
      this.hydra.setResolution(w, h);
    }
  }


  // ── Preset Switcher ──────────────────────────────────────────────
  applyPreset(index) {
    this.currentPreset = ((index % this.numPresets) + this.numPresets) % this.numPresets;

    const presets = [
      this._p1_glitchCore,
      this._p2_shatterSpace,
      this._p3_laserGrid,
      this._p4_hyperDrive,
      this._p5_neonSpike,
      this._p6_acidBurn,
      this._p7_cyberScan,
      this._p8_chromaTear,
      this._p9_voidVortex,
      this._p10_dataBreach,
      this._p11_wireRupture,
      this._p12_plasmaStorm,
      this._p13_geoMelt,
      this._p14_strobeMatrix,
      this._p15_bassCrush,
      this._p16_systemCollapse
    ];
    
    solid(0, 0, 0, 1).out(o0);
    solid(0, 0, 0, 1).out(o1);
    solid(0, 0, 0, 1).out(o2);
    solid(0, 0, 0, 1).out(o3);

    try {
      presets[this.currentPreset].bind(this)();
    } catch (err) {
      console.warn("Preset error:", err);
      solid(0, 0, 0, 1).out(o0);
    }
  }

  // 1. Glitch Core
  _p1_glitchCore() {
    this._s(
      voronoi(() => 5 + audioBass * 10, () => audioMid * 2)
        .modulatePixelate(noise(() => audioHigh * 5), () => 10 + audioBeat * 50)
        .color(...this._c(() => 1 + audioVol))
        .diff(osc(() => 20 + audioBass * 50, 0.1, () => audioMid * 5).rotate(() => audioHigh))
    ).out();
  }

  // 2. Shatter Space
  _p2_shatterSpace() {
    this._s(
      shape(4, 0.5)
        .modulate(noise(() => 2 + audioBass * 4), () => audioMid * 2)
        .colorama(() => audioHigh * 0.1)
        .color(...this._cRot(90, () => audioVol * 2))
        .kaleid(() => 2 + Math.floor(audioBeat * 4))
    ).out();
  }

  // 3. Laser Grid
  _p3_laserGrid() {
    this._s(
      osc(50, 0.05, () => audioHigh * 2)
        .thresh(() => 0.8 - audioBeat * 0.4)
        .modulateScrollY(osc(10).rotate(Math.PI/2), () => audioBass * 3)
        .color(...this._c())
        .add(src(o0).scale(0.9).luma(0.1), () => audioMid)
    ).out();
  }

  // 4. Hyper Drive
  _p4_hyperDrive() {
    this._s(
      shape(3, 0.1)
        .repeat(() => 2 + audioBass * 10, () => 2 + audioMid * 10)
        .modulateRotate(noise(() => audioVol * 5), () => audioHigh * 3)
        .color(...this._cRot(45, () => audioBeat * 3 + 0.5))
        .scrollX(() => time * 2)
    ).out();
  }

  // 5. Neon Spike
  _p5_neonSpike() {
    this._s(
      voronoi(10, 2)
        .thresh(() => 0.5 - audioBass * 0.3)
        .modulateScale(osc(() => audioMid * 20), () => audioHigh * 5)
        .color(...this._c())
        .invert(() => audioBeat > 0.5 ? 1 : 0)
    ).out();
  }

  // 6. Acid Burn
  _p6_acidBurn() {
    this._s(
      osc(() => 10 + audioBass * 20, 0.1, () => audioMid * 5)
        .colorama(() => time * 0.5 + audioVol)
        .modulate(voronoi(() => audioHigh * 10), () => audioBass * 2)
        .color(...this._cRot(180, () => 2))
    ).out();
  }

  // 7. Cyber Scan
  _p7_cyberScan() {
    this._s(
      shape(2, () => 0.1 + audioBass * 0.5)
        .scale(() => 1, () => 0.05 + audioMid * 0.2)
        .scrollY(() => time * 2 + audioBeat * 0.5)
        .modulatePixelate(noise(5), () => 100 - audioHigh * 90)
        .color(...this._c())
    ).out();
  }

  // 8. Chroma Tear
  _p8_chromaTear() {
    this._s(
      noise(() => 5 + audioBass * 15)
        .modulate(osc(10).rotate(1.57), () => audioMid * 3)
        .colorama(() => audioHigh * 0.5)
        .color(...this._cRot(120, () => audioVol * 1.5))
    ).out();
  }

  // 9. Void Vortex
  _p9_voidVortex() {
    this._s(
      shape(100, 0.5)
        .modulateRotate(noise(() => audioBass * 5), () => audioMid * 5)
        .kaleid(() => 3 + Math.floor(audioHigh * 10))
        .color(...this._c())
        .diff(src(o0).scale(() => 0.9 - audioBeat * 0.2))
    ).out();
  }

  // 10. Data Breach
  _p10_dataBreach() {
    this._s(
      osc(() => audioBass * 50, 0.2, () => audioMid * 2)
        .thresh(0.4)
        .modulatePixelate(osc(10, 0, 0), () => audioHigh * 50)
        .color(...this._cRot(60, () => audioVol))
    ).out();
  }

  // 11. Wire Rupture
  _p11_wireRupture() {
    this._s(
      voronoi(() => audioHigh * 20, 0.0)
        .thresh(() => 0.7 - audioBass * 0.5)
        .modulate(noise(2), () => audioMid * 3)
        .color(...this._c())
        .invert(() => audioBeat)
    ).out();
  }

  // 12. Plasma Storm
  _p12_plasmaStorm() {
    this._s(
      noise(() => 3 + audioMid * 10, 0.2)
        .modulateScale(osc(5), () => audioBass * 5)
        .colorama(() => audioHigh * 0.2)
        .color(...this._cRot(200, () => audioVol * 2))
    ).out();
  }

  // 13. Geo Melt
  _p13_geoMelt() {
    this._s(
      shape(() => 3 + Math.floor(audioHigh * 4), 0.3)
        .repeat(3, 3)
        .modulate(voronoi(2), () => audioBass * 4)
        .color(...this._c())
        .add(src(o0).scrollY(() => audioMid * 0.5).luma(0.2))
    ).out();
  }

  // 14. Strobe Matrix
  _p14_strobeMatrix() {
    this._s(
      osc(() => 20 + audioBass * 20, 0.1, 0)
        .rotate(Math.PI/4)
        .thresh(() => 0.5 + Math.sin(time*10)*0.4)
        .color(...this._cRot(90, () => audioBeat * 5))
        .modulate(noise(() => audioHigh * 10), () => audioMid)
    ).out();
  }

  // 15. Bass Crush
  _p15_bassCrush() {
    this._s(
      shape(4, 0.8)
        .modulatePixelate(noise(5), () => 200 - audioBass * 180)
        .colorama(() => audioMid * 0.1)
        .color(...this._c())
        .kaleid(() => 1 + Math.floor(audioHigh * 5))
    ).out();
  }

  // 16. System Collapse
  _p16_systemCollapse() {
    this._s(
      src(o0)
        .modulate(noise(() => audioMid * 10), () => audioBass * 0.5)
        .layer(
          shape(4, 0.1)
            .luma()
            .color(...this._cRot(180, () => audioVol * 3))
            .scale(() => 0.5 + audioHigh * 2)
            .scrollY(() => time)
        )
        .blend(noise(3).color(1,1,1), 0.01)
        .invert(() => audioBeat > 0.8 ? 1 : 0)
    ).out();
  }
}
