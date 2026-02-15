import { NextRequest } from 'next/server';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Use virtual environment Python with all required dependencies
const python = path.join(process.cwd(), 'venv', 'bin', 'python3');

interface TTSRequest {
  word: string;
}

interface TTSResponse {
  audio?: string; // base64 encoded audio
  error?: string;
}

async function generateTTS(word: string): Promise<string> {
  const scriptPath = path.join(process.cwd(), 'generate_tts.py');
  const args = [scriptPath, word];

  try {
    const { stdout, stderr } = await execFileAsync(python, args, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for audio data
      env: { ...process.env },
      timeout: 120000, // 2 minutes timeout for audio generation
    });

    // Log any stderr output for debugging
    if (stderr) {
      console.error('Python stderr:', stderr);
    }

    // The Python script returns base64 encoded audio
    return stdout.trim();
  } catch (error: any) {
    // Provide more detailed error information
    const errorMsg = error.stderr || error.message || 'Unknown error';
    console.error('Python script error:', errorMsg);
    throw new Error(errorMsg);
  }
}

export async function POST(req: NextRequest) {
  let body: TTSRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' } satisfies TTSResponse, { status: 400 });
  }

  const { word } = body;
  if (!word) {
    return Response.json({ error: 'Missing word parameter' } satisfies TTSResponse, { status: 400 });
  }

  try {
    const audioBase64 = await generateTTS(word);
    return Response.json({ audio: audioBase64 } satisfies TTSResponse);
  } catch (err) {
    console.error('TTS generation failed:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({
      error: `TTS generation failed: ${errorMsg}`
    } satisfies TTSResponse, { status: 500 });
  }
}
