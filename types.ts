export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  timestamp: number;
}

export type AspectRatioType = '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | '1:4' | '1:8' | '4:1' | '8:1';
export type ImageSizeType = '1K' | '2K' | '4K';

export interface GenerationConfig {
  aspectRatio: AspectRatioType;
  imageSize: ImageSizeType;
}

export interface ReferenceImage {
  file: File;
  previewUrl: string;
  base64: string; // Plain base64 string without data prefix
  mimeType: string;
}

export interface GroundedPlace {
  title: string;
  uri: string;
  address?: string;
  snippet?: string;
}

export interface MapsGroundingResult {
  text: string;
  groundingChunks: any[];
  places: GroundedPlace[];
}