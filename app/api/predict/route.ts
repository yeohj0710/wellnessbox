import path from "path";
import { NextResponse } from "next/server";

const LABELS = [
  "비타민C",
  "칼슘",
  "마그네슘",
  "비타민D",
  "아연",
  "프로바이오틱스",
  "밀크씨슬",
  "오메가3",
  "멀티비타민",
  "차전자피 식이섬유",
  "철분",
  "엽산",
  "가르시니아",
  "콜라겐",
  "셀레늄",
  "루테인",
  "비타민A",
];

const isDev = process.env.NODE_ENV !== "production";
let session: any = null;

async function getSession() {
  if (!session) {
    const ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const base = isDev
      ? path.resolve(process.cwd(), "node_modules", "onnxruntime-web", "dist")
      : path.resolve(process.cwd(), ".next", "server", "chunks");
    ort.env.wasm.wasmPaths = {
      "ort-wasm.wasm": path.join(base, "ort-wasm.wasm"),
      "ort-wasm-simd.wasm": path.join(base, "ort-wasm-simd.wasm"),
      "ort-wasm-simd-threaded.wasm": path.join(
        base,
        "ort-wasm-simd-threaded.wasm"
      ),
    };
    session = await ort.InferenceSession.create(
      path.join(process.cwd(), "public", "survey_model.onnx")
    );
  }
  return session;
}

export async function POST(request: Request) {
  try {
    const { responses } = await request.json();
    const ort = await import("onnxruntime-web");
    const sess = await getSession();
    const input = new ort.Tensor("float32", Float32Array.from(responses), [
      1,
      responses.length,
    ]);
    const output = await sess.run({ input });
    const logits = output[sess.outputNames[0]].data as Float32Array;
    const probs = Array.from(logits).map((x) => 1 / (1 + Math.exp(-x)));
    const ranked = probs
      .map((p, i) => ({ label: LABELS[i], prob: p }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);
    return NextResponse.json(ranked);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
