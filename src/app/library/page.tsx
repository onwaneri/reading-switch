'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BookCarousel } from '@/components/BookCarousel';
import { Book } from '@/types/book';

export default function LibraryPage() {
  const { user, loading: authLoading, logout } = useAuth();
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

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const loadLibraries = useCallback(async () => {
    try {
      setLoading(true);

      const [libraryRes, recommendedRes] = await Promise.all([
        fetch('/api/library', { credentials: 'include' }),
        fetch('/api/recommended', { credentials: 'include' }),
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

  // Reload libraries when user returns to the page
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        loadLibraries();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, loadLibraries]);

  const handleBookClick = (bookId: string) => {
    router.push(`/reader?bookId=${bookId}`);
  };

  const handleAddClick = () => {
    router.push('/upload');
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
      <header className="bg-white py-4 border-b border-gray-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-800">SWItch</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition text-sm"
            >
              Logout
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
              <p className="font-semibold mb-3 text-gray-800">Add Public Domain Books</p>
              <p className="text-sm mb-4">
                Download free PDFs from <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline font-medium">Project Gutenberg</a> or other public domain sources.
              </p>
              <div className="text-left max-w-xl mx-auto space-y-2 text-sm bg-amber-50 p-4 rounded-lg">
                <p className="font-medium text-gray-800">To add recommended books:</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-2">
                  <li>Download PDF files to <code className="bg-white px-2 py-1 rounded border">data/recommended/</code></li>
                  <li>Refresh this page - books will auto-process! ✨</li>
                </ol>
                <p className="text-xs text-gray-500 mt-3 italic">
                  Books are automatically processed when you visit the library page
                </p>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
