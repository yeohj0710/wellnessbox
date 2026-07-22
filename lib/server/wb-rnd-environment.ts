const TRUE_VALUES = new Set(["1", "true", "yes"]);
const MIN_TOKEN_LENGTH = 32;

export type WbRndEnvironmentContract =
  | { enabled: false; status: "disabled" }
  | {
      enabled: true;
      status: "configured";
      baseUrl: string;
      token: string;
      timeoutMs: number;
    };

function enabled(value: string | undefined) {
  return TRUE_VALUES.has((value ?? "").trim().toLowerCase());
}

function parseBaseUrl(raw: string | undefined, production: boolean) {
  const value = (raw ?? "").trim();
  if (!value) throw new Error("WB_RND_SERVICE_BASE_URL_missing");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("WB_RND_SERVICE_BASE_URL_invalid");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("WB_RND_SERVICE_BASE_URL_contains_credentials_or_suffix");
  }
  if (production && url.protocol !== "https:") {
    throw new Error("WB_RND_SERVICE_BASE_URL_https_required");
  }
  if (!production && !["http:", "https:"].includes(url.protocol)) {
    throw new Error("WB_RND_SERVICE_BASE_URL_invalid_protocol");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

function parseToken(raw: string | undefined) {
  const value = (raw ?? "").trim();
  if (value.length < MIN_TOKEN_LENGTH) {
    throw new Error("WB_RND_SERVICE_TOKEN_too_short");
  }
  return value;
}

function parseTimeout(raw: string | undefined) {
  if (!raw?.trim()) return 4_000;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 500 || value > 15_000) {
    throw new Error("WB_RND_RECOMMEND_TIMEOUT_MS_out_of_range");
  }
  return value;
}

export function resolveWbRndEnvironmentContract(
  env: NodeJS.ProcessEnv = process.env
): WbRndEnvironmentContract {
  if (!enabled(env.WB_RND_RECOMMEND_ENABLED)) {
    return { enabled: false, status: "disabled" };
  }

  return {
    enabled: true,
    status: "configured",
    baseUrl: parseBaseUrl(
      env.WB_RND_SERVICE_BASE_URL,
      env.NODE_ENV === "production"
    ),
    token: parseToken(env.WB_RND_SERVICE_TOKEN),
    timeoutMs: parseTimeout(env.WB_RND_RECOMMEND_TIMEOUT_MS),
  };
}

export function getWbRndPublicEnvironmentStatus(
  contract: WbRndEnvironmentContract
) {
  return {
    enabled: contract.enabled,
    status: contract.status,
    serviceConfigured: contract.enabled,
    timeoutMs: contract.enabled ? contract.timeoutMs : 4_000,
  };
}
