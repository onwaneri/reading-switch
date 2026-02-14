'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Book, BookPage as BookPageType, WordPosition, SWIAnalysis, DepthLevel } from '@/types/book';
import { BookPage } from '@/components/BookPage';
import { SWIPanel } from '@/components/SWIPanel';
import { DepthSelector } from '@/components/DepthSelector';

function ReaderContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId');

  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedWord, setSelectedWord] = useState<WordPosition | null>(null);
  const [analysis, setAnalysis] = useState<SWIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [depth, setDepth] = useState<DepthLevel>('standard');
  const spreadRef = useRef<HTMLDivElement>(null);
  const [spreadScale, setSpreadScale] = useState(1);
  const isPanelOpen = selectedWord !== null;
  const showTwoPages = !isPanelOpen;
  const nextPage = book?.pages[currentPage + 1];

  // Load book data
  useEffect(() => {
    if (!bookId) return;
    fetch(`/books/${bookId}/book.json`)
      .then(r => r.json())
      .then(setBook)
      .catch(() => setBook(null));
  }, [bookId]);

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
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(true);
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
      if (!res.ok) throw new Error('Analysis request failed');
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [book?.title, pageText]);

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
    setSelectedWord(null);
    setAnalysis(null);
    setAnalysisError(null);
  };

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
        <a href="/" className="text-purple-600 underline">Upload a book</a>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 animate-pulse">Loading book...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-amber-50 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
        <button
          onClick={() => setCurrentPage(p => Math.max(p - step, 0))}
          disabled={currentPage === 0}
          className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"
        >
          Prev
        </button>

        <div className="flex flex-col items-center gap-1">
          <span className="text-sm text-gray-500 font-medium">
            {book.title} — Page {currentPage + 1} of {book.pages.length}
          </span>
          <DepthSelector depth={depth} onChange={setDepth} />
        </div>

        <button
          onClick={() => setCurrentPage(p => Math.min(p + step, book.pages.length - 1))}
          disabled={currentPage === book.pages.length - 1}
          className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"
        >
          Next
        </button>
      </header>

      {/* Main content area — explicit viewport height so pages fit without scroll */}
      <main
        className={[
          'flex-1 min-h-0 flex justify-center items-center p-4 overflow-hidden transition-all duration-300',
          isPanelOpen ? 'pr-[27%]' : '',
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
                selectedWord={selectedWord}
                onWordClick={handleWordClick}
                compact
              />
              <BookPage
                page={nextPage}
                selectedWord={null}
                onWordClick={handleWordClick}
                compact
              />
            </div>
          ) : page ? (
            <div className="w-full h-full flex items-center justify-center">
              <BookPage
                page={page}
                selectedWord={selectedWord}
                onWordClick={handleWordClick}
              />
            </div>
          ) : null}
        </div>
      </main>

      {/* Right-side SWI Panel */}
      <SWIPanel
        selectedWord={selectedWord}
        analysis={analysis}
        isLoading={isAnalyzing}
        error={analysisError}
        depth={depth}
        onClose={handleClosePanel}
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
