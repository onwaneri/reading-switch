'use client';

import type { SWIAnalysis, WordPosition } from '@/types/book';

interface SWIPanelProps {
  selectedWord: WordPosition | null;
  analysis: SWIAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export function SWIPanel({ selectedWord, analysis, isLoading, error, onClose }: SWIPanelProps) {
  const isOpen = selectedWord !== null;

  return (
    <aside
      className={[
        'fixed top-0 right-0 h-full w-1/4 min-w-[280px] bg-white shadow-xl z-50',
        'flex flex-col transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
      aria-label="Word Analysis Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-yellow-50">
        <h2 className="text-lg font-bold text-purple-800">
          {selectedWord?.text ?? 'Tap a word'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 text-2xl leading-none cursor-pointer"
          aria-label="Close panel"
        >
          &times;
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <p className="text-purple-600 animate-pulse text-sm">Analyzing...</p>
          </div>
        )}

        {error && !isLoading && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        {analysis && !isLoading && (
          <div className="space-y-4">
            {/* Word Sum */}
            <section>
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">Word Sum</h3>
              <p className="text-xl font-mono font-bold text-gray-800">{analysis.wordSum}</p>
            </section>

            {/* Morpheme chips */}
            <section>
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Morphemes</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.morphemes.map((m, i) => (
                  <span
                    key={i}
                    className={[
                      'px-3 py-1 rounded-full text-sm font-semibold',
                      m.type === 'prefix' && 'bg-blue-100 text-blue-800',
                      m.type === 'base' && 'bg-green-100 text-green-800',
                      m.type === 'suffix' && 'bg-orange-100 text-orange-800',
                    ].filter(Boolean).join(' ')}
                  >
                    {m.text}
                    {m.meaning && (
                      <span className="ml-1 font-normal text-xs opacity-70">({m.meaning})</span>
                    )}
                  </span>
                ))}
              </div>
            </section>

            {/* Etymology */}
            {analysis.etymology && (
              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">Etymology</h3>
                <p className="text-sm text-gray-700">{analysis.etymology}</p>
              </section>
            )}

            {/* Word Family */}
            {analysis.wordFamily && analysis.wordFamily.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Word Family</h3>
                <div className="flex flex-wrap gap-1">
                  {analysis.wordFamily.map((w, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-sm">
                      {w}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Phonology */}
            {analysis.phonologyNote && (
              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">Phonology</h3>
                <p className="text-sm text-gray-700">{analysis.phonologyNote}</p>
              </section>
            )}
          </div>
        )}

        {!analysis && !isLoading && !error && selectedWord && (
          <p className="text-gray-400 text-sm">Loading analysis...</p>
        )}
      </div>
    </aside>
  );
}
