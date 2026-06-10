import { useState, useEffect, useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useOCR } from '../hooks/useOCR';
import { useLLM } from '../hooks/useLLM';
import { cleanOCRText } from '../utils/parser';
import CameraView from './CameraView';
import AnswerOverlay from './AnswerOverlay';
import CaptureButton from './CaptureButton';

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

  const ocrStatus = ocrError
    ? `OCR: ${ocrError}`
    : !workerReady
      ? loadingMessage
      : ocrText
        ? `Texto: ${ocrText.slice(0, 30)}…`
        : 'OCR activo - esperando';

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
          <div
            style={{
              position: 'fixed',
              top: 8,
              right: 12,
              zIndex: 20,
              fontSize: 10,
              color: ocrError ? '#ff6b6b' : 'rgba(255,255,255,0.6)',
              fontFamily: 'system-ui',
              background: 'rgba(0,0,0,0.65)',
              padding: '4px 10px',
              borderRadius: 12,
              maxWidth: '60%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {ocrStatus}
          </div>

          <button
            type="button"
            onClick={onBack}
            style={{
              position: 'fixed',
              top: 8,
              left: 12,
              zIndex: 20,
              background: 'rgba(220,38,38,0.7)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 12,
              padding: '6px 14px',
              fontSize: 12,
              fontFamily: 'system-ui',
              cursor: 'pointer',
            }}
          >
            ✕ Detener
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            style={{
              position: 'fixed',
              top: 8,
              left: 100,
              zIndex: 20,
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: '6px 12px',
              fontSize: 12,
              fontFamily: 'system-ui',
              cursor: 'pointer',
            }}
          >
            🔄
          </button>

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
