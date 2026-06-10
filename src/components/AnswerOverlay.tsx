import styles from './AnswerOverlay.module.css';

interface AnswerOverlayProps {
  answer: string;
  loading: boolean;
  error: string | null;
}

export default function AnswerOverlay({ answer, loading, error }: AnswerOverlayProps) {
  if (!loading && !error && !answer) return null;

  return (
    <div className={styles.container}>
      {loading && (
        <div className={styles.badge}>
          <div className={styles.spinner} />
          <span>Consultando IA...</span>
        </div>
      )}

      {error && (
        <div className={`${styles.badge} ${styles.error}`}>
          <span>{error}</span>
        </div>
      )}

      {answer && !loading && !error && (
        <div className={`${styles.badge} ${styles.success}`}>
          <span className={styles.letter}>{answer.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
