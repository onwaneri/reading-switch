/**
 * Example: Click word to load audio, then click play button to play it
 * Audio is cached so re-clicking the same word doesn't regenerate
 */

'use client';

import { useAudioCache } from '@/hooks/useAudioCache';

interface Book {
  title: string;
  text: string;
}

export function BookReaderWithAudioCache({ book }: { book: Book }) {
  const {
    selectedWord,
    isLoading,
    isReady,
    error,
    loadWord,
    playAudio,
    clearCache,
    cacheSize,
  } = useAudioCache();

  // Parse words from text
  const words = book.text.split(/\s+/).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{book.title}</h1>
      </div>

      {/* Control Panel */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              <strong>Selected:</strong> {selectedWord || 'None'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Cache:</strong> {cacheSize} word(s)
            </p>
            {error && (
              <p className="text-sm text-red-600">
                <strong>Error:</strong> {error}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {/* Play Button */}
            <button
              onClick={playAudio}
              disabled={!isReady || isLoading}
              className={`
                px-6 py-3 rounded font-semibold text-white
                ${isReady && !isLoading
                  ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? (
                <>⏳ Loading...</>
              ) : isReady ? (
                <>▶️ Play "{selectedWord}"</>
              ) : (
                <>▶️ Select a word first</>
              )}
            </button>

            {/* Clear Cache */}
            <button
              onClick={clearCache}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 text-sm">
        <p className="font-semibold mb-2">How to use:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click any word below to load its audio (takes 3-8 seconds first time)</li>
          <li>Click the green "Play" button to hear the pronunciation</li>
          <li>Click the same word again - it loads instantly (cached!)</li>
        </ol>
      </div>

      {/* Text Content */}
      <div className="p-6 bg-white border rounded-lg shadow-sm">
        <div className="text-lg leading-relaxed">
          {words.map((word, idx) => {
            const normalizedWord = word.toLowerCase().replace(/[^a-z]/g, '');
            const isSelected = selectedWord === normalizedWord;

            return (
              <span
                key={`${word}-${idx}`}
                onClick={() => loadWord(normalizedWord)}
                className={`
                  cursor-pointer
                  hover:bg-yellow-200
                  transition-colors
                  px-0.5
                  ${isSelected ? 'bg-yellow-300 font-bold' : ''}
                  ${isLoading && isSelected ? 'animate-pulse' : ''}
                `}
                title="Click to load audio"
              >
                {word}
                {idx < words.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </div>
      </div>

      {/* Status Display */}
      {selectedWord && (
        <div className="mt-6 p-4 bg-gray-50 rounded text-sm">
          <div className="font-semibold mb-2">Status:</div>
          <div className="space-y-1">
            <div>Word: <span className="font-mono">{selectedWord}</span></div>
            <div>
              State:{' '}
              <span className={`font-semibold ${
                isLoading ? 'text-yellow-600' :
                isReady ? 'text-green-600' :
                'text-gray-600'
              }`}>
                {isLoading ? 'Loading...' : isReady ? 'Ready to play' : 'Not loaded'}
              </span>
            </div>
            <div>
              Cached:{' '}
              <span className="font-semibold text-blue-600">
                {cacheSize > 0 ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Usage in a page:
/*
import { BookReaderWithAudioCache } from '@/components/BookReaderWithAudioCache';

export default function Page() {
  const book = {
    title: 'My Book',
    text: 'The construction of knowledge begins with understanding education and biology.'
  };

  return <BookReaderWithAudioCache book={book} />;
}
*/
