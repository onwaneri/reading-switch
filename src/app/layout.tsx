import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Word Extractor",
  description: "Upload a PDF and extract words with positions via OCR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
