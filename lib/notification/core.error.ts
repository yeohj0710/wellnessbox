import { Prisma } from "@prisma/client";
import { PushFailureType } from "@/lib/notification/core.types";

const TRANSIENT_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENOTFOUND",
]);

export type PushClassifiedError = {
  failureType: Exclude<PushFailureType, "internal">;
  statusCode: number | null;
  isDeadEndpoint: boolean;
  isRetryable: boolean;
};

function isRetryableStatusCode(statusCode: number | null) {
  if (statusCode === null) return false;
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

export function classifyPushError(error: unknown): PushClassifiedError {
  const rawStatusCode = Number(
    (error as { statusCode?: unknown; status?: unknown } | undefined)
      ?.statusCode ??
      (error as { status?: unknown } | undefined)?.status
  );
  const statusCode = Number.isFinite(rawStatusCode) ? rawStatusCode : null;
  const errorCode = String(
    (error as { code?: unknown } | undefined)?.code ?? ""
  ).toUpperCase();

  if (statusCode === 404 || statusCode === 410) {
    return {
      failureType: "dead_endpoint",
      statusCode,
      isDeadEndpoint: true,
      isRetryable: false,
    };
  }
  if (statusCode === 401 || statusCode === 403) {
    return {
      failureType: "auth_error",
      statusCode,
      isDeadEndpoint: false,
      isRetryable: false,
    };
  }
  if (TRANSIENT_ERROR_CODES.has(errorCode) || statusCode === 408) {
    return {
      failureType: "timeout",
      statusCode,
      isDeadEndpoint: false,
      isRetryable: true,
    };
  }
  if (errorCode.startsWith("ECONN") || isRetryableStatusCode(statusCode)) {
    return {
      failureType: "network",
      statusCode,
      isDeadEndpoint: false,
      isRetryable: true,
    };
  }
  return {
    failureType: "unknown",
    statusCode,
    isDeadEndpoint: false,
    isRetryable: false,
  };
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function isPushDeliveryTableMissingError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2021") return false;
  const tableName = String((error.meta as { table?: unknown })?.table ?? "");
  return tableName.toLowerCase().includes("pushdelivery");
}
