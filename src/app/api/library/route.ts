import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/sessionManager';
import { addToLibrary, removeFromLibrary, getUserLibrary as getUserLibraryIds } from '@/lib/userManager';
import { getUserLibrary } from '@/lib/bookManager';

export async function GET() {
  try {
    const user = await validateSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const books = await getUserLibrary(user.library);

    return NextResponse.json({ books });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch library';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { bookId } = await request.json();

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    await addToLibrary(user.id, bookId);

    const updatedLibraryIds = await getUserLibraryIds(user.id);
    const books = await getUserLibrary(updatedLibraryIds);

    return NextResponse.json({ success: true, books });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add book to library';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await validateSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { bookId } = await request.json();

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    await removeFromLibrary(user.id, bookId);

    const updatedLibraryIds = await getUserLibraryIds(user.id);
    const books = await getUserLibrary(updatedLibraryIds);

    return NextResponse.json({ success: true, books });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove book from library';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
