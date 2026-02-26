import fs from "node:fs";
import path from "node:path";

export type Module03ArchiveLatestEntry = {
  month: string;
  archivedAt: string;
  evaluatedAt: string;
  windowStart: string;
  windowEnd: string;
  sourceRowCount: number;
  countedEventCount: number;
  targetMaxCountPerYear: number;
  targetSatisfied: boolean;
  inputPath: string;
  schemaMapPath: string | null;
  reportPath: string;
};

export type Module03ArchiveLatest = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "monthly_archive_latest";
  generatedAt: string;
  entry: Module03ArchiveLatestEntry;
};

export type Module03SchedulerFailureWebhookResult = {
  attempted: boolean;
  delivered: boolean;
  target: string | null;
  timeoutMs: number;
  statusCode: number | null;
  responsePreview: string | null;
  errorMessage: string | null;
};

export type Module03SchedulerFailureAlert = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_failure_alert";
  generatedAt: string;
  windowEnd: string | null;
  commandArgs: string[];
  scheduler: {
    exportSource: "provided_input" | "scheduled_export" | "unknown";
    inputPath: string | null;
    archiveDir: string | null;
    handoffDir: string | null;
    requiredEnvKeys: string[];
    missingRequiredEnvKeys: string[];
    failureWebhookConfigured: boolean;
    failureAlertDir: string;
  };
  error: {
    name: string;
    message: string;
    stack: string | null;
  };
  webhook: Module03SchedulerFailureWebhookResult;
};

export type NormalizedError = {
  name: string;
  message: string;
  stack: string | null;
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getArgValue(argv: string[], flag: string): string | null {
  const flagIndex = argv.indexOf(flag);
  if (flagIndex < 0) {
    return null;
  }

  const value = argv[flagIndex + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

export function assertFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
  return value;
}

export function assertBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean.`);
  }
  return value;
}

export function normalizeIsoDate(value: string, fieldName: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`${fieldName} must be a valid ISO-8601 datetime.`);
  }
  return parsed.toISOString();
}

export function parsePositiveIntegerOrNull(
  value: string | null,
  fieldName: string
): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

export function parsePositiveIntegerWithDefault(
  value: string | null,
  fieldName: string,
  defaultValue: number
): number {
  if (value === null) {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

export function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  try {
    return JSON.parse(raw);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    throw new Error(`Failed to parse JSON file ${filePath}: ${message}`);
  }
}

export function writeJsonFile(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function toPathSafeTimestamp(isoDateTime: string): string {
  return isoDateTime.replace(/[:.]/g, "-");
}

export function toMonthToken(isoDateTime: string): string {
  const parsed = new Date(isoDateTime);
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function toWorkspacePath(value: string): string {
  const relativePath = path.relative(process.cwd(), value);
  if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
    return toPosixPath(relativePath);
  }
  return toPosixPath(value);
}

export function parseRequiredEnvKeys(value: string | null, fieldName: string): string[] {
  if (value === null) {
    return [];
  }

  const keys = [...new Set(value.split(",").map((token) => token.trim()).filter(Boolean))];
  if (keys.length === 0) {
    throw new Error(`${fieldName} must include at least one environment variable name.`);
  }

  for (const key of keys) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(
        `${fieldName} contains an invalid environment variable name: "${key}".`
      );
    }
  }

  return keys;
}

export function normalizeOptionalHttpUrl(
  value: string | null,
  fieldName: string
): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldName} must be a valid URL.`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${fieldName} must use http:// or https://.`);
  }

  return parsed.toString();
}

export function getMissingRequiredEnvKeys(requiredEnvKeys: string[]): string[] {
  return requiredEnvKeys.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function assertRequiredEnvironment(requiredEnvKeys: string[]): void {
  const missing = getMissingRequiredEnvKeys(requiredEnvKeys);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown error.",
      stack: typeof error.stack === "string" ? error.stack : null,
    };
  }

  return {
    name: "Error",
    message: String(error),
    stack: null,
  };
}

export function summarizeWebhookTarget(url: string | null): string | null {
  if (!url) {
    return null;
  }

  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
}
