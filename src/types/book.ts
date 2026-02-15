export interface WordPosition {
  text: string;
  x: number;      // percentage from left (0-100)
  y: number;      // percentage from top (0-100)
  width: number;  // percentage width
  height: number; // percentage height
}

export interface BookPage {
  pageNumber: number;
  imageUrl?: string;  // Optional - for legacy books with pre-rendered images
  words: WordPosition[];
}

export interface Book {
  id: string;
  title: string;
  pdfUrl?: string;    // URL to the PDF file for on-demand rendering
  pages: BookPage[];
}

// SWI Analysis Types

export type DepthLevel = 'simple' | 'standard' | 'deep';

export interface Morpheme {
  text: string;
  type: 'prefix' | 'base' | 'suffix';
  meaning?: string;
}

export interface MatrixMorpheme {
  text: string;
  meaning: string;
  iconUrl?: string;
}

export interface WordMatrix {
  bases: MatrixMorpheme[];
  prefixes: MatrixMorpheme[];
  suffixes: MatrixMorpheme[];
}

export interface SWIAnalysis {
  word: string;
  depth: DepthLevel;
  definition: string;
  wordSum: string;
  etymology: string;
  relatives: string[];
  matrix: WordMatrix;
}

// API Contracts

export interface AnalyzeRequest {
  word: string;
  depth: DepthLevel;
  bookTitle?: string;
  pageText?: string;
}

export interface AnalyzeResponse {
  analysis: SWIAnalysis;
}
