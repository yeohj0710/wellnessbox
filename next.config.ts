import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("onnxruntime-node");
    }
    config.module.rules.push(
      { test: /\.mjs$/, include: /node_modules/, type: "javascript/auto" },
      {
        test: /\.wasm$/,
        type: "asset/resource",
        generator: { filename: "static/chunks/[name][ext]" },
      },
      {
        test: /\.onnx$/,
        type: "asset/resource",
        generator: { filename: "static/chunks/[name][ext]" },
      },
      { test: /\.node$/, use: { loader: "node-loader" } }
    );
    return config;
  },
};

export default nextConfig;
