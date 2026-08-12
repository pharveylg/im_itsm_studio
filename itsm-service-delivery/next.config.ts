import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel serverless: increase the body size limit for XML + email uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  // Mark native Node packages as server-only so Vercel doesn't try to bundle them
  serverExternalPackages: [
    "pg",
    "@kenjiuno/msgreader",
    "mammoth",
    "pdf-parse",
  ],
};

export default nextConfig;
