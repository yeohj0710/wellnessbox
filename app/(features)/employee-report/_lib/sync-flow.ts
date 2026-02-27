import { postEmployeeSync, requestNhisInit, requestNhisSign } from "./api";
import type {
  ApiErrorPayload,
  EmployeeSyncResponse,
  IdentityInput,
} from "./client-types";
import {
  ApiRequestError,
  saveStoredIdentity,
  toIdentityPayload,
  toSyncNextAction,
} from "./client-utils";

export type NhisReadyResult = {
  linked: boolean;
  reused: boolean;
};

export type SyncFlowResult =
  | {
      status: "ready";
      syncResult: EmployeeSyncResponse;
      ready: NhisReadyResult;
    }
  | {
      status: "pending-sign";
    };

export type RestartAuthFlowResult =
  | {
      status: "ready";
      reusedFromCache: boolean;
    }
  | {
      status: "pending-sign";
    };

export async function ensureNhisReadyForSync(params: {
  getIdentityPayload: () => IdentityInput;
  forceInit?: boolean;
}): Promise<NhisReadyResult> {
  const forceInit = params.forceInit === true;

  if (forceInit) {
    const initResult = await requestNhisInit({
      identity: params.getIdentityPayload(),
      forceInit: true,
    });
    if (initResult.linked || initResult.nextStep === "fetch") {
      return {
        linked: true,
        reused: initResult.reused === true || initResult.source === "db-history",
      };
    }
    return { linked: false, reused: false };
  }

  try {
    const signResult = await requestNhisSign();
    return {
      linked: signResult.linked === true,
      reused: signResult.reused === true,
    };
  } catch (err) {
    if (!(err instanceof ApiRequestError) || err.status !== 409) throw err;
    const initResult = await requestNhisInit({
      identity: params.getIdentityPayload(),
    });
    if (initResult.linked || initResult.nextStep === "fetch") {
      return {
        linked: true,
        reused: initResult.reused === true || initResult.source === "db-history",
      };
    }
    return { linked: false, reused: false };
  }
}

export async function syncEmployeeReportAndReload(params: {
  getIdentityPayload: () => IdentityInput;
  forceRefresh?: boolean;
  debugOverride?: boolean;
  selectedPeriodKey?: string;
  loadReport: (periodKey?: string) => Promise<void>;
  applyForceSyncCooldown: (payload: ApiErrorPayload | null | undefined) => void;
  persistIdentity?: (identity: IdentityInput) => void;
}): Promise<EmployeeSyncResponse> {
  const payload = toIdentityPayload(params.getIdentityPayload());
  const syncResult = await postEmployeeSync({
    identity: payload,
    forceRefresh: params.forceRefresh === true,
    debugOverride: params.debugOverride,
  });

  const persist = params.persistIdentity ?? saveStoredIdentity;
  persist(payload);

  if (syncResult.sync?.cooldown) {
    params.applyForceSyncCooldown({ cooldown: syncResult.sync.cooldown });
  }

  await params.loadReport(params.selectedPeriodKey || undefined);
  return syncResult;
}

export function isCachedSyncSource(
  source: NonNullable<EmployeeSyncResponse["sync"]>["source"] | undefined
) {
  return (
    source === "cache-valid" ||
    source === "cache-history" ||
    source === "snapshot-history"
  );
}

export async function runRestartAuthFlow(params: {
  getIdentityPayload: () => IdentityInput;
  syncEmployeeReport: (
    forceRefresh?: boolean,
    options?: { debugOverride?: boolean }
  ) => Promise<EmployeeSyncResponse>;
  debugOverride?: boolean;
}): Promise<RestartAuthFlowResult> {
  const initResult = await requestNhisInit({
    identity: params.getIdentityPayload(),
    forceInit: true,
  });

  if (!initResult.linked && initResult.nextStep !== "fetch") {
    return { status: "pending-sign" };
  }

  const syncResult = await params.syncEmployeeReport(false, {
    debugOverride: params.debugOverride,
  });

  return {
    status: "ready",
    reusedFromCache:
      initResult.reused === true ||
      initResult.source === "db-history" ||
      isCachedSyncSource(syncResult.sync?.source),
  };
}

export async function runSyncFlowWithRecovery(params: {
  forceRefresh: boolean;
  debugOverride?: boolean;
  ensureNhisReadyForSync: (options?: { forceInit?: boolean }) => Promise<NhisReadyResult>;
  syncEmployeeReport: (
    forceRefresh?: boolean,
    options?: { debugOverride?: boolean }
  ) => Promise<EmployeeSyncResponse>;
}): Promise<SyncFlowResult> {
  let ready: NhisReadyResult = { linked: true, reused: false };

  if (!params.forceRefresh) {
    ready = await params.ensureNhisReadyForSync();
    if (!ready.linked) {
      return { status: "pending-sign" };
    }
  }

  let syncResult: EmployeeSyncResponse;
  try {
    syncResult = await params.syncEmployeeReport(params.forceRefresh, {
      debugOverride: params.debugOverride,
    });
  } catch (syncError) {
    const nextAction =
      syncError instanceof ApiRequestError
        ? toSyncNextAction(syncError.payload.nextAction)
        : null;
    const needsAuthRecovery =
      params.forceRefresh && (nextAction === "init" || nextAction === "sign");
    if (!needsAuthRecovery) {
      throw syncError;
    }

    ready = await params.ensureNhisReadyForSync({ forceInit: true });
    if (!ready.linked) {
      return { status: "pending-sign" };
    }

    syncResult = await params.syncEmployeeReport(params.forceRefresh, {
      debugOverride: params.debugOverride,
    });
  }

  return {
    status: "ready",
    syncResult,
    ready,
  };
}
