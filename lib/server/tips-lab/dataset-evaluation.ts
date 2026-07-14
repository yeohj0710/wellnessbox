import "server-only";

import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";
import modelSnapshotJson from "@/data/tips/proxy-recommendation-model.json";
import { blindProfileTokens, predictProxyTokens, type BlindProfile, type ProxyModelSnapshot } from "@/lib/tips/proxy-model-engine";

export const DATASET_SPLITS = ["train", "validation", "calibration", "blind_test"] as const;
export type DatasetSplit = (typeof DATASET_SPLITS)[number];

type DatasetRow = {
  case_id: string;
  archetype_id: string;
  split: DatasetSplit;
  label_class: string;
  teacher_session: string;
  profile: BlindProfile;
  proxy_gold_label: { consider: string[]; avoid: string[]; abstain: boolean; risk_tier: number; safety_rule_ids: string[] };
  verifier: { decision: string; detected_disagreement: boolean };
};

const model = modelSnapshotJson as ProxyModelSnapshot;
const metadata: Record<DatasetSplit, { label: string; records: number; use: string; scoring: string; file: string }> = {
  train: { label: "학습", records: 120000, use: "모델 계수 학습", scoring: "학습 적합도 재계산", file: "proxy_cases.train.jsonl.gz" },
  validation: { label: "검증", records: 15000, use: "모델 선택·일반화 확인", scoring: "전체 사례 재채점", file: "proxy_cases.validation.jsonl.gz" },
  calibration: { label: "보정", records: 10000, use: "추천 개수·판정 기준 보정", scoring: "전체 사례 재채점", file: "proxy_cases.calibration.jsonl.gz" },
  blind_test: { label: "독립 시험", records: 5000, use: "최종 고정 모델 평가", scoring: "전체 사례 재채점", file: "proxy_cases.blind_test.jsonl.gz" },
};

function splitFrom(value: unknown): DatasetSplit {
  const split = String(value ?? "blind_test");
  if (!DATASET_SPLITS.includes(split as DatasetSplit)) throw new Error("invalid_dataset_split");
  return split as DatasetSplit;
}

function rows(split: DatasetSplit) {
  const file = path.join(process.cwd(), "data", "tips", "datasets", metadata[split].file);
  const text = gunzipSync(readFileSync(file)).toString("utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line) as DatasetRow);
}

function score(row: DatasetRow) {
  const prediction = predictProxyTokens(model, blindProfileTokens(row.profile));
  const gold = [...row.proxy_gold_label.consider].sort();
  const predicted = [...prediction.predicted].sort();
  return { predicted, gold, exactMatch: JSON.stringify(predicted) === JSON.stringify(gold) };
}

export function datasetRegistry() {
  return {
    source: "C:/dev/wellnessbox-rnd/artifacts/tips/interim/retrained/datasets",
    labelClass: "PROXY_GOLD_SIMULATION",
    model: { type: "One-vs-rest SGD logistic classifier", features: 93, ingredients: 14 },
    splits: DATASET_SPLITS.map((id) => ({ id, ...metadata[id] })),
  };
}

export function listDatasetCases(input: Record<string, unknown>) {
  const split = splitFrom(input.split);
  const all = rows(split);
  const query = String(input.query ?? "").trim().toLowerCase().slice(0, 100);
  const selected = query ? all.filter((row) => row.case_id.toLowerCase().includes(query) || row.archetype_id.toLowerCase().includes(query)) : all;
  const pageSize = Math.min(25, Math.max(1, Number(input.pageSize) || 10));
  const pages = Math.max(1, Math.ceil(selected.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number(input.page) || 1));
  return {
    split,
    total: all.length,
    filtered: selected.length,
    page,
    pages,
    rows: selected.slice((page - 1) * pageSize, page * pageSize).map((row) => ({
      caseId: row.case_id, archetypeId: row.archetype_id, profile: row.profile,
      gold: row.proxy_gold_label.consider, avoid: row.proxy_gold_label.avoid,
      abstain: row.proxy_gold_label.abstain, riskTier: row.proxy_gold_label.risk_tier,
      safetyRuleIds: row.proxy_gold_label.safety_rule_ids, teacherSession: row.teacher_session,
      verifierDecision: row.verifier.decision, labelClass: row.label_class,
    })),
  };
}

export function verifyDatasetSplit(input: Record<string, unknown>) {
  const split = splitFrom(input.split);
  const all = rows(split);
  let exactMatches = 0;
  let recommendationSlots = 0;
  let correctSlots = 0;
  for (const row of all) {
    const result = score(row);
    if (result.exactMatch) exactMatches += 1;
    const gold = new Set(result.gold);
    recommendationSlots += result.predicted.length;
    correctSlots += result.predicted.filter((item) => gold.has(item)).length;
  }
  return {
    split,
    label: metadata[split].label,
    evaluationKind: split === "train" ? "TRAIN_RESUBSTITUTION" : "HELD_OUT_REPLAY",
    evaluated: all.length,
    exactMatches,
    mismatches: all.length - exactMatches,
    exactMatchPercent: all.length ? exactMatches / all.length * 100 : 0,
    setPrecisionPercent: recommendationSlots ? correctSlots / recommendationSlots * 100 : 0,
    recomputedAt: new Date().toISOString(),
  };
}
