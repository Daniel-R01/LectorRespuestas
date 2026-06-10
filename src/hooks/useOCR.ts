import { useRef, useState, useCallback, useEffect } from 'react';
import Tesseract from 'tesseract.js';

interface UseOCRReturn {
  text: string;
  isProcessing: boolean;
  loadingMessage: string;
  workerReady: boolean;
  error: string | null;
}

export function useOCR(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  intervalMs = 1000,
): UseOCRReturn {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Cargando OCR...');
  const [workerReady, setWorkerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const lastTextRef = useRef('');

  useEffect(() => {
    let cancelled = false;

    Tesseract.createWorker('spa', 1, {
      logger: (m) => {
        if (!cancelled && m.status === 'loading tesseract core') {
          setLoadingMessage('Cargando motor OCR...');
        }
        if (!cancelled && m.status === 'initializing tesseract') {
          setLoadingMessage('Inicializando...');
        }
        if (!cancelled && m.status === 'loading language traineddata') {
          setLoadingMessage('Cargando datos de idioma...');
        }
      },
    })
      .then((worker) => {
        if (cancelled) {
          worker.terminate();
          return;
        }
        workerRef.current = worker;
        setWorkerReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError('Error al inicializar OCR');
          console.error(err);
        }
      });

    return () => {
      cancelled = true;
      workerRef.current?.terminate();
    };
  }, []);

  const captureAndRecognize = useCallback(async () => {
    if (isProcessing || !canvasRef.current || !videoRef.current || !workerRef.current) return;

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || canvas.width;
      canvas.height = video.videoHeight || canvas.height;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const { data } = await workerRef.current.recognize(canvas);
      const recognized = data.text.trim();

      if (recognized && recognized !== lastTextRef.current) {
        lastTextRef.current = recognized;
        setText(recognized);
      }
    } catch {
      // Silently skip OCR errors on individual frames
    } finally {
      setIsProcessing(false);
    }
  }, [canvasRef, videoRef, isProcessing]);

  useEffect(() => {
    if (!workerReady) return;

    const id = setInterval(captureAndRecognize, intervalMs);
    return () => clearInterval(id);
  }, [captureAndRecognize, intervalMs, workerReady]);

  return { text, isProcessing, loadingMessage, workerReady, error };
}
