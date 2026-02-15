'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFPageRendererProps {
  pdfUrl: string;
  pageNumber: number;
  className?: string;
}

export function PDFPageRenderer({ pdfUrl, pageNumber, className }: PDFPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!canvasRef.current) {
        console.error('[PDFRenderer] No canvas ref');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`[PDFRenderer] Loading PDF: ${pdfUrl}, page ${pageNumber}`);

        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        if (cancelled) return;

        console.log(`[PDFRenderer] PDF loaded, ${pdf.numPages} pages`);

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        console.log(`[PDFRenderer] Page ${pageNumber} loaded`);

        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) {
          console.error('[PDFRenderer] No canvas context');
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        console.log(`[PDFRenderer] Rendering page ${pageNumber}...`);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (!cancelled) {
          console.log(`[PDFRenderer] Page ${pageNumber} rendered successfully`);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[PDFRenderer] Error:', err);
          setError(`Failed to load page: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, pageNumber]);

  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-50 p-8 rounded">
        <div className="text-red-600 text-sm">
          <p className="font-semibold">Error loading PDF page</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-h-[400px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 min-h-[400px]">
          <div className="text-center">
            <div className="text-gray-500 mb-2">Loading PDF...</div>
            <div className="text-xs text-gray-400">Page {pageNumber}</div>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={className}
        style={{ display: loading ? 'none' : 'block', maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
