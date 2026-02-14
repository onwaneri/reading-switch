export interface WordPosition {
  text: string;
  x: number;      // percentage from left (0-100)
  y: number;      // percentage from top (0-100)
  width: number;  // percentage width
  height: number; // percentage height
}

export interface BookPage {
  pageNumber: number;
  imageUrl: string;
  words: WordPosition[];
}

export interface Book {
  id: string;
  title: string;
  pages: BookPage[];
}
