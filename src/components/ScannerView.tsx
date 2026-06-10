import { useState, useEffect, useRef, useCallback } from 'react';
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
  const { answer, loading: llmLoading, error: llmError, askQuestion, reset } = useLLM(3500);

  const [autoDetect, setAutoDetect] = useState(false);
  const [flash, setFlash] = useState(false);
  const [logText, setLogText] = useState('');
  const prevDiffRef = useRef<ImageData | null>(null);
  const loadingRef = useRef(false);
  const lastAnswerRef = useRef('');

  // Keep loadingRef in sync
  loadingRef.current = llmLoading;

  useEffect(() => {
    if (flash) { const t = setTimeout(() => setFlash(false), 300); return () => clearTimeout(t); }
  }, [flash]);

  const autoTick = useCallback(async () => {
    if (loadingRef.current) return;
    const frame = await captureFrame();
    if (!frame) return;

    const { base64, diffData } = frame;

    if (prevDiffRef.current && !hasContentChanged(prevDiffRef.current, diffData)) {
      return;
    }

    if (isLowVariance(diffData)) {
      return;
    }

    prevDiffRef.current = diffData;
    setLogText('Detectada pregunta. Consultando…');
    askQuestion(base64, false);
  }, [captureFrame, askQuestion]);

  useEffect(() => {
    if (!autoDetect || !ready) return;

    const id = window.setInterval(autoTick, 3000);
    autoTick();

    return () => clearInterval(id);
  }, [autoDetect, ready, autoTick]);

  // Update log from answer/error/loading
  useEffect(() => {
    if (llmLoading) {
      setLogText('Consultando IA…');
      return;
    }
    if (llmError) {
      setLogText(llmError);
      return;
    }
    if (answer) {
      if (answer !== lastAnswerRef.current) {
        lastAnswerRef.current = answer;
        setLogText(`Respuesta: ${answer.toUpperCase()}`);
      }
      return;
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

  return (
    <>
      <CameraView
        videoRef={videoRef} canvasRef={canvasRef} ready={ready}
        error={cameraError} retry={retry} showScan={autoDetect}
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
