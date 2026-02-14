import { NextRequest } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import type { WordPosition } from "@/types/book";

export const maxDuration = 120; // allow up to 2 minutes for OCR processing

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const bookId = randomUUID();
  const title = (formData.get("title") as string) || "Untitled Book";
  const bookDir = path.join(process.cwd(), "public", "books", bookId);
  await fs.mkdir(bookDir, { recursive: true });

  const pageFiles: File[] = [];
  let i = 0;
  while (formData.has(`page-${i}`)) {
    pageFiles.push(formData.get(`page-${i}`) as File);
    i++;
  }

  if (pageFiles.length === 0) {
    return new Response(JSON.stringify({ error: "No page images received" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const worker = await createWorker("eng");
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          user_defined_dpi: "300",
        });

        const allPages = [];

        for (let i = 0; i < pageFiles.length; i++) {
          const filename = `page-${i + 1}.png`;
          const filePath = path.join(bookDir, filename);
          const imageUrl = `/books/${bookId}/${filename}`;

          const buffer = Buffer.from(await pageFiles[i].arrayBuffer());
          await fs.writeFile(filePath, buffer);

          const meta = await sharp(buffer).metadata();
          const processed = await sharp(buffer)
            .resize(
              Math.round((meta.width ?? 800) * 2),
              Math.round((meta.height ?? 600) * 2)
            )
            .normalize()
            .png()
            .toBuffer();

          const result = await worker.recognize(processed, {}, { blocks: true });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ocrData = result.data as any;

          const allWords: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }> = [];
          for (const block of ocrData.blocks || []) {
            for (const para of block.paragraphs || []) {
              for (const line of para.lines || []) {
                for (const word of line.words || []) {
                  if (word.text?.trim()) {
                    allWords.push({
                      text: word.text,
                      bbox: word.bbox || { x0: 0, y0: 0, x1: 1, y1: 1 },
                    });
                  }
                }
              }
            }
          }

          const imgWidth = allWords.length > 0 ? Math.max(...allWords.map((w) => w.bbox.x1), 1) : 1;
          const imgHeight = allWords.length > 0 ? Math.max(...allWords.map((w) => w.bbox.y1), 1) : 1;

          const words: WordPosition[] = [];
          for (const w of allWords) {
            const text = String(w.text).trim().replace(/[^\w'-]/g, "");
            if (!text || text.length === 0) continue;

            const { x0, y0, x1, y1 } = w.bbox;
            words.push({
              text,
              x: (x0 / imgWidth) * 100,
              y: (y0 / imgHeight) * 100,
              width: ((x1 - x0) / imgWidth) * 100,
              height: ((y1 - y0) / imgHeight) * 100,
            });
          }

          const pageData = { pageNumber: i + 1, imageUrl, words };
          allPages.push(pageData);

          // Stream this page's data to the client immediately
          controller.enqueue(encoder.encode(JSON.stringify(pageData) + "\n"));
        }

        await worker.terminate();

        // Save book data JSON
        const bookData = { id: bookId, title, pages: allPages };
        await fs.writeFile(
          path.join(bookDir, "book.json"),
          JSON.stringify(bookData)
        );

        controller.close();
      } catch (error) {
        console.error("Upload error:", error);
        controller.enqueue(encoder.encode(JSON.stringify({ error: "Failed to process PDF" }) + "\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
