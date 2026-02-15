'use client';

import { useState, useEffect } from 'react';
import type { BookPage } from '@/types/book';

interface SearchResult {
  pageNumber: number;
  context: string;
}

interface PageSearchProps {
  pages: BookPage[];
  onPageSelect: (pageNumber: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function PageSearch({ pages, onPageSelect, isOpen, onClose }: PageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    pages.forEach((page) => {
      const pageWords = page.words
        .slice()
        .sort((a, b) => a.y - b.y || a.x - b.x);
      const pageText = pageWords.map(w => w.text).join(' ');

      if (pageText.toLowerCase().includes(lowerQuery)) {
        const index = pageText.toLowerCase().indexOf(lowerQuery);
        const start = Math.max(0, index - 40);
        const end = Math.min(pageText.length, index + query.length + 40);
        const context = (start > 0 ? '...' : '') +
                        pageText.substring(start, end) +
                        (end < pageText.length ? '...' : '');

        searchResults.push({
          pageNumber: page.pageNumber,
          context,
        });
      }
    });

    setResults(searchResults);
  }, [query, pages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-purple-800">Search Pages</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 border-b">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for text in this book..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!query.trim() && (
            <div className="text-center text-gray-500 py-8">
              Enter text to search through all pages
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No matches found
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((result) => (
                <button
                  key={result.pageNumber}
                  onClick={() => {
                    onPageSelect(result.pageNumber - 1);
                    onClose();
                  }}
                  className="w-full text-left p-4 bg-gray-50 hover:bg-purple-50 rounded-lg transition border border-gray-200"
                >
                  <div className="font-semibold text-purple-700 mb-1">
                    Page {result.pageNumber}
                  </div>
                  <div className="text-sm text-gray-700">{result.context}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
