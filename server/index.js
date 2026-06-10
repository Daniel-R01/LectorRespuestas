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
app.use(bodyParser.json({ limit: '1mb' }));

const apiKey = process.env.ANTHROPIC_API_KEY || '';
if (!apiKey) console.error('ANTHROPIC_API_KEY not set');

const anthropic = new Anthropic({ apiKey: apiKey || 'missing' });

const SYSTEM_PROMPT = `Eres un experto en finanzas e inversiones. Recibiras una imagen de una pantalla con una pregunta de opcion multiple (a, b, c, d, e). Responde UNICAMENTE la letra correcta. Nada mas.`;

function parseAnswer(raw) {
  if (!raw || !raw.trim()) return '';
  const cleaned = raw.trim().toLowerCase();

  // Try to find isolated letter
  const m = cleaned.match(/\b([a-e])\b/);
  if (m) return m[1];

  // Try to find letter at start of a line with delimiter
  const lm = cleaned.match(/^([a-e])[).:\s]/m);
  if (lm) return lm[1];

  // Just extract any a-e
  const letters = cleaned.replace(/[^a-e]/g, '');
  if (letters.length >= 1) return letters[0];

  return '';
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasKey: !!apiKey });
});

app.post('/api/ask', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada. Agregala en Render.' });
  }

  const { image } = req.body;
  if (!image || typeof image !== 'string' || !image.startsWith('data:')) {
    return res.status(400).json({ error: 'Imagen invalida o faltante.' });
  }

  // Extract base64 and media type
  const [header, data] = image.split(',');
  const mediaType = header.match(/data:(.*);base64/)?.[1] || 'image/jpeg';

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 10,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: 'Responde solo a, b, c, d o e.' },
        ],
      }],
    });

    const content = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    console.log('Claude:', content);
    res.json({ answer: parseAnswer(content) });
  } catch (err) {
    console.error('Claude error:', err.status || '', err.message || err);
    const s = err?.status;
    const m = String(err?.message || '');
    if (s === 401 || m.includes('api key') || m.includes('auth')) {
      return res.status(500).json({ error: 'API key de Claude invalida.' });
    }
    if (s === 429 || m.includes('rate')) {
      return res.status(500).json({ error: 'Demasiadas consultas. Espera.' });
    }
    res.status(500).json({ error: m.slice(0, 80) || 'Error al procesar.' });
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
  console.log(`Server :${PORT} | Key: ${apiKey ? 'OK' : 'MISSING'}`);
});
