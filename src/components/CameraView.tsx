import { useEffect, useState } from 'react';
import styles from './CameraView.module.css';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  ready: boolean;
  error: string | null;
  retry: () => void;
}

export default function CameraView({ videoRef, canvasRef, ready, error, retry }: CameraViewProps) {
  const [scanPos, setScanPos] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let pos = 0;
    const id = setInterval(() => {
      pos = (pos + 2) % 100;
      setScanPos(pos);
    }, 40);
    return () => clearInterval(id);
  }, [ready]);

  return (
    <div className={styles.container}>
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        playsInline
        muted
      />
      <canvas ref={canvasRef} className={styles.canvas} />

      {ready && (
        <div
          className={styles.scanLine}
          style={{ top: `${scanPos}%` }}
        />
      )}

      {ready && (
        <>
          <div className={styles.cornerTL} />
          <div className={styles.cornerTR} />
          <div className={styles.cornerBL} />
          <div className={styles.cornerBR} />
        </>
      )}

      {!ready && !error && (
        <div className={styles.overlay}>
          <div className={styles.spinner} />
          <p>Activando cámara...</p>
        </div>
      )}

      {error && (
        <div className={styles.overlay}>
          <p className={styles.error}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={retry}>
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
