const fs = require('fs');

const appJsPath = '/home/santwah/Downloads/Synthestesia/app.js';
let appCode = fs.readFileSync(appJsPath, 'utf8');

// 1. Remove $specCanvas and $colorPresetBtns definitions
appCode = appCode.replace(/const \$specCanvas\s*=\s*document\.getElementById\('spectrum-canvas'\);\n?/, '');
appCode = appCode.replace(/const \$colorPresetBtns\s*=\s*document\.querySelectorAll\('\.color-preset-btn'\);\n?/, '');
appCode = appCode.replace(/const specCtx\s*=\s*\$specCanvas\.getContext\('2d'\);\n?/, '');

// 2. Fix showPlayer and visibility
appCode = appCode.replace(/\$specCanvas\.classList\.add\('visible'\);/g, "$hydraCanvas.classList.add('visible');\n  if (hydraCtrl && typeof hydraCtrl.applyPreset === 'function') hydraCtrl.applyPreset(hydraCtrl.currentPreset || 0);");
appCode = appCode.replace(/\$specCanvas\.classList\.remove\('visible'\);/g, '');

// 3. Remove loop caps
appCode = appCode.replace(
/  \/\/ Core bands scaled by sensitivity and smoothly bounded to prevent visual chaos\s+window\.audioBass = Math\.min\(analyzer\.bass \* sens, 1\.8\);\s+window\.audioMid  = Math\.min\(analyzer\.mid \* sens, 1\.5\);\s+window\.audioHigh = Math\.min\(analyzer\.high \* sens, 1\.5\);\s+window\.audioVol  = Math\.min\(analyzer\.overall \* sens, 2\.0\);\s+\/\/ Extended bands scaled by sensitivity and bounded\s+window\.audioSub        = Math\.min\(analyzer\.sub \* sens, 2\.0\);\s+window\.audioLowMid     = Math\.min\(analyzer\.lowMid \* sens, 1\.6\);\s+window\.audioPresence   = Math\.min\(analyzer\.presence \* sens, 1\.6\);\s+window\.audioBrilliance = Math\.min\(analyzer\.brilliance \* sens, 1\.8\);/g,
`  // Core bands scaled exponentially by sensitivity (no limits)
  window.audioBass = analyzer.bass * sens * sens * 1.5;
  window.audioMid  = analyzer.mid * sens * sens * 1.5;
  window.audioHigh = analyzer.high * sens * sens * 1.5;
  window.audioVol  = analyzer.overall * sens * sens * 1.5;

  // Extended bands
  window.audioSub        = analyzer.sub * sens * sens * 1.5;
  window.audioLowMid     = analyzer.lowMid * sens * sens * 1.5;
  window.audioPresence   = analyzer.presence * sens * sens * 1.5;
  window.audioBrilliance = analyzer.brilliance * sens * sens * 1.5;`
);

// 4. Remove drawSpectrum inside loop
appCode = appCode.replace(
/  \/\/ Throttle visual spectrum to 30 FPS\s+if \(loopFrameCount % 2 === 0\) \{\s+drawSpectrum\(\);\s+\}/g,
''
);

// 5. Remove drawSpectrum function entirely
appCode = appCode.replace(
/\/\/ ════════════════════════════════════════════════════════════════════\s+\/\/ SPECTRUM\s+\/\/ ════════════════════════════════════════════════════════════════════\s+function drawSpectrum\(\) \{[\s\S]*?\}\s+\/\/ ════════════════════════════════════════════════════════════════════/g,
'// ════════════════════════════════════════════════════════════════════'
);

// 6. Replace Color Preset logic with hexToHSL
appCode = appCode.replace(
/const evaColorPresets = \{[\s\S]*?updateColorPreview\(\);/g,
`// HEX to HSL converter
function hexToHSL(H) {
  let r = 0, g = 0, b = 0;
  if (H.length === 4) {
    r = "0x" + H[1] + H[1]; g = "0x" + H[2] + H[2]; b = "0x" + H[3] + H[3];
  } else if (H.length === 7) {
    r = "0x" + H[1] + H[2]; g = "0x" + H[3] + H[4]; b = "0x" + H[5] + H[6];
  }
  r /= 255; g /= 255; b /= 255;
  let cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin, h = 0, s = 0, l = 0;
  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);
  return { h, s, l };
}

const $colorPicker = document.getElementById('color-picker');
if ($colorPicker) {
  $colorPicker.addEventListener('input', (e) => {
    const hsl = hexToHSL(e.target.value);
    window.colorH = hsl.h; window.colorS = hsl.s; window.colorL = hsl.l;
    if ($sliderHue) $sliderHue.value = hsl.h;
    if ($sliderSat) $sliderSat.value = hsl.s;
    if ($sliderLum) $sliderLum.value = hsl.l;
    if ($hueValue) $hueValue.textContent = \`\${hsl.h}°\`;
    if ($satValue) $satValue.textContent = \`\${hsl.s}%\`;
    if ($lumValue) $lumValue.textContent = \`\${hsl.l}%\`;
    updateColorPreview();
    if (hydraCtrl) hydraCtrl.applyPreset(hydraCtrl.currentPreset);
  });
}

updateColorPreview();`
);

fs.writeFileSync(appJsPath, appCode);

// -------------------------------------------------------------
// HYDRA CONTROLLER
// -------------------------------------------------------------
const hydraJsPath = '/home/santwah/Downloads/Synthestesia/hydra-controller.js';
let hydraCode = fs.readFileSync(hydraJsPath, 'utf8');

// We will slice out the entire "Preset Switcher" and everything below it
const presetStartIndex = hydraCode.indexOf('  // ── Preset Switcher');
if (presetStartIndex !== -1) {
  hydraCode = hydraCode.substring(0, presetStartIndex);
}

// Append new destructive presets
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
      voronoi(() => 5 + audioBass * 10, () => audioMid * 2)
        .modulatePixelate(noise(() => audioHigh * 5), () => 10 + audioBeat * 50)
        .color(...this._c(() => 1 + audioVol))
        .diff(osc(() => 20 + audioBass * 50, 0.1, () => audioMid * 5).rotate(() => audioHigh))
    ).out();
  }

  // 2. Shatter Space
  _p2_shatterSpace() {
    this._s(
      shape(4, 0.5)
        .modulate(noise(() => 2 + audioBass * 4), () => audioMid * 2)
        .colorama(() => audioHigh * 0.1)
        .color(...this._cRot(90, () => audioVol * 2))
        .kaleid(() => 2 + Math.floor(audioBeat * 4))
    ).out();
  }

  // 3. Laser Grid
  _p3_laserGrid() {
    this._s(
      osc(50, 0.05, () => audioHigh * 2)
        .thresh(() => 0.8 - audioBeat * 0.4)
        .modulateScrollY(osc(10).rotate(Math.PI/2), () => audioBass * 3)
        .color(...this._c())
        .add(src(o0).scale(0.9).luma(0.1), () => audioMid)
    ).out();
  }

  // 4. Hyper Drive
  _p4_hyperDrive() {
    this._s(
      shape(3, 0.1)
        .repeat(() => 2 + audioBass * 10, () => 2 + audioMid * 10)
        .modulateRotate(noise(() => audioVol * 5), () => audioHigh * 3)
        .color(...this._cRot(45, () => audioBeat * 3 + 0.5))
        .scrollX(() => time * 2)
    ).out();
  }

  // 5. Neon Spike
  _p5_neonSpike() {
    this._s(
      voronoi(10, 2)
        .thresh(() => 0.5 - audioBass * 0.3)
        .modulateScale(osc(() => audioMid * 20), () => audioHigh * 5)
        .color(...this._c())
        .invert(() => audioBeat > 0.5 ? 1 : 0)
    ).out();
  }

  // 6. Acid Burn
  _p6_acidBurn() {
    this._s(
      osc(() => 10 + audioBass * 20, 0.1, () => audioMid * 5)
        .colorama(() => time * 0.5 + audioVol)
        .modulate(voronoi(() => audioHigh * 10), () => audioBass * 2)
        .color(...this._cRot(180, () => 2))
    ).out();
  }

  // 7. Cyber Scan
  _p7_cyberScan() {
    this._s(
      shape(2, () => 0.1 + audioBass * 0.5)
        .scale(() => 1, () => 0.05 + audioMid * 0.2)
        .scrollY(() => time * 2 + audioBeat * 0.5)
        .modulatePixelate(noise(5), () => 100 - audioHigh * 90)
        .color(...this._c())
    ).out();
  }

  // 8. Chroma Tear
  _p8_chromaTear() {
    this._s(
      noise(() => 5 + audioBass * 15)
        .modulate(osc(10).rotate(1.57), () => audioMid * 3)
        .colorama(() => audioHigh * 0.5)
        .color(...this._cRot(120, () => audioVol * 1.5))
    ).out();
  }

  // 9. Void Vortex
  _p9_voidVortex() {
    this._s(
      shape(100, 0.5)
        .modulateRotate(noise(() => audioBass * 5), () => audioMid * 5)
        .kaleid(() => 3 + Math.floor(audioHigh * 10))
        .color(...this._c())
        .diff(src(o0).scale(() => 0.9 - audioBeat * 0.2))
    ).out();
  }

  // 10. Data Breach
  _p10_dataBreach() {
    this._s(
      osc(() => audioBass * 50, 0.2, () => audioMid * 2)
        .thresh(0.4)
        .modulatePixelate(osc(10, 0, 0), () => audioHigh * 50)
        .color(...this._cRot(60, () => audioVol))
    ).out();
  }

  // 11. Wire Rupture
  _p11_wireRupture() {
    this._s(
      voronoi(() => audioHigh * 20, 0.0)
        .thresh(() => 0.7 - audioBass * 0.5)
        .modulate(noise(2), () => audioMid * 3)
        .color(...this._c())
        .invert(() => audioBeat)
    ).out();
  }

  // 12. Plasma Storm
  _p12_plasmaStorm() {
    this._s(
      noise(() => 3 + audioMid * 10, 0.2)
        .modulateScale(osc(5), () => audioBass * 5)
        .colorama(() => audioHigh * 0.2)
        .color(...this._cRot(200, () => audioVol * 2))
    ).out();
  }

  // 13. Geo Melt
  _p13_geoMelt() {
    this._s(
      shape(() => 3 + Math.floor(audioHigh * 4), 0.3)
        .repeat(3, 3)
        .modulate(voronoi(2), () => audioBass * 4)
        .color(...this._c())
        .add(src(o0).scrollY(() => audioMid * 0.5).luma(0.2))
    ).out();
  }

  // 14. Strobe Matrix
  _p14_strobeMatrix() {
    this._s(
      osc(() => 20 + audioBass * 20, 0.1, 0)
        .rotate(Math.PI/4)
        .thresh(() => 0.5 + Math.sin(time*10)*0.4)
        .color(...this._cRot(90, () => audioBeat * 5))
        .modulate(noise(() => audioHigh * 10), () => audioMid)
    ).out();
  }

  // 15. Bass Crush
  _p15_bassCrush() {
    this._s(
      shape(4, 0.8)
        .modulatePixelate(noise(5), () => 200 - audioBass * 180)
        .colorama(() => audioMid * 0.1)
        .color(...this._c())
        .kaleid(() => 1 + Math.floor(audioHigh * 5))
    ).out();
  }

  // 16. System Collapse
  _p16_systemCollapse() {
    this._s(
      src(o0)
        .modulate(noise(() => audioMid * 10), () => audioBass * 0.5)
        .layer(
          shape(4, 0.1)
            .luma()
            .color(...this._cRot(180, () => audioVol * 3))
            .scale(() => 0.5 + audioHigh * 2)
            .scrollY(() => time)
        )
        .blend(noise(3).color(1,1,1), 0.01)
        .invert(() => audioBeat > 0.8 ? 1 : 0)
    ).out();
  }
}
`;

fs.writeFileSync(hydraJsPath, hydraCode);
console.log('OK');
