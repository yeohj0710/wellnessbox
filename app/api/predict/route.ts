import path from "path";
import { NextResponse } from "next/server";
import catData from "@/public/assess-model/c-section-scorer-v1.cats.json";
import { CODE_TO_LABEL } from "@/lib/categories";

const CODES: string[] = catData.cat_order;
const LABELS: string[] = CODES.map((c) => CODE_TO_LABEL[c] ?? c);

let session: any = null;

async function getSession() {
  if (!session) {
    const ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    const wasmDir = path.join(process.cwd(), "public", "onnx") + path.sep;
    ort.env.wasm.wasmPaths = wasmDir;
    session = await ort.InferenceSession.create(
      path.join(process.cwd(), "public", "simple_model.onnx")
    );
  }
  return session;
}

export async function POST(request: Request) {
  try {
    const { responses } = await request.json();
    const ort = await import("onnxruntime-web");
    const sess = await getSession();

    const vals = Array.isArray(responses) ? responses : [];
    const norm = vals.map((v: number) => {
      const x = Number(v);
      const clamped = Math.max(1, Math.min(5, isFinite(x) ? x : 3));
      return (clamped - 1) / 4;
    });
    const input = new ort.Tensor("float32", Float32Array.from(norm), [
      1,
      norm.length,
    ]);

    const out = await sess.run({ input });
    const outName = sess.outputNames[0];
    const logits = out[outName].data as Float32Array;

    if (logits.length !== CODES.length) {
      throw new Error(
        `모델의 출력(${logits.length}개)과 영양소 카테고리(${CODES.length}개)가 일치하지 않습니다.`
      );
    }

    const probs = Array.from(logits, (x) => 1 / (1 + Math.exp(-x)));
    const percents = probs.map((p) => Math.round(p * 1000) / 10);

    const ranked = percents
      .map((pct, i) => ({ code: CODES[i], label: LABELS[i], percent: pct }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);

    return NextResponse.json(ranked);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
