import { useRef, useState, useEffect, useCallback } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  error: string | null;
  ready: boolean;
  toggleCamera: () => void;
  retry: () => void;
  isSecure: boolean;
  hasAPI: boolean;
}

function getCameraError(err: unknown, isSecure: boolean): string {
  const domErr = err as DOMException;
  if (!isSecure && domErr?.name === 'NotAllowedError') {
    return 'Cámara bloqueada por HTTP. Usa HTTPS o activa chrome://flags/#unsafely-treat-insecure-origin-as-secure';
  }
  if (domErr?.name === 'NotAllowedError') {
    return 'Permiso denegado. Ve a Ajustes > Chrome/Safari > Cámara y actívalo para este sitio.';
  }
  if (domErr?.name === 'NotFoundError') {
    return 'No se encontró cámara en el dispositivo.';
  }
  if (domErr?.name === 'NotReadableError') {
    return 'La cámara está siendo usada por otra app. Ciérrala e intenta de nuevo.';
  }
  return 'No se pudo acceder a la cámara. Verifica permisos del navegador.';
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
  const hasAPI = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setReady(false);

      streamRef.current?.getTracks().forEach((t) => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
  }, [facing, isSecure]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const retry = useCallback(() => {
    startCamera();
  }, [startCamera]);

  const toggleCamera = useCallback(() => {
    setFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  return { videoRef, canvasRef, error, ready, toggleCamera, retry, isSecure, hasAPI };
}
