import styles from './CaptureButton.module.css';

interface CaptureButtonProps {
  onCapture: () => void;
  onClear?: () => void;
  autoDetect: boolean;
  onToggleAuto: () => void;
  loading: boolean;
  hasText: boolean;
}

export default function CaptureButton({
  onCapture,
  onClear,
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
      >
        <span className={styles.autoDot} />
        AUTO
      </button>

      <button
        type="button"
        className={`${styles.captureBtn} ${loading ? styles.loading : ''}`}
        onClick={onCapture}
        disabled={loading}
      >
        <div className={styles.ringOuter}>
          <div className={loading ? styles.ringLoading : styles.ringIdle} />
        </div>
        <div className={styles.ringInner} />
        {loading && <div className={styles.pulse} />}
      </button>

      {onClear ? (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={onClear}
        >
          Limpiar
        </button>
      ) : (
        <span className={`${styles.hint} ${hasText ? styles.ready : ''}`}>
          {loading ? 'Consultando…' : hasText ? 'Capturar' : 'Sin texto'}
        </span>
      )}
    </div>
  );
}
