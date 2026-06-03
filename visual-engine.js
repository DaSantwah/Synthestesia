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

  // Returns the source. If screen is active, returns s0 (the capture). Else returns noise as a fallback canvas.
  _canvas() {
    if (this.screenActive) return src(s0);
    return solid(0,0,0);
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
      this._p0_bassDisplacement,
      this._p1_shatterGlass,
      this._p2_acidWash,
      this._p3_cyberScan,
      this._p4_neonTear,
      this._p5_strobeFractal,
      this._p6_liquidData,
      this._p7_systemCollapse
    ];
    solid(0,0,0,1).out(o0);
    presets[this.currentPreset].bind(this)();
  }

  // 0. Bass Displacement: The screen pulses and pixelates heavily on kick drums.
  _p0_bassDisplacement() {
    this._canvas()
      .modulatePixelate(noise(5, 0.1), () => 100 + window.audioBass * 100)
      .modulate(osc(10).rotate(1.57), () => window.audioBeat * 0.5)
      .colorama(() => window.audioMid * 0.05)
      .blend(solid(...this._c(() => window.audioBeat * 0.5)), 0.3)
      .out();
  }

  // 1. Shatter Glass: The screen fractures into Voronoi shards that spread with audio energy.
  _p1_shatterGlass() {
    this._canvas()
      .modulate(voronoi(() => 5 + window.audioMid * 5, 2), () => window.audioBass * 1.5)
      .diff(src(o0).scale(() => 0.98 + window.audioBeat * 0.05))
      .saturate(() => 1.0 + window.audioHigh)
      .out();
  }

  // 2. Acid Wash: Fluid melting of the screen capture with deep color saturation.
  _p2_acidWash() {
    this._canvas()
      .modulateRotate(noise(2, 0.1), () => window.audioBass * 0.8)
      .colorama(() => window.audioVol * 0.1)
      .blend(src(o0).scale(1.01).scrollX(() => window.audioMid * 0.01), 0.5)
      .out();
  }

  // 3. Cyber Scan: Vertical scanning lines that tear the screen horizontally on bass drops.
  _p3_cyberScan() {
    this._canvas()
      .modulateScrollX(osc(40, 0).rotate(Math.PI/2), () => window.audioBass * 0.5)
      .add(osc(60, 0.1).color(...this._c(() => window.audioHigh)), () => window.audioMid)
      .invert(() => window.audioBeat > 0.5 ? 1 : 0)
      .out();
  }

  // 4. Neon Tear: High contrast kaleidoscope that multiplies the screen capture.
  _p4_neonTear() {
    this._canvas()
      .kaleid(4)
      .modulate(osc(10).rotate(time), () => window.audioBass * 0.3)
      .diff(solid(...this._c(() => window.audioBeat)))
      .scale(() => 1.0 + window.audioMid * 0.2)
      .out();
  }

  // 5. Strobe Fractal: Rapid scaling and feedback loops triggered by transients.
  _p5_strobeFractal() {
    this._canvas()
      .modulateScale(noise(4), () => window.audioBass * 1.5)
      .diff(src(o0).scale(0.9))
      .add(solid(...this._c(() => window.audioBeat)), 0.5)
      .out();
  }

  // 6. Liquid Data: The screen turns into an audio-reactive fluid grid.
  _p6_liquidData() {
    this._canvas()
      .modulate(shape(4).repeat(10, 10), () => window.audioBass * 0.5)
      .scrollY(() => window.audioMid * 0.2)
      .colorama(() => window.audioHigh * 0.05)
      .out();
  }

  // 7. System Collapse: Extreme audio-reactive distortion for drops.
  _p7_systemCollapse() {
    this._canvas()
      .modulate(voronoi(10), () => window.audioVol * 2.0)
      .colorama(() => window.audioBeat * 0.5)
      .kaleid(() => 2 + Math.floor(window.audioBass * 3))
      .out();
  }
}
