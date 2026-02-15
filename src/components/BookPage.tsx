'use client';

import type { BookPage as BookPageType, WordPosition } from '@/types/book';
import { WordOverlay } from './WordOverlay';
import { PDFPageRenderer } from './PDFPageRenderer';

interface BookPageProps {
  page: BookPageType;
  pdfUrl?: string;
  selectedWord: WordPosition | null;
  onWordClick: (word: WordPosition, page: BookPageType) => void;
  compact?: boolean;
}

export function BookPage({ page, pdfUrl, selectedWord, onWordClick, compact }: BookPageProps) {
  return (
    <div className={compact ? 'flex-none flex items-center justify-center' : 'w-full h-full min-h-0 flex items-center justify-center'}>
      <div className="relative max-h-[calc(100vh-6rem)] max-w-full w-max block">
        {pdfUrl ? (
          <PDFPageRenderer
            pdfUrl={pdfUrl}
            pageNumber={page.pageNumber}
            className="max-h-[calc(100vh-6rem)] max-w-full block select-none object-contain"
          />
        ) : page.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={page.imageUrl}
            alt={`Page ${page.pageNumber}`}
            className="max-h-[calc(100vh-6rem)] max-w-full block select-none object-contain"
            draggable={false}
          />
        ) : null}
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
          onClick={(w) => onWordClick(w, page)}
        />
      ))}
      </div>
    </div>
  );
}
