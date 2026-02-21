export type NhisFetchFailure = {
  target: string;
  errCd?: string | null;
  errMsg?: string | null;
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
        list?: unknown[];
        summary?: {
          totalCount: number;
          recentLines: string[];
        };
      };
      medication?: {
        list?: unknown[];
        summary?: {
          totalCount: number;
          recentLines: string[];
        };
      };
      healthAge?: {
        healthAge: string | number | null;
        realAge: string | number | null;
        checkupDate: string | null;
        advice: string | null;
        riskFactorTable: unknown;
      };
    };
    raw?: {
      medical?: unknown;
      medication?: unknown;
      healthAge?: unknown;
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
