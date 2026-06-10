import { useState, useCallback, useRef } from 'react';

interface UseLLMReturn {
  answer: string;
  loading: boolean;
  error: string | null;
  askQuestion: (imageBase64: string, force?: boolean) => Promise<void>;
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
    async (imageBase64: string, force = false) => {
      const now = Date.now();
      if (!force && now - lastAskRef.current < minIntervalMs) return;
      lastAskRef.current = now;

      setError(null);
      setAnswer('');
      setLoading(true);

      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 15000);

        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64 }),
          signal: ctrl.signal,
        });

        clearTimeout(tid);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || `Error (${res.status})`);
          return;
        }

        setAnswer(data.answer || '?');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Timeout. Reintenta.');
        } else {
          setError('No se pudo conectar con el servidor.');
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
