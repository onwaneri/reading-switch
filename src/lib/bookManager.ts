import fs from 'fs/promises';
import path from 'path';
import { Book } from '@/types/book';

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
