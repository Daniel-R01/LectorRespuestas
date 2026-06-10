import styles from './CaptureButton.module.css';

interface CaptureButtonProps {
  onCapture: () => void;
  onClear?: () => void;
  autoDetect: boolean;
  onSetAuto: (v: boolean) => void;
  loading: boolean;
}

export default function CaptureButton({ onCapture, onClear, autoDetect, onSetAuto, loading }: CaptureButtonProps) {
  return (
    <div className={styles.container}>
      <div className={styles.modeGroup}>
        <button type="button" className={`${styles.modeBtn} ${!autoDetect ? styles.active : ''}`} onClick={() => onSetAuto(false)}>
          <span className={styles.modeDot} />MANUAL
        </button>
        <button type="button" className={`${styles.modeBtn} ${autoDetect ? styles.active : ''}`} onClick={() => onSetAuto(true)}>
          <span className={styles.modeDot} />AUTO
        </button>
      </div>

      <button type="button" className={`${styles.captureBtn} ${loading ? styles.loading : ''}`} onClick={onCapture} disabled={loading}>
        <div className={styles.ringOuter}><div className={loading ? styles.ringLoading : styles.ringIdle} /></div>
        <div className={styles.ringInner} />
        {loading && <div className={styles.pulse} />}
      </button>

      {onClear ? (
        <button type="button" className={styles.clearBtn} onClick={onClear}>Limpiar</button>
      ) : (
        <div className={styles.clearBtnPlaceholder} />
      )}
    </div>
  );
}
