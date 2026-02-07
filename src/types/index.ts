// Centralized type definitions for better maintainability

export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

export interface GenerationRange {
  start: number;
  end: number;
}

export interface TCGCard {
  id: string;
  name: string;
  number: string;
  rarity: string;
  set: {
    name: string;
    series: string;
  };
  images?: {
    small: string;
    large: string;
  };
  isReverse?: boolean;
}

export type PDFType = "sprites" | "complete" | "master" | "graded";

export type SpriteStyle = "hd" | "pixel";

export type Language = "en" | "fr" | "de" | "es" | "it" | "pt" | "ja";

export interface CacheConfig {
  duration: number;
  keys: {
    [key: string]: string;
  };
}

export interface ProgressCallback {
  (progress: number): void;
}

export interface ErrorWithMessage {
  message: string;
  code?: string;
  retry?: boolean;
}
