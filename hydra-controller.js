/**
 * HydraController
 *
 * Manages Hydra Synth initialization and audio-reactive preset switching.
 * 14 presets total with smooth, ethereal, psychedelic liquid vibes.
 */

// Función traductora: Convierte el HSL de tu interfaz a RGB para Hydra
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
    this.numPresets    = 14;
  }

  // ── Helper de Color ──────────────────────────────────────────────
  // Aplica el color global RGB a Hydra y lo modula con el audio
  _c(modFunc = () => 1) {
    return [
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[0] * modFunc(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[1] * modFunc(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[2] * modFunc()
    ];
  }

  // ── Init ─────────────────────────────────────────────────────────
  init(canvas) {
    let w = canvas.width;
    let h = canvas.height;
    const maxW = 1920;
    if (w > maxW) {
      h = Math.round(h * (maxW / w));
      w = maxW;
    }

    this.hydra = new Hydra({
      canvas,
      detectAudio:         false,
      enableStreamCapture: false,
      makeGlobal:          true,
      width:               w,
      height:              h,
    });
    this.applyPreset(0);
  }

  setResolution(w, h) {
    if (this.hydra) {
      const maxW = 1920;
      if (w > maxW) {
        h = Math.round(h * (maxW / w));
        w = maxW;
      }
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
      this._p6_evaSyncWaves,     // <--- El intocable
      this._p7_lclEcho,
      this._p8_neonWake,
      this._p9_deepCurrent,
      this._p10_dreamScan,
      this._p11_velvetShift,
      this._p12_silkPhase,
      this._p13_gentleVortex,
      this._p14_timeWarp,
    ];

    presets[this.currentPreset].call(this);
  }

  // ── PRESET 01 · Liquid Pulse ──────────────────────────────────────
  _p1_liquidPulse() {
    osc(() => audioLowMid * 8 + 4, 0.03, () => audioHigh * 1.5)
      .modulate(noise(() => audioBass * 2 + 1, 0.03), () => audioMid * 0.5 + 0.2)
      .colorama(() => audioBrilliance * 0.1 + audioBeat * 0.05)
      .color(...this._c(() => 0.5 + audioMid * 0.3 + audioBeat * 0.4))
      .scale(() => 1 + audioBeat * 0.12)
      .rotate(() => audioVol * 0.3, 0.005)
      .out(o0);
  }

  // ── PRESET 02 · Psychedelic Tide ──────────────────────────────────
  _p2_psychedelicTide() {
    voronoi(() => audioMid * 5 + 3, 0.02, () => audioHigh * 1.5)
      .modulateRotate(osc(() => audioBass * 5 + 2).rotate(() => audioLowMid * 2), () => audioBass * 0.4)
      .kaleid(3)
      .color(...this._c(() => 0.6 + audioBass * 0.4))
      .blend(noise(2, 0.01), 0.05)
      .out(o0);
  }

  // ── PRESET 03 · Astral Geometry ───────────────────────────────────
  _p3_astralGeometry() {
    shape(4, () => 0.4 + audioHigh * 0.1, 0.02)
      .modulate(noise(() => audioBass * 3 + 1, 0.02))
      .kaleid(() => Math.round(audioMid * 3) + 2)
      .color(...this._c(() => 0.5 + audioVol * 0.5))
      .rotate(() => audioLowMid * 0.5, 0.01)
      .out(o0);
  }

  // ── PRESET 04 · Porcaro Cascades ──────────────────────────────────
  _p4_porcaroCascades() {
    osc(() => audioMid * 12 + 8, 0.015, () => audioHigh * 1.5)
      .modulateScale(noise(() => audioBass * 1.5 + 0.5, 0.02), () => audioLowMid * 0.4 + 0.1)
      .color(...this._c(() => 0.6 + audioHigh * 0.4))
      .mult(osc(8, 0.01).rotate(() => audioVol * 0.15))
      .out(o0);
  }

  // ── PRESET 05 · Ethereal Bloom ────────────────────────────────────
  _p5_etherealBloom() {
    noise(() => audioSub * 2 + 1, 0.02)
      .modulate(voronoi(() => audioMid * 4 + 2, 0.03), () => audioBass * 0.5)
      .colorama(() => audioBrilliance * 0.15)
      .color(...this._c(() => 0.5 + audioLowMid * 0.5))
      .out(o0);
  }

  // ── PRESET 06 · EVA Sync Waves (El original, pero con color fijo) ─
  _p6_evaSyncWaves() {
    osc(
      () => audioMid * 35 + 6 + audioBeatMid * 10,
      () => audioBass * 0.3 + 0.1,
      () => audioHigh * 3.2
    )
    .modulateRotate(
      osc(() => audioMid * 18).rotate(() => audioBass * 2.2),
      () => audioBass * 0.8 + audioBeat * 0.4
    )
    // Conserva los multiplicadores bajos originales, pero usando HSL real y disparador de beat
    .color(...this._c(() => 0.4 + (audioBass + audioMid) * 0.3 + audioBeat * 0.4))
    .mult(noise(() => audioMid * 2.8, 0.02))
    .kaleid(() => Math.round(audioHigh * 5 + audioBeatMid * 3) + 2)
    .scale(() => 1 - audioBeat * 0.08)
    .out(o0);
  }

  // ── PRESET 07 · LCL Echo (Feedback Acuático) ──────────────────────
  _p7_lclEcho() {
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
      .out(o0);
  }

  // ── PRESET 08 · Neon Wake ─────────────────────────────────────────
  _p8_neonWake() {
    voronoi(() => audioHigh * 6 + 4, 0.03, () => audioMid * 2)
      .diff(osc(() => audioBass * 10 + 5, 0.02).rotate(() => audioMid * 0.5, 0.005))
      .kaleid(3)
      .colorama(() => audioBrilliance * 0.08)
      .color(...this._c(() => 0.5 + audioVol * 0.4))
      .out(o0);
  }

  // ── PRESET 09 · Deep Current ──────────────────────────────────────
  _p9_deepCurrent() {
    osc(() => audioLowMid * 10 + 5, 0.02, () => audioHigh * 0.5)
      .modulate(osc(() => audioBass * 10).rotate(Math.PI / 2), () => audioMid * 0.3)
      .color(...this._c(() => 0.6 + audioBass * 0.4))
      .blend(src(o0).scale(1.02), 0.8)
      .out(o0);
  }

  // ── PRESET 10 · Dream Scan ────────────────────────────────────────
  _p10_dreamScan() {
    src(o0)
      .scrollX(() => (audioBass - 0.5) * 0.005)
      .scrollY(() => 0.001)
      .modulate(osc(() => audioMid * 20 + 10, 0, () => audioBass * 0.2), () => audioBass * 0.02)
      .blend(
        osc(() => audioPresence * 30 + 10, 0.01)
          .color(...this._c(() => 0.2 + audioHigh * 0.8)),
        () => 0.1 + audioVol * 0.1
      )
      .out(o0);
  }

  // ── PRESET 11 · Velvet Shift ──────────────────────────────────────
  _p11_velvetShift() {
    noise(() => audioMid * 3 + 1, 0.015)
      .modulateScrollY(osc(() => audioBass * 4, 0.02), () => audioLowMid * 0.2)
      .color(...this._c(() => 0.5 + audioVol * 0.5))
      .colorama(() => audioHigh * 0.05)
      .out(o0);
  }

  // ── PRESET 12 · Silk Phase ────────────────────────────────────────
  _p12_silkPhase() {
    osc(() => audioBass * 15 + 5, 0.02, () => audioHigh * 0.2)
      .diff(osc(() => audioMid * 15 + 5, 0.02, () => audioLowMid * 0.2))
      .color(...this._c(() => 0.6 + audioBass * 0.4))
      .kaleid(2)
      .rotate(() => audioVol * 0.1, 0.005)
      .out(o0);
  }

  // ── PRESET 13 · Gentle Vortex ─────────────────────────────────────
  _p13_gentleVortex() {
    osc(() => audioHigh * 15 + 5, 0.02, () => audioBass * 0.5)
      .rotate(() => audioVol * 0.2)
      .modulateRotate(osc(() => audioMid * 10).rotate(() => audioBass * 0.5), () => audioBass * 0.2)
      .color(...this._c(() => 0.5 + audioMid * 0.5))
      .add(
        osc(() => audioBass * 10, 0.02).color(...this._c(() => audioHigh * 0.5)), 
        () => audioVol * 0.3
      )
      .out(o0);
  }

  // ── PRESET 14 · Time Warp ─────────────────────────────────────────
  _p14_timeWarp() {
    noise(() => audioSub * 1.5 + 1, 0.02)
      .modulateScale(src(o0).scale(() => 1 + audioBass * 0.01), () => 1 + audioVol * 0.2)
      .blend(
        osc(() => audioHigh * 15 + 5, 0.02)
          .color(...this._c(() => 0.4 + audioMid * 0.6))
          .kaleid(4),
        () => audioVol * 0.2
      )
      .rotate(() => audioBass * 0.2, 0.002)
      .out(o0);
  }
}
