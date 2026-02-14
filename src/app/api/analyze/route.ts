import { NextRequest } from 'next/server';
import type { AnalyzeRequest, AnalyzeResponse, SWIAnalysis, DepthLevel } from '@/types/book';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/wordCache';

// --- MOCK: SWI teammate replaces this function ---
// Their real implementation will import from @/lib/swi.ts
// and call the Anthropic SDK. The function signature stays the same.
async function analyzeWithClaude(word: string, depth: DepthLevel): Promise<SWIAnalysis> {
  const morphemes = [];
  const lower = word.toLowerCase();

  // Simple mock morpheme breakdown for demo purposes
  if (lower.startsWith('un')) {
    morphemes.push({ text: 'un', type: 'prefix' as const, meaning: 'not' });
    morphemes.push({ text: lower.slice(2), type: 'base' as const, meaning: `[${lower.slice(2)}]` });
  } else if (lower.endsWith('ness')) {
    morphemes.push({ text: lower.slice(0, -4), type: 'base' as const, meaning: `[${lower.slice(0, -4)}]` });
    morphemes.push({ text: 'ness', type: 'suffix' as const, meaning: 'state of being' });
  } else if (lower.endsWith('ing')) {
    morphemes.push({ text: lower.slice(0, -3), type: 'base' as const, meaning: `[${lower.slice(0, -3)}]` });
    morphemes.push({ text: 'ing', type: 'suffix' as const, meaning: 'ongoing action' });
  } else if (lower.endsWith('ed')) {
    morphemes.push({ text: lower.slice(0, -2), type: 'base' as const, meaning: `[${lower.slice(0, -2)}]` });
    morphemes.push({ text: 'ed', type: 'suffix' as const, meaning: 'past tense' });
  } else if (lower.endsWith('ly')) {
    morphemes.push({ text: lower.slice(0, -2), type: 'base' as const, meaning: `[${lower.slice(0, -2)}]` });
    morphemes.push({ text: 'ly', type: 'suffix' as const, meaning: 'in the manner of' });
  } else if (lower.endsWith('s') && lower.length > 2) {
    morphemes.push({ text: lower.slice(0, -1), type: 'base' as const, meaning: `[${lower.slice(0, -1)}]` });
    morphemes.push({ text: 's', type: 'suffix' as const, meaning: 'plural' });
  } else {
    morphemes.push({ text: lower, type: 'base' as const, meaning: `[${lower}]` });
  }

  const wordSum = morphemes.map(m => m.text).join(' + ');

  return {
    word,
    depth,
    wordSum,
    morphemes,
    etymology: depth === 'deep' || depth === 'full'
      ? `Mock: "${word}" — origin placeholder`
      : undefined,
    wordFamily: depth === 'deep' || depth === 'full'
      ? [`${lower}s`, `${lower}ed`, `${lower}ing`]
      : undefined,
    phonologyNote: depth === 'full'
      ? `Mock phonology note for "${word}"`
      : undefined,
  };
}
// --- END MOCK ---

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { word, depth } = body;
  if (!word || !depth) {
    return Response.json({ error: 'Missing word or depth' }, { status: 400 });
  }

  const cached = getCachedAnalysis(word, depth);
  if (cached) {
    return Response.json({ analysis: cached } satisfies AnalyzeResponse);
  }

  try {
    const analysis = await analyzeWithClaude(word, depth);
    setCachedAnalysis(word, depth, analysis);
    return Response.json({ analysis } satisfies AnalyzeResponse);
  } catch (err) {
    console.error('Analysis failed:', err);
    return Response.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
