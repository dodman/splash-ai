import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // Pin the file-tracing root to this project to suppress the spurious
  // "multiple lockfiles detected" warning from the parent directory.
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ["pdf-parse"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
