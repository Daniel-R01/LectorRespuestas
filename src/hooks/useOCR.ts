import { useRef, useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

interface UseOCRReturn {
  text: string;
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
  const [loadingMessage, setLoadingMessage] = useState('Cargando OCR...');
  const [workerReady, setWorkerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const lastTextRef = useRef('');
  const processingRef = useRef(false);
  const idRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    Tesseract.createWorker('spa', 1, {
      logger: (m) => {
        if (cancelled) return;
        if (m.status === 'loading tesseract core') {
          setLoadingMessage('Cargando motor OCR...');
        } else if (m.status === 'initializing tesseract') {
          setLoadingMessage('Inicializando...');
        } else if (m.status === 'loading language traineddata') {
          setLoadingMessage('Cargando español...');
        } else if (m.status === 'recognizing text') {
          // progress during recognition, ignore
        }
      },
    })
      .then((worker) => {
        if (cancelled) { worker.terminate(); return; }
        workerRef.current = worker;
        setWorkerReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError('Error al inicializar OCR');
          console.error('Tesseract init error:', err);
        }
      });

    return () => {
      cancelled = true;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

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
      idRef.current++;

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

  return { text, loadingMessage, workerReady, error };
}
