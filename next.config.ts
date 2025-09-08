import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  outputFileTracingExcludes: {
    "*": [".next/cache/**", "public/**", "node_modules/.prisma/**"],
  },

  webpack(config) {
    return config;
  },
};

export default nextConfig;
