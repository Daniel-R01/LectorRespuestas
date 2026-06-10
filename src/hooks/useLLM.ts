import { useState, useCallback, useRef } from 'react';
import { formatQuestion } from '../utils/prompt';

interface UseLLMReturn {
  answer: string;
  explanation: string;
  loading: boolean;
  error: string | null;
  askQuestion: (text: string) => Promise<void>;
  reset: () => void;
}

export function useLLM(minIntervalMs = 6000): UseLLMReturn {
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAskRef = useRef(0);

  const reset = useCallback(() => {
    setAnswer('');
    setExplanation('');
    setError(null);
  }, []);

  const askQuestion = useCallback(
    async (text: string) => {
      const now = Date.now();
      if (now - lastAskRef.current < minIntervalMs) return;
      lastAskRef.current = now;

      setLoading(true);
      setError(null);
      setAnswer('');
      setExplanation('');

      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: formatQuestion(text) }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || `Error del servidor (${res.status})`);
          return;
        }

        setAnswer(data.answer);
        setExplanation(data.explanation);
      } catch (err) {
        setError('No se pudo conectar con el servidor');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [minIntervalMs],
  );

  return { answer, explanation, loading, error, askQuestion, reset };
}
