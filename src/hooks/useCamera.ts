import { useRef, useState, useEffect, useCallback } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  error: string | null;
  ready: boolean;
  toggleCamera: () => void;
  retry: () => void;
  captureHighResFrame: () => Promise<ImageBitmap | null>;
}

function getCameraError(err: unknown): string {
  const domErr = err as DOMException;
  if (domErr?.name === 'NotAllowedError') {
    return 'Permiso denegado. Ve a Ajustes > Navegador > Cámara y actívalo.';
  }
  if (domErr?.name === 'NotFoundError') {
    return 'No se encontró cámara en el dispositivo.';
  }
  if (domErr?.name === 'NotReadableError') {
    return 'La cámara está en uso por otra app. Ciérrala.';
  }
  if (domErr?.name === 'OverconstrainedError') {
    return 'No se pudo acceder a la cámara trasera.';
  }
  return 'No se pudo acceder a la cámara.';
}

async function tryGetStream(facingMode: 'environment' | 'user'): Promise<MediaStream | null> {
  // Try 1: exact back camera, 4K resolution
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: facingMode },
        width: { min: 1920, ideal: 3840 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    });
  } catch { /* fall through */ }

  // Try 2: ideal back camera, 1080p
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { min: 1280, ideal: 1920 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    });
  } catch { /* fall through */ }

  // Try 3: just the facing mode
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    });
  } catch { /* fall through */ }

  return null;
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
    try {
      setError(null);
      setReady(false);

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      imageCaptureRef.current = null;

      const stream = await tryGetStream(facingMode);
      if (!stream) {
        setError('No se pudo acceder a la cámara.');
        return;
      }

      streamRef.current = stream;

      // Create ImageCapture for high-res frame grabs
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings();
      console.log('Camera:', settings?.width, 'x', settings?.height, '@', settings?.frameRate, 'fps', 'facing:', settings?.facingMode);

      if (track && typeof ImageCapture !== 'undefined') {
        try {
          imageCaptureRef.current = new ImageCapture(track);
        } catch { /* ImageCapture not supported */ }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setReady(true);
        };
      }
    } catch (err: unknown) {
      setError(getCameraError(err));
    }
  }, []);

  useEffect(() => {
    startCamera(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      imageCaptureRef.current = null;
    };
  }, []);

  const toggleCamera = useCallback(async () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    await startCamera(next);
  }, [facing, startCamera]);

  const retry = useCallback(() => {
    startCamera(facing);
  }, [facing, startCamera]);

  const captureHighResFrame = useCallback(async (): Promise<ImageBitmap | null> => {
    if (imageCaptureRef.current) {
      try {
        return await imageCaptureRef.current.grabFrame();
      } catch { /* fallback */ }
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, vw, vh);

    try {
      return await createImageBitmap(canvas);
    } catch {
      return null;
    }
  }, []);

  return { videoRef, canvasRef, error, ready, toggleCamera, retry, captureHighResFrame };
}
