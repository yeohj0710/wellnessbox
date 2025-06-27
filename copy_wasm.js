const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "node_modules", "onnxruntime-web", "dist");
const destDir = path.join(__dirname, "public", "onnx");

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

["ort-wasm.wasm", "ort-wasm-simd.wasm", "ort-wasm-simd-threaded.wasm"].forEach(
  (file) => {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
);
