import type { HyphenApiResponse } from "@/lib/server/hyphen/client";
import type { NhisHealthAgeSummary } from "@/lib/server/hyphen/normalize-types";
import {
  asArray,
  asPrimitive,
  asRecord,
  asTextOrNumber,
  getPayloadData,
} from "@/lib/server/hyphen/normalize-shared";

export function normalizeHealthAge(payload: HyphenApiResponse): NhisHealthAgeSummary {
  const root = getPayloadData(payload);
  const firstListRecord = asArray(root.list)
    .map((item) => asRecord(item))
    .find((item): item is Record<string, unknown> => item !== null);
  const source = firstListRecord ?? root;

  const healthAge = asTextOrNumber(source.healthAge ?? source.health_age ?? source.hAge);
  const realAge = asTextOrNumber(source.age ?? source.realAge ?? source.real_age ?? source.rAge);
  const checkupDate = asPrimitive(
    source.date ?? source.checkupDate ?? source.checkup_date ?? source.examDate
  );
  const advice = asPrimitive(source.advice ?? source.summary ?? source.memo ?? source.comment);
  const riskFactorTable =
    source.riskFactorTable ??
    source.risk_factor_table ??
    source.riskFactors ??
    source.riskFactorList ??
    source.riskTable ??
    [];

  return {
    healthAge,
    realAge,
    checkupDate: typeof checkupDate === "string" ? checkupDate : null,
    advice: typeof advice === "string" ? advice : null,
    riskFactorTable,
  };
}
