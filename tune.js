const fs = require('fs');

const appJsPath = '/home/santwah/Downloads/Synthestesia/app.js';
let appCode = fs.readFileSync(appJsPath, 'utf8');

// Fix app.js sensitivity
appCode = appCode.replace(
/  \/\/ Core bands scaled exponentially by sensitivity \(no limits\)\s+window\.audioBass = analyzer\.bass \* sens \* sens \* 1\.5;\s+window\.audioMid  = analyzer\.mid \* sens \* sens \* 1\.5;\s+window\.audioHigh = analyzer\.high \* sens \* sens \* 1\.5;\s+window\.audioVol  = analyzer\.overall \* sens \* sens \* 1\.5;\s+\/\/ Extended bands\s+window\.audioSub        = analyzer\.sub \* sens \* sens \* 1\.5;\s+window\.audioLowMid     = analyzer\.lowMid \* sens \* sens \* 1\.5;\s+window\.audioPresence   = analyzer\.presence \* sens \* sens \* 1\.5;\s+window\.audioBrilliance = analyzer\.brilliance \* sens \* sens \* 1\.5;/g,
`  // Core bands (linear and slightly boosted, avoiding extreme blowouts)
  const power = sens * 1.5;
  window.audioBass = analyzer.bass * power;
  window.audioMid  = analyzer.mid * power;
  window.audioHigh = analyzer.high * power;
  window.audioVol  = analyzer.overall * power;

  // Extended bands
  window.audioSub        = analyzer.sub * power;
  window.audioLowMid     = analyzer.lowMid * power;
  window.audioPresence   = analyzer.presence * power;
  window.audioBrilliance = analyzer.brilliance * power;`
);

fs.writeFileSync(appJsPath, appCode);

const hydraJsPath = '/home/santwah/Downloads/Synthestesia/hydra-controller.js';
let hydraCode = fs.readFileSync(hydraJsPath, 'utf8');

// We will slice out the entire "Preset Switcher" and everything below it
const presetStartIndex = hydraCode.indexOf('  // ── Preset Switcher');
if (presetStartIndex !== -1) {
  hydraCode = hydraCode.substring(0, presetStartIndex);
}

// Append carefully balanced, highly reactive but NON-BLOWOUT presets
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

  // 1. Glitch Core - Destructive pixelation on beat
  _p1_glitchCore() {
    this._s(
      voronoi(() => 5 + audioBass * 2, () => Math.min(audioMid * 2, 5))
        .modulatePixelate(noise(() => audioHigh * 2), () => 10 + audioBeat * 20)
        .color(...this._c(() => 1 + audioBeat * 0.8)) // Flash on beat! Not constant blowout.
        .diff(osc(() => 10 + audioBass * 5, 0.1, () => audioMid).rotate(() => audioHigh * 0.5))
    ).out(o0);
  }

  // 2. Shatter Space - Sharp geometric shards
  _p2_shatterSpace() {
    this._s(
      shape(4, 0.5)
        .modulate(noise(() => 2 + audioBass * 2), () => audioMid * 1.5)
        .colorama(() => audioHigh * 0.05)
        .color(...this._cRot(90, () => 1 + audioVol * 0.5))
        .kaleid(() => 2 + Math.floor(audioBeat * 2)) // Max 4 sides
    ).out(o0);
  }

  // 3. Laser Grid - Extreme scanlines
  _p3_laserGrid() {
    this._s(
      osc(50, 0.05, () => audioHigh * 2)
        .thresh(() => 0.6 - audioBeat * 0.3)
        .modulateScrollY(osc(10).rotate(Math.PI/2), () => audioBass * 1.5)
        .color(...this._c())
        .add(src(o0).scale(0.95).luma(0.1), () => audioMid)
    ).out(o0);
  }

  // 4. Hyper Drive - Accelerating tunnel
  _p4_hyperDrive() {
    this._s(
      shape(3, 0.1)
        .repeat(() => 2 + audioBass * 3, () => 2 + audioMid * 3)
        .modulateRotate(noise(() => audioVol * 2), () => audioHigh)
        .color(...this._cRot(45, () => 1 + audioBeat * 1.5))
        .scrollX(() => time * 2)
    ).out(o0);
  }

  // 5. Neon Spike - Sharp spikes and inverts
  _p5_neonSpike() {
    this._s(
      voronoi(10, 2)
        .thresh(() => 0.5 - audioBass * 0.2)
        .modulateScale(osc(() => audioMid * 5), () => audioHigh * 2)
        .color(...this._c())
        .invert(() => audioBeat > 0.8 ? 1 : 0) // Strict strobe invert
    ).out(o0);
  }

  // 6. Acid Burn - Liquid melting distortion
  _p6_acidBurn() {
    this._s(
      osc(() => 10 + audioBass * 10, 0.1, () => audioMid * 2)
        .colorama(() => time * 0.2 + audioVol * 0.1)
        .modulate(voronoi(() => audioHigh * 5), () => audioBass)
        .color(...this._cRot(180, () => 1.5))
    ).out(o0);
  }

  // 7. Cyber Scan - Thick scanning lines overriding pixels
  _p7_cyberScan() {
    this._s(
      shape(2, () => 0.1 + audioBass * 0.2)
        .scale(() => 1, () => 0.05 + audioMid * 0.1)
        .scrollY(() => time * 2 + audioBeat * 0.5)
        .modulatePixelate(noise(5), () => 100 - audioHigh * 50)
        .color(...this._c())
    ).out(o0);
  }

  // 8. Chroma Tear - Color separation and noise
  _p8_chromaTear() {
    this._s(
      noise(() => 5 + audioBass * 5)
        .modulate(osc(10).rotate(1.57), () => audioMid * 1.5)
        .colorama(() => audioHigh * 0.2)
        .color(...this._cRot(120, () => 1 + audioVol * 0.5))
    ).out(o0);
  }

  // 9. Void Vortex - Endless inward geometric spiral
  _p9_voidVortex() {
    this._s(
      shape(100, 0.5)
        .modulateRotate(noise(() => audioBass * 2), () => audioMid * 2)
        .kaleid(() => 3 + Math.floor(audioHigh * 4))
        .color(...this._c())
        .diff(src(o0).scale(() => 0.9 - audioBeat * 0.1).rotate(0.1))
    ).out(o0);
  }

  // 10. Data Breach - Extreme pixel blockiness
  _p10_dataBreach() {
    this._s(
      osc(() => 10 + audioBass * 20, 0.2, () => audioMid)
        .thresh(0.4)
        .modulatePixelate(osc(10, 0, 0), () => 10 + audioHigh * 40)
        .color(...this._cRot(60, () => 1 + audioVol * 0.8))
    ).out(o0);
  }

  // 11. Wire Rupture - Shredded wireframes
  _p11_wireRupture() {
    this._s(
      voronoi(() => audioHigh * 10, 0.0)
        .thresh(() => 0.7 - audioBass * 0.3)
        .modulate(noise(2), () => audioMid * 1.5)
        .color(...this._c())
        .invert(() => audioBeat)
    ).out(o0);
  }

  // 12. Plasma Storm - Expanding chaotic noise
  _p12_plasmaStorm() {
    this._s(
      noise(() => 3 + audioMid * 5, 0.2)
        .modulateScale(osc(5), () => audioBass * 2)
        .colorama(() => audioHigh * 0.1)
        .color(...this._cRot(200, () => 1 + audioVol * 0.8))
    ).out(o0);
  }

  // 13. Geo Melt - Repeating fractured shapes
  _p13_geoMelt() {
    this._s(
      shape(() => 3 + Math.floor(audioHigh * 3), 0.3)
        .repeat(3, 3)
        .modulate(voronoi(2), () => audioBass * 2)
        .color(...this._c())
        .add(src(o0).scrollY(() => audioMid * 0.2).luma(0.2))
    ).out(o0);
  }

  // 14. Strobe Matrix - Sharp diagonal beams
  _p14_strobeMatrix() {
    this._s(
      osc(() => 20 + audioBass * 10, 0.1, 0)
        .rotate(Math.PI/4)
        .thresh(() => 0.5 + Math.sin(time*10)*0.2)
        .color(...this._cRot(90, () => 1 + audioBeat * 2)) // bright flashes
        .modulate(noise(() => audioHigh * 5), () => audioMid * 0.5)
    ).out(o0);
  }

  // 15. Bass Crush - Heavy pixelation destroying smooth shapes
  _p15_bassCrush() {
    this._s(
      shape(4, 0.8)
        .modulatePixelate(noise(5), () => 100 - Math.min(audioBass * 90, 95))
        .colorama(() => audioMid * 0.05)
        .color(...this._c())
        .kaleid(() => 1 + Math.floor(audioHigh * 3))
    ).out(o0);
  }

  // 16. System Collapse - Layers glitching over each other
  _p16_systemCollapse() {
    this._s(
      src(o0)
        .modulate(noise(() => audioMid * 5), () => audioBass * 0.2)
        .layer(
          shape(4, 0.1)
            .luma()
            .color(...this._cRot(180, () => 1 + audioVol * 1.5))
            .scale(() => 0.5 + audioHigh)
            .scrollY(() => time * 0.5)
        )
        .blend(noise(3).color(1,1,1), 0.02)
        .invert(() => audioBeat > 0.8 ? 1 : 0)
    ).out(o0);
  }
}
`;

fs.writeFileSync(hydraJsPath, hydraCode);
console.log('Fixed blowout values');
