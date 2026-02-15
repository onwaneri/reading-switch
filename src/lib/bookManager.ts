import fs from 'fs/promises';
import path from 'path';
import { Book } from '@/types/book';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

// Processing lock to prevent multiple simultaneous runs
let isProcessing = false;
let lastProcessTime = 0;
const PROCESS_COOLDOWN = 60000; // Only process once every 60 seconds

export async function getBookMetadata(bookId: string): Promise<Book | null> {
  try {
    const bookPath = path.join(process.cwd(), 'public', 'books', bookId, 'book.json');
    const data = await fs.readFile(bookPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function getUserLibrary(bookIds: string[]): Promise<Book[]> {
  const books: Book[] = [];

  for (const bookId of bookIds) {
    const book = await getBookMetadata(bookId);
    if (book) {
      books.push(book);
    }
  }

  return books;
}

interface RecommendedBook {
  bookId: string;
  title: string;
  originalPath: string;
  processedDate: string;
}

export async function getRecommendedBooks(): Promise<Book[]> {
  try {
    const indexPath = path.join(process.cwd(), 'data', 'recommended', 'index.json');
    const data = await fs.readFile(indexPath, 'utf-8');
    const recommended: RecommendedBook[] = JSON.parse(data);

    const books: Book[] = [];
    for (const rec of recommended) {
      const book = await getBookMetadata(rec.bookId);
      if (book) {
        books.push(book);
      }
    }

    return books;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
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

export async function processRecommendedPdfs(): Promise<void> {
  // Skip if already processing or recently processed
  const now = Date.now();
  if (isProcessing || (now - lastProcessTime) < PROCESS_COOLDOWN) {
    return;
  }

  isProcessing = true;
  lastProcessTime = now;

  try {
    const recDir = path.join(process.cwd(), 'data', 'recommended');
    const indexPath = path.join(recDir, 'index.json');

    // Ensure directory exists
    await fs.mkdir(recDir, { recursive: true });

    // Load or create index
    let index: RecommendedBook[] = [];
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

    // Track which files are already processed
    const processedFiles = new Set(index.map(i => i.originalPath));

    // Process new PDFs
    for (const pdfFile of pdfFiles) {
      if (processedFiles.has(pdfFile)) {
        continue; // Already processed
      }

      console.log(`Auto-processing recommended PDF: ${pdfFile}`);

      try {
        const bookId = randomUUID();
        const title = pdfFile.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' ');
        const pdfPath = path.join(recDir, pdfFile);

        // Extract words using Python script
        const scriptPath = path.join(process.cwd(), 'scripts', 'extract_words.py');
        const output = await runPythonScript(scriptPath, [pdfPath]);
        const pagesData = JSON.parse(output);

        // Create book directory
        const bookDir = path.join(process.cwd(), 'public', 'books', bookId);
        await fs.mkdir(bookDir, { recursive: true });

        // Generate page images using Python script
        const imageScriptPath = path.join(process.cwd(), 'scripts', 'pdf_to_images.py');
        try {
          await runPythonScript(imageScriptPath, [pdfPath, bookDir]);
          console.log(`Generated page images for: ${pdfFile}`);
        } catch (error) {
          console.error(`Failed to generate images for ${pdfFile}:`, error);
          // Continue anyway - book will work without images but won't display thumbnail
        }

        // Save book.json
        const bookData = {
          id: bookId,
          title,
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

        console.log(`Successfully processed: ${pdfFile} as ${bookId}`);
      } catch (error) {
        console.error(`Failed to process ${pdfFile}:`, error);
        // Continue with next file
      }
    }
  } catch (error) {
    console.error('Error in processRecommendedPdfs:', error);
    // Don't throw - just log and continue
  } finally {
    isProcessing = false;
  }
}
