import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
