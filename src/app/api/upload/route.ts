import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const python = process.platform === "win32" ? "python" : "python3";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const bookId = randomUUID();
  const title = (formData.get("title") as string) || "Untitled Book";
  const pdfFile = formData.get("pdf") as File | null;

  if (!pdfFile) {
    return Response.json({ error: "No PDF file received" }, { status: 400 });
  }

  const bookDir = path.join(process.cwd(), "public", "books", bookId);
  await fs.mkdir(bookDir, { recursive: true });

  // Save PDF file permanently
  const pdfPath = path.join(bookDir, "book.pdf");
  const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
  await fs.writeFile(pdfPath, pdfBuffer);

  // Run pdfminer script to extract word positions
  let pagesData: Array<{ pageNumber: number; words: Array<{ text: string; x: number; y: number; width: number; height: number }> }>;
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "extract_words.py");
    const { stdout } = await execFileAsync(python, [scriptPath, pdfPath], {
      maxBuffer: 50 * 1024 * 1024, // 50 MB for large PDFs
      env: { ...process.env },
    });
    pagesData = JSON.parse(stdout);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: string }).stderr || "";
    console.error("Python extraction failed:", detail, stderr);
    await fs.rm(bookDir, { recursive: true, force: true });
    return Response.json(
      { error: `Failed to extract text from PDF: ${stderr || detail}` },
      { status: 500 }
    );
  }

// Build book data - pages are rendered on-demand from the PDF
  const bookData = {
    id: bookId,
    title,
    pdfUrl: `/api/books/${bookId}/book.pdf`,
    pages: pagesData,
  };
  
/*  // Clean up temp PDF
  await fs.unlink(pdfPath).catch(() => {});

  // Save page images and build book data
  const pages = [];

  for (let i = 0; formData.has(`page-${i}`); i++) {
    const file = formData.get(`page-${i}`) as File;
    const filename = `page-${i + 1}.png`;
    const filePath = path.join(bookDir, filename);
    const imageUrl = `/books/${bookId}/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    pages.push({
      pageNumber: i + 1,
      imageUrl,
      words: pagesData[i]?.words || [],
    });
  }

  const bookData = { id: bookId, title, pages }; */
  await fs.writeFile(
    path.join(bookDir, "book.json"),
    JSON.stringify(bookData)
  );

  return Response.json(bookData);
}
