import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "Reading SWItch",
  description: "Interactive picture book reader with Structured Word Inquiry",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="font-[family-name:var(--font-nunito)]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
