'use client';

import type { WordPosition } from '@/types/book';

interface WordOverlayProps {
  word: WordPosition;
  isSelected: boolean;
  onClick: (word: WordPosition) => void;
}

export function WordOverlay({ word, isSelected, onClick }: WordOverlayProps) {
  return (
    <button
      onClick={() => onClick(word)}
      title={word.text}
      aria-label={`Tap to learn about: ${word.text}`}
      style={{
        position: 'absolute',
        left: `${word.x}%`,
        top: `${word.y}%`,
        width: `${word.width}%`,
        height: `${word.height}%`,
      }}
      className={[
        'cursor-pointer box-border border-2 rounded-sm transition-colors',
        isSelected
          ? 'border-yellow-400 bg-yellow-100/40'
          : 'border-transparent hover:border-yellow-400 hover:bg-yellow-100/20',
      ].join(' ')}
    />
  );
}
