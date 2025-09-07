import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack(config) {
    return config;
  },
  outputFileTracingIncludes: {
    "app/api/chat": ["./data/**"],
  },
};

export default nextConfig;
