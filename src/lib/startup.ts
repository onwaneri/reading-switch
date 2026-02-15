import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const python = process.platform === 'win32' ? 'python' : 'python3';

function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
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

let hasRun = false;

export async function initializeRecommendedBooks() {
  // Only run once
  if (hasRun) return;
  hasRun = true;

  try {
    const recDir = path.join(process.cwd(), 'data', 'recommended');
    const indexPath = path.join(recDir, 'index.json');

    // Ensure directory exists
    await fs.mkdir(recDir, { recursive: true });

    // Load or create index
    let index: Array<{ bookId: string; title: string; originalPath: string; processedDate: string }> = [];
    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Get all PDF files
    const files = await fs.readdir(recDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) return;

    // Track which files are already processed
    const processedFiles = new Set(index.map(i => i.originalPath));

    for (const pdfFile of pdfFiles) {
      if (processedFiles.has(pdfFile)) {
        continue; // Already processed
      }

      console.log(`[Startup] Auto-processing: ${pdfFile}`);

      try {
        const bookId = randomUUID();
        const title = pdfFile.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' ');
        const pdfPath = path.join(recDir, pdfFile);

        // Create book directory
        const bookDir = path.join(process.cwd(), 'public', 'books', bookId);
        await fs.mkdir(bookDir, { recursive: true });

        // Copy PDF to book directory
        const destPdfPath = path.join(bookDir, 'book.pdf');
        await fs.copyFile(pdfPath, destPdfPath);

        // Extract words using Python script
        const scriptPath = path.join(process.cwd(), 'scripts', 'extract_words.py');
        const output = await runPythonScript(scriptPath, [destPdfPath]);
        const pagesData = JSON.parse(output);

        // Save book.json with PDF URL for on-demand rendering
        const bookData = {
          id: bookId,
          title,
          pdfUrl: `/api/books/${bookId}/book.pdf`,
          pages: pagesData,
        };
        await fs.writeFile(
          path.join(bookDir, 'book.json'),
          JSON.stringify(bookData, null, 2)
        );

        // Update index
        index.push({
          bookId,
          title,
          originalPath: pdfFile,
          processedDate: new Date().toISOString(),
        });

        await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

        console.log(`[Startup] ✓ Processed: ${pdfFile}`);
      } catch (error) {
        console.error(`[Startup] Failed to process ${pdfFile}:`, error);
      }
    }
  } catch (error) {
    console.error('[Startup] Error in initializeRecommendedBooks:', error);
  }
}
