import styles from './AnswerOverlay.module.css';

interface AnswerOverlayProps {
  answer: string;
  explanation: string;
  loading: boolean;
  error: string | null;
}

export default function AnswerOverlay({ answer, explanation, loading, error }: AnswerOverlayProps) {
  if (!loading && !error && !answer && !explanation) return null;

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

      {answer && !loading && (
        <div className={styles.badge}>
          <div className={styles.answer}>
            <span className={styles.label}>Respuesta</span>
            <span className={styles.letter}>{answer.toUpperCase()}</span>
          </div>
          {explanation && (
            <p className={styles.explanation}>{explanation}</p>
          )}
        </div>
      )}

      {!answer && !loading && explanation && (
        <div className={styles.badge}>
          <p className={styles.explanation}>{explanation}</p>
        </div>
      )}
    </div>
  );
}
