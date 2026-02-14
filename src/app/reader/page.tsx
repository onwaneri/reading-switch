'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Book, WordPosition, SWIAnalysis, DepthLevel } from '@/types/book';
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

  // Load book data
  useEffect(() => {
    if (!bookId) return;
    fetch(`/books/${bookId}/book.json`)
      .then(r => r.json())
      .then(setBook)
      .catch(() => setBook(null));
  }, [bookId]);

  // Arrow key navigation
  useEffect(() => {
    if (!book) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPage(p => Math.min(p + 1, book!.pages.length - 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPage(p => Math.max(p - 1, 0));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [book]);

  // Fetch analysis for a word
  const fetchAnalysis = useCallback(async (word: WordPosition, depthLevel: DepthLevel) => {
    setSelectedWord(word);
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.text, depth: depthLevel }),
      });
      if (!res.ok) throw new Error('Analysis request failed');
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleWordClick = useCallback((word: WordPosition) => {
    fetchAnalysis(word, depth);
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

  const page = book.pages[currentPage];
  const isPanelOpen = selectedWord !== null;

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
        <button
          onClick={() => setCurrentPage(p => Math.max(p - 1, 0))}
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
          onClick={() => setCurrentPage(p => Math.min(p + 1, book.pages.length - 1))}
          disabled={currentPage === book.pages.length - 1}
          className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"
        >
          Next
        </button>
      </header>

      {/* Main content area — shifts left when panel is open */}
      <main
        className={[
          'flex-1 flex justify-center items-start p-6 transition-all duration-300',
          isPanelOpen ? 'pr-[27%]' : '',
        ].join(' ')}
      >
        <div className="w-full max-w-3xl">
          {page && (
            <BookPage
              page={page}
              selectedWord={selectedWord}
              onWordClick={handleWordClick}
            />
          )}
        </div>
      </main>

      {/* Right-side SWI Panel */}
      <SWIPanel
        selectedWord={selectedWord}
        analysis={analysis}
        isLoading={isAnalyzing}
        error={analysisError}
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
