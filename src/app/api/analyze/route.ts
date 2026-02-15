import { NextRequest } from 'next/server';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { AnalyzeRequest, AnalyzeResponse, SWIAnalysis } from '@/types/book';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/wordCache';

const execFileAsync = promisify(execFile);
const python = process.platform === 'win32' ? 'python' : 'python3';

interface PythonOutput {
  definition: string;
  wordSum: string;
  relatives: string[];
  matrix: { bases: { text: string; meaning: string }[]; prefixes: { text: string; meaning: string }[]; suffixes: { text: string; meaning: string }[] };
  icon?: string;
  visualConcept?: string;
}

async function analyzeWord(word: string, context?: { bookTitle?: string; pageText?: string }): Promise<PythonOutput> {
  const scriptPath = path.join(process.cwd(), 'main.py');
  const args = [scriptPath, word];
  if (context?.bookTitle || context?.pageText) {
    args.push(JSON.stringify(context));
  }
  const { stdout } = await execFileAsync(python, args, {
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env },
    timeout: 60000,
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

  const { word, depth, bookTitle, pageText } = body;
  if (!word || !depth) {
    return Response.json({ error: 'Missing word or depth' }, { status: 400 });
  }

  // Matrix is the same regardless of depth, so cache by word only
  const cached = getCachedAnalysis(word, depth);
  if (cached) {
    return Response.json({ analysis: cached } satisfies AnalyzeResponse);
  }

  try {
    const result = await analyzeWord(word, { bookTitle, pageText });
    const analysis: SWIAnalysis = {
      word,
      depth,
      definition: result.definition,
      wordSum: result.wordSum,
      relatives: result.relatives,
      matrix: result.matrix,
      icon: result.icon,
      visualConcept: result.visualConcept,
    };
    setCachedAnalysis(word, depth, analysis);
    return Response.json({ analysis } satisfies AnalyzeResponse);
  } catch (err) {
    console.error('Analysis failed:', err);
    return Response.json({ error: 'Analysis failed' }, { status: 500 });
  }
}