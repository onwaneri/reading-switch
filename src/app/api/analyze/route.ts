import { NextRequest } from 'next/server';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { AnalyzeRequest, AnalyzeResponse, SWIAnalysis, WordMatrix } from '@/types/book';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/wordCache';

const execFileAsync = promisify(execFile);

async function analyzeWord(word: string): Promise<WordMatrix> {
  const scriptPath = path.join(process.cwd(), 'main.py');
  const { stdout } = await execFileAsync('python3', [scriptPath, word], {
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env },
    timeout: 30000,
  });
  return JSON.parse(stdout);
}

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

  // Matrix is the same regardless of depth, so cache by word only
  const cached = getCachedAnalysis(word, depth);
  if (cached) {
    return Response.json({ analysis: cached } satisfies AnalyzeResponse);
  }

  try {
    const matrix = await analyzeWord(word);
    const analysis: SWIAnalysis = { word, depth, matrix };
    setCachedAnalysis(word, depth, analysis);
    return Response.json({ analysis } satisfies AnalyzeResponse);
  } catch (err) {
    console.error('Analysis failed:', err);
    return Response.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
