const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "WELLNESSBOX_PRISMA_URL",
  "POSTGRES_PRISMA_URL",
] as const;

const DIRECT_URL_KEYS = [
  "DIRECT_URL",
  "WELLNESSBOX_URL_NON_POOLING",
  "POSTGRES_URL_NON_POOLING",
] as const;

const ACCEPTED_URL_PREFIX = /^(postgres(?:ql)?:\/\/|prisma:\/\/|prisma\+postgres:\/\/)/i;

export type PrismaEnvValidation = {
  ok: boolean;
  databaseKey: string | null;
  directKey: string | null;
  errors: string[];
  message: string | null;
};

let cachedValidation: PrismaEnvValidation | null = null;

function pickEnvValue(keys: readonly string[]) {
  for (const key of keys) {
    const raw = process.env[key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) return { key, value };
  }
  return null;
}

function setEnvIfEmpty(key: string, value: string | null | undefined) {
  if (!value) return false;
  const existing = typeof process.env[key] === "string" ? process.env[key]!.trim() : "";
  if (existing) return false;
  process.env[key] = value;
  return true;
}

function isAcceptedDbUrl(value: string) {
  return ACCEPTED_URL_PREFIX.test(value);
}

function buildPrismaEnvGuide(errors: string[]) {
  const head = "[DB 설정 안내] Prisma 연결 환경변수를 확인해 주세요.";
  const detail = errors.map((item, index) => `${index + 1}. ${item}`).join(" ");
  return [
    head,
    detail,
    "DATABASE_URL 우선순위: DATABASE_URL > WELLNESSBOX_PRISMA_URL > POSTGRES_PRISMA_URL.",
    "DIRECT_URL 우선순위: DIRECT_URL > WELLNESSBOX_URL_NON_POOLING > POSTGRES_URL_NON_POOLING.",
    "허용 URL 형식: postgresql://..., postgres://..., prisma://..., prisma+postgres://...",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildValidationResult(): PrismaEnvValidation {
  const database = pickEnvValue(DATABASE_URL_KEYS);
  const direct = pickEnvValue(DIRECT_URL_KEYS) ?? database;

  if (database?.value) {
    setEnvIfEmpty("DATABASE_URL", database.value);
    setEnvIfEmpty("WELLNESSBOX_PRISMA_URL", database.value);
  }
  if (direct?.value) {
    setEnvIfEmpty("DIRECT_URL", direct.value);
    setEnvIfEmpty("WELLNESSBOX_URL_NON_POOLING", direct.value);
  }

  const normalizedDatabase = pickEnvValue(DATABASE_URL_KEYS);
  const normalizedDirect = pickEnvValue(DIRECT_URL_KEYS);

  const errors: string[] = [];
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
    databaseKey: normalizedDatabase?.key ?? null,
    directKey: normalizedDirect?.key ?? null,
    errors,
    message: errors.length > 0 ? buildPrismaEnvGuide(errors) : null,
  };
}

export function ensurePrismaEnvConfigured(force = false): PrismaEnvValidation {
  if (!force && cachedValidation) return cachedValidation;
  cachedValidation = buildValidationResult();
  return cachedValidation;
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
  if (!hasPrismaEnvSignature(rawMessage)) return null;
  return buildPrismaEnvGuide([
    "Prisma 연결 중 환경변수 해석 오류가 발생했습니다. DATABASE_URL/DIRECT_URL 및 대체 키를 다시 확인해 주세요.",
  ]);
}

export function isPrismaEnvError(error: unknown) {
  return Boolean(resolvePrismaEnvErrorMessage(error));
}
