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
  } = useOCR(canvasRef, videoRef, 1000);
  const { answer, explanation, loading: llmLoading, error: llmError, askQuestion, reset } = useLLM(6000);

  const [autoDetect, setAutoDetect] = useState(true);
  const prevOcrRef = useRef('');
  const lastAutoSendRef = useRef(0);

  useEffect(() => {
    if (!autoDetect || !ocrText || llmLoading || !workerReady) return;

    const prev = prevOcrRef.current;
    if (!prev) {
      prevOcrRef.current = ocrText;
      return;
    }

    if (ocrText.length === prev.length && ocrText === prev) return;

    const wordChange = Math.abs(ocrText.length - prev.length) > 20
      || ocrText.split(/\s+/).filter((w) => !prev.includes(w)).length > 5;

    if (wordChange) {
      const now = Date.now();
      if (now - lastAutoSendRef.current > 8000) {
        lastAutoSendRef.current = now;
        reset();
        askQuestion(cleanOCRText(ocrText));
      }
    }

    prevOcrRef.current = ocrText;
  }, [ocrText, autoDetect, llmLoading, workerReady, askQuestion, reset]);

  const handleCapture = () => {
    if (!ocrText || llmLoading) return;
    lastAutoSendRef.current = 0;
    reset();
    askQuestion(cleanOCRText(ocrText));
  };

  return (
    <>
      <CameraView
        videoRef={videoRef}
        canvasRef={canvasRef}
        ready={ready}
        error={cameraError}
        retry={retry}
      />

      <AnswerOverlay
        answer={answer}
        explanation={explanation}
        loading={llmLoading}
        error={llmError}
      />

      {ready && (
        <>
          <div className={styles.topBar}>
            <button type="button" className={styles.stopBtn} onClick={onBack}>
              ✕
            </button>

            <span className={`${styles.status} ${ocrError ? styles.statusErr : ''}`}>
              {ocrError
                ? `OCR: ${ocrError}`
                : !workerReady
                  ? loadingMessage
                  : ocrText
                    ? ocrText.slice(0, 25)
                    : 'Esperando texto…'}
            </span>

            <button type="button" className={styles.flipBtn} onClick={toggleCamera}>
              🔄
            </button>
          </div>

          <CaptureButton
            onCapture={handleCapture}
            autoDetect={autoDetect}
            onToggleAuto={() => setAutoDetect((v) => !v)}
            loading={llmLoading}
            hasText={!!ocrText}
          />
        </>
      )}
    </>
  );
}
