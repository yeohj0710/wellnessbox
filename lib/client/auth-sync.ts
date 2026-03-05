"use client";

export type AuthSyncScope =
  | "all"
  | "user-session"
  | "phone-link"
  | "b2b-employee-session"
  | "nhis-link";

export type AuthSyncEventDetail = {
  scope: AuthSyncScope;
  reason: string;
  at: string;
};

type SubscribeAuthSyncOptions = {
  scopes?: AuthSyncScope[];
};

const AUTH_SYNC_EVENT_NAME = "wb:auth-sync";
const AUTH_SYNC_STORAGE_KEY = "wb:auth-sync:v1";

const AUTH_SYNC_SCOPE_SET = new Set<AuthSyncScope>([
  "all",
  "user-session",
  "phone-link",
  "b2b-employee-session",
  "nhis-link",
]);

function resolveNowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeScope(value: unknown): AuthSyncScope | null {
  if (typeof value !== "string") return null;
  if (!AUTH_SYNC_SCOPE_SET.has(value as AuthSyncScope)) return null;
  return value as AuthSyncScope;
}

function normalizeAuthSyncEventDetail(value: unknown): AuthSyncEventDetail | null {
  if (!isRecord(value)) return null;
  const scope = normalizeScope(value.scope);
  if (!scope) return null;
  const reason = typeof value.reason === "string" ? value.reason : "";
  const at =
    typeof value.at === "string" && Number.isFinite(Date.parse(value.at))
      ? value.at
      : resolveNowIso();
  return { scope, reason, at };
}

function toAuthSyncEventDetail(input: {
  scope: AuthSyncScope;
  reason?: string;
}): AuthSyncEventDetail {
  return {
    scope: input.scope,
    reason: input.reason ?? "",
    at: resolveNowIso(),
  };
}

function shouldHandleScope(scope: AuthSyncScope, scopes: Set<AuthSyncScope>) {
  if (scopes.has("all")) return true;
  if (scope === "all") return true;
  return scopes.has(scope);
}

export function emitAuthSyncEvent(input: {
  scope: AuthSyncScope;
  reason?: string;
}) {
  if (typeof window === "undefined") return;

  const detail = toAuthSyncEventDetail(input);
  window.dispatchEvent(
    new CustomEvent<AuthSyncEventDetail>(AUTH_SYNC_EVENT_NAME, {
      detail,
    })
  );

  try {
    window.localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(detail));
  } catch {
    // ignore storage write failures
  }
}

export function subscribeAuthSyncEvent(
  listener: (detail: AuthSyncEventDetail) => void,
  options?: SubscribeAuthSyncOptions
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const scopeSet = new Set<AuthSyncScope>(
    options?.scopes && options.scopes.length > 0 ? options.scopes : ["all"]
  );

  const emitIfNeeded = (detail: AuthSyncEventDetail | null) => {
    if (!detail) return;
    if (!shouldHandleScope(detail.scope, scopeSet)) return;
    listener(detail);
  };

  const onWindowEvent = (event: Event) => {
    const custom = event as CustomEvent<AuthSyncEventDetail | null>;
    emitIfNeeded(normalizeAuthSyncEventDetail(custom.detail));
  };

  const onStorageEvent = (event: StorageEvent) => {
    if (event.key !== AUTH_SYNC_STORAGE_KEY) return;
    if (!event.newValue) return;
    try {
      emitIfNeeded(normalizeAuthSyncEventDetail(JSON.parse(event.newValue)));
    } catch {
      // ignore malformed storage payload
    }
  };

  window.addEventListener(AUTH_SYNC_EVENT_NAME, onWindowEvent as EventListener);
  window.addEventListener("storage", onStorageEvent);

  return () => {
    window.removeEventListener(AUTH_SYNC_EVENT_NAME, onWindowEvent as EventListener);
    window.removeEventListener("storage", onStorageEvent);
  };
}

