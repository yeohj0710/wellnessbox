const DATABASE_URL_KEYS = [
  "WELLNESSBOX_PRISMA_URL",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
] as const;

const DIRECT_URL_KEYS = [
  "WELLNESSBOX_URL_NON_POOLING",
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

const ACCEPTED_URL_PREFIX =
  /^(postgres(?:ql)?:\/\/|prisma:\/\/|prisma\+postgres:\/\/)/i;
const POSTGRES_URL_PREFIX = /^postgres(?:ql)?:\/\//i;
const ACCELERATE_PROTOCOL_ERROR_SIGNATURES = [
  "must start with the protocol `prisma://` or `prisma+postgres://`",
  "must start with prisma:// or prisma+postgres://",
];

export type PrismaEnvConflictScope = "database" | "direct";

export type PrismaEnvConflict = {
  scope: PrismaEnvConflictScope;
  keys: string[];
  hosts: string[];
  details: Array<{ key: string; host: string }>;
};

export type PrismaEnvValidation = {
  ok: boolean;
  databaseKey: string | null;
  directKey: string | null;
  conflicts: PrismaEnvConflict[];
  errors: string[];
  message: string | null;
};

type EnvValue = {
  key: string;
  value: string;
};

let cachedValidation: PrismaEnvValidation | null = null;
const DB_ENV_WARN_STATE_KEY = "__WB_DB_ENV_WARN_STATE__";

type DbEnvWarnState = {
  lastConflictWarnSignature: string | null;
};

function getDbEnvWarnState(): DbEnvWarnState {
  const root = globalThis as typeof globalThis & {
    [DB_ENV_WARN_STATE_KEY]?: DbEnvWarnState;
  };
  const existing = root[DB_ENV_WARN_STATE_KEY];
  if (existing) return existing;
  const created: DbEnvWarnState = {
    lastConflictWarnSignature: null,
  };
  root[DB_ENV_WARN_STATE_KEY] = created;
  return created;
}

function pickEnvValue(keys: readonly string[]) {
  for (const key of keys) {
    const raw = process.env[key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) return { key, value };
  }
  return null;
}

function collectEnvValues(keys: readonly string[]): EnvValue[] {
  const out: EnvValue[] = [];
  for (const key of keys) {
    const raw = process.env[key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    out.push({ key, value });
  }
  return out;
}

function resolveUrlHost(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.trim().toLowerCase();
    if (!host) return null;
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${host}${port}`;
  } catch {
    return null;
  }
}

function setEnvValue(key: string, value: string | null | undefined) {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;
  const existing =
    typeof process.env[key] === "string" ? process.env[key]!.trim() : "";
  if (existing === normalized) return false;
  process.env[key] = normalized;
  return true;
}

function isAcceptedDbUrl(value: string) {
  return ACCEPTED_URL_PREFIX.test(value);
}

function resolvePrismaEnvConflicts(
  scope: PrismaEnvConflictScope,
  values: EnvValue[]
): PrismaEnvConflict[] {
  if (values.length < 2) return [];

  const hostMap = new Map<string, string[]>();
  for (const value of values) {
    const host = resolveUrlHost(value.value);
    if (!host) continue;
    const keys = hostMap.get(host);
    if (keys) {
      keys.push(value.key);
    } else {
      hostMap.set(host, [value.key]);
    }
  }

  if (hostMap.size <= 1) return [];

  return [
    {
      scope,
      keys: values.map((item) => item.key),
      hosts: [...hostMap.keys()],
      details: [...hostMap.entries()].flatMap(([host, keys]) =>
        keys.map((key) => ({ key, host }))
      ),
    },
  ];
}

function formatPrismaEnvConflict(conflict: PrismaEnvConflict) {
  const scopeLabel = conflict.scope === "database" ? "DATABASE" : "DIRECT";
  const detail = conflict.details
    .map((item) => `${item.key}=>${item.host}`)
    .join(", ");
  return `${scopeLabel} URL host mismatch detected. (${detail})`;
}

function buildPrismaEnvGuide(errors: string[]) {
  const head = "[DB 설정 안내] Prisma 연결 환경변수를 확인해 주세요.";
  const detail = errors.map((item, index) => `${index + 1}. ${item}`).join(" ");
  return [
    head,
    detail,
    "DATABASE_URL 우선순위: WELLNESSBOX_PRISMA_URL > DATABASE_URL > POSTGRES_PRISMA_URL.",
    "DIRECT_URL 우선순위: WELLNESSBOX_URL_NON_POOLING > DIRECT_URL > POSTGRES_URL_NON_POOLING.",
    "허용 URL 형식: postgresql://..., postgres://..., prisma://..., prisma+postgres://...",
  ]
    .filter(Boolean)
    .join(" ");
}

function isNextProductionBuildPhase() {
  const phase = (process.env.NEXT_PHASE ?? "").trim();
  return phase.includes("phase-production-build");
}

function shouldWarnPrismaEnvConflicts() {
  const override = (process.env.WB_DB_ENV_WARN_CONFLICT ?? "").trim();
  if (override === "1") return true;
  if (override === "0") return false;
  return !isNextProductionBuildPhase();
}

function warnPrismaEnvConflictsOnce(input: {
  conflictMessages: string[];
  selected: {
    databaseKey: string | null;
    directKey: string | null;
  };
}) {
  const warnState = getDbEnvWarnState();
  const signature = JSON.stringify({
    conflicts: input.conflictMessages,
    selected: input.selected,
  });
  if (warnState.lastConflictWarnSignature === signature) return;
  warnState.lastConflictWarnSignature = signature;
  console.warn("[db-env] conflicting db url env detected", {
    conflicts: input.conflictMessages,
    selected: input.selected,
  });
}

function buildValidationResult(): PrismaEnvValidation {
  const databaseCandidates = collectEnvValues(DATABASE_URL_KEYS);
  const directCandidates = collectEnvValues(DIRECT_URL_KEYS);
  const conflicts = [
    ...resolvePrismaEnvConflicts("database", databaseCandidates),
    ...resolvePrismaEnvConflicts("direct", directCandidates),
  ];

  const database = pickEnvValue(DATABASE_URL_KEYS);
  const direct = pickEnvValue(DIRECT_URL_KEYS) ?? database;

  if (database?.value) {
    setEnvValue("DATABASE_URL", database.value);
    setEnvValue("WELLNESSBOX_PRISMA_URL", database.value);
  }
  if (direct?.value) {
    setEnvValue("DIRECT_URL", direct.value);
    setEnvValue("WELLNESSBOX_URL_NON_POOLING", direct.value);
  }

  const normalizedDatabase = pickEnvValue(DATABASE_URL_KEYS);
  const normalizedDirect = pickEnvValue(DIRECT_URL_KEYS);

  const errors: string[] = [];
  const conflictMessages = conflicts.map(formatPrismaEnvConflict);
  if (conflictMessages.length > 0 && shouldWarnPrismaEnvConflicts()) {
    warnPrismaEnvConflictsOnce({
      conflictMessages,
      selected: {
        databaseKey: database?.key ?? null,
        directKey: direct?.key ?? null,
      },
    });
  }

  if (!normalizedDatabase?.value) {
    errors.push(
      "데이터베이스 URL이 비어 있습니다. DATABASE_URL 또는 WELLNESSBOX_PRISMA_URL(대체: POSTGRES_PRISMA_URL)을 설정해 주세요."
    );
  } else if (!isAcceptedDbUrl(normalizedDatabase.value)) {
    errors.push(
      `DB URL 형식이 올바르지 않습니다. (${normalizedDatabase.key}) postgresql://, postgres://, prisma://, prisma+postgres:// 중 하나로 시작해야 합니다.`
    );
  }

  if (!normalizedDirect?.value) {
    errors.push(
      "DIRECT URL이 비어 있습니다. DIRECT_URL 또는 WELLNESSBOX_URL_NON_POOLING(대체: POSTGRES_URL_NON_POOLING)을 설정해 주세요."
    );
  } else if (!isAcceptedDbUrl(normalizedDirect.value)) {
    errors.push(
      `DIRECT URL 형식이 올바르지 않습니다. (${normalizedDirect.key}) postgresql://, postgres://, prisma://, prisma+postgres:// 중 하나로 시작해야 합니다.`
    );
  }

  return {
    ok: errors.length === 0,
    databaseKey: database?.key ?? null,
    directKey: direct?.key ?? null,
    conflicts,
    errors,
    message: errors.length > 0 ? buildPrismaEnvGuide(errors) : null,
  };
}

export function ensurePrismaEnvConfigured(force = false): PrismaEnvValidation {
  if (!force && cachedValidation) return cachedValidation;
  cachedValidation = buildValidationResult();
  return cachedValidation;
}

function resolveDatabaseUrlValue() {
  return pickEnvValue(DATABASE_URL_KEYS)?.value ?? "";
}

function isPrismaEngineModeMismatchMessage(message: string) {
  const normalized = message.toLowerCase();
  return ACCELERATE_PROTOCOL_ERROR_SIGNATURES.some((signature) =>
    normalized.includes(signature)
  );
}

export function isPrismaEngineModeMismatch(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "";
  if (!rawMessage) return false;
  if (!isPrismaEngineModeMismatchMessage(rawMessage)) return false;
  return POSTGRES_URL_PREFIX.test(resolveDatabaseUrlValue());
}

function hasPrismaEnvSignature(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("p6001") ||
    normalized.includes("database_url") ||
    normalized.includes("direct_url") ||
    normalized.includes("wellnessbox_prisma_url") ||
    normalized.includes("wellnessbox_url_non_pooling") ||
    normalized.includes("prisma+postgres") ||
    normalized.includes("prisma://")
  );
}

export function resolvePrismaEnvErrorMessage(error: unknown) {
  const status = ensurePrismaEnvConfigured();
  if (!status.ok) return status.message;
  const rawMessage = error instanceof Error ? error.message : "";
  if (!rawMessage) return null;
  if (isPrismaEngineModeMismatch(error)) return null;
  if (!hasPrismaEnvSignature(rawMessage)) return null;
  return buildPrismaEnvGuide([
    "Prisma 연결 중 환경변수 해석 오류가 발생했습니다. DATABASE_URL/DIRECT_URL 또는 WELLNESSBOX_* 값을 다시 확인해 주세요.",
  ]);
}

export function isPrismaEnvError(error: unknown) {
  return Boolean(resolvePrismaEnvErrorMessage(error));
}
