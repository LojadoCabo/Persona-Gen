import { GeneratedImage, GenerationConfig, ReferenceImage, MapsGroundingResult } from "../types";

/**
 * Creates or edits images using gemini-nano-banana-2.1 via server API.
 * Supports:
 * - Text prompt only (create image from scratch)
 * - Text prompt + reference images (edit image / keep character identity consistent)
 */
export const generateOrEditImage = async (
  prompt: string,
  references: ReferenceImage[] = [],
  config: GenerationConfig
): Promise<GeneratedImage> => {
  const payload = {
    prompt,
    references: references.map(ref => ({
      base64: ref.base64,
      mimeType: ref.mimeType,
    })),
    config: {
      aspectRatio: config.aspectRatio,
      imageSize: config.imageSize,
    },
  };

  const response = await fetch('/api/images/generate-or-edit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Falha ao gerar/editar imagem com Gemini.');
  }

  return {
    id: data.id || crypto.randomUUID(),
    url: data.url,
    prompt: data.prompt,
    aspectRatio: data.aspectRatio,
    imageSize: data.imageSize,
    timestamp: data.timestamp || Date.now(),
  };
};

/**
 * Performs Google Maps Grounding via server API using gemini-3.8-flash.
 * Retrieves real-world locations, visual scenery descriptions, and verified Google Maps links.
 */
export const searchMapsGrounding = async (
  query: string,
  userLocation?: { latitude: number; longitude: number }
): Promise<MapsGroundingResult> => {
  const response = await fetch('/api/maps/grounding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, userLocation }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Falha ao buscar locais no Google Maps.');
  }

  return {
    text: data.text || '',
    groundingChunks: data.groundingChunks || [],
    places: data.places || [],
  };
};
