import { NextResponse } from "next/server";
import type { InferenceSession, Tensor } from "onnxruntime-node";

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

let session: InferenceSession | null = null;

async function getSession() {
  const ort = await import("onnxruntime-node");
  if (!session) {
    session = await ort.InferenceSession.create("survey_model.onnx");
  }
  return session;
}

export async function POST(request: Request) {
  const ort = await import("onnxruntime-node");
  const { responses } = await request.json();
  const sess = await getSession();

  const inputTensor = new ort.Tensor(
    "float32",
    Float32Array.from(responses),
    [1, 10]
  );

  const outputMap = await sess.run({ input: inputTensor });
  const logits = (outputMap[sess.outputNames[0]] as Tensor)
    .data as Float32Array;

  const probs = Array.from(logits).map((x) => 1 / (1 + Math.exp(-x)));

  const ranked = probs
    .map((p, i) => ({ label: LABELS[i], prob: p }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 3);

  return NextResponse.json(ranked);
}
