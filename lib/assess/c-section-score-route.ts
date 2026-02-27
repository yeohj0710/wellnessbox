import path from "path";
import fs from "fs/promises";
import { z } from "zod";

type OrtModule = typeof import("onnxruntime-web");
type OrtSession = Awaited<ReturnType<OrtModule["InferenceSession"]["create"]>>;

const payloadSchema = z
  .object({
    cats: z.array(z.string().trim().min(1)),
    answers: z.array(z.array(z.number()).length(5)),
  })
  .superRefine((value, ctx) => {
    if (value.cats.length !== value.answers.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cats and answers length must match",
      });
    }
  });

let ortPromise: Promise<OrtModule> | null = null;
let sessionPromise: Promise<OrtSession> | null = null;
let catOrderPromise: Promise<string[]> | null = null;

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeAnswers(answers: number[][]): Float32Array {
  const batch = answers.length;
  const arr = new Float32Array(batch * 5);
  for (let i = 0; i < batch; i++) {
    for (let j = 0; j < 5; j++) {
      let value = answers[i][j];
      if (value > 1) value = value / 3;
      if (value < 0) value = 0;
      if (value > 1) value = 1;
      arr[i * 5 + j] = value;
    }
  }
  return arr;
}

async function loadOrtModule() {
  if (!ortPromise) {
    ortPromise = import("onnxruntime-web");
  }
  return ortPromise;
}

async function loadCatOrder(): Promise<string[]> {
  if (!catOrderPromise) {
    const filePath = path.join(
      process.cwd(),
      "public",
      "assess-model",
      "c-section-scorer-v1.cats.json"
    );
    catOrderPromise = fs
      .readFile(filePath, "utf-8")
      .then((raw) => JSON.parse(raw).cat_order as string[]);
  }
  return catOrderPromise;
}

async function loadSession(): Promise<OrtSession> {
  if (!sessionPromise) {
    const ort = await loadOrtModule();
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = path.join(process.cwd(), "public", "onnx") + path.sep;

    const modelPath = path.join(
      process.cwd(),
      "public",
      "assess-model",
      "c-section-scorer-v1.onnx"
    );
    sessionPromise = ort.InferenceSession.create(modelPath);
  }
  return sessionPromise;
}

export function parseCSectionScorePayload(raw: unknown) {
  return payloadSchema.safeParse(raw);
}

export async function runCSectionScore(input: {
  cats: string[];
  answers: number[][];
}) {
  const [ort, order, session] = await Promise.all([
    loadOrtModule(),
    loadCatOrder(),
    loadSession(),
  ]);

  const catIndexes = input.cats.map((category) => order.indexOf(category));
  if (catIndexes.some((index) => index < 0)) {
    return {
      ok: false as const,
      response: jsonResponse({ error: "Unknown category in payload" }, 400),
    };
  }

  const catIds = BigInt64Array.from(catIndexes.map((index) => BigInt(index)));
  const catTensor = new ort.Tensor("int64", catIds, [input.cats.length]);
  const answerTensor = new ort.Tensor("float32", normalizeAnswers(input.answers), [
    input.answers.length,
    5,
  ]);

  const output = await session.run({ cat_ids: catTensor, answers: answerTensor });
  const scores = Array.from(output["score_0_1"].data as Float32Array);
  const percents = Array.from(output["percent_0_1"].data as Float32Array);
  const indices = Array.from(
    output["topk_indices"].data as BigInt64Array,
    (value) => Number(value)
  );

  return {
    ok: true as const,
    response: jsonResponse(
      {
        catsOrdered: indices.map((index) => input.cats[index]),
        scores: indices.map((index) => scores[index]),
        percents: indices.map((index) => percents[index]),
      },
      200
    ),
  };
}

export function toCSectionPayloadInvalidResponse(message: string) {
  return jsonResponse({ error: message }, 400);
}

export function toCSectionInternalErrorResponse(error: unknown) {
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Internal error";
  return jsonResponse({ error: message }, 500);
}

export async function runCSectionScorePostRoute(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return toCSectionPayloadInvalidResponse("Invalid payload");
    }

    const parsed = parseCSectionScorePayload(rawBody);
    if (!parsed.success) {
      return toCSectionPayloadInvalidResponse(
        parsed.error.issues[0]?.message || "Invalid payload"
      );
    }

    const result = await runCSectionScore({
      cats: parsed.data.cats,
      answers: parsed.data.answers,
    });
    return result.response;
  } catch (error) {
    return toCSectionInternalErrorResponse(error);
  }
}
