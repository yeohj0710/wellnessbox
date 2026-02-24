import {
  RND_MODULE_07_DATA_SOURCES,
  RND_MODULE_07_NAME,
  type RndModule07AlgorithmAdjustment,
  type RndModule07DataSource,
  type RndModule07IntegrationSession,
  type RndModule07SourceSummary,
} from "./contracts";
import type { RndDataSensitivity, RndModule02SourceKind } from "../module02-data-lake/contracts";

export const MODULE07_MVP_PHASE = "MVP" as const;
export const MODULE07_MVP_RUN_ID_PREFIX = "rnd07-mvp-run" as const;

export function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

export function toRate(successfulSessions: number, totalSessions: number): number {
  if (totalSessions <= 0) return 0;
  return Number(((successfulSessions / totalSessions) * 100).toFixed(2));
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

export function buildRunId(generatedAt: string): string {
  const token = generatedAt.replace(/[^0-9]/g, "");
  return `${MODULE07_MVP_RUN_ID_PREFIX}-${token}`;
}

export function mapSourceToModule02SourceKind(
  source: RndModule07DataSource
): RndModule02SourceKind {
  switch (source) {
    case "wearable":
      return "internal_behavior";
    case "continuous_glucose":
      return "internal_behavior";
    case "genetic_test":
      return "internal_profile";
    default: {
      const exhaustiveCheck: never = source;
      throw new Error(`Unsupported Module 07 source: ${exhaustiveCheck}`);
    }
  }
}

export function mapSourceToSensitivity(source: RndModule07DataSource): RndDataSensitivity {
  return source === "genetic_test" ? "sensitive" : "internal";
}

export function groupBySessionId<T extends { sessionId: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const existing = map.get(row.sessionId) ?? [];
    existing.push(row);
    map.set(row.sessionId, existing);
  }
  return map;
}

export function groupAdjustmentsByUserId(
  rows: RndModule07AlgorithmAdjustment[]
): Map<string, RndModule07AlgorithmAdjustment[]> {
  const map = new Map<string, RndModule07AlgorithmAdjustment[]>();
  for (const row of rows) {
    const existing = map.get(row.appUserIdHash) ?? [];
    existing.push(row);
    map.set(row.appUserIdHash, existing);
  }
  return map;
}

export function sortByKey<T>(rows: T[], selector: (row: T) => string): T[] {
  return [...rows].sort((left, right) =>
    selector(left).localeCompare(selector(right))
  );
}

export function buildSourceSummaries(
  sessions: RndModule07IntegrationSession[]
): RndModule07SourceSummary[] {
  return RND_MODULE_07_DATA_SOURCES.map((source) => {
    const sourceSessions = sessions.filter((session) => session.source === source);
    const totalSessions = sourceSessions.length;
    const successfulSessions = sourceSessions.filter(
      (session) => session.status === "success"
    ).length;
    const sampleCount = sourceSessions.reduce(
      (sum, session) => sum + session.recordsAccepted,
      0
    );
    return {
      source,
      totalSessions,
      successfulSessions,
      sampleCount,
      integrationRate: toRate(successfulSessions, totalSessions),
    };
  });
}
