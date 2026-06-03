/**
 * VisualEngine V3.0 (Hydra Shaders)
 * Flawlessly integrated shaders that treat screen capture (s0) as the canvas.
 * CERO estática. Pura reactividad de grado VJ.
 */

function hsl2rgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

export class VisualEngine {
  constructor() {
    this.hydra = null;
    this.currentPreset = 0;
    this.numPresets = 8; // Quality over quantity: 8 ultra-premium presets
    this.screenActive = false;
  }

  // Color Helper based on UI HSL
  _c(bright = () => 1) {
    return [
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[0] * bright(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[1] * bright(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[2] * bright()
    ];
  }

  // Returns the base texture. Since we don't use screen video anymore, we use a fluid noise base.
  _canvas() {
    return noise(2, 0.1);
  }

  init(canvasEl) {
    this.hydra = new Hydra({
      canvas: canvasEl, detectAudio: false, enableStreamCapture: false,
      makeGlobal: true, width: window.innerWidth, height: window.innerHeight,
    });
    this.playIdle();
  }

  playIdle() {
    // A sophisticated, quiet dark-mode idle state
    solid(0.02, 0.0, 0.03)
      .add(osc(10, 0.05, 0).color(0.1, 0.0, 0.2).modulate(noise(2, 0.1)))
      .out();
  }

  setResolution(w, h) {
    if (this.hydra) this.hydra.setResolution(w, h);
  }

  applyPreset(index) {
    this.currentPreset = ((index % this.numPresets) + this.numPresets) % this.numPresets;
    const presets = [
      this._p0_liquidSmoke,
      this._p1_neonInk,
      this._p2_aurora,
      this._p3_waterRipples,
      this._p4_ferrofluid,
      this._p5_lavaLamp,
      this._p6_biolum,
      this._p7_vapor
    ];
    // Reset buffers before switching
    solid(0,0,0,1).out(o0);
    solid(0,0,0,1).out(o1);
    
  // 0. Liquid Smoke: Deep, slow-moving smoke that reacts to the bass by displacing.
  _p0_liquidSmoke() {
    noise(2, 0.05)
      .modulateScale(osc(2).rotate(() => time * 0.1), 0.1)
      .modulate(src(o0).scrollY(() => -0.005 - window.audioBass * 0.01), 0.05)
      .blend(src(o0).scale(() => 1.002 + window.audioBeat * 0.01), 0.9)
      .mult(solid(...this._c(() => 1.0 + window.audioMid * 0.5)))
      .out(o0);
  }

  // 1. Neon Ink Drop: Ink spreading in water.
  _p1_neonInk() {
    shape(4, 0.01).scrollX(() => Math.sin(time)*0.1).scrollY(() => Math.cos(time)*0.1)
      .color(...this._c())
      .modulate(noise(3, 0.1), () => window.audioBass * 0.5)
      .blend(src(o0).scale(1.01).rotate(() => window.audioMid * 0.01), 0.95)
      .out(o0);
  }

  // 2. Aurora Borealis: Wavy, colorful curtains of light.
  _p2_aurora() {
    osc(5, 0.05, () => window.audioMid * 0.5)
      .color(...this._c())
      .modulate(noise(2, 0.02).scrollY(-0.02), 0.2)
      .blend(src(o0).scale(1.0).scrollY(0.005), 0.9)
      .saturate(1.2)
      .out(o0);
  }

  // 3. Deep Water Surface: Rippling reflections.
  _p3_waterRipples() {
    noise(4, 0.1)
      .luma(0.5, 0.1)
      .color(...this._c())
      .modulate(src(o0), () => window.audioBass * 0.1)
      .blend(src(o0).scale(1.02), 0.85)
      .modulateScrollY(osc(2), () => window.audioBeat * 0.05)
      .out(o0);
  }

  // 4. Magnetic Ferrofluid: Dark, metallic fluid.
  _p4_ferrofluid() {
    voronoi(5, 0.5)
      .luma(0.2)
      .modulate(noise(2, 0.1), () => window.audioHigh * 0.2)
      .blend(src(o0).scale(() => 0.99 - window.audioBass * 0.02), 0.9)
      .mult(solid(...this._c()))
      .out(o0);
  }

  // 5. Lava Lamp: Slow, glowing blobs.
  _p5_lavaLamp() {
    noise(2, 0.02)
      .thresh(0.4, 0.2)
      .color(...this._c())
      .modulate(src(o0), () => 0.01 + window.audioBass * 0.05)
      .blend(src(o0).scrollY(-0.002), 0.95)
      .out(o0);
  }

  // 6. Bioluminescent Algae: Glowing swirls in the dark.
  _p6_biolum() {
    noise(10, 0.2)
      .luma(0.8, 0.1)
      .color(...this._c())
      .modulateRotate(osc(2), () => window.audioMid * 0.2)
      .blend(src(o0).scale(1.01).rotate(0.01), 0.92)
      .out(o0);
  }

  // 7. Ethereal Vapor: Very soft mists.
  _p7_vapor() {
    osc(3, 0.01, 0)
      .modulate(noise(1, 0.01), 0.1)
      .color(...this._c())
      .blend(src(o0).scale(1.005).scrollY(() => -0.001 - window.audioBass * 0.01), 0.98)
      .out(o0);
  }
}
