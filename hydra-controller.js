/**
 * HydraController
 *
 * Manages Hydra Synth initialization and audio-reactive preset switching.
 * 14 presets total + smooth transition blend on preset change.
 *
 * Audio globals (written by app.js, read here as lambdas):
 *   audioBass / audioMid / audioHigh / audioVol
 *   audioSub / audioLowMid / audioPresence / audioBrilliance  (extended)
 *
 * Color globals:
 *   colorH [0,360] / colorS [0,100] / colorL [0,100]
 */
export class HydraController {
  constructor() {
    this.hydra         = null;
    this.currentPreset = 0;
    this.numPresets    = 14;
    this._transitioning = false;
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
    if (this.hydra) this.hydra.setResolution(w, h);
  }

  // ── Preset Switcher with Blend Transition ─────────────────────────
  applyPreset(index) {
    this.currentPreset = ((index % this.numPresets) + this.numPresets) % this.numPresets;

    const presets = [
      this._p1_pulse,
      this._p2_spectral,
      this._p3_fractal,
      this._p4_vortex,
      this._p5_crystal,
      this._p6_evaSyncWaves,
      this._p7_armoredWave,
      this._p8_neuralGrid,
      this._p9_berserkCore,
      this._p10_etherealBloom,
      this._p11_feedbackLoop,
      this._p12_glitchScan,
      this._p13_lissajous,
      this._p14_warpField,
    ];

    presets[this.currentPreset].call(this);
  }

  // ── PRESET 01 · Pulse ─────────────────────────────────────────────
  _p1_pulse() {
    osc(
      () => audioBass * 42 + 4,
      0.1,
      () => audioHigh * 5 + 0.5
    )
    .color(
      () => (colorH / 360) * audioBass * 2.2,
      () => (colorS / 100) * audioMid * 0.9,
      () => (colorL / 100) * audioHigh * 2.8
    )
    .modulate(noise(() => audioMid * 3.5, 0.35), () => audioBass * 0.38)
    .kaleid(4)
    .rotate(() => audioVol * 0.45, 0.018)
    .out(o0);
  }

  // ── PRESET 02 · Spectral ──────────────────────────────────────────
  _p2_spectral() {
    voronoi(
      () => audioMid * 28 + 5,
      () => audioHigh * 0.4 + 0.05,
      () => audioBass * 4
    )
    .color(
      () => (colorH / 360) * audioHigh * 2.5,
      () => (colorS / 100) * audioMid * 1.8,
      () => (colorL / 100) * audioBass * 3.2
    )
    .diff(
      osc(() => audioBass * 38, 0.04, () => audioHigh * 2.2)
      .rotate(() => audioMid * Math.PI * 2)
    )
    .out(o0);
  }

  // ── PRESET 03 · Fractal ───────────────────────────────────────────
  _p3_fractal() {
    noise(
      () => audioBass * 4.5 + 1.2,
      () => audioMid * 0.4
    )
    .mult(
      osc(() => audioHigh * 52 + 8, 0.05, 0)
      .rotate(() => audioMid * 3.2)
    )
    .color(
      () => (colorH / 360) * audioBass * 2.8,
      () => (colorS / 100) * audioHigh * 3.2,
      () => (colorL / 100) * audioMid * 1.6
    )
    .kaleid(() => Math.round(audioBass * 7) + 3)
    .rotate(() => audioVol * 2.2, 0.008)
    .out(o0);
  }

  // ── PRESET 04 · Vortex ────────────────────────────────────────────
  _p4_vortex() {
    osc(() => audioHigh * 62 + 12, 0.02, () => audioBass * 3.5)
    .rotate(() => audioVol * Math.PI)
    .modulateRotate(
      osc(() => audioMid * 22).rotate(() => audioBass * 1.6),
      () => audioBass * 1.3
    )
    .color(
      () => (colorH / 360) * audioHigh * 2.2,
      () => (colorS / 100) * audioBass * 1.6,
      () => (colorL / 100) * audioMid * 2.8
    )
    .add(
      osc(() => audioBass * 22, 0.1)
      .color(
        () => (colorH / 360) * audioMid * 0.8,
        0,
        () => (colorL / 100) * audioHigh * 2.4
      ),
      () => audioVol * 0.42
    )
    .out(o0);
  }

  // ── PRESET 05 · Crystal ───────────────────────────────────────────
  _p5_crystal() {
    shape(
      () => Math.round(audioMid * 4) + 3,
      () => audioBass * 0.72 + 0.12,
      0.008
    )
    .modulate(noise(() => audioHigh * 3.2))
    .color(
      () => (colorH / 360) * audioMid * 3.8,
      () => (colorS / 100) * audioBass * 0.6,
      () => (colorL / 100) * audioHigh * 2.8
    )
    .add(
      osc(() => audioBass * 85, 0.08, () => audioHigh * 2.2)
      .rotate(() => audioMid * Math.PI),
      () => audioVol * 0.55
    )
    .kaleid(() => Math.round(audioHigh * 4) + 2)
    .out(o0);
  }

  // ── PRESET 06 · EVA Sync Waves ─────────────────────────────────────
  _p6_evaSyncWaves() {
    osc(
      () => audioMid * 35 + 6,
      () => audioBass * 0.3 + 0.1,
      () => audioHigh * 3.2
    )
    .modulateRotate(
      osc(() => audioMid * 18).rotate(() => audioBass * 2.2),
      () => audioBass * 0.8
    )
    .color(
      () => (colorH / 360) * audioHigh * 2.4,
      () => (colorS / 100) * audioMid * 1.2,
      () => (colorL / 100) * (0.4 + audioBass * 0.6)
    )
    .mult(noise(() => audioMid * 2.8, 0.25))
    .kaleid(() => Math.round(audioHigh * 5) + 2)
    .out(o0);
  }

  // ── PRESET 07 · Armored Wave ───────────────────────────────────────
  _p7_armoredWave() {
    osc(() => audioHigh * 48 + 10, 0.08, () => audioBass * 2.8)
    .rotate(() => audioVol * 1.8, 0.012)
    .modulateScale(
      voronoi(() => audioMid * 22, () => audioHigh * 0.35),
      () => 1 + audioMid * 0.5
    )
    .color(
      () => (colorH / 360) * (1 + audioHigh * 0.8),
      () => (colorS / 100) * (0.6 + audioMid * 0.4),
      () => (colorL / 100) * (0.5 + audioVol * 0.3)
    )
    .out(o0);
  }

  // ── PRESET 08 · Neural Grid ────────────────────────────────────────
  _p8_neuralGrid() {
    voronoi(
      () => audioMid * 32 + 8,
      () => audioHigh * 0.5 + 0.08,
      () => audioBass * 5.2
    )
    .color(
      () => ((colorH + audioHigh * 120) / 360) % 1,
      () => (colorS / 100) * (0.7 + audioMid * 0.3),
      () => (colorL / 100) * (0.45 + audioVol * 0.35)
    )
    .modulateRotate(
      osc(() => audioBass * 45).rotate(() => audioMid * 3),
      () => audioMid * 0.6
    )
    .out(o0);
  }

  // ── PRESET 09 · Berserk Core ───────────────────────────────────────
  _p9_berserkCore() {
    osc(() => audioHigh * 95 + 15, 0.04, () => audioBass * 4.2)
    .rotate(() => audioVol * Math.PI * 2, 0.02)
    .add(
      voronoi(() => audioMid * 45, () => audioHigh * 0.6)
      .color(
        () => ((colorH + audioVol * 180) / 360) % 1,
        () => Math.min(1, (colorS / 100) * 1.5 + audioHigh * 0.5),
        () => (colorL / 100) * (0.55 + audioVol * 0.35)
      ),
      () => audioBass * 0.6
    )
    .kaleid(() => Math.round(audioMid * 6) + 2)
    .out(o0);
  }

  // ── PRESET 10 · Ethereal Bloom ─────────────────────────────────────
  _p10_etherealBloom() {
    osc(
      () => audioMid * 24 + 4,
      () => audioBass * 0.25 + 0.08,
      () => audioHigh * 2.8
    )
    .modulate(noise(() => audioMid * 1.8, 0.35), () => audioVol * 0.25)
    .color(
      () => (colorH / 360) * (1 + audioHigh * 0.6),
      () => (colorS / 100) * (0.55 + audioMid * 0.25),
      () => (colorL / 100) * (0.55 + audioBass * 0.25)
    )
    .kaleid(3)
    .rotate(() => audioVol * 0.8, 0.006)
    .blend(
      osc(() => audioHigh * 18)
      .kaleid(2)
      .color(
        () => ((colorH + 180) / 360) % 1,
        () => (colorS / 100) * 0.8,
        () => (colorL / 100) * 0.6
      ),
      0.3
    )
    .out(o0);
  }

  // ── PRESET 11 · Feedback Loop ──────────────────────────────────────
  // Reads o0 back into itself — builds and accumulates across time
  // Starts dark, grows into its own evolving universe
  _p11_feedbackLoop() {
    // Seed with a gentle osc on first call; subsequent frames feed on themselves
    src(o0)
      .modulate(
        noise(() => audioMid * 2.2, 0.3),
        () => audioBass * 0.045
      )
      .blend(
        osc(() => audioHigh * 28 + 3, 0.06)
        .color(
          () => (colorH / 360),
          () => (colorS / 100) * 0.7,
          () => (colorL / 100) * 0.5
        ),
        () => audioVol * 0.22
      )
      .scale(() => 1 + audioBass * 0.007)
      .rotate(() => audioVol * 0.004, 0.003)
      .brightness(() => -0.003)        // slow fade prevents runaway
      .out(o0);
  }

  // ── PRESET 12 · Glitch Scan ────────────────────────────────────────
  // VHS-style horizontal scan lines + chromatic glitch on transients
  _p12_glitchScan() {
    src(o0)
      .scrollX(() => (audioBass - 0.5) * 0.04)
      .scrollY(() => 0.002)
      .modulate(
        osc(() => audioMid * 80 + 30, 0, () => audioBass * 0.5)
        .pixelate(() => 2 + audioBass * 40, 2),
        () => audioBass * 0.06
      )
      .blend(
        osc(() => audioPresence * 120 + 20, 0.01)
        .color(
          () => (colorH / 360),
          0,
          () => (colorL / 100) * audioHigh * 3
        ),
        () => audioVol * 0.18
      )
      .contrast(() => 1 + audioVol * 0.4)
      .brightness(() => audioBass * 0.05 - 0.02)
      .out(o0);
  }

  // ── PRESET 13 · Lissajous ──────────────────────────────────────────
  // Two oscillators phase-shifted → classic Lissajous interference figures
  // Frequency ratio driven by bass vs high creates dynamic knots
  _p13_lissajous() {
    osc(
      () => audioBass * 60 + 10,
      () => audioMid * 0.2,
      () => audioHigh * Math.PI
    )
    .diff(
      osc(
        () => audioHigh * 60 + 10,
        () => audioMid * 0.2,
        () => audioBass * Math.PI + Math.PI / 2
      )
    )
    .color(
      () => (colorH / 360) * (0.5 + audioBass),
      () => (colorS / 100) * (0.4 + audioMid * 0.8),
      () => (colorL / 100) * (0.6 + audioHigh * 0.8)
    )
    .kaleid(() => Math.round(audioLowMid * 4) + 2)
    .rotate(() => audioVol * 0.3, 0.01)
    .out(o0);
  }

  // ── PRESET 14 · Warp Field ─────────────────────────────────────────
  // Canvas folds back on itself — space-time distortion effect
  // noise drives the warp depth; bass creates sudden tears
  _p14_warpField() {
    noise(
      () => audioSub * 3 + 1.5,
      () => audioMid * 0.3
    )
    .modulateScale(
      src(o0).scale(() => 1 + audioBass * 0.02),
      () => 1 + audioVol * 0.6
    )
    .blend(
      osc(() => audioHigh * 35 + 5, 0.04)
      .color(
        () => (colorH / 360) * (1 + audioHigh * 0.5),
        () => (colorS / 100) * (0.5 + audioMid * 0.3),
        () => (colorL / 100) * (0.5 + audioBass * 0.3)
      )
      .kaleid(6),
      () => audioVol * 0.3
    )
    .rotate(() => audioBass * 0.8, 0.005)
    .out(o0);
  }
}
