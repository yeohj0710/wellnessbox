import bundleJson from "../../../data/tips/blind-test-cases.json";
import { selectBlindTestRows, summarizeBlindTests } from "@/lib/tips/blind-test-engine";
import modelSnapshotJson from "@/data/tips/proxy-recommendation-model.json";
import { blindProfileTokens, predictProxyTokens, type BlindProfile, type ProxyModelSnapshot } from "@/lib/tips/proxy-model-engine";

type BlindTestRow = (typeof bundleJson.rows)[number];

const modelSnapshot = modelSnapshotJson as ProxyModelSnapshot;
const evaluatedRows = bundleJson.rows.map((row) => {
  const live = predictProxyTokens(modelSnapshot, blindProfileTokens(row.profile as unknown as BlindProfile));
  const liveExactMatch = JSON.stringify([...row.gold].sort()) === JSON.stringify([...live.predicted].sort());
  const gold = new Set(row.gold);
  const liveSetPrecisionPercent = live.predicted.length ? (live.predicted.filter((id) => gold.has(id)).length / live.predicted.length) * 100 : row.gold.length ? 0 : 100;
  return { ...row, storedPredicted: row.predicted, predicted: live.predicted, exactMatch: liveExactMatch, setPrecisionPercent: liveSetPrecisionPercent, liveInference: { activeFeatureCount: live.activeFeatureCount, predictedCount: live.predictedCount } };
});

export function listBlindTests(input: Record<string, unknown>) {
  const selected = selectBlindTestRows(evaluatedRows, input);
  const pageSize = Math.min(50, Math.max(1, Number(input.pageSize) || 12));
  const pages = Math.max(1, Math.ceil(selected.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number(input.page) || 1));
  const start = (page - 1) * pageSize;
  return {
    source: bundleJson.sources,
    totalBlindTestRows: bundleJson.summary.total,
    filteredRows: selected.length,
    page,
    pages,
    pageSize,
    summary: summarizeBlindTests(selected),
    rows: selected.slice(start, start + pageSize),
  };
}

export function verifyBlindTests(input: Record<string, unknown>) {
  const selected = selectBlindTestRows(evaluatedRows, input);
  return {
    source: bundleJson.sources,
    filter: String(input.filter ?? "all"),
    query: String(input.query ?? ""),
    recomputedAt: new Date().toISOString(),
    summary: summarizeBlindTests(selected),
    disclosure: "이 재실행은 배포 모델이 AI 생성 프록시 정답을 재현하는지 검증합니다. 실제 환자 대상 임상 효과를 검증하지 않습니다.",
  };
}
