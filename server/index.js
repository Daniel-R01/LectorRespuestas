import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const apiKey = process.env.ANTHROPIC_API_KEY || '';
if (!apiKey) console.error('ANTHROPIC_API_KEY not set');

const anthropic = new Anthropic({ apiKey: apiKey || 'missing' });

const SYSTEM_PROMPT = `Eres un experto en finanzas e inversiones. Analiza la pregunta y opciones, luego responde EXCLUSIVAMENTE con la letra de la respuesta correcta. Reglas estrictas:

- Si NO hay una pregunta con alternativas (a,b,c,d,e) visibles, responde "NO_PREGUNTA"
- Si SI hay pregunta, razona internamente pero NO expliques tu razonamiento
- Responde SOLO la letra (a, b, c, d o e), sin texto, sin puntuacion, sin saltos de linea
- Ejemplo: si la opcion b es correcta, responde unicamente: b
- NO digas "La respuesta es...", NO escribas analisis, SOLO la letra`;

function parseAnswer(raw) {
  if (!raw || !raw.trim()) return '';
  const cleaned = raw.trim().toLowerCase();

  if (cleaned.includes('no_pregunta')) return '';

  // 1. Respuesta ideal: solo la letra con puntuacion opcional
  const single = /^\s*([a-e])\s*[).]*\s*$/.exec(cleaned);
  if (single) return single[1];

  // 2. Patrones explicitos de respuesta ("correcta es X", "respuesta: X")
  //    Preferir la ultima coincidencia
  const indicators = /(?:respuesta|opci[oó]n|correcta|letra)\b[^a-e]*?\b([a-e])\b/gi;
  let best = null;
  let m;
  while ((m = indicators.exec(cleaned)) !== null) {
    best = m[1];
  }
  if (best) return best;

  // 3. Ultima letra a-e aislada (evita falsos positivos de "a" como preposicion)
  const allLetters = [...cleaned.matchAll(/\b([a-e])\b/g)];
  if (allLetters.length > 0) return allLetters[allLetters.length - 1][1];

  // 4. Letra al inicio de linea con delimitador
  const lm = /^([a-e])[).:\s]/m.exec(cleaned);
  if (lm) return lm[1];

  // 5. Ultimo caracter a-e como ultimo recurso
  const letters = cleaned.replace(/[^a-e]/g, '');
  if (letters.length >= 1) return letters[letters.length - 1];

  return '';
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasKey: !!apiKey, model: 'opus-4-8' });
});

app.get('/api/profiles', (_req, res) => {
  const dir = path.join(__dirname, '..', 'profiles');
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  const profiles = files.map(f => ({
    name: f.replace('.md', ''),
    content: fs.readFileSync(path.join(dir, f), 'utf-8'),
  }));
  res.json(profiles);
});

app.post('/api/ask', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada. Agregala en Render.' });
  }

  const { image, profile } = req.body;
  if (!image || typeof image !== 'string' || !image.startsWith('data:')) {
    return res.status(400).json({ error: 'Imagen invalida o faltante.' });
  }

  const [header, data] = image.split(',');
  const mediaType = header.match(/data:(.*);base64/)?.[1] || 'image/jpeg';

  const systemPrompt = profile
    ? `${SYSTEM_PROMPT}\n\nSi la pregunta es sobre la empresa del siguiente perfil, usa estos datos verificados (NO los inventes). Si NO es sobre esta empresa, ignora esta seccion:\n\n${profile}`
    : SYSTEM_PROMPT;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 10,
      system: systemPrompt,
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
