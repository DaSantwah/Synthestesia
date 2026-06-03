/**
 * HydraController V3 (Premium Audio-Reactive Engine)
 *
 * Flawlessly integrated with normalized audio bounds [0.0 - 1.0].
 * Advanced Screen Capture integration (s0): Presets act as visual modulators
 * and displacement maps for the live screen feed, rather than just overlaying it.
 */

function hsl2rgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

export class HydraController {
  constructor() {
    this.hydra = null;
    this.currentPreset = 0;
    this.numPresets = 16;
    this.screenActive = false;
  }

  _c(brightMult = () => 1.0) {
    return [
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[0] * brightMult(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[1] * brightMult(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[2] * brightMult()
    ];
  }

  _cRot(offset = 90, brightMult = () => 1.0) {
    return [
      () => hsl2rgb((window.colorH + offset) % 360, window.colorS, window.colorL)[0] * brightMult(),
      () => hsl2rgb((window.colorH + offset) % 360, window.colorS, window.colorL)[1] * brightMult(),
      () => hsl2rgb((window.colorH + offset) % 360, window.colorS, window.colorL)[2] * brightMult()
    ];
  }

  // Master output wrapper: If screen capture is active, use the preset (chain) 
  // to organically modulate, displace, and blend the screen capture!
  _s(chain) {
    if (this.screenActive) {
      return src(s0)
        .modulate(chain, () => audioBass * 0.15 + 0.05)
        .blend(chain, () => 0.3 + audioMid * 0.2)
        .layer(src(s0).luma(0.1).colorama(() => audioHigh * 0.05))
        .saturate(() => 1.0 + audioBeat * 0.5);
    }
    return chain;
  }

  async toggleScreenCapture() {
    if (this.screenActive) {
      this.stopScreenCapture();
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
        this.screenVideo = video;
        this.screenActive = true;
        this.applyPreset(this.currentPreset);
        return stream;
      } catch (err) {
        this.screenActive = false;
        throw err;
      }
    }
  }

  stopScreenCapture() {
    this.screenActive = false;
    if (this.screenStream) this.screenStream.getTracks().forEach(t => t.stop());
    if (this.screenVideo) this.screenVideo.remove();
    if (s0 && s0.src) s0.src = null;
  }

  init(canvas) {
    this.hydra = new Hydra({
      canvas, detectAudio: false, enableStreamCapture: false,
      makeGlobal: true, width: canvas.width, height: canvas.height,
    });
    this.playIdleVisuals();
  }

  playIdleVisuals() {
    solid(0.015, 0.004, 0.03)
      .layer(
        shape(4, 0.01, 0).scale(1, 100).repeat(20, 20)
          .color(0.32, 1.0, 0.0)
          .modulate(noise(2, 0.1).scrollX(0.5, 0.1))
      ).out();
  }

  setResolution(w, h) {
    if (this.hydra) this.hydra.setResolution(w, h);
  }

  applyPreset(index) {
    this.currentPreset = ((index % this.numPresets) + this.numPresets) % this.numPresets;
    const presets = [
      this._p1_glitchCore, this._p2_shatterSpace, this._p3_laserGrid, this._p4_hyperDrive,
      this._p5_neonSpike, this._p6_acidBurn, this._p7_cyberScan, this._p8_chromaTear,
      this._p9_voidVortex, this._p10_dataBreach, this._p11_wireRupture, this._p12_plasmaStorm,
      this._p13_geoMelt, this._p14_strobeMatrix, this._p15_bassCrush, this._p16_systemCollapse
    ];
    
    solid(0,0,0,1).out(o0);
    try { presets[this.currentPreset].bind(this)(); } 
    catch (err) { solid(0,0,0,1).out(o0); }
  }

  // 1. Glitch Core (Pulsing Voronoi)
  _p1_glitchCore() {
    this._s(
      voronoi(8, 1)
        .modulatePixelate(noise(3), () => 10 + audioBass * 40)
        .color(...this._c())
        .diff(osc(10, 0.1).rotate(Math.PI/4).scale(() => 1.0 + audioBeat * 0.2))
    ).out(o0);
  }

  // 2. Shatter Space (No pelotita, aggressive geometric fracture)
  _p2_shatterSpace() {
    this._s(
      shape(4, 0.5)
        .modulate(noise(3), () => audioBass * 0.5)
        .colorama(() => audioHigh * 0.1)
        .color(...this._cRot(90))
        .kaleid(4)
        .scale(() => 1.0 + audioBeat * 0.3)
        .diff(src(o0).scale(0.95))
    ).out(o0);
  }

  // 3. Laser Grid (Audio-reactive horizontal scanlines)
  _p3_laserGrid() {
    this._s(
      osc(60, 0.05, () => audioMid * 1.5)
        .thresh(0.7)
        .color(...this._c())
        .modulateScrollY(osc(10).rotate(1.57), () => audioBass * 0.2)
        .add(src(o0).scrollX(0.01).luma(0.1))
    ).out(o0);
  }

  // 4. Hyper Drive (Tunnel effect)
  _p4_hyperDrive() {
    this._s(
      shape(3, 0.1)
        .repeat(3, 3)
        .color(...this._cRot(45))
        .modulateRotate(noise(2), () => audioHigh * 0.5)
        .scrollX(() => time * 0.5 + audioMid * 0.2)
        .scale(() => 1.0 + audioBass * 0.5)
    ).out(o0);
  }

  // 5. Neon Spike
  _p5_neonSpike() {
    this._s(
      voronoi(15, 2)
        .thresh(0.5)
        .color(...this._c())
        .modulateScale(osc(5), () => audioMid * 0.5)
        .invert(() => audioBeat > 0.5 ? 1 : 0)
    ).out(o0);
  }

  // 6. Acid Burn (Fluid, colorama heavy, beautifully chaotic)
  _p6_acidBurn() {
    this._s(
      noise(4, 0.1)
        .colorama(() => audioBass * 0.2)
        .color(...this._cRot(180))
        .modulateRotate(osc(5), () => audioMid * 0.5)
        .diff(src(o0).scale(0.98))
    ).out(o0);
  }

  // 7. Cyber Scan
  _p7_cyberScan() {
    this._s(
      shape(2, 0.1).scale(1, 0.05)
        .scrollY(() => time + audioBass * 0.5)
        .color(...this._c())
        .modulatePixelate(noise(5), () => 50 + audioHigh * 50)
    ).out(o0);
  }

  // 8. Chroma Tear
  _p8_chromaTear() {
    this._s(
      osc(20, 0.1, () => audioMid * 0.5)
        .modulate(noise(4), () => audioBass * 0.4)
        .colorama(() => audioHigh * 0.2)
        .color(...this._cRot(120))
        .kaleid(2)
    ).out(o0);
  }

  // 9. Void Vortex
  _p9_voidVortex() {
    this._s(
      shape(99, 0.3)
        .modulate(voronoi(5), () => audioBass * 0.3)
        .kaleid(5)
        .rotate(() => time * 0.2 + audioMid * 0.2)
        .color(...this._c())
    ).out(o0);
  }

  // 10. Data Breach
  _p10_dataBreach() {
    this._s(
      osc(40, 0.1, () => audioMid * 0.5)
        .thresh(0.5)
        .color(...this._cRot(60))
        .modulatePixelate(noise(10), 80)
        .scrollX(() => audioBass * 0.2)
    ).out(o0);
  }

  // 11. Wire Rupture
  _p11_wireRupture() {
    this._s(
      voronoi(20, 0)
        .thresh(0.8)
        .color(...this._c())
        .modulateRotate(noise(2), () => audioBass * 0.5)
        .diff(src(o0).scale(0.95))
    ).out(o0);
  }

  // 12. Plasma Storm
  _p12_plasmaStorm() {
    this._s(
      noise(6, 0.2)
        .thresh(0.5)
        .color(...this._cRot(30))
        .modulate(osc(10), () => audioBass * 0.3)
        .colorama(() => audioMid * 0.1)
    ).out(o0);
  }

  // 13. Geo Melt
  _p13_geoMelt() {
    this._s(
      shape(3, 0.4).repeat(3, 3)
        .color(...this._cRot(200))
        .modulate(noise(3), () => audioBass * 0.4)
        .add(src(o0).scrollY(0.01).rotate(() => audioHigh * 0.1).luma(0.1))
    ).out(o0);
  }

  // 14. Strobe Matrix
  _p14_strobeMatrix() {
    this._s(
      osc(30, 0.1).rotate(Math.PI/4)
        .thresh(0.5)
        .color(...this._c())
        .modulateScrollX(osc(5), () => audioBass * 0.2)
        .invert(() => audioBeat)
    ).out(o0);
  }

  // 15. Bass Crush
  _p15_bassCrush() {
    this._s(
      shape(4, 0.5)
        .color(...this._cRot(40))
        .modulate(osc(10).rotate(1.57), () => audioBass * 0.5)
        .kaleid(3)
        .scale(() => 1.0 + audioBeat * 0.2)
    ).out(o0);
  }

  // 16. System Collapse
  _p16_systemCollapse() {
    this._s(
      shape(100, 0.1).repeat(4, 4)
        .color(...this._c())
        .modulateScale(noise(5), () => audioBass * 0.3)
        .modulate(osc(5).rotate(1.57), () => audioMid * 0.2)
        .add(src(o0).scale(0.95).luma(0.2))
    ).out(o0);
  }
}
