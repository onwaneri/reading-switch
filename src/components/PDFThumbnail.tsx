'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFThumbnailProps {
  pdfUrl: string;
  className?: string;
}

export function PDFThumbnail({ pdfUrl, className }: PDFThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderThumbnail() {
      if (!canvasRef.current || !pdfUrl) return;

      try {
        setLoading(true);
        setError(false);

        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1); // First page
        if (cancelled) return;

        // Scale to fit thumbnail size (small for performance)
        const scale = 0.5;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[PDFThumbnail] Error:', err);
          setError(true);
          setLoading(false);
        }
      }
    }

    renderThumbnail();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  if (error || !pdfUrl) {
    return <div className={`text-6xl ${className}`}>📖</div>;
  }

  return (
    <>
      {loading && <div className={`text-6xl ${className}`}>📖</div>}
      <canvas
        ref={canvasRef}
        className={className}
        style={{ display: loading ? 'none' : 'block' }}
      />
    </>
  );
}
