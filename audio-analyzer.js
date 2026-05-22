/**
 * AudioAnalyzer
 * Wraps the Web Audio API to:
 *  - Load and decode audio files (expanded format support)
 *  - Accept live microphone input
 *  - Run FFT analysis every frame
 *  - Expose smoothed frequency bands: bass / mid / high / overall
 *    + sub / low-mid / presence / brilliance (extended bands)
 *  - Expose seek functionality
 *  - Provide a MediaStream output for recording (audio + video sync)
 */
export class AudioAnalyzer {
  constructor() {
    this.audioContext     = null;
    this.analyser         = null;
    this.compressor       = null;       // dynamic compressor for peak control/mastering
    this.source           = null;
    this.audioBuffer      = null;
    this.mediaStreamDest  = null;
    this.micStream        = null;       // raw getUserMedia stream (to stop tracks)

    this.dataArray        = null;
    this.bufferLength     = 0;

    // ── Core bands [0, 1] smoothed ──────────────────────────────────
    this.bass    = 0;
    this.mid     = 0;
    this.high    = 0;
    this.overall = 0;

    // ── Extended bands [0, 1] smoothed ─────────────────────────────
    this.sub       = 0;   // 20 – 80 Hz    (deep sub, 808s)
    this.lowMid    = 0;   // 250 – 800 Hz  (body, warmth)
    this.presence  = 0;   // 2k – 6k Hz    (attack, clarity)
    this.brilliance= 0;   // 6k – 20k Hz   (air, shimmer)

    this.SMOOTH  = 0.80;

    // Running slow averages for transient/beat detection
    this.slowBass = 0;
    this.slowMid  = 0;

    // Beat triggers [0, 1] that decay exponentially
    this.bassBeat = 0;
    this.midBeat  = 0;

    // Cooldown frames to prevent double triggers
    this._bassCooldown = 0;
    this._midCooldown  = 0;

    // Playback state
    this.isPlaying    = false;
    this.isMic        = false;
    this.duration     = 0;
    this._startedAt   = 0;
    this._startOffset = 0;
  }

  // ── Init ────────────────────────────────────────────────────────
  async init() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.75;
    this.bufferLength = this.analyser.frequencyBinCount; // 1024 bins
    this.dataArray    = new Uint8Array(this.bufferLength);

    // Dynamic Compressor for mastering-level output control (preventing clipping and distortion)
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-2.0, this.audioContext.currentTime); // Prevent digital distortion
    this.compressor.knee.setValueAtTime(8, this.audioContext.currentTime);          // Soft knee transition
    this.compressor.ratio.setValueAtTime(4, this.audioContext.currentTime);         // 4:1 mastering-grade ratio
    this.compressor.attack.setValueAtTime(0.005, this.audioContext.currentTime);    // Catch hot transients
    this.compressor.release.setValueAtTime(0.12, this.audioContext.currentTime);    // Responsive release

    // Connect Compressor -> Analyser
    this.compressor.connect(this.analyser);

    this.analyser.connect(this.audioContext.destination);

    this.mediaStreamDest = this.audioContext.createMediaStreamDestination();
    this.analyser.connect(this.mediaStreamDest);
  }

  // ── File Loading ────────────────────────────────────────────────
  async loadFile(file) {
    if (!this.audioContext) await this.init();
    await this._stopMic();
    this._stopSource();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer  = await this.audioContext.decodeAudioData(arrayBuffer);
    this.duration     = this.audioBuffer.duration;
    this.isMic        = false;
    return this.duration;
  }

  // ── Microphone Input ────────────────────────────────────────────
  async initMic() {
    if (!this.audioContext) await this.init();
    
    // Ensure the AudioContext is resumed
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this._stopSource();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    this.micStream = stream;

    const micSource = this.audioContext.createMediaStreamSource(stream);
    
    // Crucial: disconnect analyser from speakers to avoid feedback screeching
    try { this.analyser.disconnect(this.audioContext.destination); } catch (_) {}
    
    micSource.connect(this.compressor);

    // Store as source so stopMic can clean it up
    this.source    = micSource;
    this.isMic     = true;
    this.isPlaying = true;
    this.duration  = 0;
    return true;
  }

  async _stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    this.isMic = false;
  }

  // ── Playback ────────────────────────────────────────────────────
  async play(onEnded) {
    if (!this.audioBuffer || this.isPlaying) return;
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this._createAndStart(0, onEnded);
  }

  async replay(onEnded) {
    this._stopSource();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this._createAndStart(0, onEnded);
  }

  /**
   * Seek to a position in seconds.
   * Re-creates the AudioBufferSourceNode from the new offset.
   */
  seek(seconds, onEnded) {
    if (!this.audioBuffer || this.isMic) return;
    const wasPlaying = this.isPlaying;
    this._stopSource();
    if (wasPlaying) {
      this._createAndStart(Math.max(0, Math.min(seconds, this.duration)), onEnded);
    } else {
      this._startOffset = seconds;
    }
  }

  stop() {
    this._stopSource();
    if (this.isMic) this._stopMic();
  }

  unload() {
    this._stopSource();
    this._stopMic();
    this.audioBuffer = null;
    this.duration = 0;
    this.slowBass = 0;
    this.slowMid = 0;
    this.bassBeat = 0;
    this.midBeat = 0;
  }

  get currentTime() {
    if (!this.isPlaying || this.isMic) return 0;
    const elapsed = this.audioContext.currentTime - this._startedAt;
    return Math.min(this._startOffset + elapsed, this.duration);
  }

  // ── FFT Update ──────────────────────────────────────────────────
  update() {
    if (!this.analyser) return;
    this.analyser.getByteFrequencyData(this.dataArray);

    // Update cooldowns
    if (this._bassCooldown > 0) this._bassCooldown--;
    if (this._midCooldown > 0) this._midCooldown--;

    const rawBass  = this._bandAvg(20,   150);  // narrow low bass for kicks
    const rawMid   = this._bandAvg(250,  1500); // narrow mid for snares/instrument strikes
    const rawHigh  = this._bandAvg(1500, 20000);

    // Extended bands
    const rawSub        = this._bandAvg(20,   80);
    const rawLowMid     = this._bandAvg(250,  800);
    const rawPresence   = this._bandAvg(2000, 6000);
    const rawBrilliance = this._bandAvg(6000, 20000);

    const s = this.SMOOTH;
    this.bass       = s * this.bass       + (1 - s) * rawBass;
    this.mid        = s * this.mid        + (1 - s) * rawMid;
    this.high       = s * this.high       + (1 - s) * rawHigh;
    this.overall    = (this.bass + this.mid + this.high) / 3;

    this.sub        = s * this.sub        + (1 - s) * rawSub;
    this.lowMid     = s * this.lowMid     + (1 - s) * rawLowMid;
    this.presence   = s * this.presence   + (1 - s) * rawPresence;
    this.brilliance = s * this.brilliance + (1 - s) * rawBrilliance;

    // Slow moving average to track baseline ambient level
    if (this.slowBass === 0) this.slowBass = rawBass;
    else this.slowBass = 0.985 * this.slowBass + 0.015 * rawBass;

    if (this.slowMid === 0) this.slowMid = rawMid;
    else this.slowMid = 0.985 * this.slowMid + 0.015 * rawMid;

    // Trigger detection (Onset)
    const bassThreshold = 1.30;
    const midThreshold = 1.35;

    if (rawBass > this.slowBass * bassThreshold && this._bassCooldown === 0 && rawBass > 0.04) {
      this.bassBeat = 1.0;
      this._bassCooldown = 14; // ~230ms cooldown at 60fps
    } else {
      this.bassBeat = Math.max(0, this.bassBeat * 0.88); // rapid exponential decay
    }

    if (rawMid > this.slowMid * midThreshold && this._midCooldown === 0 && rawMid > 0.04) {
      this.midBeat = 1.0;
      this._midCooldown = 16; // ~260ms cooldown
    } else {
      this.midBeat = Math.max(0, this.midBeat * 0.86); // rapid decay
    }
  }

  getFullSpectrum() { return this.dataArray; }

  getAudioStream() { return this.mediaStreamDest?.stream ?? null; }

  // ── Private Helpers ─────────────────────────────────────────────
  _createAndStart(offset = 0, onEnded = null) {
    // Reconnect analyser to speakers for audible file playback
    try { this.analyser.connect(this.audioContext.destination); } catch (_) {}

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.compressor);

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
    if (this.source && !this.isMic) {
      try { this.source.stop(); } catch (_) {}
      try { this.source.disconnect(); } catch (_) {}
      this.source = null;
    } else if (this.source && this.isMic) {
      try { this.source.disconnect(); } catch (_) {}
      this.source = null;
    }
    this.isPlaying    = false;
    this._startOffset = 0;
    this._startedAt   = 0;
  }

  _bandAvg(startHz, endHz) {
    if (!this.audioContext) return 0;
    const nyquist  = this.audioContext.sampleRate / 2;
    const startBin = Math.max(0, Math.floor(startHz / nyquist * this.bufferLength));
    const endBin   = Math.min(this.bufferLength - 1, Math.ceil(endHz / nyquist * this.bufferLength));
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) sum += this.dataArray[i];
    return sum / ((endBin - startBin + 1) * 255);
  }
}
