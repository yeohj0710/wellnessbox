import { CODE_TO_LABEL } from "@/lib/categories";
import type { CheckAiClientScore } from "@/lib/checkai-client";

const MODEL_URL = "/simple_model.onnx";
const CAT_ORDER_URL = "/assess-model/c-section-scorer-v1.cats.json";

let sessionPromise: Promise<any> | null = null;
let catOrderPromise: Promise<string[]> | null = null;

async function loadCatOrder(): Promise<string[]> {
  if (!catOrderPromise) {
    catOrderPromise = fetch(CAT_ORDER_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load category order.");
        }
        return response.json();
      })
      .then((payload) => {
        if (!Array.isArray(payload?.cat_order)) {
          throw new Error("Invalid category order format.");
        }
        return payload.cat_order as string[];
      });
  }
  return catOrderPromise;
}

async function loadSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-web");
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = "/onnx/";
      return ort.InferenceSession.create(MODEL_URL);
    })();
  }
  return sessionPromise;
}

function normalizeAnswer(value: number) {
  const numeric = Number(value);
  const clamped = Math.max(1, Math.min(5, Number.isFinite(numeric) ? numeric : 3));
  return (clamped - 1) / 4;
}

export async function runEnglishCheckAiPrediction(
  responses: readonly number[]
): Promise<CheckAiClientScore[]> {
  const ort = await import("onnxruntime-web");
  const [session, catOrder] = await Promise.all([loadSession(), loadCatOrder()]);

  const normalized = responses.map(normalizeAnswer);
  const input = new ort.Tensor("float32", Float32Array.from(normalized), [
    1,
    normalized.length,
  ]);

  const output = await session.run({ input });
  const outputName = session.outputNames[0];
  const logits = output[outputName].data as Float32Array;

  if (logits.length !== catOrder.length) {
    throw new Error(
      `Model output (${logits.length}) does not match categories (${catOrder.length}).`
    );
  }

  return Array.from(logits, (value, index) => {
    const prob = 1 / (1 + Math.exp(-value));
    return {
      code: catOrder[index],
      label: CODE_TO_LABEL[catOrder[index]] ?? catOrder[index],
      prob,
    } satisfies CheckAiClientScore;
  })
    .sort((left, right) => right.prob - left.prob)
    .slice(0, 3);
}
