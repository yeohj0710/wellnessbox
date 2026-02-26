import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type { ExportApiFailure, ReportAudit } from "./client-types";

export class ExportApiError extends Error {
  payload: ExportApiFailure;

  constructor(payload: ExportApiFailure) {
    super(payload.error || "내보내기에 실패했습니다.");
    this.name = "ExportApiError";
    this.payload = payload;
  }
}

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatDateTime(raw: string | null | undefined) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("ko-KR");
}

export function formatRelativeTime(raw: string | null | undefined) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "방금";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "방금";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 172800) return "어제";
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const message = (data as { error?: string })?.error || "요청 처리에 실패했습니다.";
    throw new Error(message);
  }
  return data;
}

export function parseLayoutDsl(raw: unknown): LayoutDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const layout = raw as LayoutDocument;
  if (!Array.isArray(layout.pages) || layout.pages.length === 0) return null;
  if (!layout.pageSizeMm || typeof layout.pageSizeMm.width !== "number") return null;
  return layout;
}

export function toInputValue(raw: unknown) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) return raw.join(", ");
  return "";
}

export function toMultiValues(raw: unknown) {
  if (Array.isArray(raw)) return raw.map((item) => String(item)).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(/[,\n/|]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function extractIssuesFromAudit(audit: ReportAudit | null | undefined) {
  const entries = audit?.validation ?? [];
  const selectedStage = audit?.selectedStage;
  const selectedStylePreset = audit?.selectedStylePreset;
  const selected = [...entries].reverse().find((entry) => {
    if (!selectedStage || entry.stage !== selectedStage) return false;
    if (!selectedStylePreset) return true;
    return entry.stylePreset === selectedStylePreset;
  });
  if (selected?.issues?.length) return selected.issues;
  const selectedStageOnly = [...entries]
    .reverse()
    .find((entry) => selectedStage && entry.stage === selectedStage && entry.issues?.length);
  if (selectedStageOnly?.issues?.length) return selectedStageOnly.issues;
  const latest = [...entries].reverse().find((entry) => entry.issues?.length);
  return latest?.issues ?? [];
}

function formatBounds(issue: LayoutValidationIssue) {
  const first = issue.nodeBounds;
  const second = issue.relatedNodeBounds;
  const firstText = first
    ? `x:${first.x.toFixed(1)} y:${first.y.toFixed(1)} w:${first.w.toFixed(1)} h:${first.h.toFixed(
        1
      )}`
    : "-";
  const secondText = second
    ? ` / 상대 x:${second.x.toFixed(1)} y:${second.y.toFixed(1)} w:${second.w.toFixed(
        1
      )} h:${second.h.toFixed(1)}`
    : "";
  return `${firstText}${secondText}`;
}

export function formatIssueDebug(issue: LayoutValidationIssue) {
  const page = issue.pageId || "-";
  const node = issue.nodeId || "-";
  const related = issue.relatedNodeId ? ` / related:${issue.relatedNodeId}` : "";
  return `page:${page} / node:${node}${related} / ${formatBounds(issue)}`;
}

export function mergePeriods(...groups: Array<Array<string> | undefined>) {
  const set = new Set<string>();
  for (const group of groups) {
    if (!group) continue;
    for (const period of group) if (period) set.add(period);
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = header.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
  const encoded = match?.[1] || match?.[2];
  if (!encoded) return fallback;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export async function downloadFromApi(url: string, fallbackName: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as ExportApiFailure;
    throw new ExportApiError(data);
  }
  const blob = await response.blob();
  const filename = filenameFromDisposition(
    response.headers.get("content-disposition"),
    fallbackName
  );
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
