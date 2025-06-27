import type { NextConfig } from "next";
import CopyPlugin from "copy-webpack-plugin";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/predict": [".next/server/chunks/*"],
  },
  webpack(config, { isServer }) {
    const dest = isServer ? "server/chunks" : "static/chunks";
    config.module.rules.push(
      {
        test: /\.wasm$/,
        type: "asset/resource",
        generator: { filename: `${dest}/[name][ext]` },
      },
      {
        test: /\.onnx$/,
        type: "asset/resource",
        generator: { filename: `${dest}/[name][ext]` },
      }
    );
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(
              __dirname,
              "node_modules/onnxruntime-web/dist/ort-wasm.wasm"
            ),
            to: dest,
          },
          {
            from: path.resolve(
              __dirname,
              "node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm"
            ),
            to: dest,
          },
          {
            from: path.resolve(
              __dirname,
              "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm"
            ),
            to: dest,
          },
          {
            from: path.resolve(__dirname, "public/survey_model.onnx"),
            to: dest,
          },
        ],
      })
    );
    return config;
  },
};

export default nextConfig;
