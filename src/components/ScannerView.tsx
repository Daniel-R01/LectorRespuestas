import { useState, useEffect, useRef } from 'react';
import { useCamera, hasContentChanged, isLowVariance } from '../hooks/useCamera';
import { useLLM } from '../hooks/useLLM';
import CameraView from './CameraView';
import AnswerOverlay from './AnswerOverlay';
import CaptureButton from './CaptureButton';
import styles from './ScannerView.module.css';

interface ScannerViewProps {
  onBack: () => void;
}

export default function ScannerView({ onBack }: ScannerViewProps) {
  const { videoRef, canvasRef, ready, error: cameraError, toggleCamera, retry, captureFrame } = useCamera();
  const { answer, loading: llmLoading, error: llmError, askQuestion, reset } = useLLM(4000);

  const [autoDetect, setAutoDetect] = useState(false);
  const [flash, setFlash] = useState(false);
  const [logText, setLogText] = useState('');
  const prevDiffRef = useRef<ImageData | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const lastAnswerRef = useRef('');

  useEffect(() => {
    if (flash) { const t = setTimeout(() => setFlash(false), 300); return () => clearTimeout(t); }
  }, [flash]);

  // AUTO mode: capture every 3 seconds
  useEffect(() => {
    if (!autoDetect || !ready || llmLoading) return;

    const tick = async () => {
      const frame = await captureFrame();
      if (!frame) return;

      const { base64, diffData } = frame;

      // Check if content changed vs previous frame
      if (prevDiffRef.current && !hasContentChanged(prevDiffRef.current, diffData)) {
        return;
      }

      // Check if frame has meaningful content (not blank/dark screen)
      if (isLowVariance(diffData)) {
        return;
      }

      prevDiffRef.current = diffData;
      setLogText('Detectada pregunta. Consultando…');

      // Only ask if answer would be different from last (skip duplicates)
      await askQuestion(base64, false);
    };

    autoTimerRef.current = window.setInterval(tick, 3000);
    tick(); // First tick immediately

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [autoDetect, ready, llmLoading, captureFrame, askQuestion]);

  // Update log when answer arrives
  useEffect(() => {
    if (answer && answer !== lastAnswerRef.current) {
      lastAnswerRef.current = answer;
      setLogText(`Respuesta: ${answer.toUpperCase()}`);
    }
    if (llmError) {
      setLogText(llmError);
    }
    if (llmLoading) {
      setLogText('Consultando IA…');
    }
  }, [answer, llmError, llmLoading]);

  const handleCapture = async () => {
    setFlash(true);
    if (llmLoading) return;
    setLogText('Capturando…');

    const frame = await captureFrame();
    if (!frame) { setLogText('Error al capturar.'); return; }

    prevDiffRef.current = frame.diffData;
    reset();
    askQuestion(frame.base64, true);
  };

  const handleClear = () => {
    reset();
    lastAnswerRef.current = '';
    prevDiffRef.current = null;
    setLogText('Apunta la camara a una pregunta…');
  };

  const hasResult = !!(answer || llmError);

  // Initial log message
  useEffect(() => {
    if (ready && !logText) {
      setLogText('Apunta la camara a una pregunta…');
    }
  }, [ready, logText]);

  return (
    <>
      <CameraView
        videoRef={videoRef}
        canvasRef={canvasRef}
        ready={ready}
        error={cameraError}
        retry={retry}
        showScan={autoDetect}
      />

      <AnswerOverlay answer={answer} loading={llmLoading} error={llmError} />

      {ready && (
        <>
          {flash && <div className={styles.flash} />}

          <div className={styles.topBar}>
            <button type="button" className={styles.stopBtn} onClick={onBack}>✕</button>
            <div className={styles.spacer} />
            <button type="button" className={styles.flipBtn} onClick={toggleCamera}>🔄</button>
          </div>

          <div className={styles.logBox}>
            <span className={`${styles.logText} ${llmError ? styles.logErr : ''}`}>
              {logText || 'Apunta la camara a una pregunta…'}
            </span>
          </div>

          <CaptureButton
            onCapture={handleCapture}
            onClear={hasResult ? handleClear : undefined}
            autoDetect={autoDetect}
            onSetAuto={(v) => setAutoDetect(v)}
            loading={llmLoading}
          />
        </>
      )}
    </>
  );
}
