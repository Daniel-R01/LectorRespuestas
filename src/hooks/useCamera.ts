import { useRef, useState, useEffect, useCallback } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  error: string | null;
  ready: boolean;
  toggleCamera: () => void;
  retry: () => void;
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { min: 1280, ideal: 1920 },
          height: { min: 960, ideal: 1440 },
        },
        audio: false,
      });

      streamRef.current = stream;

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

  return { videoRef, canvasRef, error, ready, toggleCamera, retry };
}
