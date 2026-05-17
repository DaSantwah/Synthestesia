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
  async start(canvas, audioStream) {
    if (this.isRecording) return;

    // Release previous blob to free memory
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }

    this.chunks = [];

    // Build a MediaStream: video track from canvas + audio track from Web Audio
    const videoStream = canvas.captureStream(24);
    const tracks = [...videoStream.getVideoTracks()];
    if (audioStream) tracks.push(...audioStream.getAudioTracks());
    const combined = new MediaStream(tracks);

    // Pick the best supported codec
    const mimeType = VideoRecorder._bestMimeType();
    
    // Bajamos el bitrate a 4 Mbps para no asfixiar el procesador
    const options  = mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : {};

    this.mediaRecorder = new MediaRecorder(combined, options);

    this.mediaRecorder.ondataavailable = ({ data }) => {
      if (data && data.size > 0) this.chunks.push(data);
    };

    this.mediaRecorder.start(100); // emit a chunk every 100 ms
    this.isRecording = true;
  }

  // ── Helpers ──────────────────────────────────────────────────────
  static _bestMimeType() {
    const candidates = [
      'video/webm;codecs=h264,opus', // Prioridad 1: Mejor aceleración en hardware
      'video/webm;codecs=vp8,opus',  // Prioridad 2: Más ligero que VP9
      'video/webm;codecs=vp9,opus',  // Prioridad 3: Pesado, último recurso
      'video/webm',
      'video/mp4',
    ];
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
  }
