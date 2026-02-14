"use client";

import { useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { BookPage } from "@/types/book";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

async function renderPdfPages(file: File): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const blobs: Blob[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
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

  return blobs;
}

interface WordEntry {
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [words, setWords] = useState<WordEntry[]>([]);
  const [done, setDone] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    setError("");
    setUploading(true);
    setWords([]);
    setDone(false);

    try {
      const pageBlobs = await renderPdfPages(file);

      const formData = new FormData();
      formData.append("title", file.name.replace(".pdf", ""));
      pageBlobs.forEach((blob, i) => {
        formData.append(`page-${i}`, blob, `page-${i}.png`);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!; // keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          const pageData: BookPage = JSON.parse(line);
          if ("error" in pageData) {
            throw new Error((pageData as unknown as { error: string }).error);
          }
          const newWords: WordEntry[] = pageData.words.map((w) => ({
            page: pageData.pageNumber,
            text: w.text,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
          }));
          setWords((prev) => [...prev, ...newWords]);
        }
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="file"
          accept="application/pdf"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {uploading && <span style={{ marginLeft: "0.5rem" }}>Processing...</span>}
        {done && <span style={{ marginLeft: "0.5rem" }}>{words.length} words found</span>}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {words.length > 0 && (
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "14px" }}>
          {words.map((w) =>
            `Page ${w.page} | "${w.text}" | x: ${w.x.toFixed(1)}% y: ${w.y.toFixed(1)}% w: ${w.width.toFixed(1)}% h: ${w.height.toFixed(1)}%\n`
          ).join("")}
        </pre>
      )}
    </div>
  );
}
