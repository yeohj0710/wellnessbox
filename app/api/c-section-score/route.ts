export const dynamic = "force-dynamic";

import path from "path";
import fs from "fs/promises";

type Payload = {
  cats: string[];
  answers: number[][];
};

let sessionPromise: Promise<any> | null = null;
let catOrderPromise: Promise<string[]> | null = null;

function normAnswers(ans: number[][]): Float32Array {
  const b = ans.length;
  const arr = new Float32Array(b * 5);
  for (let i = 0; i < b; i++) {
    for (let j = 0; j < 5; j++) {
      let v = ans[i][j];
      if (v > 1) v = v / 3;
      if (v < 0) v = 0;
      if (v > 1) v = 1;
      arr[i * 5 + j] = v;
    }
  }
  return arr;
}

async function loadCatOrder(): Promise<string[]> {
  if (!catOrderPromise) {
    const p = path.join(
      process.cwd(),
      "public",
      "assess-model",
      "c-section-scorer-v1.cats.json"
    );
    catOrderPromise = fs
      .readFile(p, "utf-8")
      .then((d) => JSON.parse(d).cat_order as string[]);
  }
  return catOrderPromise;
}

async function loadSession(): Promise<any> {
  if (!sessionPromise) {
    const ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const wasmDir = path.join(process.cwd(), "public", "onnx") + path.sep;
    ort.env.wasm.wasmPaths = wasmDir;
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    if (
      !body ||
      !Array.isArray(body.cats) ||
      !Array.isArray(body.answers) ||
      body.cats.length !== body.answers.length
    ) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cats = body.cats;
    const ans = body.answers;

    for (const row of ans) {
      if (!Array.isArray(row) || row.length !== 5) {
        return new Response(
          JSON.stringify({ error: "Each category must have 5 answers" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const ort = await import("onnxruntime-web");
    const [order, sess] = await Promise.all([loadCatOrder(), loadSession()]);

    const catIndexes = cats.map((c) => order.indexOf(c));
    if (catIndexes.some((i) => i < 0)) {
      return new Response(
        JSON.stringify({ error: "Unknown category in payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const ids = BigInt64Array.from(catIndexes.map((i) => BigInt(i)));

    const catTensor = new ort.Tensor("int64", ids, [cats.length]);
    const ansTensor = new ort.Tensor("float32", normAnswers(ans), [
      ans.length,
      5,
    ]);
    const output = await sess.run({ cat_ids: catTensor, answers: ansTensor });

    const scores = Array.from(output["score_0_1"].data as Float32Array);
    const percents = Array.from(output["percent_0_1"].data as Float32Array);
    const indices = Array.from(
      output["topk_indices"].data as BigInt64Array,
      (v) => Number(v)
    );

    const catsOrdered = indices.map((i) => cats[i]);
    const scoresOrdered = indices.map((i) => scores[i]);
    const percentsOrdered = indices.map((i) => percents[i]);

    return new Response(
      JSON.stringify({
        catsOrdered,
        scores: scoresOrdered,
        percents: percentsOrdered,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
