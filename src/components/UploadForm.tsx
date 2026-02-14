"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as pdfjsLib from "pdfjs-dist";

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
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/png");
    });
    blobs.push(blob);
  }

  onProgress(total, total);
  return blobs;
}

export function UploadForm() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [processingPage, setProcessingPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    setError("");
    setUploading(true);
    setProcessingPage(0);
    setTotalPages(0);

    try {
      const pageBlobs = await renderPdfPages(file, (completed, total) => {
        setProcessingPage(completed);
        setTotalPages(total);
      });

      const formData = new FormData();
      formData.append("title", file.name.replace(".pdf", ""));
      formData.append("pdf", file);
      pageBlobs.forEach((blob, i) => {
        formData.append(`page-${i}`, blob, `page-${i}.png`);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Upload failed");
      }

      const bookData = await res.json();
      router.push(`/reader?bookId=${bookData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }, [router]);

  return (
    <div>
      <div className="mb-4">
        <input
          type="file"
          accept="application/pdf"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {uploading && (
          <span className="ml-2 text-sm text-gray-600">
            {processingPage < totalPages
              ? `Rendering page ${processingPage + 1}/${totalPages}...`
              : "Extracting words..."}
          </span>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
