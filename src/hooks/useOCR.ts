import { useRef, useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

interface UseOCRReturn {
  text: string;
  loadingMessage: string;
  workerReady: boolean;
  error: string | null;
  retryWorker: () => void;
}

export function useOCR(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  intervalMs = 1000,
): UseOCRReturn {
  const [text, setText] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Cargando OCR...');
  const [workerReady, setWorkerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const lastTextRef = useRef('');
  const processingRef = useRef(false);
  const cancelledRef = useRef(false);

  const initWorker = () => {
    setWorkerReady(false);
    setError(null);
    setLoadingMessage('Cargando OCR...');
    cancelledRef.current = false;

    workerRef.current?.terminate();
    workerRef.current = null;

    Tesseract.createWorker('spa', 1, {
      logger: (m) => {
        if (cancelledRef.current) return;
        if (m.status === 'loading tesseract core') {
          setLoadingMessage('Cargando motor OCR...');
        } else if (m.status === 'initializing tesseract') {
          setLoadingMessage('Inicializando...');
        } else if (m.status === 'loading language traineddata') {
          setLoadingMessage('Cargando español... (' + Math.round((m.progress || 0) * 100) + '%)');
        }
      },
    })
      .then((worker) => {
        if (cancelledRef.current) { worker.terminate(); return; }
        workerRef.current = worker;
        setWorkerReady(true);
      })
      .catch((err) => {
        if (cancelledRef.current) return;
        const msg = err?.message || String(err);
        if (msg.includes('NetworkError') || msg.includes('fetch')) {
          setError('Error de conexión. Verifica tu internet.');
        } else if (msg.includes('aborted')) {
          setError('Descarga cancelada.');
        } else {
          setError('Error al inicializar OCR');
        }
        console.error('Tesseract init error:', err);
      });
  };

  useEffect(() => {
    initWorker();
    return () => {
      cancelledRef.current = true;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const retryWorker = () => {
    initWorker();
  };

  useEffect(() => {
    if (!workerReady) return;

    const doCapture = async () => {
      if (processingRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const worker = workerRef.current;
      if (!video || !canvas || !worker) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      processingRef.current = true;

      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = vw;
        canvas.height = vh;
        ctx.drawImage(video, 0, 0, vw, vh);

        const { data } = await worker.recognize(canvas);
        const recognized = data.text.trim();

        if (recognized && recognized !== lastTextRef.current) {
          lastTextRef.current = recognized;
          setText(recognized);
        }
      } catch {
        // skip individual frame errors
      } finally {
        processingRef.current = false;
      }
    };

    const id = setInterval(doCapture, intervalMs);
    return () => clearInterval(id);
  }, [canvasRef, videoRef, workerReady, intervalMs]);

  return { text, loadingMessage, workerReady, error, retryWorker };
}
