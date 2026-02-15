#!/usr/bin/env node
/**
 * Simple setup for recommended books
 * Place your 6 PDFs in public/recommended/ named book1.pdf, book2.pdf, etc.
 * Run this script once: node scripts/setup-simple.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function setupRecommendedBooks() {
  const recommendedDir = path.join(projectRoot, 'public', 'recommended');

  // Ensure directory exists
  await fs.mkdir(recommendedDir, { recursive: true });

  // Read recommended.json to get book info
  const recJsonPath = path.join(projectRoot, 'public', 'recommended.json');
  const recData = JSON.parse(await fs.readFile(recJsonPath, 'utf-8'));

  for (const bookInfo of recData) {
    const pdfPath = path.join(projectRoot, 'public', bookInfo.pdfUrl);

    console.log(`\nProcessing: ${bookInfo.title}`);
    console.log(`  PDF: ${pdfPath}`);

    try {
      // Check if PDF exists
      await fs.access(pdfPath);

      // Read PDF to count pages
      const pdfData = await fs.readFile(pdfPath);
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      console.log(`  Pages: ${numPages}`);

      // Create pages array with empty word data
      const pages = [];
      for (let i = 1; i <= numPages; i++) {
        pages.push({
          pageNumber: i,
          words: [] // No word extraction - will display PDF without clickable words
        });
      }

      // Create book.json
      const bookData = {
        id: bookInfo.id,
        title: bookInfo.title,
        pdfUrl: bookInfo.pdfUrl,
        pages
      };

      // Create book directory
      const bookDir = path.join(projectRoot, 'public', 'books', bookInfo.id);
      await fs.mkdir(bookDir, { recursive: true });

      // Save book.json
      const bookJsonPath = path.join(bookDir, 'book.json');
      await fs.writeFile(bookJsonPath, JSON.stringify(bookData, null, 2));

      console.log(`  ✓ Created: /books/${bookInfo.id}/book.json`);

    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
      console.error(`  Make sure the PDF exists at: ${pdfPath}`);
    }
  }

  console.log('\n✓ Done! Your books are ready.');
  console.log('\nNote: Books will display PDFs but won\'t have clickable words.');
  console.log('To add word extraction, upload PDFs via the upload page.');
}

setupRecommendedBooks().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
