import type { SWIAnalysis, DepthLevel } from '@/types/book';

const cache = new Map<string, SWIAnalysis>();

function makeKey(word: string, depth: DepthLevel): string {
  return `${word.toLowerCase()}:${depth}`;
}

export function getCachedAnalysis(word: string, depth: DepthLevel): SWIAnalysis | undefined {
  return cache.get(makeKey(word, depth));
}

export function setCachedAnalysis(word: string, depth: DepthLevel, analysis: SWIAnalysis): void {
  cache.set(makeKey(word, depth), analysis);
}

export function clearCache(): void {
  cache.clear();
}
