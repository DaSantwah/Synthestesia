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
    this.applyPreset(0);
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
      this._p1_liquidPulse,
      this._p2_psychedelicTide,
      this._p3_astralGeometry,
      this._p4_porcaroCascades,
      this._p5_etherealBloom,
      this._p6_evaSyncWaves,
      this._p7_lclEcho,
      this._p8_neonWake,
      this._p9_deepCurrent,
      this._p10_dreamScan,
      this._p11_velvetShift,
      this._p12_silkPhase,
      this._p13_gentleVortex,
      this._p14_timeWarp,
      this._p15_infiniteTunnel,
      this._p16_reactiveSphere,
    ];

    presets[this.currentPreset].call(this);
  }

  // ── PRESET 01 · Liquid Pulse ──────────────────────────────────────
  _p1_liquidPulse() {
    this._s(
      osc(() => audioLowMid * 8 + 4, 0.03, () => audioHigh * 1.5)
        .modulate(noise(() => audioBass * 2 + 1, 0.03), () => audioMid * 0.5 + 0.2)
        .colorama(() => audioBrilliance * 0.1 + audioBeat * 0.05)
        .color(...this._c(() => 0.5 + audioMid * 0.3 + audioBeat * 0.4))
        .scale(() => 1 + audioBeat * 0.12)
        .rotate(() => audioVol * 0.3, 0.005)
    ).out(o0);
  }

  // ── PRESET 02 · Psychedelic Tide ──────────────────────────────────
  _p2_psychedelicTide() {
    this._s(
      voronoi(() => 4 + audioMid * 4, 0.05)
        .diff(osc(() => 2 + audioBass * 10, 0.1).rotate(() => audioLowMid * 0.5))
        .kaleid(() => Math.round(audioHigh * 4) + 3)
        .color(...this._cRot(180, () => 1.0 + audioBeat * 0.8)) // Strong complementary flash
        .modulateScale(noise(3, 0.1), () => audioBass * 1.5) // Explosive reactive geometry
        .blend(noise(() => 2 + audioBass * 3, 0.01), 0.1)
    ).out(o0);
  }

  // ── PRESET 03 · Astral Geometry ───────────────────────────────────
  _p3_astralGeometry() {
    this._s(
      shape(4, 0.5, 0.1)
        .repeat(3, 3)
        .modulateScrollY(osc(() => 2 + audioBass * 15, 0.1), () => audioMid * 0.5)
        .kaleid(4)
        .color(...this._cRot(90, () => 1.0 + audioBeat * 0.5))
        .add(
          src(o0).scale(() => 0.9 - audioBass * 0.2).rotate(() => time * 0.2), 
          () => 0.6 + audioVol * 0.2
        )
        .scale(() => 1.0 + audioBass * 0.5) // Violent zoom on bass
    ).out(o0);
  }

  // ── PRESET 04 · Porcaro Cascades ──────────────────────────────────
  _p4_porcaroCascades() {
    this._s(
      osc(() => audioMid * 12 + 8, 0.015, () => audioHigh * 1.5)
        .modulateScale(noise(() => audioBass * 1.5 + 0.5, 0.02), () => audioLowMid * 0.4 + 0.1)
        .color(...this._c(() => 0.6 + audioHigh * 0.4))
        .mult(osc(8, 0.01).rotate(() => audioVol * 0.15))
    ).out(o0);
  }

  // ── PRESET 05 · Ethereal Bloom ────────────────────────────────────
  _p5_etherealBloom() {
    this._s(
      noise(() => 2 + audioSub * 5, 0.05)
        .modulatePixelate(voronoi(() => 5 + audioMid * 5, 0.05), () => 10 + audioBass * 100) // Huge pixelation bursts
        .colorama(() => audioBrilliance * 0.5)
        .color(...this._cRot(45, () => 1.2 + audioLowMid * 0.8))
        .modulate(src(o0).scale(1.05), () => audioBass * 0.5) // Liquid feedback
    ).out(o0);
  }

  // ── PRESET 06 · EVA Sync Waves ────────────────────────────────────
  _p6_evaSyncWaves() {
    this._s(
      osc(
        () => audioMid * 35 + 6 + audioBeatMid * 10,
        () => audioBass * 0.3 + 0.1,
        () => audioHigh * 3.2
      )
      .modulateRotate(
        osc(() => audioMid * 18).rotate(() => audioBass * 2.2),
        () => audioBass * 0.8 + audioBeat * 0.4
      )
      .color(...this._c(() => 0.4 + (audioBass + audioMid) * 0.3 + audioBeat * 0.4))
      .mult(noise(() => audioMid * 2.8, 0.02))
      .kaleid(() => Math.round(audioHigh * 5 + audioBeatMid * 3) + 2)
      .scale(() => 1 - audioBeat * 0.08)
    ).out(o0);
  }

  // ── PRESET 07 · LCL Echo ──────────────────────────────────────────
  _p7_lclEcho() {
    this._s(
      src(o0)
        .scale(() => 1 - audioBass * 0.01)
        .rotate(() => audioMid * 0.01, 0.002)
        .blend(
          shape(4, () => 0.4 + audioHigh * 0.2, 0.08)
            .modulate(osc(() => audioBass * 6 + 2, 0.02), 0.3)
            .color(...this._c(() => audioVol * 1.2))
            .scrollX(() => audioLowMid * 0.02),
          () => 0.1 + audioHigh * 0.15
        )
    ).out(o0);
  }

  // ── PRESET 08 · Vaporwave Retro-Grid ──────────────────────────────
  _p8_neonWake() {
    this._s(
      shape(4, 0.9, 0.01)
        .scale(() => 1, () => window.innerHeight / window.innerWidth)
        .repeat(20, 20)
        .modulateScale(osc(10).rotate(1.57), 0.5)
        .scrollY(() => time * 0.2 + audioLowMid * 0.05)
        .color(...this._cRot(240, () => 0.5 + audioBass * 0.5)) // Triadic secondary color
        .add(
          shape(20, () => 0.3 + audioMid * 0.1, 0.2)
            .color(...this._cRot(30, () => 1.0)) // Analogous bright sun
            .scrollY(-0.2), 
          () => 0.8 + audioVol * 0.2
        )
        .add(
          src(o0).scale(1.02).modulate(noise(2), 0.01), // Retro trailing effect
          0.1
        )
    ).out(o0);
  }

  // ── PRESET 09 · Deep Current ──────────────────────────────────────
  _p9_deepCurrent() {
    this._s(
      src(o0)
        .scale(() => 1.01 + audioBass * 0.01)
        .rotate(0.002)
        .blend(
          osc(() => audioLowMid * 10 + 5, 0.02, () => audioHigh * 0.5)
            .modulate(osc(() => audioBass * 10).rotate(Math.PI / 2), () => audioMid * 0.3)
            .color(...this._c(() => 0.5 + audioBass * 0.5)),
          () => 0.2 + audioVol * 0.15
        )
    ).out(o0);
  }

  // ── PRESET 10 · CRT Glitch Scanlines ──────────────────────────────
  _p10_dreamScan() {
    this._s(
      src(o0)
        .scrollX(() => (audioMid - 0.5) * 0.2 * audioBeat) // Glitch horizontal tears
        .scrollY(() => time * 0.1) // Constant vertical scan
        .modulate(osc(() => 20 + audioBass * 50, 0, () => audioMid * 1.5), () => audioBass * 0.1)
        .color(...this._cRot(60, () => 1.0 + audioBrilliance * 2.0))
        .add(osc(() => 100 + audioHigh * 200, 0.1).color(1, 1, 1).scale(1, 0.05).scrollY(() => time * -0.5), () => audioBeat * 0.8) // Flash scanline
    ).out(o0);
  }

  // ── PRESET 11 · Orbital Solar Flares ──────────────────────────────
  _p11_velvetShift() {
    this._s(
      shape(100, 0.1, 0.9) // Giant core sphere
        .scale(() => 1.0 + audioBass * 1.2)
        .color(...this._cRot(0, () => 1.5 + audioMid * 1.0))
        .modulateScale(osc(() => 5 + audioHigh * 10).rotate(() => time * 0.5), () => audioLowMid * 2.0)
        .add(
          shape(100, 0.02, 1.0)
            .scale(() => 2.0 + audioSub * 2.5) // Outer expanding halo
            .color(...this._cRot(30, () => audioHigh * 2.0)),
          0.5
        )
        .rotate(() => time * 0.2 + audioBeatMid * 0.5)
    ).out(o0);
  }

  // ── PRESET 12 · Neon Laser Scanner ────────────────────────────────
  _p12_silkPhase() {
    this._s(
      osc(() => 10 + audioMid * 5, 0.1, () => audioHigh * 1.5)
        .thresh(0.8, 0.1) // Sharp laser lines
        .color(...this._cRot(180, () => 1.0 + audioBeat * 0.5)) // Complementary bright flashes
        .rotate(() => time * 0.1 + audioBass * 0.2)
        .modulate(noise(5, 0.1), () => audioLowMid * 0.1)
        .kaleid(2)
        .add(
          osc(() => 5 + audioHigh * 5, 0.1).thresh(0.9, 0.1)
            .color(...this._cRot(120, () => 0.8 + audioMid * 0.3)) // Triadic alternate lasers
            .rotate(() => -time * 0.15),
          0.5
        )
    ).out(o0);
  }

  // ── PRESET 13 · Gentle Vortex ─────────────────────────────────────
  _p13_gentleVortex() {
    this._s(
      osc(() => audioHigh * 15 + 5, 0.02, () => audioBass * 0.5)
        .rotate(() => audioVol * 0.2)
        .modulateRotate(osc(() => audioMid * 10).rotate(() => audioBass * 0.5), () => audioBass * 0.2)
        .color(...this._c(() => 0.5 + audioMid * 0.5))
        .add(
          osc(() => audioBass * 10, 0.02).color(...this._c(() => audioHigh * 0.5)), 
          () => audioVol * 0.3
        )
    ).out(o0);
  }

  // ── PRESET 14 · Time Warp ─────────────────────────────────────────
  _p14_timeWarp() {
    this._s(
      noise(() => audioSub * 1.5 + 1, 0.02)
        .modulateScale(src(o0).scale(() => 1 + audioBass * 0.01), () => 1 + audioVol * 0.2)
        .blend(
          osc(() => audioHigh * 15 + 5, 0.02)
            .color(...this._c(() => 0.4 + audioMid * 0.6))
            .kaleid(4),
          () => audioVol * 0.2
        )
        .rotate(() => audioBass * 0.2, 0.002)
    ).out(o0);
  }

  // ── PRESET 15 · Infinite Tunnel (Vórtice Infinito) ───────────────
  _p15_infiniteTunnel() {
    this._s(
      src(o0)
        .scale(() => 0.95 - audioBeat * 0.04) // Efecto de empuje (zoom) en cada golpe de bajo
        .rotate(() => 0.012 + audioLowMid * 0.02) // Acelera el vórtice con la música
        .blend(
          osc(() => 20 + audioMid * 8, 0.06, 0.9) // Añade estrías a las paredes del túnel
            .kaleid(5)
            .color(...this._cRot(0, () => 0.6 + audioHigh * 0.6)) // Destellos de luz en agudos
            .rotate(() => time * 0.08 + audioBass * 0.1) // Giros bruscos reactivos
            .modulate(osc(10).rotate(1.57), () => 0.05 + audioVol * 0.1) // Distorsión reactiva
            .add(
              noise(() => 180 + audioBass * 50, 0.01).luma(0.4, 0.1), 
              () => 0.1 + audioBass * 0.5 // Gránulos más intensos
            ),
          () => 0.15 + audioHigh * 0.15 // Intensifica la mezcla en los agudos
        )
    ).out(o0);
  }

  // ── PRESET 16 · 3D Audio Terrain ──────────────────────────────────
  _p16_reactiveSphere() {
    this._s(
      shape(2, 0.01)
        .repeat(20, 100)
        .modulateScale(osc(10).rotate(Math.PI / 2), 0.5)
        .modulateRepeat(osc(() => 10 + audioBass * 30), () => audioMid * 5.0)
        .modulateScrollY(noise(() => 2 + audioBass * 5, 0.1), () => audioSub * 2.0)
        .color(...this._cRot(180, () => 1.5 + audioHigh * 2.0))
        .add(
          noise(() => 3 + audioMid * 10, 0.1)
            .color(...this._cRot(0, () => audioBass * 2.0))
            .scrollY(() => time * 0.5),
          0.3
        )
        .kaleid(2)
        .scale(() => 1.2 + audioLowMid * 0.5)
        .rotate(() => time * 0.1)
    ).out(o0);
  }
}
