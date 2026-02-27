import { asArray, asRecord, toText } from "@/lib/b2b/report-payload-shared";

type HealthMetric = { metric: string; value: string; unit: string | null };

function normalizeCompact(text: string) {
  return text.replace(/\s+/g, "").trim();
}

function normalizeUnit(unit: string | null | undefined) {
  if (!unit) return null;
  const normalized = normalizeCompact(unit).toLowerCase();
  if (!normalized) return null;
  const table: Record<string, string> = {
    mmhg: "mmHg",
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "kg/m2": "kg/m2",
    "kg/m\u00b2": "kg/m2",
    cm: "cm",
    kg: "kg",
    bpm: "bpm",
    "%": "%",
  };
  return table[normalized] ?? unit.trim();
}

export function mergeValueWithUnit(value: string, unit: string | null) {
  if (!unit) return value;
  const compactValue = normalizeCompact(value).toLowerCase();
  const compactUnit = normalizeCompact(unit).toLowerCase();
  if (compactValue.includes(compactUnit)) return value;
  return `${value} ${unit}`.trim();
}

export function extractHealthMetrics(normalizedJson: unknown): HealthMetric[] {
  const normalized = asRecord(normalizedJson);
  const checkup = asRecord(normalized?.checkup);
  const overview = asArray(checkup?.overview);
  const metrics: HealthMetric[] = [];
  const seen = new Set<string>();

  for (const item of overview) {
    const row = asRecord(item);
    if (!row) continue;
    const metric = toText(row.itemName ?? row.metric ?? row.inspectItem ?? row.type);
    const valueRaw = toText(row.value ?? row.itemData ?? row.result);
    const unit = normalizeUnit(toText(row.unit) || null);
    if (!metric || !valueRaw) continue;
    const value = mergeValueWithUnit(valueRaw, unit);
    const uniqueKey = `${metric}|${value}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);
    metrics.push({ metric, value, unit });
    if (metrics.length >= 16) break;
  }

  return metrics;
}
