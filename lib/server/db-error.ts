import "server-only";

import { Prisma } from "@prisma/client";
import {
  isPrismaEngineModeMismatch,
  resolvePrismaEnvErrorMessage,
} from "@/lib/db-env";
import { noStoreJson } from "@/lib/server/no-store";

export type DbRouteError = {
  status: number;
  code:
    | "DB_ENV_INVALID"
    | "DB_RESOURCE_LIMIT"
    | "DB_SCHEMA_MISMATCH"
    | "DB_POOL_TIMEOUT"
    | "DB_QUERY_FAILED";
  message: string;
};

const DB_SCHEMA_MISMATCH_MESSAGE =
  "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC2A4\uD0A4\uB9C8\uAC00 \uD604\uC7AC \uC11C\uBC84 \uCF54\uB4DC\uC640 \uB9DE\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uC6B4\uC601 \uD658\uACBD\uC758 DB URL \uC124\uC815\uACFC prisma migrate deploy \uC801\uC6A9 \uC5EC\uBD80\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const DB_POOL_TIMEOUT_MESSAGE =
  "\uC11C\uBC84 DB \uC5F0\uACB0\uC774 \uC77C\uC2DC\uC801\uC73C\uB85C \uBC14\uC05C \uC0C1\uD0DC\uC785\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
const DB_RESOURCE_LIMIT_MESSAGE =
  "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC0AC\uC6A9\uB7C9 \uD55C\uB3C4\uC5D0 \uB3C4\uB2EC\uD588\uC2B5\uB2C8\uB2E4. Neon/Prisma \uCF58\uC194\uC5D0\uC11C compute quota \uB610\uB294 \uD504\uB85C\uC81D\uD2B8 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const DB_DEFAULT_ERROR_MESSAGE =
  "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.";
const DB_INIT_ERROR_MESSAGE =
  "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uCD08\uAE30\uD654\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. DB \uC5F0\uACB0 \uD658\uACBD\uBCC0\uC218(DATABASE_URL/DIRECT_URL \uB610\uB294 WELLNESSBOX_*)\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const DB_URL_FORMAT_ERROR_MESSAGE =
  "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uBB38\uC790\uC5F4 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. DATABASE_URL/DIRECT_URL \uAC12\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";

function normalizeErrorMessage(value: unknown) {
  if (value instanceof Error) return value.message;
  return "";
}

function isSchemaMismatchKnownError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

function hasSchemaMismatchSignature(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("p2021") || normalized.includes("p2022");
}

function hasPoolTimeoutSignature(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes(
      "timed out fetching a new connection from the connection pool"
    ) || normalized.includes("connection pool timeout")
  );
}

function hasResourceLimitSignature(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("exceeded the compute time quota") ||
    normalized.includes("compute time quota") ||
    normalized.includes("account or project has exceeded")
  );
}

export function resolveDbRouteError(
  error: unknown,
  fallbackMessage = DB_DEFAULT_ERROR_MESSAGE
): DbRouteError {
  const isEngineModeMismatch = isPrismaEngineModeMismatch(error);
  const envMessage = resolvePrismaEnvErrorMessage(error);
  if (envMessage) {
    return {
      status: 503,
      code: "DB_ENV_INVALID",
      message: envMessage,
    };
  }

  const rawMessage = normalizeErrorMessage(error).toLowerCase();
  if (hasResourceLimitSignature(rawMessage)) {
    return {
      status: 503,
      code: "DB_RESOURCE_LIMIT",
      message: DB_RESOURCE_LIMIT_MESSAGE,
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    if (isEngineModeMismatch) {
      return {
        status: 500,
        code: "DB_QUERY_FAILED",
        message: fallbackMessage,
      };
    }
    return {
      status: 503,
      code: "DB_ENV_INVALID",
      message: DB_INIT_ERROR_MESSAGE,
    };
  }

  if (isSchemaMismatchKnownError(error)) {
    return {
      status: 503,
      code: "DB_SCHEMA_MISMATCH",
      message: DB_SCHEMA_MISMATCH_MESSAGE,
    };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P6001" &&
    !isEngineModeMismatch
  ) {
    return {
      status: 503,
      code: "DB_ENV_INVALID",
      message: DB_URL_FORMAT_ERROR_MESSAGE,
    };
  }

  if (hasSchemaMismatchSignature(rawMessage)) {
    return {
      status: 503,
      code: "DB_SCHEMA_MISMATCH",
      message: DB_SCHEMA_MISMATCH_MESSAGE,
    };
  }

  if (rawMessage.includes("p6001") && !isEngineModeMismatch) {
    return {
      status: 503,
      code: "DB_ENV_INVALID",
      message: DB_URL_FORMAT_ERROR_MESSAGE,
    };
  }

  if (hasPoolTimeoutSignature(rawMessage)) {
    return {
      status: 503,
      code: "DB_POOL_TIMEOUT",
      message: DB_POOL_TIMEOUT_MESSAGE,
    };
  }

  return {
    status: 500,
    code: "DB_QUERY_FAILED",
    message: fallbackMessage,
  };
}

export function buildDbRouteErrorResponse(
  error: unknown,
  fallbackMessage = DB_DEFAULT_ERROR_MESSAGE
) {
  const dbError = resolveDbRouteError(error, fallbackMessage);
  return noStoreJson(
    { ok: false, code: dbError.code, error: dbError.message },
    dbError.status
  );
}

export async function runWithDbRouteError(
  fallbackMessage: string,
  work: () => Promise<Response>
) {
  try {
    return await work();
  } catch (error) {
    return buildDbRouteErrorResponse(error, fallbackMessage);
  }
}

export function withDbRouteError<TArgs extends unknown[]>(
  fallbackMessage: string,
  work: (...args: TArgs) => Promise<Response>
) {
  return (...args: TArgs) =>
    runWithDbRouteError(fallbackMessage, () => work(...args));
}
