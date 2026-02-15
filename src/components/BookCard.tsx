'use client';

interface BookCardProps {
  bookId: string;
  title: string;
  thumbnail: string;
  onClick: () => void;
}

export function BookCard({ title, thumbnail, onClick }: BookCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-48 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer"
    >
      <div className="aspect-[3/4] bg-gray-100 rounded-t-lg overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2" title={title}>
          {title}
        </h3>
      </div>
    </div>
  );
}

export function AddBookCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-48 aspect-[3/4] bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition"
    >
      <div className="text-center">
        <div className="text-6xl text-gray-400 mb-2">+</div>
        <p className="text-sm text-gray-600">Add Book</p>
      </div>
    </div>
  );
}
