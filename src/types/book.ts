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

export type DepthLevel = 'simple' | 'standard' | 'deep';

export interface Morpheme {
  text: string;
  type: 'prefix' | 'base' | 'suffix';
  meaning?: string;
}

export interface MatrixMorpheme {
  text: string;
  meaning: string;
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
  relatives: string[];
  matrix: WordMatrix;
  icon?: string;
  visualConcept?: string;
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
