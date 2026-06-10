import { useEffect, useState } from 'react';
import styles from './CameraView.module.css';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  ready: boolean;
  error: string | null;
  retry: () => void;
  showScan: boolean;
}

export default function CameraView({ videoRef, canvasRef, ready, error, retry, showScan }: CameraViewProps) {
  const [scanPos, setScanPos] = useState(0);

  useEffect(() => {
    if (!ready || !showScan) return;
    let pos = 0;
    const id = setInterval(() => {
      pos = (pos + 2) % 100;
      setScanPos(pos);
    }, 40);
    return () => clearInterval(id);
  }, [ready, showScan]);

  return (
    <div className={styles.container}>
      <video
        ref={videoRef}
        className={`${styles.video} ${ready ? styles.visible : styles.hidden}`}
        autoPlay
        playsInline
        muted
        disablePictureInPicture
      />
      <canvas ref={canvasRef} className={styles.canvas} />

      {!ready && !error && (
        <div className={styles.loadingScreen}>
          <div className={styles.logo}>
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="12" width="48" height="40" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
              <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" />
              <circle cx="32" cy="32" r="4" fill="currentColor" />
            </svg>
          </div>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Permití el acceso a la cámara</p>
          <p className={styles.loadingSub}>para comenzar a escanear</p>
        </div>
      )}

      {ready && showScan && (
        <div className={styles.scanLine} style={{ top: `${scanPos}%` }} />
      )}

      {ready && (
        <>
          <div className={styles.cornerTL} />
          <div className={styles.cornerTR} />
          <div className={styles.cornerBL} />
          <div className={styles.cornerBR} />
        </>
      )}

      {error && (
        <div className={styles.loadingScreen}>
          <p className={styles.error}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={retry}>
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
