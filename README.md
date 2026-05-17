# Synthestesia · Audio Reactive Visual Generator

Sube cualquier canción → obtén un video con visuales generativas reactivas al audio, renderizadas en tiempo real con **Hydra Synth** y exportadas como **WebM** con audio sincronizado.

Todo corre en el navegador. Ningún archivo se envía a servidores.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Visuales | [Hydra Synth](https://hydra.ojack.xyz/) — live-coding audiovisual via WebGL |
| Análisis de audio | Web Audio API · `AnalyserNode` + FFT |
| Grabación | `MediaRecorder` + `canvas.captureStream()` |
| Hosting | Vercel (static, sin backend) |

---

## Cómo funciona

```
Archivo de audio
       │
       ▼
  AudioContext
       │
       ├── AnalyserNode ──► FFT (1024 bins)
       │        │                │
       │        │        bandAvg(bass/mid/high)
       │        │                │
       │        │        window.audioBass  ◄──── Hydra lambdas
       │        │        window.audioMid        () => audioBass * 40
       │        │        window.audioHigh        (evaluadas cada frame)
       │        │
       │        ├── AudioContext.destination  (speakers)
       │        └── MediaStreamDestination    (audio track para grabar)
       │
  Hydra Canvas
       │
       └── canvas.captureStream(30fps)  ─┐
                                         ├── MediaRecorder → WebM blob
            AudioStream ─────────────────┘
```

### Bandas de frecuencia

| Variable | Rango | Fuente musical |
|----------|-------|---------------|
| `audioBass` | 20 – 250 Hz | Kick, bombo, sub-bass |
| `audioMid`  | 250 – 2000 Hz | Snare, voces, instrumentos |
| `audioHigh` | 2000 – 20000 Hz | Hi-hats, platillos, presencia |
| `audioVol`  | promedio de los tres | Energía global |

Todos los valores están normalizados `[0, 1]` con suavizado exponencial (`α = 0.80`).

---

## Presets de Hydra

| # | Nombre | Descripción |
|---|--------|-------------|
| 01 | **Pulse** | Osciladores en kaleidoscopio — el bass bombea la densidad de anillos |
| 02 | **Spectral** | Celdas Voronoi que se expanden con las medias frecuencias |
| 03 | **Fractal** | Noise × lattice oscilante + kaleidoscopio; orgánico y morfológico |
| 04 | **Vortex** | Espiral doble rotada por energía total — respira con la música |
| 05 | **Crystal** | Formas geométricas (lados = f(mid)) fragmentadas por transientes |

---

## Deploy en Vercel

### 1. Fork / clona el repo

```bash
git clone https://github.com/TU_USUARIO/hydravis.git
cd hydravis
```

### 2. Push a GitHub

```bash
git add .
git commit -m "feat: initial HydraVis"
git push origin main
```

### 3. Conecta en Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa tu repo de GitHub
3. **Framework Preset** → `Other`
4. **Root Directory** → `.` (raíz)
5. **Build Command** → *(dejar vacío — es un sitio estático)*
6. **Output Directory** → `.`
7. Haz clic en **Deploy**

Vercel detectará automáticamente que es un sitio estático y lo servirá directamente.

---

## Desarrollo local

No se necesita ningún build step. Basta con un servidor HTTP local (los ES modules no funcionan con `file://`):

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# VS Code
# Instala la extensión "Live Server" y abre con Go Live
```

Abre `http://localhost:8080`.

---

## Estructura del proyecto

```
hydravis/
├── index.html              # Entrada principal
├── style.css               # Dark Studio theme (Space Mono + DM Sans)
├── vercel.json             # Config de Vercel
├── README.md
└── js/
    ├── app.js              # Orquestador principal (ES module)
    ├── audio-analyzer.js   # Web Audio API — FFT + bandas de frecuencia
    ├── hydra-controller.js # Hydra Synth — 5 presets reactivos
    └── recorder.js         # MediaRecorder — exporta WebM con audio
```

---

## Agregar nuevos presets

Edita `js/hydra-controller.js` y añade un método `_p6_miPreset()`:

```javascript
_p6_miPreset() {
  // Las lambdas () => audioXxx se evalúan en cada frame de Hydra
  osc(() => audioBass * 30 + 2, 0.1, () => audioHigh * 3)
    .color(() => audioMid, 0.5, () => audioBass)
    .kaleid(6)
    .out(o0);
}
```

Luego incrementa `this.numPresets = 6` y agrega el método al array en `applyPreset()`.  
Por último añade un botón `<button class="preset-btn" data-preset="5">06</button>` en el HTML.

---

## Notas técnicas

- **Formato de salida**: WebM (VP9 + Opus en Chrome/Firefox, VP8 como fallback).  
  Para convertir a MP4 puedes usar ffmpeg: `ffmpeg -i salida.webm salida.mp4`
- **Resolución de grabación**: igual que la ventana del navegador al momento de grabar.  
  Para mayor calidad, maximiza la ventana o usa una pantalla de alta resolución.
- **AudioContext requiere interacción del usuario**: el contexto de audio se inicializa
  la primera vez que el usuario interactúa (clic / drop). Esto es una restricción del navegador.
- **Compatibilidad**: Chrome y Firefox modernos. Safari tiene soporte parcial de MediaRecorder.

---

## Licencia

MIT — libre para usar, modificar y distribuir.
