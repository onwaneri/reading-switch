'use client';

import { useState } from 'react';

interface SearchResult {
  identifier: string;
  title: string;
  creator?: string;
}

interface SearchBarProps {
  onAddBook: (identifier: string, title: string) => void;
}

export function SearchBar({ onAddBook }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    setSearching(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError('Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (identifier: string, title: string) => {
    setDownloading(identifier);
    setError('');

    try {
      await onAddBook(identifier, title);
    } catch (err) {
      setError('Failed to add book. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-purple-800 mb-4">
        Search Internet Archive
      </h3>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for books..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="px-6 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <div
              key={result.identifier}
              className="flex justify-between items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{result.title}</h4>
                {result.creator && (
                  <p className="text-sm text-gray-600">by {result.creator}</p>
                )}
              </div>
              <button
                onClick={() => handleAdd(result.identifier, result.title)}
                disabled={downloading === result.identifier}
                className="ml-4 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {downloading === result.identifier ? 'Adding...' : 'Add to Library'}
              </button>
            </div>
          ))}
        </div>
      )}

      {searching && (
        <div className="text-center text-gray-600 py-8">
          Searching...
        </div>
      )}

      {!searching && results.length === 0 && query && (
        <div className="text-center text-gray-600 py-8">
          No results found. Try a different search.
        </div>
      )}
    </div>
  );
}
