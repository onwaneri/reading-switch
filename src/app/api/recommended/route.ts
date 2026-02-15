import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/sessionManager';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(python, [scriptPath, ...args]);
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
        reject(new Error(`Script failed: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function ensureBooksExist() {
  try {
    // Read recommended.json
    const recJsonPath = path.join(process.cwd(), 'public', 'recommended.json');
    const recData = JSON.parse(await fs.readFile(recJsonPath, 'utf-8'));

    for (const bookInfo of recData) {
      const bookDir = path.join(process.cwd(), 'public', 'books', bookInfo.id);
      const bookJsonPath = path.join(bookDir, 'book.json');

      // Check if book.json already exists
      try {
        await fs.access(bookJsonPath);
        continue; // Already exists, skip
      } catch {
        // Doesn't exist, create it
      }

      console.log(`[Auto-setup] Processing ${bookInfo.title}...`);

      const pdfPath = path.join(process.cwd(), 'public', bookInfo.pdfUrl);

      try {
        // Extract words using Python script (same as upload!)
        console.log(`[Auto-setup]   Extracting word positions...`);
        const scriptPath = path.join(process.cwd(), 'scripts', 'extract_words.py');
        const output = await runPythonScript(scriptPath, [pdfPath]);
        const pagesData = JSON.parse(output);

        // Create directory
        await fs.mkdir(bookDir, { recursive: true });

        // Generate page images for thumbnails
        console.log(`[Auto-setup]   Generating page images...`);
        const imageScriptPath = path.join(process.cwd(), 'scripts', 'pdf_to_images.py');
        try {
          await runPythonScript(imageScriptPath, [pdfPath, bookDir]);
          console.log(`[Auto-setup]   ✓ Generated page images`);
        } catch (imgErr) {
          console.warn(`[Auto-setup]   ⚠ Could not generate images (thumbnail will use fallback):`, imgErr);
        }

        // Create book.json with word data
        const bookData = {
          id: bookInfo.id,
          title: bookInfo.title,
          pdfUrl: bookInfo.pdfUrl,
          pages: pagesData
        };

        // Save book.json
        await fs.writeFile(bookJsonPath, JSON.stringify(bookData, null, 2));

        console.log(`[Auto-setup] ✓ ${bookInfo.title} ready with ${pagesData.length} pages`);
      } catch (err) {
        console.error(`[Auto-setup] Failed to process ${bookInfo.title}:`, err);
      }
    }
  } catch (err) {
    console.error('[Auto-setup] Error:', err);
  }
}

export async function GET() {
  try {
    // Auto-create book.json files if they don't exist
    ensureBooksExist().catch(err => {
      console.error('[Auto-setup] Background error:', err);
    });

    // Read recommended books list
    const filePath = path.join(process.cwd(), 'public', 'recommended.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const allBooks = JSON.parse(data);

    // Get user session to filter out books already in their library
    const user = await validateSession();
    const userLibraryIds = user ? new Set(user.library) : new Set();

    // Filter out books that are already in user's library
    const books = allBooks.filter((book: any) => !userLibraryIds.has(book.id));

    // Return book metadata (pages will be loaded separately by the reader)
    return NextResponse.json({ books });
  } catch (error) {
    console.error('Failed to load recommended books:', error);
    return NextResponse.json({ books: [] });
  }
}
