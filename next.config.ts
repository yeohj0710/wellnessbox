import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  outputFileTracingIncludes: {
    "/api/rag/**": ["data/**/*"],
  },
  outputFileTracingExcludes: {
    "/*": [".next/cache/**"],
  },
  webpack(config) {
    return config;
  },
};

export default nextConfig;
