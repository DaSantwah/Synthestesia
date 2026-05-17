/**
 * AudioAnalyzer
 * Wraps the Web Audio API to:
 *  - Load and decode audio files
 *  - Run FFT analysis every frame
 *  - Expose smoothed frequency bands: bass / mid / high / overall
 *  - Provide a MediaStream output for recording (audio + video sync)
 */
export class AudioAnalyzer {
  constructor() {
    this.audioContext     = null;
    this.analyser         = null;
    this.source           = null;        // AudioBufferSourceNode (current)
    this.audioBuffer      = null;        // Decoded PCM data
    this.mediaStreamDest  = null;        // For recording

    this.dataArray        = null;
    this.bufferLength     = 0;

    // Normalized frequency band energies [0, 1] — smoothed
    this.bass    = 0;
    this.mid     = 0;
    this.high    = 0;
    this.overall = 0;

    // Exponential smoothing factor (higher = more sluggish / cinematic)
    this.SMOOTH  = 0.80;

    // Playback state
    this.isPlaying   = false;
    this.duration    = 0;
    this._startedAt  = 0;   // audioContext.currentTime when playback began
    this._startOffset = 0;  // where in the buffer we started from
  }

  // ── Init ────────────────────────────────────────────────────────
  async init() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // AnalyserNode — FFT window
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.75;
    this.bufferLength = this.analyser.frequencyBinCount; // 1024 bins
    this.dataArray    = new Uint8Array(this.bufferLength);

    // Routing: analyser → speakers
    this.analyser.connect(this.audioContext.destination);

    // Routing: analyser → recording stream (without double-playing)
    this.mediaStreamDest = this.audioContext.createMediaStreamDestination();
    this.analyser.connect(this.mediaStreamDest);
  }

  // ── File Loading ────────────────────────────────────────────────
  /**
   * @param {File} file - Audio file selected by user
   * @returns {number} Duration in seconds
   */
  async loadFile(file) {
    if (!this.audioContext) await this.init();

    this._stopSource(); // clean up any previous playback

    const arrayBuffer  = await file.arrayBuffer();
    this.audioBuffer   = await this.audioContext.decodeAudioData(arrayBuffer);
    this.duration      = this.audioBuffer.duration;
    return this.duration;
  }

  // ── Playback ────────────────────────────────────────────────────
  /**
   * Start playback from the beginning.
   * @param {Function} [onEnded] - Called when audio finishes naturally
   */
  play(onEnded) {
    if (!this.audioBuffer || this.isPlaying) return;
    this._createAndStart(0, onEnded);
  }

  /**
   * Restart playback from the very beginning (used by recorder).
   * @param {Function} [onEnded]
   */
  replay(onEnded) {
    this._stopSource();
    this._createAndStart(0, onEnded);
  }

  stop() {
    this._stopSource();
  }

  /** Current playback position in seconds */
  get currentTime() {
    if (!this.isPlaying) return 0;
    const elapsed = this.audioContext.currentTime - this._startedAt;
    return Math.min(this._startOffset + elapsed, this.duration);
  }

  // ── FFT Update (call every animation frame) ─────────────────────
  update() {
    if (!this.analyser) return;
    this.analyser.getByteFrequencyData(this.dataArray);

    const rawBass  = this._bandAvg(20,   250);
    const rawMid   = this._bandAvg(250,  2000);
    const rawHigh  = this._bandAvg(2000, 20000);

    const s = this.SMOOTH;
    this.bass    = s * this.bass    + (1 - s) * rawBass;
    this.mid     = s * this.mid     + (1 - s) * rawMid;
    this.high    = s * this.high    + (1 - s) * rawHigh;
    this.overall = (this.bass + this.mid + this.high) / 3;
  }

  /** Full spectrum array (Uint8Array, length = 1024) for waveform drawing */
  getFullSpectrum() {
    return this.dataArray;
  }

  /** MediaStream that carries the audio — merged with video for recording */
  getAudioStream() {
    return this.mediaStreamDest?.stream ?? null;
  }

  // ── Private Helpers ─────────────────────────────────────────────
  _createAndStart(offset = 0, onEnded = null) {
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        onEnded?.();
      }
    };

    this._startOffset = offset;
    this._startedAt   = this.audioContext.currentTime;
    this.source.start(0, offset);
    this.isPlaying = true;
  }

  _stopSource() {
    if (this.source) {
      try { this.source.stop(); } catch (_) {}
      try { this.source.disconnect(); } catch (_) {}
      this.source = null;
    }
    this.isPlaying    = false;
    this._startOffset = 0;
    this._startedAt   = 0;
  }

  /**
   * Average energy of a frequency band, normalized [0, 1].
   * @param {number} startHz
   * @param {number} endHz
   */
  _bandAvg(startHz, endHz) {
    const nyquist  = this.audioContext.sampleRate / 2;
    const startBin = Math.max(0, Math.floor(startHz / nyquist * this.bufferLength));
    const endBin   = Math.min(this.bufferLength - 1, Math.ceil(endHz / nyquist * this.bufferLength));

    let sum = 0;
    for (let i = startBin; i <= endBin; i++) sum += this.dataArray[i];
    return sum / ((endBin - startBin + 1) * 255);
  }
}
