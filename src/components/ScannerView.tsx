import { useState, useEffect, useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useOCR } from '../hooks/useOCR';
import { useLLM } from '../hooks/useLLM';
import { cleanOCRText } from '../utils/parser';
import CameraView from './CameraView';
import AnswerOverlay from './AnswerOverlay';
import CaptureButton from './CaptureButton';
import styles from './ScannerView.module.css';

interface ScannerViewProps {
  onBack: () => void;
}

export default function ScannerView({ onBack }: ScannerViewProps) {
  const { videoRef, canvasRef, ready, error: cameraError, toggleCamera, retry } = useCamera();
  const {
    text: ocrText,
    workerReady,
    loadingMessage,
    error: ocrError,
    retryWorker,
  } = useOCR(canvasRef, videoRef, 1000);
  const { answer, explanation, loading: llmLoading, error: llmError, askQuestion, reset } = useLLM(6000);

  const [autoDetect, setAutoDetect] = useState(true);
  const [justTried, setJustTried] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevOcrRef = useRef('');
  const lastAutoSendRef = useRef(0);

  useEffect(() => {
    if (justTried) {
      const t = setTimeout(() => setJustTried(false), 2000);
      return () => clearTimeout(t);
    }
  }, [justTried]);

  useEffect(() => {
    if (flash) {
      const t = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(t);
    }
  }, [flash]);

  useEffect(() => {
    if (!autoDetect || !ocrText || llmLoading || !workerReady) return;

    const prev = prevOcrRef.current;
    if (!prev) {
      prevOcrRef.current = ocrText;
      return;
    }

    if (ocrText === prev) return;

    const wordChange = Math.abs(ocrText.length - prev.length) > 20
      || ocrText.split(/\s+/).filter((w) => !prev.includes(w)).length > 4;

    if (wordChange) {
      const now = Date.now();
      if (now - lastAutoSendRef.current > 8000) {
        lastAutoSendRef.current = now;
        reset();
        askQuestion(cleanOCRText(ocrText), false);
      }
    }

    prevOcrRef.current = ocrText;
  }, [ocrText, autoDetect, llmLoading, workerReady, askQuestion, reset]);

  const handleCapture = () => {
    setFlash(true);
    if (!ocrText) {
      setJustTried(true);
      return;
    }
    if (llmLoading) return;
    lastAutoSendRef.current = 0;
    reset();
    askQuestion(cleanOCRText(ocrText), true);
  };

  const handleClear = () => {
    reset();
    prevOcrRef.current = '';
    lastAutoSendRef.current = 0;
  };

  const hasResult = !!(answer || explanation || llmError);
  const hasText = !!ocrText;

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

      <AnswerOverlay
        answer={answer}
        explanation={explanation}
        loading={llmLoading}
        error={llmError}
      />

      {ready && (
        <>
          {flash && <div className={styles.flash} />}

          <div className={styles.topBar}>
            <button type="button" className={styles.stopBtn} onClick={onBack}>
              ✕
            </button>

            <span className={`${styles.status} ${ocrError ? styles.statusErr : ''}`}>
              {ocrError
                ? 'OCR: Error'
                : !workerReady
                  ? loadingMessage
                  : ocrText
                    ? ocrText.slice(0, 30)
                    : 'Esperando texto…'}
            </span>

            <button type="button" className={styles.flipBtn} onClick={toggleCamera}>
              🔄
            </button>
          </div>

          {ocrError && (
            <div className={styles.ocrErrorBar}>
              <span>{ocrError}</span>
              <button type="button" className={styles.ocrRetryBtn} onClick={retryWorker}>
                Reintentar
              </button>
            </div>
          )}

          {justTried && !hasText && !llmLoading && (
            <div className={styles.toast}>Sin texto detectado. Apunta mejor la cámara.</div>
          )}

          <CaptureButton
            onCapture={handleCapture}
            onClear={hasResult ? handleClear : undefined}
            autoDetect={autoDetect}
            onToggleAuto={() => setAutoDetect((v) => !v)}
            loading={llmLoading}
            hasText={hasText}
          />
        </>
      )}
    </>
  );
}
