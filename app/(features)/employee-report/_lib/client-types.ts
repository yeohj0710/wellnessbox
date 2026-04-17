import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import type {
  LatestReport,
  ReportListItem,
} from "@/lib/b2b/admin-report-contract";

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
  latestReport?: {
    id: string;
    variantIndex: number;
    status: string;
    updatedAt: string;
  } | null;
};

export type EmployeeSessionUpsertResponse = {
  ok: boolean;
  found: boolean;
  hasReport?: boolean;
  report?: {
    id: string;
    variantIndex: number;
    status: string;
  } | null;
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
    networkFetched?: boolean;
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

export type EmployeeSyncStateSnapshot = {
  status: "idle" | "queued" | "awaiting_sign" | "running" | "completed" | "failed";
  step: "init" | "sign" | "fetch" | "report" | null;
  periodKey: string;
  requestedAt: string | null;
  startedAt: string | null;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  completedAt: string | null;
  attemptCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lastResultSource: string | null;
  lastSnapshotId: string | null;
  lastReportId: string | null;
  active: boolean;
};

export type EmployeeCurrentStatusSnapshot = {
  hasAnyWorkspaceData: boolean;
  health: {
    complete: boolean;
    snapshotId: string | null;
    fetchedAt: string | null;
    latestSnapshotId: string | null;
    latestFetchedAt: string | null;
    latestPeriodKey: string | null;
  };
  survey: {
    complete: boolean;
    responseId: string | null;
    submittedAt: string | null;
    updatedAt: string | null;
    latestResponseId: string | null;
    latestSubmittedAt: string | null;
    latestPeriodKey: string | null;
  };
  report: {
    available: boolean;
    reportId: string | null;
    updatedAt: string | null;
  };
  ready: boolean;
};

export type EmployeeWorkspaceResponse = {
  ok: boolean;
  employee?: {
    id: string;
    name: string;
    appUserId: string | null;
    lastSyncedAt: string | null;
    lastViewedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  currentPeriodKey?: string;
  requestedPeriodKey?: string;
  selectedPeriodKey?: string | null;
  selectedReportId?: string | null;
  report?: LatestReport | null;
  reports?: ReportListItem[];
  availablePeriods?: string[];
  sync?: EmployeeSyncStateSnapshot;
  currentStatus?: EmployeeCurrentStatusSnapshot;
  error?: string;
};

export type EmployeeWorkspaceStartResponse = EmployeeWorkspaceResponse & {
  scheduledHealthSync?: boolean;
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
