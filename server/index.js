import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10kb' }));

const apiKey = process.env.ANTHROPIC_API_KEY || '';
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set');
}

const anthropic = new Anthropic({ apiKey: apiKey || 'missing' });

const SYSTEM_PROMPT = `Eres un experto en finanzas e inversiones. Responde ÚNICAMENTE con dos líneas:

PRIMERA LÍNEA: Solo la letra de la opción correcta (a, b, c o d).
SEGUNDA LÍNEA: Una breve explicación de máximo 15 palabras.

Ejemplo:
b
Un ETF es un fondo cotizado en bolsa que replica un índice.`;

function parseAnswer(raw) {
  if (!raw) return { answer: '', explanation: '' };

  const cleaned = raw.trim();
  const lines = cleaned.split('\n').filter(Boolean);

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    const match = trimmed.match(/^([a-d])[).\s]?/i);
    if (match) {
      const rest = lines.filter((_, i) => i !== lines.indexOf(line)).join(' ').trim();
      return {
        answer: match[1].toLowerCase(),
        explanation: rest || trimmed.slice(1).trim() || '',
      };
    }
  }

  const onlyLetter = cleaned.replace(/[^a-dA-D]/g, '').toLowerCase();
  if (onlyLetter.length === 1 && /^[a-d]$/.test(onlyLetter)) {
    return { answer: onlyLetter, explanation: '' };
  }

  const lower = cleaned.toLowerCase();
  for (const letter of ['a', 'b', 'c', 'd']) {
    if (lower.includes(`la letra ${letter}`) || lower.includes(`opción ${letter}`) || lower.includes(`es la ${letter}`)) {
      return { answer: letter, explanation: cleaned };
    }
  }

  return { answer: '', explanation: cleaned };
}

function getClaudeError(err) {
  const s = err?.status;
  const msg = String(err?.message || err || '');
  const lower = msg.toLowerCase();

  if (s === 401 || s === 403 || lower.includes('api key') || lower.includes('api_key') || lower.includes('auth') || lower.includes('x-api-key') || lower.includes('permission')) {
    return 'API key de Claude inválida. Verificá ANTHROPIC_API_KEY en Render.';
  }
  if (s === 429 || lower.includes('rate') || lower.includes('quota')) {
    return 'Demasiadas consultas. Esperá unos segundos.';
  }
  if (s === 400) {
    return 'Solicitud inválida a Claude.';
  }
  if (s === 500 || s === 502 || s === 503 || lower.includes('overload')) {
    return 'Servicio de Claude no disponible. Reintentá.';
  }
  return `Error: ${msg.slice(0, 80)}`;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasKey: !!apiKey });
});

app.post('/api/ask', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key de Claude no configurada. Agregala en Render > Environment.' });
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.length < 5) {
    return res.status(400).json({ error: 'Texto muy corto o inválido. Apunta mejor la cámara.' });
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });

    const content = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    console.log('Claude response:', content);

    const { answer, explanation } = parseAnswer(content);
    res.json({ answer, explanation });
  } catch (err) {
    console.error('Claude error:', err.status || '', err.message || err);
    res.status(500).json({ error: getClaudeError(err) });
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
  console.log(`Server on :${PORT} | API key: ${apiKey ? 'OK' : 'MISSING'}`);
});
