'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Book, BookPage as BookPageType, WordPosition, SWIAnalysis, DepthLevel } from '@/types/book';
import { BookPage } from '@/components/BookPage';
import { SWIPanel } from '@/components/SWIPanel';
import { PageSearch } from '@/components/PageSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useSocraticChat } from '@/hooks/useSocraticChat';

function ReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookId = searchParams.get('bookId');
  const { user } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedWord, setSelectedWord] = useState<WordPosition | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [analysis, setAnalysis] = useState<SWIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const depth: DepthLevel = 'deep';
  const spreadRef = useRef<HTMLDivElement>(null);
  const [spreadScale, setSpreadScale] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);
  const [checkingLibrary, setCheckingLibrary] = useState(true);
  const { reset: resetChat } = useSocraticChat();
  const isPanelOpen = showSidebar;
  const showTwoPages = !isPanelOpen;
  const nextPage = book?.pages[currentPage + 1];

  // Load book data
  useEffect(() => {
    if (!bookId) return;

    console.log(`[Reader] Loading book: ${bookId}`);
    setBookLoading(true);
    setBookError(null);

    fetch(`/api/books/${bookId}/book.json`)
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(bookData => {
        console.log('[Reader] Book loaded:', bookData);
        setBook(bookData);
        setBookLoading(false);
      })
      .catch(err => {
        console.error('[Reader] Failed to load book:', err);
        setBookError(err instanceof Error ? err.message : 'Failed to load book');
        setBook(null);
        setBookLoading(false);
      });


    /*    fetch(`/api/books/${bookId}/book.json`)
      .then(r => r.json())
      .then((data: Book) => {
        // Normalize image URLs: rewrite old /books/ paths to /api/books/
        data.pages = data.pages.map(p => ({
          ...p,
          imageUrl: p.imageUrl.startsWith('/books/')
            ? p.imageUrl.replace('/books/', '/api/books/')
            : p.imageUrl,
        }));
        setBook(data);
      })
      .catch(() => setBook(null)); */
  }, [bookId]);

  // Check if book is in user's library
  useEffect(() => {
    if (!bookId || !user) {
      setCheckingLibrary(false);
      return;
    }

    setCheckingLibrary(true);
    fetch('/api/library', {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        const isInLib = data.books?.some((b: Book) => b.id === bookId) || false;
        setInLibrary(isInLib);
      })
      .catch(() => setInLibrary(false))
      .finally(() => setCheckingLibrary(false));
  }, [bookId, user]);

  const handleToggleLibrary = async () => {
    console.log('[Add to Library] Button clicked!');
    console.log('[Add to Library] bookId:', bookId);
    console.log('[Add to Library] user:', user);

    if (!bookId || !user) {
      console.error('[Add to Library] Missing bookId or user!');
      alert('Error: Not logged in or no book ID');
      return;
    }

    try {
      if (inLibrary) {
        console.log('[Add to Library] Removing from library...');
        const response = await fetch('/api/library', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId }),
          credentials: 'include',
        });
        console.log('[Add to Library] Remove response:', response.status);
        setInLibrary(false);
      } else {
        console.log('[Add to Library] Adding to library...');
        const response = await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId }),
          credentials: 'include',
        });
        console.log('[Add to Library] Add response:', response.status);

        if (!response.ok) {
          const error = await response.json();
          console.error('[Add to Library] API error:', error);
          alert('Failed to add to library: ' + (error.error || 'Unknown error'));
          return;
        }

        setInLibrary(true);
        console.log('[Add to Library] Navigating to library...');
        // Navigate back to library after adding with a full reload
        setTimeout(() => {
          window.location.href = '/library';
        }, 500);
      }
    } catch (error) {
      console.error('[Add to Library] Failed to toggle library:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Arrow key navigation — step by 2 when panel closed (2-page spread), 1 when open
  const step = selectedWord !== null ? 1 : 2;
  useEffect(() => {
    if (!book) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPage(p => Math.min(p + step, book!.pages.length - 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPage(p => Math.max(p - step, 0));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [book, step]);

  // Reconstruct approximate page text from word positions (reading order)
  const page = book?.pages[currentPage];
  const pageText = page
    ? page.words
        .slice()
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map(w => w.text)
        .join(' ')
    : '';

  // Fetch analysis for a word
  const fetchAnalysis = useCallback(async (word: WordPosition, depthLevel: DepthLevel, pageTextOverride?: string) => {
    setSelectedWord(word);
    setShowSidebar(true);
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(true);
    resetChat();
    const textToUse = pageTextOverride ?? pageText;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: word.text,
          depth: depthLevel,
          bookTitle: book?.title,
          pageText: textToUse,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Analysis failed (${res.status})`);
      }
      const data = await res.json();
      console.log('[Reader] Analysis received:', data.analysis);
      setAnalysis(data.analysis);
    } catch (err) {
      console.error('[Reader] Analysis error:', err);
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [book?.title, pageText, resetChat]);

  const handleWordClick = useCallback((word: WordPosition, page: BookPageType) => {
    const pageIndex = page.pageNumber - 1;
    setCurrentPage(pageIndex);
    const pageTextForWord = page.words
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map(w => w.text)
      .join(' ');
    fetchAnalysis(word, depth, pageTextForWord);
  }, [fetchAnalysis, depth]);

  // Re-analyze at new depth when depth changes with a word selected
  useEffect(() => {
    if (selectedWord) {
      fetchAnalysis(selectedWord, depth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth]);

  const handleClosePanel = () => {
    setShowSidebar(false);
    setAnalysis(null);
    setAnalysisError(null);
    resetChat();
  };

  // Clear selected word when page changes
  useEffect(() => {
    setSelectedWord(null);
    setShowSidebar(false);
    setAnalysis(null);
    setAnalysisError(null);
  }, [currentPage]);

  // Scale the 2-page spread as a unit to fit viewport (keeps pages touching)
  useEffect(() => {
    if (!showTwoPages || !nextPage || !spreadRef.current) return;
    const el = spreadRef.current;
    const parent = el.parentElement;
    if (!parent) return;
    const measure = () => {
      const maxW = parent.clientWidth;
      const maxH = parent.clientHeight;
      const { scrollWidth, scrollHeight } = el;
      if (maxW > 0 && maxH > 0 && scrollWidth > 0 && scrollHeight > 0) {
        const scale = Math.min(1, maxW / scrollWidth, maxH / scrollHeight);
        setSpreadScale(scale);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showTwoPages, nextPage, page]);

  if (!bookId) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-2">No book specified.</p>
        <a href="/library" className="text-purple-600 underline">Go to Library</a>
      </div>
    );
  }

  if (bookError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-amber-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-4">Failed to Load Book</h2>
          <p className="text-gray-700 mb-2">Book ID: <code className="bg-gray-100 px-2 py-1 rounded">{bookId}</code></p>
          <p className="text-sm text-gray-600 mb-4">{bookError}</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Retry
            </button>
            <a
              href="/library"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Back to Library
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (bookLoading || !book) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-amber-50">
        <div className="text-center">
          <p className="text-gray-500 animate-pulse mb-2">Loading book...</p>
          <p className="text-xs text-gray-400">Book ID: {bookId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#FFF9EE' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 flex flex-row justify-between items-center py-[10px] px-6 isolate"
        style={{
          height: '50px',
          background: '#FFF9EE',
          boxShadow: '0px 4px 5.3px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Switch text - far left */}
        <div className="flex items-center px-[5px] py-0" style={{ zIndex: 1 }}>
          <button
            onClick={() => window.location.href = '/library'}
            className="font-bold text-center cursor-pointer hover:opacity-80 transition"
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '32px',
              lineHeight: '47px',
              color: '#061B2E'
            }}
          >
            Switch
          </button>
        </div>

        {/* Book title - center */}
        <div className="flex items-center justify-center">
          <span className="text-red-500 font-bold text-lg">
            {book.title}
          </span>
        </div>

        {/* Navigation + User buttons - far right */}
        <div className="flex items-center gap-3" style={{ zIndex: 0 }}>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-center"
            style={{ width: '40px', height: '40px' }}
            title="Search pages"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-6 h-6" style={{ color: '#061B2E' }}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          <button
            onClick={() => window.location.href = '/library'}
            className="flex items-center justify-center"
            style={{ width: '40px', height: '40px' }}
            title="Library"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-6 h-6" style={{ color: '#061B2E' }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content area — explicit viewport height so pages fit without scroll */}
      <main
        className={[
          'flex-1 min-h-0 flex justify-center items-center p-4 overflow-hidden transition-all duration-500 ease-in-out',
          isPanelOpen ? 'pr-[27%] -ml-[120px]' : '',
        ].join(' ')}
      >
        <div
          className={[
            'h-full w-full flex justify-center items-center overflow-hidden',
            showTwoPages ? 'max-w-6xl' : 'max-w-3xl',
          ].join(' ')}
        >
          {page && showTwoPages && nextPage ? (
            <div
              ref={spreadRef}
              className="flex flex-row shrink-0 origin-center"
              style={{ transform: `scale(${spreadScale})` }}
            >
              <BookPage
                page={page}
                pdfUrl={book.pdfUrl}
                selectedWord={selectedWord}
                onWordClick={handleWordClick}
                compact
              />
              <BookPage
                page={nextPage}
                pdfUrl={book.pdfUrl}
                selectedWord={null}
                onWordClick={handleWordClick}
                compact
              />
            </div>
          ) : page ? (
            <div className="w-full h-full flex items-center justify-center">
              <BookPage
                page={page}
                pdfUrl={book.pdfUrl}
                selectedWord={selectedWord}
                onWordClick={handleWordClick}
              />
            </div>
          ) : null}
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer className="flex-shrink-0 flex justify-center items-center py-4" style={{ background: '#FFF9EE' }}>
        <div className="flex items-center gap-2 bg-red-500/75 rounded-lg p-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - step, 0))}
            disabled={currentPage === 0}
            className="px-3 py-2 rounded text-white hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold text-xl"
            title="Previous page"
          >
            ←
          </button>
          <input
            type="number"
            min="1"
            max={book.pages.length}
            value={currentPage + 1}
            onChange={(e) => {
              const page = parseInt(e.target.value) - 1;
              if (page >= 0 && page < book.pages.length) {
                setCurrentPage(page);
              }
            }}
            className="w-16 px-2 py-1 text-center border-2 border-white rounded focus:outline-none focus:ring-2 focus:ring-red-700 bg-white text-red-500 font-semibold"
            title="Enter page number"
          />
          <button
            onClick={() => setCurrentPage(p => Math.min(p + step, book.pages.length - 1))}
            disabled={currentPage >= book.pages.length - step}
            className="px-3 py-2 rounded text-white hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold text-xl"
            title="Next page"
          >
            →
          </button>
        </div>
      </footer>

      {/* Right-side SWI Panel */}
      {showSidebar && selectedWord && (
        <SWIPanel
          selectedWord={selectedWord}
          analysis={analysis}
          isLoading={isAnalyzing}
          error={analysisError}
          depth={depth}
          onClose={handleClosePanel}
        />
      )}

      {/* Page Search Modal */}
      <PageSearch
        pages={book.pages}
        onPageSelect={setCurrentPage}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 animate-pulse">Loading...</p>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
