import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5kb' }));

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('⚠ ANTHROPIC_API_KEY no configurada en variables de entorno');
}

const anthropic = new Anthropic({ apiKey: apiKey || 'missing' });

const SYSTEM_PROMPT = `Eres un experto en finanzas e inversiones. Responde ÚNICAMENTE con dos líneas:

PRIMERA LÍNEA: Solo la letra de la opción correcta (a, b, c o d).
SEGUNDA LÍNEA: Una breve explicación de máximo 15 palabras.

Ejemplo de formato correcto:
b
Un ETF es un fondo cotizado en bolsa que replica un índice.`;

function parseAnswer(raw) {
  if (!raw) return { answer: '', explanation: '' };
  const lines = raw.trim().split('\n').filter(Boolean);
  const firstLine = lines[0]?.trim().toLowerCase() || '';

  for (const line of lines) {
    const match = line.trim().match(/^([a-d])[.)\s]/i);
    if (match) {
      return {
        answer: match[1].toLowerCase(),
        explanation: lines.slice(1).join(' ').trim() || line.slice(2).trim(),
      };
    }
  }

  const fullLower = raw.toLowerCase();
  for (const letter of ['a', 'b', 'c', 'd']) {
    if (fullLower.includes(`la letra ${letter}`) || fullLower.includes(`opción ${letter}`) || fullLower.includes(`respuesta ${letter}`)) {
      return { answer: letter, explanation: raw.trim() };
    }
  }

  const singleLetter = firstLine.replace(/[^a-d]/g, '');
  if (singleLetter.length === 1) {
    return { answer: singleLetter, explanation: lines.slice(1).join(' ').trim() };
  }

  return { answer: '', explanation: raw.trim() };
}

app.post('/api/ask', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'API key de Claude no configurada en el servidor' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'No se proporcionó texto válido' });
    }

    const msg = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });

    const content = msg.content[0]?.type === 'text'
      ? msg.content[0].text
      : '';

    console.log('Claude response:', content);

    const { answer, explanation } = parseAnswer(content);
    res.json({ answer, explanation });
  } catch (err) {
    console.error('Claude API error:', err.message);

    if (err.status === 401 || err.message?.includes('authentication')) {
      return res.status(401).json({ error: 'API key de Claude inválida' });
    }
    if (err.status === 429 || err.message?.includes('rate')) {
      return res.status(429).json({ error: 'Límite de consultas excedido. Espera unos segundos.' });
    }

    res.status(500).json({
      error: 'Error al procesar la pregunta',
      details: err.message,
    });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API key: ${apiKey ? '✓ configurada' : '✗ FALTA'}`);
});
