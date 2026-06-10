import { useState, useEffect, useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useOCR } from '../hooks/useOCR';
import { useLLM } from '../hooks/useLLM';
import { extractQuestion, textSimilarity } from '../utils/parser';
import CameraView from './CameraView';
import AnswerOverlay from './AnswerOverlay';
import CaptureButton from './CaptureButton';

interface ScannerViewProps {
  onBack: () => void;
}

export default function ScannerView({ onBack }: ScannerViewProps) {
  const { videoRef, canvasRef, ready, error: cameraError, toggleCamera } = useCamera();
  const { text: ocrText, workerReady, loadingMessage } = useOCR(canvasRef, videoRef, 1000);
  const { answer, explanation, loading: llmLoading, error: llmError, askQuestion, reset } = useLLM(8000);

  const [autoDetect, setAutoDetect] = useState(true);
  const prevOcrRef = useRef('');

  useEffect(() => {
    if (!autoDetect || !ocrText || llmLoading) return;

    const prev = prevOcrRef.current;
    if (!prev) {
      prevOcrRef.current = ocrText;
      return;
    }

    const similarity = textSimilarity(ocrText, prev);
    if (similarity < 0.5) {
      const question = extractQuestion(ocrText);
      if (question) {
        reset();
        askQuestion(question);
      }
    }

    prevOcrRef.current = ocrText;
  }, [ocrText, autoDetect, llmLoading, askQuestion, reset]);

  const handleCapture = () => {
    const question = extractQuestion(ocrText);
    if (question) {
      reset();
      askQuestion(question);
    }
  };

  const ocrStatus = workerReady
    ? `OCR activo${ocrText ? ' - texto detectado' : ''}`
    : loadingMessage;

  return (
    <>
      <CameraView
        videoRef={videoRef}
        canvasRef={canvasRef}
        ready={ready}
        error={cameraError}
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
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'system-ui',
              background: 'rgba(0,0,0,0.5)',
              padding: '4px 10px',
              borderRadius: 12,
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
