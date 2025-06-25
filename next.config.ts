import type { NextConfig } from "next";
import CopyPlugin from "copy-webpack-plugin";
import path from "path";

const nextConfig: NextConfig = {
  compress: true,
  images: {},
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
              from: path.join(
                __dirname,
                "node_modules",
                "onnxruntime-web",
                "dist",
                "ort-wasm.wasm"
              ),
              to: "static/chunks",
            },
            {
              from: path.join(
                __dirname,
                "node_modules",
                "onnxruntime-web",
                "dist",
                "ort-wasm-simd.wasm"
              ),
              to: "static/chunks",
            },
            {
              from: path.join(__dirname, "public", "survey_model.onnx"),
              to: "static/chunks",
            },
          ],
        })
      );
    }

    return config;
  },
};

export default nextConfig;
