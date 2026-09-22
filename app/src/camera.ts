import { PoseLandmarker } from '@mediapipe/tasks-vision';
// El motor WebAssembly se sirve junto a la app (sin depender de un CDN externo).
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import type { CoachState } from './coach';
import type { Point } from './types';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export type FrameHandler = (points: Point[] | null, aspect: number, now: number) => void;

const COLORS: Record<CoachState, string> = {
  unknown: 'rgba(255, 255, 255, 0.85)',
  ok: 'rgba(76, 201, 128, 0.95)',
  adjust: 'rgba(255, 160, 60, 0.95)',
};

// Conexiones del esqueleto sin la cara, que aquí solo añadiría ruido visual.
const BODY_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS.filter(({ start, end }) => start >= 11 && end >= 11);

/**
 * Cámara + detección de postura en el propio dispositivo. El vídeo nunca sale del
 * navegador: MediaPipe se ejecuta localmente con WebAssembly/WebGPU.
 */
export class PoseCamera {
  private landmarker: PoseLandmarker | null = null;
  private stream: MediaStream | null = null;
  private running = false;
  private lastVideoTime = -1;
  private ctx: CanvasRenderingContext2D;
  onFrame: FrameHandler = () => {};
  state: CoachState = 'unknown';

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.ctx = canvas.getContext('2d')!;
  }

  static get supported(): boolean {
    return !!navigator.mediaDevices?.getUserMedia;
  }

  get active(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    this.landmarker ??= await this.createLandmarker();
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private async createLandmarker(): Promise<PoseLandmarker> {
    const fileset = { wasmLoaderPath, wasmBinaryPath };
    const options = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO' as const,
      numPoses: 1,
    });
    try {
      return await PoseLandmarker.createFromOptions(fileset, options('GPU'));
    } catch {
      return PoseLandmarker.createFromOptions(fileset, options('CPU'));
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    const { video } = this;
    if (this.landmarker && video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      const now = performance.now();
      this.landmarker.detectForVideo(video, now, (result) => {
        // Los landmarks solo son válidos dentro del callback: se copian.
        const points = result.landmarks[0]?.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 0 })) ?? null;
        const aspect = video.videoWidth / Math.max(1, video.videoHeight);
        this.draw(points);
        this.onFrame(points, aspect, now);
      });
    }
    requestAnimationFrame(this.loop);
  };

  private draw(points: Point[] | null): void {
    const { canvas, ctx, video } = this;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!points) return;

    const color = COLORS[this.state];
    const w = canvas.width;
    const h = canvas.height;
    const scale = Math.max(2, h / 180);
    ctx.lineCap = 'round';
    ctx.lineWidth = scale * 1.5;
    ctx.strokeStyle = color;
    for (const { start, end } of BODY_CONNECTIONS) {
      const a = points[start];
      const b = points[end];
      if (a.visibility < 0.5 || b.visibility < 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    points.forEach((p, i) => {
      if (i < 11 || p.visibility < 0.5) return;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, scale * 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
