import styles from './CameraView.module.css';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  ready: boolean;
  error: string | null;
}

export default function CameraView({ videoRef, canvasRef, ready, error }: CameraViewProps) {
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

      {!ready && !error && (
        <div className={styles.overlay}>
          <div className={styles.spinner} />
          <p>Activando cámara...</p>
        </div>
      )}

      {error && (
        <div className={styles.overlay}>
          <p className={styles.error}>{error}</p>
        </div>
      )}
    </div>
  );
}
