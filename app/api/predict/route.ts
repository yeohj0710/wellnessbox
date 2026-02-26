import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import catData from "@/public/assess-model/c-section-scorer-v1.cats.json";
import { CODE_TO_LABEL } from "@/lib/categories";

const CODES: string[] = catData.cat_order;
const LABELS: string[] = CODES.map((code) => CODE_TO_LABEL[code] ?? code);

const requestSchema = z.object({
  responses: z.array(z.coerce.number()).default([]),
});

const MIN_SCORE = 1;
const MAX_SCORE = 5;
const DEFAULT_SCORE = 3;

let ortSession: any = null;

async function getOrtSession() {
  if (ortSession) return ortSession;

  const ort = await import("onnxruntime-web");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;

  const wasmDir = path.join(process.cwd(), "public", "onnx") + path.sep;
  ort.env.wasm.wasmPaths = wasmDir;

  ortSession = await ort.InferenceSession.create(
    path.join(process.cwd(), "public", "simple_model.onnx")
  );
  return ortSession;
}

function normalizeResponses(values: number[]) {
  return values.map((value) => {
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? numeric : DEFAULT_SCORE;
    const clamped = Math.max(MIN_SCORE, Math.min(MAX_SCORE, safeValue));
    return (clamped - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  });
}

function logistic(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return noStoreJson({ error: "Invalid request body" }, 400);
    }

    const ort = await import("onnxruntime-web");
    const session = await getOrtSession();
    const normalized = normalizeResponses(parsed.data.responses);

    const input = new ort.Tensor("float32", Float32Array.from(normalized), [
      1,
      normalized.length,
    ]);
    const output = await session.run({ input });
    const outputName = session.outputNames?.[0];
    if (!outputName || !output[outputName]) {
      return noStoreJson({ error: "Model output is missing" }, 500);
    }

    const logits = output[outputName].data as Float32Array;
    if (logits.length !== CODES.length) {
      return noStoreJson(
        {
          error: `Model output shape mismatch: got ${logits.length}, expected ${CODES.length}`,
        },
        500
      );
    }

    const percents = Array.from(logits, (value) =>
      Math.round(logistic(value) * 1000) / 10
    );
    const ranked = percents
      .map((percent, index) => ({
        code: CODES[index],
        label: LABELS[index],
        percent,
      }))
      .sort((left, right) => right.percent - left.percent)
      .slice(0, 3);

    return noStoreJson(ranked);
  } catch (error) {
    return noStoreJson(
      { error: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}
