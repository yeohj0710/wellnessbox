export type LoginStatus = {
  isUserLoggedIn: boolean;
  isPharmLoggedIn: boolean;
  isRiderLoggedIn: boolean;
  isAdminLoggedIn: boolean;
  isTestLoggedIn: boolean;
};

export const EMPTY_LOGIN_STATUS: LoginStatus = {
  isUserLoggedIn: false,
  isPharmLoggedIn: false,
  isRiderLoggedIn: false,
  isAdminLoggedIn: false,
  isTestLoggedIn: false,
};

export function normalizeLoginStatusResponse(
  raw: Partial<Record<keyof LoginStatus, unknown>> | null | undefined
): LoginStatus {
  return {
    isUserLoggedIn: raw?.isUserLoggedIn === true,
    isPharmLoggedIn: raw?.isPharmLoggedIn === true,
    isRiderLoggedIn: raw?.isRiderLoggedIn === true,
    isAdminLoggedIn: raw?.isAdminLoggedIn === true,
    isTestLoggedIn: raw?.isTestLoggedIn === true,
  };
}

const NETWORK_ERROR_COOLDOWN_MS = 4000;
const SUCCESS_STATUS_CACHE_MS = 1200;
let networkErrorUntil = 0;
let lastKnownStatus: LoginStatus = EMPTY_LOGIN_STATUS;
let lastResolvedAt = 0;
let inFlightLoginStatusRequest: Promise<LoginStatus> | null = null;

export async function getLoginStatus(
  signal?: AbortSignal
): Promise<LoginStatus> {
  const now = Date.now();
  if (now < networkErrorUntil) {
    return lastKnownStatus;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    networkErrorUntil = now + NETWORK_ERROR_COOLDOWN_MS;
    return lastKnownStatus;
  }

  if (now - lastResolvedAt < SUCCESS_STATUS_CACHE_MS) {
    return lastKnownStatus;
  }

  if (inFlightLoginStatusRequest) {
    return inFlightLoginStatusRequest;
  }

  inFlightLoginStatusRequest = (async () => {
    const res = await fetch("/api/auth/login-status", {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
      credentials: "include",
      signal,
    }).catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error &&
        "name" in error &&
        (error as { name?: string }).name === "AbortError"
      ) {
        throw error;
      }

      networkErrorUntil = Date.now() + NETWORK_ERROR_COOLDOWN_MS;
      return null;
    });

    if (!res) return lastKnownStatus;
    if (!res.ok) return lastKnownStatus;

    const raw = (await res.json()) as Partial<Record<keyof LoginStatus, unknown>>;
    const normalized = normalizeLoginStatusResponse(raw);
    lastKnownStatus = normalized;
    lastResolvedAt = Date.now();
    networkErrorUntil = 0;
    return normalized;
  })();

  try {
    return await inFlightLoginStatusRequest;
  } finally {
    inFlightLoginStatusRequest = null;
  }
}
