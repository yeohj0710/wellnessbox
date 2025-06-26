import path from "path";
import { NextResponse } from "next/server";

async function getOrt() {
  return import("onnxruntime-web");
}

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

let session: any = null;
async function getSession() {
  if (!session) {
    const ort = await getOrt();
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const modelPath = path.join(process.cwd(), "public", "survey_model.onnx");
    session = await ort.InferenceSession.create(modelPath);
  }
  return session;
}

export async function POST(request: Request) {
  try {
    const { responses } = await request.json();
    const ort = await getOrt();
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
