'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BookCarousel } from '@/components/BookCarousel';
import { SearchBar } from '@/components/SearchBar';
import { Book } from '@/types/book';

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [myLibrary, setMyLibrary] = useState<Book[]>([]);
  const [recommended, setRecommended] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const loadLibraries = useCallback(async () => {
    try {
      setLoading(true);

      const [libraryRes, recommendedRes] = await Promise.all([
        fetch('/api/library'),
        fetch('/api/recommended'),
      ]);

      if (libraryRes.ok) {
        const libraryData = await libraryRes.json();
        setMyLibrary(libraryData.books || []);
      }

      if (recommendedRes.ok) {
        const recommendedData = await recommendedRes.json();
        setRecommended(recommendedData.books || []);
      }
    } catch (err) {
      setError('Failed to load libraries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadLibraries();
    }
  }, [user, loadLibraries]);

  const handleBookClick = (bookId: string) => {
    router.push(`/reader?bookId=${bookId}`);
  };

  const handleAddClick = () => {
    router.push('/upload');
  };

  const handleAddFromSearch = async (identifier: string, title: string) => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      if (!response.ok) {
        throw new Error('Failed to download book');
      }

      const data = await response.json();

      await loadLibraries();

      router.push(`/reader?bookId=${data.bookId}`);
    } catch (err) {
      throw err;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-purple-800 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-gray-200 py-4 border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">SWItch</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition text-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">My Library</h2>
          {loading ? (
            <div className="text-center text-gray-600">Loading...</div>
          ) : (
            <BookCarousel
              books={myLibrary}
              showAddButton
              onAddClick={handleAddClick}
              onBookClick={handleBookClick}
            />
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Recommended Library</h2>
          {loading ? (
            <div className="text-center text-gray-600">Loading...</div>
          ) : recommended.length > 0 ? (
            <BookCarousel
              books={recommended}
              onBookClick={handleBookClick}
            />
          ) : (
            <div className="text-center text-gray-600 py-8 bg-white rounded-lg">
              <p>No recommended books available yet.</p>
              <p className="text-sm mt-2">
                Add PDFs to the <code className="bg-gray-100 px-2 py-1 rounded">data/recommended/</code> folder
                and run the processing script.
              </p>
            </div>
          )}
        </section>

        <section>
          <SearchBar onAddBook={handleAddFromSearch} />
        </section>
      </main>
    </div>
  );
}
