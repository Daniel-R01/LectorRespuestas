import { useState, useCallback, useRef } from 'react';
import { formatQuestion } from '../utils/prompt';

interface UseLLMReturn {
  answer: string;
  loading: boolean;
  error: string | null;
  askQuestion: (text: string, force?: boolean) => Promise<void>;
  reset: () => void;
}

export function useLLM(minIntervalMs = 6000): UseLLMReturn {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAskRef = useRef(0);

  const reset = useCallback(() => {
    setAnswer('');
    setError(null);
  }, []);

  const askQuestion = useCallback(
    async (text: string, force = false) => {
      const now = Date.now();
      if (!force && now - lastAskRef.current < minIntervalMs) return;
      lastAskRef.current = now;

      setLoading(true);
      setError(null);
      setAnswer('');

      try {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 15000);

        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: formatQuestion(text) }),
          signal: timeoutController.signal,
        });

        clearTimeout(timeoutId);

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || `Error del servidor (${res.status})`);
          return;
        }

        setAnswer(data.answer);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('La consulta tardó demasiado. Reintentá.');
        } else {
          setError('No se pudo conectar con el servidor');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [minIntervalMs],
  );

  return { answer, loading, error, askQuestion, reset };
}
