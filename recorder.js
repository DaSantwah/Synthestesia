/**
 * VideoRecorder
 *
 * Captures Hydra's canvas stream and mixes it with the Web Audio output
 * into a single WebM file using the MediaRecorder API.
 *
 * Recording flow:
 *  1. app.js calls recorder.start(canvas, audioStream)
 *  2. Internally: canvas.captureStream(30fps) + audioStream → combined MediaStream
 *  3. MediaRecorder collects chunks every 100ms
 *  4. app.js calls recorder.stop() → returns a blob: URL for download
 */
export class VideoRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.chunks        = [];
    this.isRecording   = false;
    this._blobUrl      = null;
  }

  // ── Start ────────────────────────────────────────────────────────
  /**
   * @param {HTMLCanvasElement} canvas      - Hydra's render canvas
   * @param {MediaStream|null}  audioStream - From AudioContext.createMediaStreamDestination()
   */
  async start(canvas, audioStream) {
    if (this.isRecording) return;

    // Release previous blob to free memory
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }

    this.chunks = [];

    // Build a MediaStream: video track from canvas + audio track from Web Audio
    const videoStream = canvas.captureStream(30);
    const tracks = [...videoStream.getVideoTracks()];
    if (audioStream) tracks.push(...audioStream.getAudioTracks());
    const combined = new MediaStream(tracks);

    // Pick the best supported codec (prefer VP9+Opus for quality)
    const mimeType = VideoRecorder._bestMimeType();
    const options  = mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : {};

    this.mediaRecorder = new MediaRecorder(combined, options);

    this.mediaRecorder.ondataavailable = ({ data }) => {
      if (data && data.size > 0) this.chunks.push(data);
    };

    this.mediaRecorder.start(100); // emit a chunk every 100 ms
    this.isRecording = true;
  }

  // ── Stop ─────────────────────────────────────────────────────────
  /**
   * Finalize recording and return a download URL.
   * @returns {Promise<string|null>} Object URL of the recorded blob
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        resolve(null);
        return;
      }

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

  // ── Helpers ──────────────────────────────────────────────────────
  static _bestMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
  }
}
