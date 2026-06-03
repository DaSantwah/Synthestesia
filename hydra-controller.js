/**
 * HydraController
 *
 * Manages Hydra Synth initialization and audio-reactive preset switching.
 * 14 presets total with smooth, ethereal, psychedelic liquid vibes.
 * Now equipped with live screen capture blending for DJs and performers.
 */

// Translation function: Converts UI HSL to RGB for Hydra
function hsl2rgb(h, s, l) {
  s /= 100; 
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

export class HydraController {
  constructor() {
    this.hydra         = null;
    this.currentPreset = 0;
    this.numPresets    = 16;
    this.screenActive  = false; // Live desktop/window capture status
  }

  // ── Color Helper ──────────────────────────────────────────────────
  // Applies global HSL converted to RGB to Hydra and modulates with audio
  _c(modFunc = () => 1) {
    return [
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[0] * modFunc(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[1] * modFunc(),
      () => hsl2rgb(window.colorH, window.colorS, window.colorL)[2] * modFunc()
    ];
  }

  // Rotated HSL color helper for differentiating frequencies
  _cRot(offset, modFunc = () => 1) {
    return [
      () => hsl2rgb((window.colorH + offset) % 360, window.colorS, window.colorL)[0] * modFunc(),
      () => hsl2rgb((window.colorH + offset) % 360, window.colorS, window.colorL)[1] * modFunc(),
      () => hsl2rgb((window.colorH + offset) % 360, window.colorS, window.colorL)[2] * modFunc()
    ];
  }

  // ── Screen Feed Helper ────────────────────────────────────────────
  // Dynamically blends/modulates screen capture s0 when screenActive is true
  _s(chain) {
    if (this.screenActive) {
      return chain.blend(
        src(s0)
          .scale(() => 1.0 + audioBeat * 0.05)
          .colorama(() => audioBrilliance * 0.03)
          .modulate(osc(() => audioBass * 5).rotate(Math.PI / 2), () => audioMid * 0.1),
        () => 0.4 + audioBass * 0.2 // higher blend weight on bass drops!
      );
    }
    return chain;
  }

  // ── Screen Capture Lifecycle ──────────────────────────────────────
  async toggleScreenCapture() {
    if (this.screenActive) {
      this.stopScreenCapture();
      this.applyPreset(this.currentPreset);
      return null;
    } else {
      try {
        // Solicitar de forma activa video y audio interno de la ventana/pestaña
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        
        // Crear un puente de elemento video en memoria para alimentar a s0 de Hydra
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true; // Muteado para no retroalimentar sonido en las bocinas del DJ
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().catch(e => console.error('[Synthestesia] Error reproduciendo video de pantalla:', e));
        };

        s0.init({ src: video, dynamic: true });
        
        this.screenStream = stream;
        this.screenVideo = video;
        this.screenActive = true;
        this.applyPreset(this.currentPreset);
        
        return stream;
      } catch (err) {
        console.error('[Synthestesia] Screen capture initiation failed:', err);
        this.screenActive = false;
        throw err;
      }
    }
  }

  stopScreenCapture() {
    this.screenActive = false;
    try {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }
      if (this.screenVideo) {
        this.screenVideo.srcObject = null;
        this.screenVideo.remove();
        this.screenVideo = null;
      }
      if (s0 && s0.src) {
        s0.src = null;
      }
    } catch (err) {
      console.warn('[Synthestesia] Error stopping screen tracks:', err);
    }
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
    this.playIdleVisuals();
  }

  // Visuales de reposo / HUD inactivo (Mecha/EVA-01) sin audio.
  playIdleVisuals() {
    solid(0.015, 0.004, 0.03) // Dark purple background
      .layer(
        shape(4, 0.01, 0)
          .scale(1, 100)
          .repeat(20, 20)
          .color(0.32, 1.0, 0.0) // Neon green grid
          .modulate(noise(2, 0.1).scrollX(0.5, 0.1))
          .mult(osc(10, 0.05, 0.5).color(0.48, 0.01, 0.92)) // Purple scanning lines
      )
      .layer(
        osc(20, -0.05, 0.8)
          .color(1.0, 0.34, 0.13) // Orange warning stripes
          .mask(shape(4, 0.8, 0.001).scrollX(0.2, 0.1))
          .luma(0.1)
      )
      .out();
  }

  setResolution(w, h) {
    if (this.hydra) {
      this.hydra.setResolution(w, h);
    }
  }


  // ── Preset Switcher ──────────────────────────────────────────────
  applyPreset(index) {
    this.currentPreset = ((index % this.numPresets) + this.numPresets) % this.numPresets;

    const presets = [
      this._p1_coreReactor,
      this._p2_atFieldFractal,
      this._p3_dataStream,
      this._p4_tacticalScope,
      this._p5_gridGlitch,
      this._p6_evaSyncWaves,
      this._p7_lclEcho,
      this._p8_radarSweep,
      this._p9_topoMap,
      this._p10_crtScanlines,
      this._p11_orbitalHalo,
      this._p12_neonLaser,
      this._p13_geometryVortex,
      this._p14_hyperWarp,
      this._p15_infiniteTunnel,
      this._p16_wireframeSphere,
    ];

    presets[this.currentPreset].call(this);
  }

  // ── PRESET 01 · Core Reactor (Geometría Sólida) ───────────────────
  _p1_coreReactor() {
    this._s(
      shape(100, () => 0.2 + audioBass * 0.1, 0.01) // Esfera dura central, escala controlada
        .color(...this._cRot(0, () => 1.5 + audioMid * 1.5))
        .modulateScale(osc(10).rotate(1.57), () => audioBass * 0.5)
        .add(
          shape(4, 0.4, 0.01) // Cuadrado afilado de fondo
            .rotate(() => time * 0.2)
            .color(...this._cRot(180, () => audioHigh * 1.5))
            .repeat(2, 2)
            .kaleid(2),
          0.3
        )
    ).out(o0);
  }

  // ── PRESET 02 · AT-Field Fractal (Hexágonos Absolutos) ────────────
  _p2_atFieldFractal() {
    this._s(
      voronoi(5, 0.0) // Voronoi duro, bordes geométricos
        .thresh(0.5, 0.1) // Blanco/negro muy afilado
        .kaleid(6) // Simetría hexagonal
        .color(...this._cRot(45, () => 1.2 + audioBeat * 1.5))
        .modulate(osc(15).rotate(() => time * 0.1), () => audioLowMid * 0.4)
        .scale(() => 1.0 + audioBass * 0.2) // Escala moderada
    ).out(o0);
  }

  // ── PRESET 03 · Data Stream (Cascada Matrix Táctica) ──────────────
  _p3_dataStream() {
    this._s(
      shape(4, 0.01, 0)
        .scale(1, 20) // Líneas verticales afiladas
        .repeat(30, 1)
        .color(...this._cRot(90, () => 1.0 + audioHigh * 1.0))
        .scrollY(() => time * 1.5 + audioMid * 2.0) // Lluvia rápida
        .modulate(noise(3, 0).scrollX(0.5), () => audioBass * 0.3)
        .add(
          src(o0).scale(1.01).luma(0.2), // Ligeras estelas
          0.4
        )
    ).out(o0);
  }

  // ── PRESET 04 · Tactical Scope (Anillos Concéntricos Rígidos) ─────
  _p4_tacticalScope() {
    this._s(
      shape(100, 0.1, 0.01) // Anillo fino
        .repeat(4, 4)
        .modulateScale(osc(8).rotate(1.57), () => audioMid * 0.8)
        .color(...this._cRot(15, () => 0.8 + audioVol * 1.0))
        .add(
          shape(100, () => 0.5 + audioBass * 0.3, 0.001) // Anillo externo perimetral
            .color(...this._cRot(180, () => 0.5 + audioBeat * 1.0)),
          0.5
        )
    ).out(o0);
  }

  // ── PRESET 05 · Grid Glitch (Fallos de Matriz) ────────────────────
  _p5_gridGlitch() {
    this._s(
      osc(20, 0, () => audioMid * 2.0)
        .thresh(0.4, 0) // Bandas afiladas
        .mult(osc(20, 0).rotate(1.57).thresh(0.4, 0)) // Cruces puras
        .color(...this._cRot(120, () => 1.2 + audioHigh * 0.8))
        .scrollX(() => (audioBeatMid > 0.5 ? Math.random() * 0.1 : 0)) // Glitch horizontal en beats
        .scrollY(() => (audioBeat > 0.5 ? Math.random() * 0.1 : 0))
    ).out(o0);
  }

  // ── PRESET 06 · EVA Sync Waves (Afilado) ──────────────────────────
  _p6_evaSyncWaves() {
    this._s(
      osc(() => 20 + audioMid * 20, 0.05, () => audioHigh * 2)
        .thresh(0.5, 0.05) // Bordes definidos
        .modulateRotate(osc(10).rotate(() => audioBass * 1.5), () => audioBass * 0.5)
        .color(...this._cRot(300, () => 1.0 + audioBeat * 0.8))
        .kaleid(() => Math.round(audioHigh * 4) + 3) // Formas de 3 a 7 lados
        .scale(0.8)
    ).out(o0);
  }

  // ── PRESET 07 · LCL Echo (Fractal Afilado) ────────────────────────
  _p7_lclEcho() {
    this._s(
      src(o0)
        .scale(() => 0.95 - audioBass * 0.05) // Feedback estricto, no expande
        .rotate(() => audioMid * 0.1)
        .blend(
          shape(3, 0.3, 0.01) // Triángulos fuertes
            .color(...this._cRot(75, () => 1.5 + audioVol * 1.0))
            .scrollX(() => audioLowMid * 0.1)
            .scrollY(() => audioHigh * -0.1),
          () => 0.2 + audioBeat * 0.2
        )
    ).out(o0);
  }

  // ── PRESET 08 · Radar Sweep (Reemplazo absoluto del 08 antiguo) ───
  _p8_radarSweep() {
    this._s(
      osc(10, 0.1, 0.5) // Línea rotativa principal (Sweep)
        .thresh(0.8, 0.05)
        .color(...this._cRot(210, () => 2.0 + audioHigh * 1.0))
        .rotate(() => time * 1.0 + audioLowMid * 0.5)
        .mult(
          shape(100, 0.8, 0.02) // Límite del radar circular
            .color(1, 1, 1)
        )
        .add(
          shape(4, 0.05, 0) // Targets encontrados (Glitches poligonales)
            .repeat(8, 8)
            .color(...this._cRot(30, () => audioBeat * 2.5)) // Solo visibles al golpear bajo
            .modulate(noise(5, 0.1).scrollX(1)),
          0.6
        )
    ).out(o0);
  }

  // ── PRESET 09 · Topo Map (Mapas de Relieve Holográfico) ───────────
  _p9_topoMap() {
    this._s(
      noise(4, 0.05) // Base topográfica
        .thresh(() => 0.4 - audioBass * 0.1, 0.02) // Líneas de contorno cortadas
        .color(...this._cRot(340, () => 1.0 + audioMid * 1.5))
        .modulate(osc(10).rotate(1.57), () => audioBass * 0.2)
        .scrollY(() => time * 0.2)
        .add(
          src(o0).scale(1.02).luma(0.1), 
          0.3
        )
    ).out(o0);
  }

  // ── PRESET 10 · CRT Scanlines (Glitch Fuerte) ─────────────────────
  _p10_crtScanlines() {
    this._s(
      osc(100, 0.02) // Scanlines horizontales muy cerradas
        .rotate(1.57)
        .color(...this._cRot(200, () => 1.2 + audioHigh * 1.0))
        .modulate(noise(10, 0).scrollX(0.5), () => audioBass * 0.15)
        .modulateScrollY(osc(2), () => audioMid * 0.2)
        .add(
          shape(4, 0.1, 0.0) // Estática poligonal
            .repeat(20, 2)
            .color(...this._cRot(0, () => audioBeatMid * 2.0)),
          0.5
        )
    ).out(o0);
  }

  // ── PRESET 11 · Orbital Halo (Arreglado: No Tapa la Pantalla) ─────
  _p11_orbitalHalo() {
    this._s(
      shape(100, 0.4, 0.01) // Base de anillo fija (NO 2.0+ de scale)
        .color(...this._cRot(110, () => 1.5 + audioMid * 1.0))
        .scale(() => 1.0 + audioBass * 0.15) // Escala controlada y segura
        .modulateRotate(osc(20).rotate(() => time * 0.2), () => audioHigh * 0.3)
        .diff(
          shape(100, 0.35, 0.01) // Recorte interno para hacer un anillo perfecto
            .scale(() => 1.0 + audioBass * 0.15)
        )
    ).out(o0);
  }

  // ── PRESET 12 · Neon Laser (Líneas Filosas Geométricas) ───────────
  _p12_neonLaser() {
    this._s(
      osc(15, 0.05, () => audioHigh * 2)
        .thresh(0.7, 0.01) // Láser cortante
        .rotate(() => time * -0.2)
        .color(...this._cRot(160, () => 1.5 + audioBeat * 1.0))
        .kaleid(3) // Geometría triangular/hexagonal
        .modulate(osc(10).rotate(1.57), () => audioBass * 0.2)
    ).out(o0);
  }

  // ── PRESET 13 · Geometry Vortex (Geometría Clara en Rotación) ─────
  _p13_geometryVortex() {
    this._s(
      shape(6, 0.5, 0.01) // Hexágono principal
        .color(...this._cRot(280, () => 1.2 + audioMid * 1.0))
        .rotate(() => time * 0.3 + audioBass * 0.5)
        .repeat(2, 2)
        .add(
          src(o0)
            .scale(() => 0.8 + audioBass * 0.1) // Vortex inward
            .rotate(0.1),
          0.6
        )
    ).out(o0);
  }

  // ── PRESET 14 · Hyper Warp (Reemplaza el viejo "Time Warp") ───────
  _p14_hyperWarp() {
    this._s(
      shape(4, 0.05, 0) // "Estrellas" rectangulares
        .repeat(15, 15)
        .color(...this._cRot(350, () => 1.0 + audioHigh * 2.0))
        .modulate(noise(2, 0).scrollX(0.5), () => audioBass * 0.3)
        .blend(
          src(o0) // Efecto Hyper Warp con feedback zoom-in estricto
            .scale(() => 1.05 + audioBeat * 0.1) // Salto warp con los golpes
            .luma(0.2), 
          0.8
        )
    ).out(o0);
  }

  // ── PRESET 15 · Infinite Tunnel (Túnel Recto Geométrico) ──────────
  _p15_infiniteTunnel() {
    this._s(
      osc(10, 0.1, () => audioMid * 1.5)
        .kaleid(4) // Túnel cuadrado en lugar de redondo
        .color(...this._cRot(40, () => 1.0 + audioVol * 0.5))
        .scale(() => 1.0 + audioBass * 0.2)
        .modulateRotate(noise(2, 0.05), () => audioHigh * 0.2)
        .add(
          src(o0).scale(0.85).luma(0.1),
          0.7 // Zoom interior fuerte
        )
    ).out(o0);
  }

  // ── PRESET 16 · Wireframe Sphere (Terreno 3D Estricto) ────────────
  _p16_wireframeSphere() {
    this._s(
      shape(2, 0.01) // Líneas delgadas wireframe
        .repeat(20, 20)
        .modulate(osc(10).rotate(1.57), 0.5) // Distorsión base
        .thresh(0.5, 0.0) // Wireframe cortado
        .color(...this._cRot(80, () => 1.5 + audioBass * 1.5))
        .scrollY(() => time * 0.5)
        .kaleid(2) // Simetría
        .modulateScale(osc(5).rotate(() => time * 0.1), () => audioMid * 0.4) // Efecto esférico ligero
    ).out(o0);
  }
}
