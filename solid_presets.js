const fs = require('fs');

const hydraJsPath = '/home/santwah/Downloads/Synthestesia/hydra-controller.js';
let hydraCode = fs.readFileSync(hydraJsPath, 'utf8');

const presetStartIndex = hydraCode.indexOf('  // ── Preset Switcher');
if (presetStartIndex !== -1) {
  hydraCode = hydraCode.substring(0, presetStartIndex);
}

// Write the ABSOLUTELY STABLE, NON-BLOWOUT presets.
// Zero crazy scale multipliers. Zero color explosions. 
// Pure geometrical distortion and rotation for reactivity.
hydraCode += `  // ── Preset Switcher ──────────────────────────────────────────────
  applyPreset(index) {
    this.currentPreset = ((index % this.numPresets) + this.numPresets) % this.numPresets;

    const presets = [
      this._p1_glitchCore,
      this._p2_shatterSpace,
      this._p3_laserGrid,
      this._p4_hyperDrive,
      this._p5_neonSpike,
      this._p6_acidBurn,
      this._p7_cyberScan,
      this._p8_chromaTear,
      this._p9_voidVortex,
      this._p10_dataBreach,
      this._p11_wireRupture,
      this._p12_plasmaStorm,
      this._p13_geoMelt,
      this._p14_strobeMatrix,
      this._p15_bassCrush,
      this._p16_systemCollapse
    ];
    
    solid(0, 0, 0, 1).out(o0);
    solid(0, 0, 0, 1).out(o1);
    solid(0, 0, 0, 1).out(o2);
    solid(0, 0, 0, 1).out(o3);

    try {
      presets[this.currentPreset].bind(this)();
    } catch (err) {
      console.warn("Preset error:", err);
      solid(0, 0, 0, 1).out(o0);
    }
  }

  // 1. Glitch Core
  _p1_glitchCore() {
    this._s(
      shape(4, 0.5) // A solid base shape that never grows to infinity
        .color(...this._c())
        .modulate(noise(4), () => audioBass * 0.8) // Distorts instead of scaling
        .rotate(() => time * 0.2 + audioMid * 0.5)
        .kaleid(4)
        .diff(src(o0).rotate(0.1).scale(0.95))
    ).out(o0);
  }

  // 2. Shatter Space
  _p2_shatterSpace() {
    this._s(
      voronoi(8, 2)
        .thresh(0.5)
        .color(...this._cRot(90))
        .modulateRotate(osc(10), () => audioHigh * 1.5)
        .add(shape(99, 0.1).color(...this._c()).modulateScale(noise(2), () => audioBass * 0.5))
    ).out(o0);
  }

  // 3. Laser Grid
  _p3_laserGrid() {
    this._s(
      osc(40, 0.1, () => audioMid * 0.5)
        .rotate(Math.PI/2)
        .thresh(0.8)
        .color(...this._c())
        .modulateScrollX(noise(3), () => audioBass * 0.5)
        .add(src(o0).scrollY(() => audioHigh * 0.1).luma(0.1))
    ).out(o0);
  }

  // 4. Hyper Drive
  _p4_hyperDrive() {
    this._s(
      shape(3, 0.2)
        .repeat(5, 5)
        .color(...this._cRot(45))
        .modulate(voronoi(2), () => audioBass * 0.4)
        .scrollX(() => time + audioMid * 0.5)
        .scrollY(() => audioHigh * 0.5)
    ).out(o0);
  }

  // 5. Neon Spike
  _p5_neonSpike() {
    this._s(
      osc(20, 0.1, 0)
        .rotate(Math.PI/4)
        .thresh(0.5)
        .color(...this._c())
        .modulate(noise(5), () => audioBass * 0.6)
        .kaleid(() => 2 + Math.floor(audioBeat * 2))
    ).out(o0);
  }

  // 6. Acid Burn
  _p6_acidBurn() {
    this._s(
      noise(4, 0.1)
        .colorama(() => audioBass * 0.2)
        .color(...this._cRot(180))
        .modulateRotate(osc(5), () => audioMid * 1.5)
        .diff(src(o0).scale(0.99))
    ).out(o0);
  }

  // 7. Cyber Scan
  _p7_cyberScan() {
    this._s(
      shape(2, 0.8)
        .scale(1, 0.05)
        .scrollY(() => time * 1.5 + audioBass * 0.5)
        .color(...this._c())
        .modulatePixelate(noise(5), 50)
        .add(voronoi(15, 0).thresh(0.8).color(...this._cRot(90)).luma(), () => audioHigh * 0.5)
    ).out(o0);
  }

  // 8. Chroma Tear
  _p8_chromaTear() {
    this._s(
      shape(6, 0.4)
        .color(...this._c())
        .modulate(osc(10).rotate(1.57), () => audioBass * 0.5)
        .colorama(() => audioMid * 0.1)
        .add(src(o0).scale(0.9).rotate(() => audioHigh * 0.2).luma(0.2))
    ).out(o0);
  }

  // 9. Void Vortex
  _p9_voidVortex() {
    this._s(
      shape(99, 0.3)
        .color(...this._cRot(60))
        .modulate(voronoi(5), () => audioBass * 0.5)
        .kaleid(5)
        .rotate(() => time * 0.5 + audioMid * 0.5)
    ).out(o0);
  }

  // 10. Data Breach
  _p10_dataBreach() {
    this._s(
      osc(30, 0.1, () => audioMid * 0.5)
        .thresh(0.5)
        .color(...this._c())
        .modulatePixelate(noise(10), 100) // Fixed pixelation size, no negative values!
        .scrollX(() => audioBass * 0.5)
        .scrollY(() => audioHigh * 0.5)
    ).out(o0);
  }

  // 11. Wire Rupture
  _p11_wireRupture() {
    this._s(
      voronoi(15, 0)
        .thresh(0.8)
        .color(...this._cRot(120))
        .modulateRotate(noise(2), () => audioBass * 1.5)
        .diff(src(o0).scale(0.95))
    ).out(o0);
  }

  // 12. Plasma Storm
  _p12_plasmaStorm() {
    this._s(
      noise(6, 0.2)
        .thresh(0.5)
        .color(...this._c())
        .modulate(osc(10), () => audioBass * 0.5)
        .colorama(() => audioMid * 0.1)
    ).out(o0);
  }

  // 13. Geo Melt
  _p13_geoMelt() {
    this._s(
      shape(3, 0.4)
        .repeat(3, 3)
        .color(...this._cRot(200))
        .modulate(noise(3), () => audioBass * 0.6)
        .add(src(o0).scrollY(0.01).rotate(() => audioHigh * 0.1).luma(0.1))
    ).out(o0);
  }

  // 14. Strobe Matrix
  _p14_strobeMatrix() {
    this._s(
      osc(20, 0.1, 0)
        .rotate(Math.PI/4)
        .thresh(0.5)
        .color(...this._c())
        .modulateScrollX(osc(5), () => audioBass * 0.5)
        .invert(() => audioBeat) // The only place where we use a flash
    ).out(o0);
  }

  // 15. Bass Crush
  _p15_bassCrush() {
    this._s(
      shape(4, 0.5)
        .color(...this._cRot(40))
        .modulate(osc(10).rotate(1.57), () => audioBass * 0.8)
        .kaleid(3)
        .rotate(() => time * -0.2)
    ).out(o0);
  }

  // 16. System Collapse
  _p16_systemCollapse() {
    this._s(
      shape(100, 0.1)
        .color(...this._c())
        .modulateScale(noise(5), () => audioBass * 0.5)
        .repeat(4, 4)
        .modulate(osc(5).rotate(1.57), () => audioMid * 0.5)
        .add(src(o0).scale(0.95).luma(0.2))
    ).out(o0);
  }
}
`;

fs.writeFileSync(hydraJsPath, hydraCode);
console.log('Done rewriting solid presets.');
