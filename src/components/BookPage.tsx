'use client';

import type { BookPage as BookPageType, WordPosition } from '@/types/book';
import { WordOverlay } from './WordOverlay';

interface BookPageProps {
  page: BookPageType;
  selectedWord: WordPosition | null;
  onWordClick: (word: WordPosition) => void;
}

export function BookPage({ page, selectedWord, onWordClick }: BookPageProps) {
  return (
    <div className="relative w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={page.imageUrl}
        alt={`Page ${page.pageNumber}`}
        className="w-full block select-none"
        draggable={false}
      />
      {page.words.map((word, i) => (
        <WordOverlay
          key={`${page.pageNumber}-${i}`}
          word={word}
          isSelected={
            selectedWord !== null &&
            selectedWord.text === word.text &&
            selectedWord.x === word.x &&
            selectedWord.y === word.y
          }
          onClick={onWordClick}
        />
      ))}
    </div>
  );
}
