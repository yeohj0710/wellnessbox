import fs from "fs/promises";
import path from "path";

let catOrderPromise: Promise<string[]> | null = null;
let sessionPromise: Promise<any> | null = null;

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

async function loadSession() {
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

export async function getCatOrder(): Promise<string[]> {
  return loadCatOrder();
}

export async function mapCats(cats: string[]): Promise<BigInt64Array> {
  const order = await loadCatOrder();
  const ids = cats.map((c) => BigInt(order.indexOf(c)));
  return BigInt64Array.from(ids);
}

export function normAnswers(ans: number[][]): Float32Array {
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

export async function run(
  cats: string[],
  answers: number[][]
): Promise<{ catsOrdered: string[]; scores: number[]; percents: number[] }> {
  const ort = await import("onnxruntime-web");
  const sess = await loadSession();
  const catTensor = new ort.Tensor("int64", await mapCats(cats), [cats.length]);
  const ansTensor = new ort.Tensor("float32", normAnswers(answers), [
    answers.length,
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
  return { catsOrdered, scores: scoresOrdered, percents: percentsOrdered };
}
