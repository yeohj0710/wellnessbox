// RND: Module 03 KPI #6 deterministic adverse-event fixture builder.

import type { RndModule03AppliedRuleResult } from "../../../lib/rnd/module03-personal-safety/contracts";
import type { Module03AdverseEventSample } from "../../../lib/rnd/module03-personal-safety/evaluation";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be a valid ISO datetime string.`);
  }
}

function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
}

export function buildModule03AdverseEventSamples(
  appliedResults: RndModule03AppliedRuleResult[],
  eventCount: number,
  evaluatedAt: string
): Module03AdverseEventSample[] {
  if (!Array.isArray(appliedResults) || appliedResults.length === 0) {
    throw new Error("At least one Module 03 applied result is required to seed KPI #6 samples.");
  }
  assertPositiveInteger(eventCount, "eventCount");
  assertIsoDateTime(evaluatedAt, "evaluatedAt");

  const sortedSeeds = [...appliedResults].sort((left, right) =>
    left.resultId.localeCompare(right.resultId)
  );
  const evaluatedAtMs = Date.parse(evaluatedAt);

  return Array.from({ length: eventCount }, (_, index) => {
    const seed = sortedSeeds[index % sortedSeeds.length];
    const ordinal = index + 1;
    const suffix = String(ordinal).padStart(3, "0");
    const linkedToEngineRecommendation = ordinal <= 4;
    const includedIn12MonthWindow = ordinal <= 8;
    const lookbackDays = includedIn12MonthWindow ? ordinal * 28 : 380 + ordinal;
    const reportedAt = new Date(evaluatedAtMs - lookbackDays * DAY_IN_MS).toISOString();

    return {
      sampleId: `m03-kpi06-sample-${suffix}`,
      eventId: `m03-kpi06-event-${suffix}`,
      caseId: seed.caseId,
      reportedAt,
      linkedToEngineRecommendation,
    };
  });
}
