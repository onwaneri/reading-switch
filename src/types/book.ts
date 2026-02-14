export interface WordPosition {
  text: string;
  x: number;      // percentage from left (0-100)
  y: number;      // percentage from top (0-100)
  width: number;  // percentage width
  height: number; // percentage height
}

export interface BookPage {
  pageNumber: number;
  imageUrl: string;
  words: WordPosition[];
}

export interface Book {
  id: string;
  title: string;
  pages: BookPage[];
}

// SWI Analysis Types

export type DepthLevel = 'simple' | 'standard' | 'deep' | 'full';

export interface Morpheme {
  text: string;
  type: 'prefix' | 'base' | 'suffix';
  meaning?: string;
}

export interface SWIAnalysis {
  word: string;
  depth: DepthLevel;
  wordSum: string;
  morphemes: Morpheme[];
  etymology?: string;
  wordFamily?: string[];
  phonologyNote?: string;
  wordMatrix?: string;
}

// API Contracts

export interface AnalyzeRequest {
  word: string;
  depth: DepthLevel;
}

export interface AnalyzeResponse {
  analysis: SWIAnalysis;
}
