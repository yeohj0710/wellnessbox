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
  };
  error?: string;
};

export type NhisFetchResponse = {
  ok: boolean;
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
};

export type NhisActionResponse = {
  ok: boolean;
  error?: string;
  errCd?: string | null;
  errMsg?: string | null;
};

export type HealthLinkClientProps = {
  loggedIn: boolean;
};

export type ActionKind = null | "init" | "sign" | "fetch" | "unlink" | "status";

export type WorkflowStep = {
  id: "status" | "auth" | "sync";
  title: string;
  subtitle: string;
};
