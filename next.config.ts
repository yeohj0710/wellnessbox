import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  outputFileTracing: true,
  outputFileTracingExcludes: {
    "**/node_modules/onnxruntime-node/**": ["**/*"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "onnxruntime-node"];
    }
    config.module.rules.push({
      test: /\.node$/,
      use: "node-loader",
    });
    return config;
  },
};

export default nextConfig;
