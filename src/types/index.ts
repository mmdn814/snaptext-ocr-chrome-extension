export interface OcrResult {
  id: string;
  text: string;
  charCount: number;
  lineCount: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  timestamp: number;
  sourceType: "screen" | "image" | "video" | "preset" | "clipboard";
  title?: string;
  tags?: string[];
  isFavorite?: boolean;
  mode?: string;
  tokensUsed?: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PresetSample {
  id: string;
  title: string;
  description: string;
  category: "print" | "handwritten" | "highlight" | "video";
  imageUrl: string;
  sampleExpectedText?: string;
}
