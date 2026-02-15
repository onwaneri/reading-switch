import { NextResponse } from 'next/server';
import { getRecommendedBooks } from '@/lib/bookManager';

export async function GET() {
  try {
    const books = await getRecommendedBooks();
    return NextResponse.json({ books });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch recommended books';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
