import { useState, useEffect } from 'react';
import styles from './StartScreen.module.css';

interface Profile {
  name: string;
  content: string;
}

interface StartScreenProps {
  onStart: (profileContent: string | null) => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(setProfiles)
      .catch(() => {});
  }, []);

  const selectedProfile = profiles.find(p => p.name === selected)?.content ?? null;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="12" width="48" height="40" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <circle cx="32" cy="32" r="4" fill="currentColor" />
            <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="44" y1="8" x2="44" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className={styles.title}>Lector Respuestas</h1>
        <p className={styles.subtitle}>Asistente de preguntas financieras en tiempo real</p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>1</span>
            <p>Apunta la cámara a la pantalla con la pregunta</p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>2</span>
            <p>El OCR detecta el texto y las opciones a, b, c, d</p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>3</span>
            <p>La IA analiza y muestra la respuesta en pantalla</p>
          </div>
        </div>

        {profiles.length > 0 && (
          <select
            className={styles.select}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Sin perfil de empresa</option>
            {profiles.map(p => (
              <option key={p.name} value={p.name}>{p.name.toUpperCase()}</option>
            ))}
          </select>
        )}

        <button type="button" className={styles.button} onClick={() => onStart(selectedProfile)}>
          Comenzar
        </button>

        <span className={styles.version}>v{__APP_VERSION__}</span>
      </div>
    </div>
  );
}
