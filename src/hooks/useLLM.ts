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

export function useLLM(minIntervalMs = 8000): UseLLMReturn {
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

      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: formatQuestion(text) }),
        });

        if (!res.ok) throw new Error(`Error ${res.status}`);

        const data = await res.json();
        setAnswer(data.answer);
        setExplanation(data.explanation);
      } catch (err) {
        setError('Error al consultar la IA');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [minIntervalMs],
  );

  return { answer, explanation, loading, error, askQuestion, reset };
}
