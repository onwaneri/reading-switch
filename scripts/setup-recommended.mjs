#!/usr/bin/env node
/**
 * One-time setup script for recommended PDFs
 *
 * Usage: node scripts/setup-recommended.mjs
 *
 * Place PDF files in data/recommended/ then run this script once to process them.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const python = process.platform === 'win32' ? 'python' : 'python3';

function runPythonScript(scriptPath, args) {
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

async function processRecommendedPdfs() {
  const recDir = path.join(projectRoot, 'data', 'recommended');
  const indexPath = path.join(recDir, 'index.json');

  // Ensure directory exists
  await fs.mkdir(recDir, { recursive: true });

  // Load or create index
  let index = [];
  try {
    const data = await fs.readFile(indexPath, 'utf-8');
    index = JSON.parse(data);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  // Get all PDF files
  const files = await fs.readdir(recDir);
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    console.log('No PDF files found in data/recommended/');
    console.log('Add some PDF files to data/recommended/ and run this script again.');
    return;
  }

  // Track which files are already processed
  const processedFiles = new Set(index.map(i => i.originalPath));

  console.log(`\nFound ${pdfFiles.length} PDF(s) in data/recommended/`);
  console.log(`${processedFiles.size} already processed\n`);

  for (const pdfFile of pdfFiles) {
    if (processedFiles.has(pdfFile)) {
      console.log(`✓ Already processed: ${pdfFile}`);
      continue;
    }

    console.log(`\nProcessing: ${pdfFile}`);

    try {
      const bookId = randomUUID();
      const title = pdfFile.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' ');
      const pdfPath = path.join(recDir, pdfFile);

      // Create book directory
      const bookDir = path.join(projectRoot, 'public', 'books', bookId);
      await fs.mkdir(bookDir, { recursive: true });

      // Copy PDF to book directory
      console.log('  Copying PDF...');
      const destPdfPath = path.join(bookDir, 'book.pdf');
      await fs.copyFile(pdfPath, destPdfPath);

      // Extract words using Python script
      console.log('  Extracting words...');
      const scriptPath = path.join(projectRoot, 'scripts', 'extract_words.py');
      const output = await runPythonScript(scriptPath, [destPdfPath]);
      const pagesData = JSON.parse(output);

      // Save book.json with PDF URL for on-demand rendering
      const bookData = {
        id: bookId,
        title,
        pdfUrl: `/books/${bookId}/book.pdf`,
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

      console.log(`  ✓ Successfully processed: ${pdfFile}`);
      console.log(`    Book ID: ${bookId}`);

    } catch (error) {
      console.error(`  ✗ Failed to process ${pdfFile}:`, error.message);
    }
  }

  console.log('\n✓ Done processing recommended PDFs!\n');
}

processRecommendedPdfs().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
