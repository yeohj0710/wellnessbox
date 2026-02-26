import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";

export type IdentityInput = {
  name: string;
  birthDate: string;
  phone: string;
};

export type EmployeeSessionGetResponse = {
  ok: boolean;
  authenticated?: boolean;
  employee?: {
    name: string;
    birthDate: string;
    phoneNormalized: string;
  };
};

export type EmployeeSessionUpsertResponse = {
  ok: boolean;
  found: boolean;
  message?: string;
};

export type EmployeeReportResponse = {
  ok: boolean;
  employee?: {
    id: string;
    name: string;
    lastSyncedAt: string | null;
  };
  report?: {
    id: string;
    variantIndex: number;
    status: string;
    pageSize: string;
    periodKey?: string;
    payload?: ReportSummaryPayload;
    layoutDsl?: unknown;
    exportAudit?: {
      validation?: Array<{ issues?: LayoutValidationIssue[] }>;
    } | null;
    updatedAt: string;
  };
  periodKey?: string;
  availablePeriods?: string[];
  error?: string;
};

export type NhisInitResponse = {
  ok: boolean;
  nextStep?: "sign" | "fetch";
  linked?: boolean;
  reused?: boolean;
  source?: string;
};

export type NhisSignResponse = {
  ok: boolean;
  linked?: boolean;
  reused?: boolean;
};

export type EmployeeSyncResponse = {
  ok: boolean;
  sync?: {
    source?: "fresh" | "cache-valid" | "cache-history" | "snapshot-history";
    forceRefresh?: boolean;
    cooldown?: {
      cooldownSeconds: number;
      remainingSeconds: number;
      availableAt: string | null;
    };
  };
  report?: {
    id: string;
  };
};

export type LoginStatusResponse = {
  isAdminLoggedIn?: boolean;
};

export type SyncGuidance = {
  code?: string;
  reason?: string;
  nextAction?: "init" | "sign" | "retry" | "wait";
  message: string;
  retryAfterSec?: number;
  availableAt?: string | null;
};

export type ApiErrorPayload = {
  error?: string;
  code?: string;
  reason?: string;
  nextAction?: "init" | "sign" | "retry" | "wait";
  retryAfterSec?: number;
  availableAt?: string;
  cooldown?: {
    cooldownSeconds?: number;
    remainingSeconds?: number;
    availableAt?: string | null;
  };
};
