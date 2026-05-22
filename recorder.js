/**
 * VideoRecorder
 *
 * Captures Hydra's canvas stream and mixes it with the Web Audio output
 * into a single WebM file using the MediaRecorder API.
 */
export class VideoRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.chunks        = [];
    this.isRecording   = false;
    this._blobUrl      = null;
  }

  async start(canvas, audioStream) {
    if (this.isRecording) return;

    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }

    this.chunks = [];

    const videoStream = canvas.captureStream(30); // Capture at smooth 30 FPS
    const tracks = [...videoStream.getVideoTracks()];
    if (audioStream) tracks.push(...audioStream.getAudioTracks());
    const combined = new MediaStream(tracks);

    const mimeType = VideoRecorder._bestMimeType();
    const options  = mimeType ? { 
      mimeType, 
      videoBitsPerSecond: 12_000_000, // 12 Mbps for crystal-clear 1080p
      audioBitsPerSecond: 256_000     // 256 kbps high-fidelity audio
    } : {};

    this.mediaRecorder = new MediaRecorder(combined, options);

    this.mediaRecorder.ondataavailable = ({ data }) => {
      if (data && data.size > 0) this.chunks.push(data);
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) { resolve(null); return; }

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        const type = this.mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(this.chunks, { type });
        this._blobUrl = URL.createObjectURL(blob);
        resolve(this._blobUrl);
      };

      this.mediaRecorder.stop();
    });
  }

  static _bestMimeType() {
    const candidates = [
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
      'video/mp4',
    ];
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
  }
}
