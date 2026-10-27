import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared server-side Gemini client with aistudio-build telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Create & Edit Images using gemini-nano-banana-2.1
app.post('/api/images/generate-or-edit', async (req, res) => {
  try {
    const { prompt, references = [], config = {} } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'O prompt descritivo é obrigatório.' });
    }

    const parts: any[] = [];

    // If reference images are provided, include them for image editing / identity consistency
    if (Array.isArray(references) && references.length > 0) {
      for (const ref of references) {
        if (ref.base64) {
          parts.push({
            inlineData: {
              data: ref.base64,
              mimeType: ref.mimeType || 'image/png',
            },
          });
        }
      }
    }

    // Add user text prompt
    parts.push({
      text: prompt,
    });

    const aspectRatio = config.aspectRatio || '1:1';
    const imageSize = config.imageSize || '1K';

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: {
        parts,
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    let finalImageUrl = '';
    let explanationText = '';

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          finalImageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          explanationText += part.text;
        }
      }
    }

    if (!finalImageUrl) {
      return res.status(500).json({
        error: 'O modelo não retornou dados de imagem. Verifique se o prompt respeita as diretrizes de segurança.',
        details: explanationText || undefined,
      });
    }

    return res.json({
      id: crypto.randomUUID(),
      url: finalImageUrl,
      prompt,
      aspectRatio,
      imageSize,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Error in /api/images/generate-or-edit:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Erro ao processar imagem no servidor Gemini.',
      status: err.status,
    });
  }
});

// Endpoint: Maps Grounding using gemini-3.8-flash (with googleMaps tool)
app.post('/api/maps/grounding', async (req, res) => {
  try {
    const { query, userLocation } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'A busca de local ou cenário é obrigatória.' });
    }

    const toolConfig = userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number'
      ? {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
          },
        }
      : undefined;

    const promptText = `Você é um guia de locações e cenários visuais. O usuário busca informações sobre o local ou cenário: "${query}".
Forneça detalhes precisos sobre o ambiente, pontos de referência visuais, iluminação, arquitetura ou atmosfera natural que seriam perfeitos para compor uma cena ou fotografia.
Cite locais reais relevantes identificados pelo Google Maps.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        tools: [{ googleMaps: {} }],
        ...(toolConfig ? { toolConfig } : {}),
      },
    });

    const text = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Extract all structured map places & links as mandated by Maps Grounding guidelines
    const places: Array<{ title: string; uri: string; address?: string; snippet?: string }> = [];

    for (const chunk of groundingChunks) {
      if ((chunk as any).maps) {
        const mapsData = (chunk as any).maps;
        places.push({
          title: mapsData.title || 'Local no Google Maps',
          uri: mapsData.uri || '',
          address: mapsData.address || '',
          snippet: mapsData.placeAnswerSources?.reviewSnippets?.[0] || '',
        });
      }
    }

    return res.json({
      text,
      groundingChunks,
      places,
    });
  } catch (err: any) {
    console.error('Error in /api/maps/grounding:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Erro ao consultar Google Maps Grounding.',
      status: err.status,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PersonaGen full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
