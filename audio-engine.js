/**
 * AudioEngine V3.0 (The Math Engine)
 * Precision FFT audio analysis with dynamic scaling and true transient detection.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyzer = null;
    this.dataArray = null;
    this.stream = null;
    this.isActive = false;

    // Reactivity data
    this.bass = 0;
    this.mid = 0;
    this.high = 0;
    this.overall = 0;
    
    // Beat Detection
    this.beat = 0;
    this.beatMid = 0;
    this.energyHistory = [];
    
    // Dynamic normalizer
    this.peakEnergy = 0.01; 
  }

  async startMic() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') await this.ctx.resume();

      // Stop existing stream or file if any
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      if (this.fileAudio) { this.fileAudio.pause(); this.fileAudio.src = ''; }
      if (this.sourceNode) { this.sourceNode.disconnect(); }

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
      });
      
      this.sourceNode = this.ctx.createMediaStreamSource(this.stream);
      this._setupAnalyzer();
      return true;
    } catch (err) {
      console.error("[AudioEngine] Mic access denied:", err);
      return false;
    }
  }

  async playFile(file) {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') await this.ctx.resume();

      // Stop existing
      if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
      if (this.sourceNode) { this.sourceNode.disconnect(); this.sourceNode = null; }
      if (this.fileAudio) { this.fileAudio.pause(); }

      const url = URL.createObjectURL(file);
      this.fileAudio = new Audio(url);
      this.fileAudio.crossOrigin = "anonymous";
      this.fileAudio.loop = true;
      await this.fileAudio.play();

      this.sourceNode = this.ctx.createMediaElementSource(this.fileAudio);
      // For file playback, we need to route it to destination so they hear it
      this.sourceNode.connect(this.ctx.destination);
      this._setupAnalyzer();
      return true;
    } catch (err) {
      console.error("[AudioEngine] Error playing file:", err);
      return false;
    }
  }

  _setupAnalyzer() {
    if (!this.analyzer) {
      this.analyzer = this.ctx.createAnalyser();
      this.analyzer.fftSize = 2048;
      this.analyzer.smoothingTimeConstant = 0.7;
    }
    this.sourceNode.connect(this.analyzer);
    this.dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    this.isActive = true;
  }

  // File Playback Controls
  getAudioTime() {
    return this.fileAudio ? this.fileAudio.currentTime : 0;
  }

  getAudioDuration() {
    return this.fileAudio && !isNaN(this.fileAudio.duration) ? this.fileAudio.duration : 0;
  }

  seek(time) {
    if (this.fileAudio) {
      this.fileAudio.currentTime = time;
    }
  }

  togglePlay() {
    if (this.fileAudio) {
      if (this.fileAudio.paused) {
        this.fileAudio.play();
        return true; // is playing
      } else {
        this.fileAudio.pause();
        return false; // is paused
      }
    }
    return false;
  }

  isPlaying() {
    return this.fileAudio && !this.fileAudio.paused;
  }

  update(sensMultiplier = 1.0) {
    if (!this.isActive || !this.analyzer) return;
    this.analyzer.getByteFrequencyData(this.dataArray);

    // Get specific bands
    const rawBass = this._getBand(20, 150);
    const rawMid = this._getBand(150, 2000);
    const rawHigh = this._getBand(2000, 15000);
    const rawOverall = this._getBand(20, 20000);

    // Dynamic peak tracking to auto-scale audio (never overblows, never too quiet)
    this.peakEnergy = Math.max(this.peakEnergy * 0.995, rawOverall);
    if (this.peakEnergy < 0.1) this.peakEnergy = 0.1;

    // Normalize against peak, clamp at 1.0, then multiply by user sensitivity
    const normalize = (val) => Math.min((val / this.peakEnergy) * sensMultiplier, sensMultiplier * 1.5);

    this.bass = normalize(rawBass);
    this.mid = normalize(rawMid);
    this.high = normalize(rawHigh);
    this.overall = normalize(rawOverall);

    // Onset Detection (Beat)
    this.energyHistory.push(rawBass);
    if (this.energyHistory.length > 60) this.energyHistory.shift();
    
    const localAvg = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    
    // Trigger beat if current bass spikes above 130% of recent average
    if (rawBass > localAvg * 1.3 && rawBass > 0.05) {
      this.beat = 1.0;
    } else {
      this.beat = Math.max(0, this.beat - 0.05); // Decay
    }
  }

  _getBand(lowHz, highHz) {
    const nyquist = this.ctx.sampleRate / 2;
    const lowIndex = Math.round((lowHz / nyquist) * this.analyzer.frequencyBinCount);
    const highIndex = Math.round((highHz / nyquist) * this.analyzer.frequencyBinCount);
    
    let sum = 0;
    let count = 0;
    for (let i = lowIndex; i <= highIndex && i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
      count++;
    }
    // Return a 0.0 - 1.0 value directly
    return count > 0 ? (sum / count) / 255.0 : 0;
  }
}
