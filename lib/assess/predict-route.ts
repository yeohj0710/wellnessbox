import path from "node:path";
import { z } from "zod";
import catData from "@/public/assess-model/c-section-scorer-v1.cats.json";
import { CODE_TO_LABEL } from "@/lib/categories";
import { noStoreJson } from "@/lib/server/no-store";

const CODES: string[] = catData.cat_order;
const LABELS: string[] = CODES.map((code) => CODE_TO_LABEL[code] ?? code);

const MIN_SCORE = 1;
const MAX_SCORE = 5;
const DEFAULT_SCORE = 3;

const requestSchema = z.object({
  responses: z.array(z.coerce.number()).default([]),
});

type OrtModule = Awaited<typeof import("onnxruntime-web")>;
type OrtSession = Awaited<
  ReturnType<(typeof import("onnxruntime-web"))["InferenceSession"]["create"]>
>;

let ortSession: OrtSession | null = null;

async function getOrtModule(): Promise<OrtModule> {
  return import("onnxruntime-web");
}

async function getOrtSession() {
  if (ortSession) return ortSession;

  const ort = await getOrtModule();
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

export function parsePredictRouteRequest(rawBody: unknown) {
  return requestSchema.safeParse(rawBody);
}

export async function runPredictRoute(responses: number[]) {
  const ort = await getOrtModule();
  const session = await getOrtSession();
  const normalized = normalizeResponses(responses);

  const input = new ort.Tensor("float32", Float32Array.from(normalized), [
    1,
    normalized.length,
  ]);
  const output = await session.run({ input });
  const outputName = session.outputNames?.[0];
  if (!outputName || !output[outputName]) {
    return { ok: false as const, status: 500, error: "Model output is missing" };
  }

  const logits = output[outputName].data as Float32Array;
  if (logits.length !== CODES.length) {
    return {
      ok: false as const,
      status: 500,
      error: `Model output shape mismatch: got ${logits.length}, expected ${CODES.length}`,
    };
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

  return { ok: true as const, ranked };
}

export async function runPredictPostRoute(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = parsePredictRouteRequest(body);
    if (!parsed.success) {
      return noStoreJson({ error: "Invalid request body" }, 400);
    }

    const result = await runPredictRoute(parsed.data.responses);
    if (!result.ok) {
      return noStoreJson({ error: result.error }, result.status);
    }
    return noStoreJson(result.ranked);
  } catch (error) {
    return noStoreJson(
      { error: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}
