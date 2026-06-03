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

  // Returns the source. If screen is active, returns s0 (the capture). Else returns a noise texture.
  _canvas() {
    if (this.screenActive) return src(s0);
    return noise(2, 0.1);
  }

  async toggleScreenCapture() {
    if (this.screenActive) {
      this.screenActive = false;
      if (this.screenStream) this.screenStream.getTracks().forEach(t => t.stop());
      this.applyPreset(this.currentPreset);
      return null;
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        const video = document.createElement('video');
        video.autoplay = true; video.playsInline = true; video.muted = true;
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();

        s0.init({ src: video, dynamic: true });
        this.screenStream = stream;
        this.screenActive = true;
        this.applyPreset(this.currentPreset);
        return stream;
      } catch (err) {
        this.screenActive = false;
        throw err;
      }
    }
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
      this._p0_liquidFeedback,
      this._p1_hyperSpace,
      this._p2_glassEcho,
      this._p3_chromaticFluid,
      this._p4_neonAbyss,
      this._p5_strobeFractal,
      this._p6_cyberMelt,
      this._p7_systemCollapse
    ];
    // Reset buffers before switching
    solid(0,0,0,1).out(o0);
    solid(0,0,0,1).out(o1);
    
    setTimeout(() => {
      presets[this.currentPreset].bind(this)();
    }, 50);
  }

  // 0. Liquid Feedback: Infinite melting mirror that reacts to bass transients.
  _p0_liquidFeedback() {
    this._canvas()
      .modulate(noise(2, 0.01).modulate(src(o0), 0.1), () => window.audioBass * 0.5)
      .blend(src(o0).scale(() => 1.001 + window.audioBeat * 0.02).scrollY(0.002), 0.85)
      .saturate(1.05)
      .colorama(() => window.audioHigh * 0.02)
      .out(o0);
  }

  // 1. Hyper Space: Deep 3D-like zoom with chromatic aberration on beats.
  _p1_hyperSpace() {
    this._canvas()
      .kaleid(4)
      .modulateScale(osc(4).rotate(time * 0.1), () => window.audioMid * 0.5)
      .diff(src(o0).scale(() => 0.95 - window.audioBeat * 0.1).rotate(0.01))
      .color(...this._c(() => 1.0 + window.audioBeat))
      .out(o0);
  }

  // 2. Glass Echo: Smooth, elegant glassmorphic echoes of the screen.
  _p2_glassEcho() {
    this._canvas()
      .luma(0.2)
      .modulatePixelate(noise(5), () => 100 + window.audioBass * 100)
      .layer(src(o0).mask(shape(4, 0.5, 0.1)).scale(1.05).luma(0.1))
      .blend(src(o0).scale(1.01), 0.8)
      .out(o0);
  }

  // 3. Chromatic Fluid: Intense color separation and fluid smearing.
  _p3_chromaticFluid() {
    this._canvas()
      .color(1, 0, 0).shift(0.01, 0)
      .layer(this._canvas().color(0, 1, 0).mask(shape(99, 0.5, 0.1)))
      .layer(this._canvas().color(0, 0, 1).shift(-0.01, 0))
      .modulate(src(o0), () => window.audioBass * 0.3)
      .blend(src(o0).scale(1.02), 0.9)
      .out(o0);
  }

  // 4. Neon Abyss: Deep space void with neon edges tracing the screen capture.
  _p4_neonAbyss() {
    this._canvas()
      .edge(() => window.audioHigh * 2)
      .color(...this._c())
      .modulate(noise(3, 0.1), () => window.audioBass * 0.5)
      .add(src(o0).scrollY(-0.01).scale(0.99), 0.6)
      .out(o0);
  }

  // 5. Strobe Fractal: Rapid geometric expansion.
  _p5_strobeFractal() {
    this._canvas()
      .modulateRotate(osc(10), () => window.audioMid * 0.5)
      .kaleid(() => 2 + Math.floor(window.audioBeat * 4))
      .diff(src(o0).scale(0.9))
      .add(solid(...this._c(() => window.audioBeat)), 0.5)
      .out(o0);
  }

  // 6. Cyber Melt: Heavy vertical distortion like a melting VHS.
  _p6_cyberMelt() {
    this._canvas()
      .modulateScrollX(osc(40, 0).rotate(Math.PI/2), () => window.audioBass * 0.5)
      .blend(src(o0).scrollY(() => -0.01 - window.audioBeat * 0.05), 0.8)
      .saturate(() => 1.0 + window.audioBeat)
      .out(o0);
  }

  // 7. System Collapse: Pure chaos, mixing voronoi, feedback, and scale.
  _p7_systemCollapse() {
    this._canvas()
      .modulate(voronoi(10), () => window.audioVol * 2.0)
      .colorama(() => window.audioBeat * 0.5)
      .kaleid(() => 2 + Math.floor(window.audioBass * 3))
      .blend(src(o0).scale(1.1).rotate(0.05), 0.5)
      .out(o0);
  }
}
