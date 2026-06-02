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
      voronoi(() => audioMid * 5 + 3, 0.02, () => audioHigh * 1.5)
        .modulateRotate(osc(() => audioBass * 5 + 2).rotate(() => audioLowMid * 2), () => audioBass * 0.4)
        .kaleid(3)
        .color(...this._c(() => 0.6 + audioBass * 0.4))
        .blend(noise(2, 0.01), 0.05)
    ).out(o0);
  }

  // ── PRESET 03 · Astral Geometry ───────────────────────────────────
  _p3_astralGeometry() {
    this._s(
      shape(4, () => 0.4 + audioHigh * 0.1, 0.02)
        .modulate(noise(() => audioBass * 3 + 1, 0.02))
        .kaleid(() => Math.round(audioMid * 3) + 2)
        .color(...this._c(() => 0.5 + audioVol * 0.5))
        .rotate(() => audioLowMid * 0.5, 0.01)
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
      noise(() => audioSub * 2 + 1, 0.02)
        .modulate(voronoi(() => audioMid * 4 + 2, 0.03), () => audioBass * 0.5)
        .colorama(() => audioBrilliance * 0.15)
        .color(...this._c(() => 0.5 + audioLowMid * 0.5))
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

  // ── PRESET 10 · Liquid Gold Fluid ─────────────────────────────────
  _p10_dreamScan() {
    this._s(
      noise(() => 2 + audioSub * 0.5, 0.05)
        .modulate(voronoi(() => 3 + audioMid * 2), () => 0.3 + audioBass * 0.2)
        .color(...this._cRot(0, () => 0.8 + audioVol * 0.3)) // Base liquid color
        .colorama(() => audioBrilliance * 0.05)
        .blend(
          osc(() => 5 + audioHigh * 2, 0.1, () => audioLowMid * 0.5)
            .color(...this._cRot(330, () => 0.6 + audioMid * 0.4)), // Analogous shifting highlights
          0.3
        )
        .rotate(() => time * 0.05)
    ).out(o0);
  }

  // ── PRESET 11 · Velvet Shift ──────────────────────────────────────
  _p11_velvetShift() {
    this._s(
      noise(() => audioMid * 3 + 1, 0.015)
        .modulateScrollY(osc(() => audioBass * 4, 0.02), () => audioLowMid * 0.2)
        .color(...this._c(() => 0.5 + audioVol * 0.5))
        .colorama(() => audioHigh * 0.05)
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

  // ── PRESET 16 · Holographic Sphere (Esfera Holográfica) ───────────
  _p16_reactiveSphere() {
    // Generador de rejilla con ojo de pez en 3D y grano de semitono reactivo
    const getGrainyGrid = (freqFunc, grainIntensityFunc) => osc(freqFunc, 0, 0.8)
      .mult(osc(freqFunc, 0, 0.8).rotate(Math.PI / 2))
      .modulateScale(shape(100, 0.9, 0.4), -0.85) // Abombamiento constante
      .add(noise(220, 0.01).luma(0.4, 0.1), grainIntensityFunc) // Grano analógico/semitono
      .rotate(() => time * 0.03); // Giro constante

    // Halo de brillo ambiental de fondo que reacciona de forma fluida al volumen general
    const halo = shape(100, 0.78, 0.35)
      .color(...this._cRot(0, () => audioVol * 0.15));

    // Capa 1: Núcleo (Reactivo 100% a Graves)
    const core = getGrainyGrid(
      () => 45 + audioBass * 15,
      () => 0.08 + audioBass * 0.15
    )
      .color(...this._cRot(0, () => 0.7 + audioBass * 0.5))
      .mult(shape(100, () => 0.22 + audioBass * 0.12, 0.08));

    // Capa 2: Anillo Medio (Reactivo 100% a Medios)
    const mid = getGrainyGrid(
      () => 55 + audioMid * 18,
      () => 0.08 + audioMid * 0.15
    )
      .color(...this._cRot(120, () => 0.7 + audioMid * 0.5))
      .mult(
        shape(100, () => 0.48 + audioMid * 0.16, 0.08)
          .diff(shape(100, 0.24, 0.08))
      );

    // Capa 3: Anillo Exterior (Reactivo 100% a Agudos)
    const high = getGrainyGrid(
      () => 65 + audioHigh * 22,
      () => 0.08 + audioHigh * 0.2
    )
      .color(...this._cRot(240, () => 0.7 + audioHigh * 0.5))
      .mult(
        shape(100, () => 0.72 + audioHigh * 0.12, 0.08)
          .diff(shape(100, 0.48, 0.08))
      );

    // Fusionamos el halo con los tres círculos de colores reaccionando por separado
    this._s(
      halo.add(core.add(mid).add(high))
    ).out(o0);
  }
}
