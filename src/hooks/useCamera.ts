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

function getCameraError(err: unknown, isSecure: boolean): string {
  const domErr = err as DOMException;
  if (!isSecure && domErr?.name === 'NotAllowedError') {
    return 'Cámara bloqueada por HTTP. Debes usar HTTPS.';
  }
  if (domErr?.name === 'NotAllowedError') {
    return 'Permiso denegado. Ve a Ajustes > Navegador > Cámara y actívalo.';
  }
  if (domErr?.name === 'NotFoundError') {
    return 'No se encontró cámara en el dispositivo.';
  }
  if (domErr?.name === 'NotReadableError') {
    return 'La cámara está en uso por otra app. Ciérrala.';
  }
  return 'No se pudo acceder a la cámara.';
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageCaptureRef = useRef<ImageCapture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

  const isSecure = typeof window !== 'undefined'
    ? window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    : false;

  const startCamera = useCallback(async (facingMode: 'environment' | 'user') => {
    try {
      setError(null);
      setReady(false);

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      imageCaptureRef.current = null;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });

      streamRef.current = stream;

      // Create ImageCapture from the video track for high-res captures
      const track = stream.getVideoTracks()[0];
      if (track && typeof ImageCapture !== 'undefined') {
        try {
          imageCaptureRef.current = new ImageCapture(track);
        } catch {
          // ImageCapture not available
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setReady(true);
        };
      }
    } catch (err: unknown) {
      setError(getCameraError(err, isSecure));
    }
  }, [isSecure]);

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
      } catch {
        // Fall back to canvas
      }
    }

    // Fallback: capture from video via canvas
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
