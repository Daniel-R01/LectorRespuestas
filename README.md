# Lector Respuestas

App web que usa la cámara del celular para leer preguntas de opción múltiple (a,b,c,d) en tiempo real y mostrar la respuesta correcta usando IA (Claude).

## Cómo funciona

1. Apunta la cámara a la pantalla con la pregunta
2. OCR (Tesseract.js) detecta el texto automáticamente
3. Se envía a Claude 3 Haiku para obtener la respuesta
4. La respuesta se muestra como overlay en pantalla

## Stack

- **Frontend**: React + TypeScript + Vite
- **OCR**: Tesseract.js v5 (browser-side)
- **LLM**: Claude 3 Haiku (Anthropic)
- **Server**: Express proxy

## Setup local

```bash
npm install
cp .env.example .env   # Agrega tu ANTHROPIC_API_KEY en .env
```

En dos terminales:

```bash
# Terminal 1 - Proxy server
npm run dev:server

# Terminal 2 - Frontend dev
npm run dev
```

Abre `http://localhost:5173` en tu celular (misma red WiFi).

## Deploy en Render

1. Crea un Web Service en [Render](https://render.com)
2. Conecta este repositorio de GitHub
3. Configura:

| Campo | Valor |
|-------|-------|
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Environment | `ANTHROPIC_API_KEY` = tu API key |

4. Deploy

> El servidor Express sirve el frontend y el proxy `/api/ask` en un solo servicio.
