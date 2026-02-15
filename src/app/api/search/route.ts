import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'search_archive.py');

    const results = await new Promise<string>((resolve, reject) => {
      const proc = spawn('python', [scriptPath, query]);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Search failed: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });

    const parsedResults = JSON.parse(results);

    return NextResponse.json({ results: parsedResults });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
