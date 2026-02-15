'use client';

import { useRef } from 'react';
import { Book } from '@/types/book';
import { BookCard, AddBookCard } from './BookCard';

interface BookCarouselProps {
  books: Book[];
  showAddButton?: boolean;
  onAddClick?: () => void;
  onBookClick: (bookId: string) => void;
}

export function BookCarousel({
  books,
  showAddButton,
  onAddClick,
  onBookClick,
}: BookCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const hasBooks = books.length > 0 || showAddButton;

  if (!hasBooks) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No books yet</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {showAddButton && onAddClick && (
          <AddBookCard onClick={onAddClick} />
        )}

        {books.map((book) => (
          <BookCard
            key={book.id}
            bookId={book.id}
            title={book.title}
            pdfUrl={book.pdfUrl}
            thumbnail={book.pages?.[0]?.imageUrl}
            onClick={() => onBookClick(book.id)}
          />
        ))}
      </div>

      {books.length > 3 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
