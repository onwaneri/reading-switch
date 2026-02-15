'use client';

import { useEffect } from 'react';
import type { DepthLevel, SWIAnalysis, WordPosition } from '@/types/book';
import type { ChatMessage, ChatContext } from '@/types/chat';
import { useAudioCache } from '@/hooks/useAudioCache';
import { ChatAssistant } from '@/components/ChatAssistant';

interface SWIPanelProps {
  selectedWord: WordPosition | null;
  analysis: SWIAnalysis | null;
  isLoading: boolean;
  error: string | null;
  depth: DepthLevel;
  onClose: () => void;
  bookTitle: string;
  pageText: string;
  chatMessages: ChatMessage[];
  isChatStreaming: boolean;
  chatError: string | null;
  onChatSend: (text: string, context: ChatContext) => void;
  isChatExpanded: boolean;
  onToggleChatExpanded: () => void;
}

function WordSumDisplay({ wordSum, bases, word }: { wordSum: string; bases: string[]; word: string }) {
  const parts = wordSum.split(/\s*\+\s*/);
  const basesLower = bases.map(b => b.toLowerCase());

  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {parts.map((part, i) => {
        const isBase = basesLower.includes(part.toLowerCase());
        const firstBaseIdx = parts.findIndex(p => basesLower.includes(p.toLowerCase()));
        let colorClass = 'bg-orange-100 text-orange-800'; // suffix default
        if (isBase) {
          colorClass = 'bg-green-100 text-green-800';
        } else if (i < firstBaseIdx) {
          colorClass = 'bg-blue-100 text-blue-800'; // prefix
        }

        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-400 text-sm">+</span>}
            <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${colorClass} ${isBase ? 'text-base' : ''}`}>
              {isBase ? part.toUpperCase() : part}
            </span>
          </span>
        );
      })}
      <span className="text-gray-400 mx-1">→</span>
      <span className="font-bold text-gray-800">{word}</span>
    </div>
  );
}

export function SWIPanel({
  selectedWord, analysis, isLoading, error, depth, onClose,
  bookTitle, pageText, chatMessages, isChatStreaming, chatError, onChatSend, isChatExpanded, onToggleChatExpanded,
}: SWIPanelProps) {
  const isOpen = selectedWord !== null;
  const showMatrix = depth === 'standard' || depth === 'deep';
  const showRelatives = depth === 'deep';
  const { isLoading: audioLoading, isReady: audioReady, loadWord, playAudio } = useAudioCache();

  // Pre-load audio when a word is selected
  useEffect(() => {
    if (selectedWord?.text) {
      loadWord(selectedWord.text);
    }
  }, [selectedWord?.text, loadWord]);

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
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-purple-800">
            {selectedWord?.text ?? 'Tap a word'}
          </h2>
          {selectedWord && (
            <button
              onClick={playAudio}
              disabled={!audioReady}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-40 disabled:cursor-default cursor-pointer transition"
              aria-label="Play pronunciation"
              title={audioLoading ? 'Loading audio...' : audioReady ? 'Play pronunciation' : 'Audio unavailable'}
            >
              {audioLoading ? (
                <span className="block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M11.553 3.064A.75.75 0 0112 3.75v16.5a.75.75 0 01-1.255.555L5.46 16H2.75A.75.75 0 012 15.25v-6.5A.75.75 0 012.75 8H5.46l5.285-4.805a.75.75 0 01.808-.131zM14.47 8.47a.75.75 0 011.06 0 5 5 0 010 7.071.75.75 0 11-1.06-1.06 3.5 3.5 0 000-4.95.75.75 0 010-1.061zm2.828-2.828a.75.75 0 011.06 0 9 9 0 010 12.728.75.75 0 11-1.06-1.06 7.5 7.5 0 000-10.607.75.75 0 010-1.06z" />
                </svg>
              )}
            </button>
          )}
        </div>
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
          <div className="space-y-5">
            {/* 1. Definition (SWI Q1: What does it mean?) */}
            {analysis.definition && (
              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">Meaning</h3>
                <p className="text-sm text-gray-700">{analysis.definition}</p>
                {analysis.icon && (
                  <div className="mt-3 flex flex-col items-center gap-1">
                    <img
                      src={analysis.icon}
                      alt={`Icon representing ${analysis.word}`}
                      className="w-16 h-16 object-contain opacity-80"
                    />
                    {analysis.visualConcept && (
                      <p className="text-xs text-gray-500 italic">"{analysis.visualConcept}"</p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* 2. Word Sum (SWI Q2: How is it built?) */}
            <section>
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Word Sum</h3>
              <WordSumDisplay
                wordSum={analysis.wordSum}
                bases={analysis.matrix.bases.map(b => b.text)}
                word={analysis.word}
              />
            </section>

            {/* 3. Word Matrix (Standard + Deep) */}
            {showMatrix && (
              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Word Matrix</h3>
                <div className="flex gap-3 items-start">
                  {/* Prefixes column */}
                  {analysis.matrix.prefixes.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {analysis.matrix.prefixes.map((p, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 text-right"
                          title={p.meaning}
                        >
                          {p.text}-
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Base column */}
                  <div className="flex flex-col gap-1.5 items-center">
                    {analysis.matrix.bases.map((b, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-green-100 text-green-800">
                          {b.text.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{b.meaning}</span>
                      </div>
                    ))}
                  </div>

                  {/* Suffixes column */}
                  {analysis.matrix.suffixes.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {analysis.matrix.suffixes.map((s, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded text-xs font-medium bg-orange-50 text-orange-700"
                          title={s.meaning}
                        >
                          -{s.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 4. Word Relatives (Deep only) */}
            {showRelatives && analysis.relatives.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Word Family</h3>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.relatives.map((r, i) => (
                    <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                      {r}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Socratic Chat */}
            <ChatAssistant
              analysis={analysis}
              bookTitle={bookTitle}
              pageText={pageText}
              messages={chatMessages}
              isStreaming={isChatStreaming}
              error={chatError}
              onSend={onChatSend}
              isExpanded={isChatExpanded}
              onToggleExpand={onToggleChatExpanded}
            />
          </div>
        )}

        {!analysis && !isLoading && !error && selectedWord && (
          <p className="text-gray-400 text-sm">Loading analysis...</p>
        )}
      </div>
    </aside>
  );
}
