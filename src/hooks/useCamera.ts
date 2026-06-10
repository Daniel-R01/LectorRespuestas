import { useRef, useState, useEffect, useCallback } from 'react';

export interface FrameCapture {
  base64: string;
  diffData: ImageData;
}

function getCameraError(err: unknown): string {
  const domErr = err as DOMException;
  if (domErr?.name === 'NotAllowedError') return 'Permiso denegado. Activalo en Ajustes del navegador.';
  if (domErr?.name === 'NotFoundError') return 'No se encontró cámara en el dispositivo.';
  if (domErr?.name === 'NotReadableError') return 'La cámara esta en uso por otra app.';
  if (domErr?.name === 'OverconstrainedError') return 'No se pudo usar la camara trasera.';
  return 'No se pudo acceder a la camara.';
}

async function tryGetStream(facingMode: 'environment' | 'user'): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: facingMode }, width: { min: 1920, ideal: 3840 }, frameRate: { ideal: 30 } },
      audio: false,
    });
  } catch { /* fall */ }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { min: 1280, ideal: 1920 }, frameRate: { ideal: 30 } },
      audio: false,
    });
  } catch { /* fall */ }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    });
  } catch { /* fall */ }
  return null;
}

function toGrayscale(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    d[i] = gray;
    d[i + 1] = gray;
    d[i + 2] = gray;
  }
  ctx.putImageData(img, 0, 0);
}

function downsampleForDiff(ctx: CanvasRenderingContext2D, srcW: number, srcH: number): ImageData {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 32;
  tempCanvas.height = 32;
  const tCtx = tempCanvas.getContext('2d')!;
  tCtx.drawImage(ctx.canvas, 0, 0, srcW, srcH, 0, 0, 32, 32);
  return tCtx.getImageData(0, 0, 32, 32);
}

export function hasContentChanged(prev: ImageData, curr: ImageData): boolean {
  if (!prev || !curr) return true;
  let diff = 0;
  const len = Math.min(prev.data.length, curr.data.length);
  for (let i = 0; i < len; i += 4) {
    if (Math.abs(prev.data[i] - curr.data[i]) > 25) diff++;
  }
  return diff > (prev.width * prev.height * 0.2);
}

export function isLowVariance(data: ImageData): boolean {
  const d = data.data;
  let sum = 0;
  const len = d.length;
  for (let i = 0; i < len; i += 4) sum += d[i];
  const avg = sum / (len / 4);
  let close = 0;
  for (let i = 0; i < len; i += 4) {
    if (Math.abs(d[i] - avg) < 20) close++;
  }
  return close / (len / 4) > 0.9;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  error: string | null;
  ready: boolean;
  toggleCamera: () => void;
  retry: () => void;
  captureFrame: () => Promise<FrameCapture | null>;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageCaptureRef = useRef<ImageCapture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

  const startCamera = useCallback(async (facingMode: 'environment' | 'user') => {
    setError(null);
    setReady(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    imageCaptureRef.current = null;

    try {
      const stream = await tryGetStream(facingMode);
      if (!stream) { setError('No se pudo acceder a la camara.'); return; }
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track && typeof ImageCapture !== 'undefined') {
        try { imageCaptureRef.current = new ImageCapture(track); } catch { /* */ }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); setReady(true); };
      }
    } catch (err: unknown) {
      setError(getCameraError(err));
    }
  }, []);

  useEffect(() => { startCamera(facing); return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; }; }, []);

  const toggleCamera = useCallback(async () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    await startCamera(next);
  }, [facing, startCamera]);

  const retry = useCallback(() => { startCamera(facing); }, [facing, startCamera]);

  const captureFrame = useCallback(async (): Promise<FrameCapture | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    let bitmap: ImageBitmap | null = null;
    if (imageCaptureRef.current) {
      try { bitmap = await imageCaptureRef.current.grabFrame(); } catch { /* */ }
    }

    const video = videoRef.current;
    if (!bitmap && video) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw && vh) {
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(video, 0, 0); }
      }
    }

    if (bitmap) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.drawImage(bitmap, 0, 0); bitmap.close(); }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width === 0) return null;

    // Resize to max 800px
    let w = canvas.width;
    let h = canvas.height;
    const maxDim = 800;
    if (Math.max(w, h) > maxDim) {
      const ratio = maxDim / Math.max(w, h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const tCtx = tmp.getContext('2d')!;
      tCtx.drawImage(canvas, 0, 0, w, h);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(tmp, 0, 0);
    }

    // Convert to grayscale
    toGrayscale(ctx, canvas.width, canvas.height);

    // Build diff data (32x32 downsample)
    const diffData = downsampleForDiff(ctx, canvas.width, canvas.height);

    // Export to JPEG base64
    const base64 = canvas.toDataURL('image/jpeg', 0.6);

    return { base64, diffData };
  }, []);

  return { videoRef, canvasRef, error, ready, toggleCamera, retry, captureFrame };
}
