import type { NextConfig } from "next";
import CopyPlugin from "copy-webpack-plugin";

const nextConfig: NextConfig = {
  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack(config, { isServer, dev }) {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("onnxruntime-node");
    }

    if (!dev) {
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
        }
      );

      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: "./node_modules/onnxruntime-web/dist/ort-wasm.wasm",
              to: "static/chunks",
            },
            {
              from: "./node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm",
              to: "static/chunks",
            },
            {
              from: "./public/model",
              to: "static/chunks/app",
            },
          ],
        })
      );
    }

    return config;
  },
};

export default nextConfig;
