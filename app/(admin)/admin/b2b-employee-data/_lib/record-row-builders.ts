import { compactJson, formatDateTime } from "./client-utils";
import type { EmployeeOpsResponse } from "./client-types";
import type { RecordListRow } from "../_components/RecordListSection";

export type EmployeeRecordRowsByGroup = {
  healthSnapshots: RecordListRow[];
  surveyResponses: RecordListRow[];
  analysisResults: RecordListRow[];
  pharmacistNotes: RecordListRow[];
  reports: RecordListRow[];
  accessLogs: RecordListRow[];
  adminActionLogs: RecordListRow[];
};

export function buildEmployeeRecordRowsByGroup(
  opsData: EmployeeOpsResponse
): EmployeeRecordRowsByGroup {
  return {
    healthSnapshots: opsData.records.healthSnapshots.map((row) => ({
      id: row.id,
      recordType: "healthSnapshot",
      metaText: `${row.periodKey || "-"} · ${formatDateTime(row.fetchedAt)} · ${compactJson(
        row.normalizedShape,
        90
      )}`,
      payload: row.normalizedJson,
    })),
    surveyResponses: opsData.records.surveyResponses.map((row) => ({
      id: row.id,
      recordType: "surveyResponse",
      metaText: `${row.periodKey || "-"} · 응답 ${row.answers.length}개 · ${formatDateTime(
        row.updatedAt
      )}`,
      payload: row.answersJson,
    })),
    analysisResults: opsData.records.analysisResults.map((row) => ({
      id: row.id,
      recordType: "analysisResult",
      metaText: `v${row.version} · ${row.periodKey || "-"} · ${formatDateTime(row.updatedAt)}`,
      payload: row.payload,
    })),
    pharmacistNotes: opsData.records.pharmacistNotes.map((row) => ({
      id: row.id,
      recordType: "pharmacistNote",
      metaText: `${row.periodKey || "-"} · ${formatDateTime(row.updatedAt)} · ${
        row.note?.slice(0, 60) || "-"
      }`,
    })),
    reports: opsData.records.reports.map((row) => ({
      id: row.id,
      recordType: "report",
      metaText: `${row.periodKey || "-"} · ${row.status} · ${formatDateTime(row.updatedAt)}`,
      payload: row.reportPayload,
    })),
    accessLogs: opsData.records.accessLogs.map((row) => ({
      id: row.id,
      recordType: "accessLog",
      metaText: `${row.action} · ${formatDateTime(row.createdAt)}`,
      payload: row.payload,
    })),
    adminActionLogs: opsData.records.adminActionLogs.map((row) => ({
      id: row.id,
      recordType: "adminActionLog",
      metaText: `${row.action} · ${formatDateTime(row.createdAt)}`,
      payload: row.payload,
    })),
  };
}

export function buildHealthLinkRecordRows(
  opsData: EmployeeOpsResponse
): { fetchCaches: RecordListRow[]; fetchAttempts: RecordListRow[] } | null {
  if (!opsData.healthLink) return null;
  const fetchCaches: RecordListRow[] = opsData.healthLink.fetchCaches.map((row) => ({
    id: row.id,
    recordType: "healthFetchCache",
    metaText: `${row.ok ? "성공" : "실패"} · ${formatDateTime(row.fetchedAt)} · targets: ${row.targets.join(
      ","
    )}`,
  }));
  const fetchAttempts: RecordListRow[] = opsData.healthLink.fetchAttempts.map((row) => ({
    id: row.id,
    recordType: "healthFetchAttempt",
    metaText: `${row.forceRefresh ? "강제조회" : "일반조회"} · ${
      row.cached ? "캐시" : "원격"
    } · ${formatDateTime(row.createdAt)}`,
  }));
  return { fetchCaches, fetchAttempts };
}
