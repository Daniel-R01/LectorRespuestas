import { useRef, useState, useEffect, useCallback } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  error: string | null;
  ready: boolean;
  toggleCamera: () => void;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

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
      const domErr = err as DOMException;
      if (domErr?.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Debes aceptar el permiso en tu navegador.');
      } else if (domErr?.name === 'NotFoundError') {
        setError('No se encontró cámara en el dispositivo.');
      } else if (domErr?.name === 'NotReadableError') {
        setError('La cámara está siendo usada por otra app.');
      } else {
        setError('No se pudo acceder a la cámara. Asegúrate de usar HTTPS.');
      }
    }
  }, [facing]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const toggleCamera = useCallback(() => {
    setFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  return { videoRef, canvasRef, error, ready, toggleCamera };
}
