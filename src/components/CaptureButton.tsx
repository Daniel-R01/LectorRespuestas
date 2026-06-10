import styles from './CaptureButton.module.css';

interface CaptureButtonProps {
  onCapture: () => void;
  autoDetect: boolean;
  onToggleAuto: () => void;
  loading: boolean;
  hasText: boolean;
}

export default function CaptureButton({
  onCapture,
  autoDetect,
  onToggleAuto,
  loading,
  hasText,
}: CaptureButtonProps) {
  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.autoBtn} ${autoDetect ? styles.active : ''}`}
        onClick={onToggleAuto}
        title={autoDetect ? 'Auto-detección activada' : 'Auto-detección desactivada'}
      >
        AUTO
      </button>

      <button
        type="button"
        className={`${styles.captureBtn} ${loading ? styles.loading : ''} ${!hasText && !loading ? styles.disabled : ''}`}
        onClick={onCapture}
        disabled={loading}
      >
        {loading ? (
          <div className={styles.pulse} />
        ) : (
          <div className={styles.ring} />
        )}
      </button>

      <div className={styles.placeholder} />
    </div>
  );
}
