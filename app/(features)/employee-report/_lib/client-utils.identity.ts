import type { IdentityInput } from "./client-types";

const LS_KEY = "wb:b2b:employee:last-input:v2";
const LEGACY_LS_KEYS = [
  "wb:b2b:employee:last-input:v1",
  "wb:b2b:employee:last-input",
  "wb:b2b:survey:identity:v1",
] as const;
const IDENTITY_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type StoredIdentitySource =
  | "none"
  | "v2"
  | "legacy"
  | "expired"
  | "invalid";

type StoredIdentityCandidate = {
  schemaVersion?: number;
  savedAt?: string;
  identity?: IdentityInput;
  name?: string;
  birthDate?: string;
  phone?: string;
};

export type ParsedStoredIdentityResult = {
  source: StoredIdentitySource;
  identity: IdentityInput | null;
  shouldClear: boolean;
};

type StoredIdentityReadResult = {
  source: StoredIdentitySource;
  identity: IdentityInput | null;
};

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function toIdentityPayload(identity: IdentityInput): IdentityInput {
  return {
    name: identity.name.trim(),
    birthDate: normalizeDigits(identity.birthDate),
    phone: normalizeDigits(identity.phone),
  };
}

export function isValidIdentityInput(identity: IdentityInput) {
  const normalized = toIdentityPayload(identity);
  return (
    normalized.name.length > 0 &&
    /^\d{8}$/.test(normalized.birthDate) &&
    /^\d{10,11}$/.test(normalized.phone)
  );
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function isStoredIdentityCandidate(
  value: unknown
): value is StoredIdentityCandidate {
  return typeof value === "object" && value !== null;
}

export function parseStoredIdentitySnapshot(
  raw: string | null | undefined,
  nowMs = Date.now()
): ParsedStoredIdentityResult {
  if (!raw) {
    return {
      source: "none",
      identity: null,
      shouldClear: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredIdentityCandidate(parsed)) {
      return {
        source: "invalid",
        identity: null,
        shouldClear: true,
      };
    }

    const savedAtMs = parsed.savedAt ? new Date(parsed.savedAt).getTime() : nowMs;
    if (!Number.isFinite(savedAtMs) || nowMs - savedAtMs > IDENTITY_TTL_MS) {
      return {
        source: "expired",
        identity: null,
        shouldClear: true,
      };
    }

    const candidate = parsed.identity ?? {
      name: parsed.name || "",
      birthDate: parsed.birthDate || "",
      phone: parsed.phone || "",
    };

    if (!candidate.name || !candidate.birthDate || !candidate.phone) {
      return {
        source: "invalid",
        identity: null,
        shouldClear: true,
      };
    }

    const identity = {
      name: candidate.name,
      birthDate: normalizeDigits(candidate.birthDate),
      phone: normalizeDigits(candidate.phone),
    };

    if (
      identity.name.length < 1 ||
      !/^\d{8}$/.test(identity.birthDate) ||
      !/^\d{10,11}$/.test(identity.phone)
    ) {
      return {
        source: "invalid",
        identity: null,
        shouldClear: true,
      };
    }

    return {
      source: parsed.schemaVersion === 2 ? "v2" : "legacy",
      identity,
      shouldClear: false,
    };
  } catch {
    return {
      source: "invalid",
      identity: null,
      shouldClear: true,
    };
  }
}

export function readStoredIdentityWithSource(): StoredIdentityReadResult {
  if (typeof window === "undefined") {
    return {
      source: "none",
      identity: null,
    };
  }

  const keys = [LS_KEY, ...LEGACY_LS_KEYS];
  let fallbackSource: StoredIdentitySource = "none";

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    const parsed = parseStoredIdentitySnapshot(raw, Date.now());
    if (parsed.shouldClear) {
      window.localStorage.removeItem(key);
    }
    if (parsed.identity) {
      // Canonicalize to v2 key and purge legacy keys when a valid identity is restored.
      if (key !== LS_KEY) {
        saveStoredIdentity(parsed.identity);
      }
      return {
        source: parsed.source,
        identity: parsed.identity,
      };
    }
    if (fallbackSource === "none" && parsed.source !== "none") {
      fallbackSource = parsed.source;
    }
  }

  return {
    source: fallbackSource,
    identity: null,
  };
}

export function readStoredIdentity(): IdentityInput | null {
  return readStoredIdentityWithSource().identity;
}

export function resolveIdentityPrimaryActionLabel(input: {
  hasAuthAttempt: boolean;
  syncNextAction: "init" | "sign" | "retry" | null;
  storedIdentitySource: StoredIdentitySource;
}) {
  void input.hasAuthAttempt;
  void input.storedIdentitySource;
  if (input.syncNextAction === "sign") return "카카오톡 인증 완료 후 확인";
  return "카카오톡으로 인증 보내기";
}

export function saveStoredIdentity(identity: IdentityInput) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      schemaVersion: 2,
      savedAt: new Date().toISOString(),
      identity,
    })
  );
  for (const key of LEGACY_LS_KEYS) {
    localStorage.removeItem(key);
  }
}

export function clearStoredIdentity() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEY);
  for (const key of LEGACY_LS_KEYS) {
    localStorage.removeItem(key);
  }
}
