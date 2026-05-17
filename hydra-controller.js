/**
 * HydraController
 *
 * Manages Hydra Synth initialization and audio-reactive preset switching.
 *
 * How audio reactivity works:
 *  - app.js writes window.audioBass / audioMid / audioHigh / audioVol every frame
 *  - Hydra evaluates lambda functions `() => audioBass * N` on each render tick
 *  - Because JavaScript resolves identifiers at call time (not definition time),
 *    the lambdas always read the freshest values from the global scope
 *
 * All frequency values are normalized [0, 1]:
 *   audioBass  — 20 Hz – 250 Hz  (kick, sub-bass)
 *   audioMid   — 250 Hz – 2 kHz  (snare, vocals, instruments)
 *   audioHigh  — 2 kHz – 20 kHz  (hi-hats, cymbals, air)
 *   audioVol   — overall energy
 */
export class HydraController {
  constructor() {
    this.hydra         = null;
    this.currentPreset = 0;
    this.numPresets    = 5;
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
    [
      this._p1_pulse,
      this._p2_spectral,
      this._p3_fractal,
      this._p4_vortex,
      this._p5_crystal,
    ][this.currentPreset].call(this);
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
      () => audioBass * 2.2,
      () => audioMid  * 0.9,
      () => audioHigh * 2.8
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
      () => audioHigh * 2.5,
      () => audioMid  * 1.8,
      () => audioBass * 3.2
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
      () => audioMid  * 0.4
    )
    .mult(
      osc(
        () => audioHigh * 52 + 8,
        0.05,
        0
      ).rotate(() => audioMid * 3.2)
    )
    .color(
      () => audioBass * 2.8,
      () => audioHigh * 3.2,
      () => audioMid  * 1.6
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
      () => audioHigh * 2.2,
      () => audioBass * 1.6,
      () => audioMid  * 2.8
    )
    .add(
      osc(() => audioBass * 22, 0.1)
        .color(
          () => audioMid  * 0.8,
          0,
          () => audioHigh * 2.4
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
      () => audioMid  * 3.8,
      () => audioBass * 0.6,
      () => audioHigh * 2.8
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
}
