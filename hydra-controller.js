/**
 * HydraController
 *
 * Manages Hydra Synth initialization and audio-reactive preset switching.
 *
 * How audio reactivity works:
 *  - app.js writes window.audioBass / audioMid / audioHigh / audioVol every frame
 *  - app.js writes window.colorH / colorS / colorL for color control
 *  - Hydra evaluates lambda functions `() => audioBass * N` on each render tick
 *  - Because JavaScript resolves identifiers at call time (not definition time),
 *    the lambdas always read the freshest values from the global scope
 *
 * All frequency values are normalized [0, 1]:
 *   audioBass  — 20 Hz – 250 Hz  (kick, sub-bass)
 *   audioMid   — 250 Hz – 2 kHz  (snare, vocals, instruments)
 *   audioHigh  — 2 kHz – 20 kHz  (hi-hats, cymbals, air)
 *   audioVol   — overall energy
 *
 * Color values (HSL):
 *   colorH     — [0, 360]  Hue
 *   colorS     — [0, 100]  Saturation
 *   colorL     — [0, 100]  Lightness
 */
export class HydraController {
  constructor() {
    this.hydra         = null;
    this.currentPreset = 0;
    this.numPresets    = 10;  // Expanded to 10 presets
  }

  // ── Init ─────────────────────────────────────────────────────────
  /**
   * @param {HTMLCanvasElement} canvas - Full-screen canvas for Hydra
   */
  init(canvas) {
    this.hydra = new Hydra({
      canvas,
      detectAudio:          false, // we supply our own audio data
      enableStreamCapture:  false,
      makeGlobal:           true,  // exposes osc(), noise(), etc. on window
      width:                canvas.width,
      height:               canvas.height,
    });

    // Render default preset immediately
    this.applyPreset(0);
  }

  setResolution(w, h) {
    if (this.hydra) this.hydra.setResolution(w, h);
  }

  // ── Preset Switcher ───────────────────────────────────────────────
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
    ];
    presets[this.currentPreset].call(this);
  }

  // ── PRESET 01 · Pulse ─────────────────────────────────────────────
  // Bass drives oscillator frequency → fat, throbbing rings
  // High-freq detail modulates as kaleidoscope color offset
  _p1_pulse() {
    osc(
      () => audioBass * 42 + 4,   // bass pumps the ring density
      0.1,
      () => audioHigh * 5 + 0.5   // high adds color shift
    )
    .color(
      () => (colorH / 360) * audioBass * 2.2,
      () => (colorS / 100) * audioMid * 0.9,
      () => (colorL / 100) * audioHigh * 2.8
    )
    .modulate(
      noise(() => audioMid * 3.5, 0.35),
      () => audioBass * 0.38
    )
    .kaleid(4)
    .rotate(
      () => audioVol * 0.45,
      0.018
    )
    .out(o0);
  }

  // ── PRESET 02 · Spectral ──────────────────────────────────────────
  // Voronoi cells expand/contract with mid-range energy
  // Diff with a rotating osc creates an interference shimmer
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
      osc(
        () => audioBass * 38,
        0.04,
        () => audioHigh * 2.2
      )
      .rotate(() => audioMid * Math.PI * 2)
    )
    .out(o0);
  }

  // ── PRESET 03 · Fractal ───────────────────────────────────────────
  // Noise scaled by bass × an oscillator lattice × kaleidoscope
  // Very organic — morphs slowly between crystalline and molten
  _p3_fractal() {
    noise(
      () => audioBass * 4.5 + 1.2,
      () => audioMid * 0.4
    )
    .mult(
      osc(
        () => audioHigh * 52 + 8,
        0.05,
        0
      ).rotate(() => audioMid * 3.2)
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
  // Two osc layers: high-freq spiral + bass-freq bloom, rotationally
  // modulated — creates a spinning vortex that breathes with the music
  _p4_vortex() {
    osc(
      () => audioHigh * 62 + 12,
      0.02,
      () => audioBass * 3.5
    )
    .rotate(() => audioVol * Math.PI)
    .modulateRotate(
      osc(() => audioMid * 22)
        .rotate(() => audioBass * 1.6),
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
  // Geometric shapes (sides determined by mid energy) + noise modulation
  // Results in a faceted, gem-like structure that shatters with transients
  _p5_crystal() {
    shape(
      () => Math.round(audioMid * 4) + 3,
      () => audioBass * 0.72 + 0.12,
      0.008
    )
    .modulate(
      noise(() => audioHigh * 3.2)
    )
    .color(
      () => (colorH / 360) * audioMid * 3.8,
      () => (colorS / 100) * audioBass * 0.6,
      () => (colorL / 100) * audioHigh * 2.8
    )
    .add(
      osc(
        () => audioBass * 85,
        0.08,
        () => audioHigh * 2.2
      ).rotate(() => audioMid * Math.PI),
      () => audioVol * 0.55
    )
    .kaleid(() => Math.round(audioHigh * 4) + 2)
    .out(o0);
  }

  // ── PRESET 06 · EVA Sync Waves ─────────────────────────────────────
  // Inspired by EVA Unit-01 synchronization waves
  // Dual oscillating waves with purple/green interference pattern
  _p6_evaSyncWaves() {
    osc(
      () => audioMid * 35 + 6,
      () => audioBass * 0.3 + 0.1,
      () => audioHigh * 3.2
    )
    .modulateRotate(
      osc(() => audioMid * 18)
        .rotate(() => audioBass * 2.2),
      () => audioBass * 0.8
    )
    .color(
      () => (colorH / 360) * audioHigh * 2.4,
      () => (colorS / 100) * audioMid * 1.2,
      () => (colorL / 100) * (0.4 + audioBass * 0.6)
    )
    .mult(
      noise(() => audioMid * 2.8, 0.25)
    )
    .kaleid(() => Math.round(audioHigh * 5) + 2)
    .out(o0);
  }

  // ── PRESET 07 · Armored Wave ───────────────────────────────────────
  // Geometric armored plating effect with color modulation
  // Sharp, crystalline structures responding to mid/high frequencies
  _p7_armoredWave() {
    osc(
      () => audioHigh * 48 + 10,
      0.08,
      () => audioBass * 2.8
    )
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
  // Cellular/neural network effect with dynamic color shifts
  // Grid lattice that pulses with audio frequency bands
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
      osc(() => audioBass * 45)
        .rotate(() => audioMid * 3),
      () => audioMid * 0.6
    )
    .out(o0);
  }

  // ── PRESET 09 · Berserk Core ───────────────────────────────────────
  // High-energy chaotic visualization — rapid color shifts
  // Intense overlay effects that respond to all frequency bands
  _p9_berserkCore() {
    osc(
      () => audioHigh * 95 + 15,
      0.04,
      () => audioBass * 4.2
    )
    .rotate(() => audioVol * Math.PI * 2, 0.02)
    .add(
      voronoi(() => audioMid * 45, () => audioHigh * 0.6)
        .color(
          () => ((colorH + audioVol * 180) / 360) % 1,
          () => Math.min(100, (colorS / 100) * 150 + audioHigh * 50),
          () => (colorL / 100) * (0.55 + audioVol * 0.35)
        ),
      () => audioBass * 0.6
    )
    .kaleid(() => Math.round(audioMid * 6) + 2)
    .out(o0);
  }

  // ── PRESET 10 · Ethereal Bloom ─────────────────────────────────────
  // Soft, dreamy visualization with smooth gradient shifts
  // Gentle interference patterns with color blooming effects
  _p10_etherealBloom() {
    osc(
      () => audioMid * 24 + 4,
      () => audioBass * 0.25 + 0.08,
      () => audioHigh * 2.8
    )
    .modulate(
      noise(() => audioMid * 1.8, 0.35),
      () => audioVol * 0.25
    )
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
}
