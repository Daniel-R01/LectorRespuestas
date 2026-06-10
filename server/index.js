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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Eres un experto en finanzas e inversiones. Responde ÚNICAMENTE con dos líneas:

PRIMERA LÍNEA: Solo la letra de la opción correcta (a, b, c o d).
SEGUNDA LÍNEA: Una breve explicación de máximo 15 palabras.

Ejemplo de formato correcto:
b
Un ETF es un fondo cotizado en bolsa que replica un índice.`;

app.post('/api/ask', async (req, res) => {
  try {
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

    const lines = content.trim().split('\n');
    const answer = lines[0]?.trim().toLowerCase().replace(/[^a-d]/g, '') || '';
    const explanation = lines.slice(1).join(' ').trim();

    res.json({ answer, explanation });
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({
      error: 'Error al procesar la pregunta',
      details: err.message,
    });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
