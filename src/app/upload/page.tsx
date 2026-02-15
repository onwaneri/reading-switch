'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DropZone } from '@/components/DropZone';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

async function renderPdfPages(
  file: File,
  onProgress: (completed: number, total: number) => void
): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const total = pdf.numPages;
  const blobs: Blob[] = [];

  for (let i = 1; i <= total; i++) {
    onProgress(i - 1, total);
    const page = await pdf.getPage(i);
    const scale = 3.0;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    blobs.push(blob);
  }

  onProgress(total, total);
  return blobs;
}

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [processingPage, setProcessingPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setError('');
    setUploading(true);
    setProcessingPage(1);
    setTotalPages(1);

    try {
      const formData = new FormData();
      formData.append('title', file.name.replace('.pdf', ''));
      formData.append('pdf', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Upload failed');
      }

      const bookData = await res.json();

      // Add to user's library
      await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: bookData.id }),
      });

      router.push(`/reader?bookId=${bookData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  }, [router]);

  const handleFileSelect = useCallback((file: File) => {
    handleFile(file);
  }, [handleFile]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-purple-800 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const progress = totalPages > 0 ? Math.round((processingPage / totalPages) * 100) : 0;

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-purple-800">Add Book</h1>
          <button
            onClick={() => router.push('/library')}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Add PDF</h2>
          <DropZone onFileSelect={handleFileSelect} disabled={uploading} />
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-gray-500 text-sm">OR</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        <label className="block">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            disabled={uploading}
            className="hidden"
            id="file-input"
          />
          <span
            onClick={() => !uploading && document.getElementById('file-input')?.click()}
            className={`block w-full text-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'
            }`}
          >
            select file from your computer
          </span>
        </label>

        {uploading && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                Processing PDF...
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-300 animate-pulse w-full"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
