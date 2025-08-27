import fs from 'fs/promises';
import path from 'path';
import { InferenceSession, Tensor } from 'onnxruntime-node';

let catOrderPromise: Promise<string[]> | null = null;
let sessionPromise: Promise<InferenceSession> | null = null;

async function loadCatOrder(): Promise<string[]> {
  if (!catOrderPromise) {
    const p = path.join(
      process.cwd(),
      'assess',
      'model',
      'c-section-scorer-v1.cats.json'
    );
    catOrderPromise = fs
      .readFile(p, 'utf-8')
      .then((d) => (JSON.parse(d).cat_order as string[]));
  }
  return catOrderPromise;
}

async function loadSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    const p = path.join(
      process.cwd(),
      'assess',
      'model',
      'c-section-scorer-v1.onnx'
    );
    sessionPromise = InferenceSession.create(p);
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
      arr[i * 5 + j] = v;
    }
  }
  return arr;
}

export async function run(
  cats: string[],
  answers: number[][]
): Promise<{ catsOrdered: string[]; scores: number[]; percents: number[] }> {
  const [sess] = await Promise.all([loadSession(), loadCatOrder()]);
  const catTensor = new Tensor('int64', await mapCats(cats), [cats.length]);
  const ansTensor = new Tensor('float32', normAnswers(answers), [
    answers.length,
    5,
  ]);
  const output = await sess.run({ cat_ids: catTensor, answers: ansTensor });
  const scores = Array.from(output.score_0_1.data as Float32Array);
  const percents = Array.from(output.percent_0_1.data as Float32Array);
  const indices = Array.from(
    output.topk_indices.data as BigInt64Array,
    (v) => Number(v)
  );
  const catsOrdered = indices.map((i) => cats[i]);
  const scoresOrdered = indices.map((i) => scores[i]);
  const percentsOrdered = indices.map((i) => percents[i]);
  return { catsOrdered, scores: scoresOrdered, percents: percentsOrdered };
}
