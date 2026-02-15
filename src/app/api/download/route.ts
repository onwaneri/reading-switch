import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { validateSession } from '@/lib/sessionManager';
import { addToLibrary } from '@/lib/userManager';

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { identifier } = await request.json();

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: 'Identifier is required' }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'download_archive.py');

    const result = await new Promise<string>((resolve, reject) => {
      const process = spawn('python', [scriptPath, identifier], {
        cwd: process.cwd(),
      });
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Download failed: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });

    const parsedResult = JSON.parse(result);

    if (parsedResult.bookId) {
      await addToLibrary(user.id, parsedResult.bookId);
    }

    return NextResponse.json({ bookId: parsedResult.bookId, title: parsedResult.title });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
