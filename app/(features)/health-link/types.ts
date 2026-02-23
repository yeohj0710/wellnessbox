export type NhisFetchFailure = {
  target: string;
  errCd?: string | null;
  errMsg?: string | null;
};

export type NhisPrimitive = string | number | boolean | null;
export type NhisDataRow = Record<string, NhisPrimitive>;

export type NhisListSummary = {
  totalCount: number;
  recentLines: string[];
  peopleCount?: number;
  detailCount?: number;
};

export type NhisCheckupSummary = {
  listCount: number;
  yearlyCount: number;
  overviewCount: number;
  yearCount: number;
  peopleCount: number;
  recentLines: string[];
};

export type NhisRecommendationSummary = {
  diagnosisTimeline: NhisDataRow[];
  medicationTimeline: NhisDataRow[];
  activeIngredients: string[];
  cautions: string[];
  checkupFindings: NhisDataRow[];
};

export type NhisAiSummary = {
  source?: "openai" | "fallback";
  model?: string;
  generatedAt?: string;
  headline: string;
  summary: string;
  highlights: string[];
  nextSteps: string[];
  riskLevel?: "low" | "medium" | "high" | "unknown";
};

export type NhisStatusResponse = {
  ok: boolean;
  status?: {
    linked: boolean;
    provider: string;
    loginMethod: string | null;
    loginOrgCd: string | null;
    lastLinkedAt: string | null;
    lastFetchedAt: string | null;
    lastError: { code: string | null; message: string | null } | null;
    hasStepData: boolean;
    hasCookieData: boolean;
    pendingAuthReady: boolean;
    forceRefresh?: {
      available: boolean;
      cooldownSeconds: number;
      remainingSeconds: number;
      availableAt: string | null;
    };
    targetPolicy?: {
      highCostTargetsEnabled: boolean;
      allowedTargets: string[];
    };
    cache?: {
      totalEntries: number;
      validEntries: number;
      summaryAvailable: boolean;
      summarySource?: "valid" | "history" | null;
      latestFetchedAt: string | null;
      latestExpiresAt: string | null;
      latestHitAt: string | null;
      latestHitCount: number;
    };
    latestFetchAttemptAt?: string | null;
    fetchBudget?: {
      windowHours: number;
      fresh: {
        used: number;
        limit: number;
        remaining: number;
      };
      forceRefresh: {
        used: number;
        limit: number;
        remaining: number;
      };
    };
  };
  error?: string;
};

export type NhisFetchResponse = {
  ok: boolean;
  cached?: boolean;
  forceRefreshGuarded?: boolean;
  forceRefreshAgeSeconds?: number | null;
  forceRefreshGuardSeconds?: number | null;
  cache?: {
    source?: string;
    stale?: boolean;
    fetchedAt?: string | null;
    expiresAt?: string | null;
  };
  partial?: boolean;
  failed?: NhisFetchFailure[];
  data?: {
    normalized?: {
      medical?: {
        list?: NhisDataRow[];
        summary?: NhisListSummary;
      };
      medication?: {
        list?: NhisDataRow[];
        summary?: NhisListSummary;
      };
      checkup?: {
        list?: NhisDataRow[];
        yearly?: NhisDataRow[];
        overview?: NhisDataRow[];
        summary?: NhisCheckupSummary;
      };
      healthAge?: {
        healthAge: string | number | null;
        realAge: string | number | null;
        checkupDate: string | null;
        advice: string | null;
        riskFactorTable: unknown;
      };
      recommendation?: NhisRecommendationSummary;
      aiSummary?: NhisAiSummary;
    };
    raw?: {
      medical?: unknown;
      medication?: unknown;
      checkupList?: unknown;
      checkupYearly?: unknown;
      checkupOverview?: unknown;
      healthAge?: unknown;
      checkupListByYear?: unknown;
    };
  };
  error?: string;
  errCd?: string | null;
  errMsg?: string | null;
  retryAfterSec?: number;
  blockedTargets?: string[];
  budget?: {
    windowHours: number;
    fresh: {
      used: number;
      limit: number;
      remaining: number;
    };
    forceRefresh: {
      used: number;
      limit: number;
      remaining: number;
    };
  };
};

export type NhisActionResponse = {
  ok: boolean;
  reused?: boolean;
  linked?: boolean;
  nextStep?: "sign" | "fetch";
  source?: string;
  error?: string;
  errCd?: string | null;
  errMsg?: string | null;
  retryAfterSec?: number;
  blockedTargets?: string[];
  budget?: {
    windowHours: number;
    fresh: {
      used: number;
      limit: number;
      remaining: number;
    };
    forceRefresh: {
      used: number;
      limit: number;
      remaining: number;
    };
  };
};

export type HealthLinkClientProps = {
  loggedIn: boolean;
};

export type ActionKind =
  | null
  | "init"
  | "sign"
  | "fetch"
  | "fetchDetail"
  | "unlink"
  | "status";

export type WorkflowStep = {
  id: "status" | "auth" | "sync";
  title: string;
  subtitle: string;
};
