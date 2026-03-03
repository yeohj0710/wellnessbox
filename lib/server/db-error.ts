import "server-only";

import { Prisma } from "@prisma/client";
import {
  isPrismaEngineModeMismatch,
  resolvePrismaEnvErrorMessage,
} from "@/lib/db-env";

export type DbRouteError = {
  status: number;
  code:
    | "DB_ENV_INVALID"
    | "DB_SCHEMA_MISMATCH"
    | "DB_POOL_TIMEOUT"
    | "DB_QUERY_FAILED";
  message: string;
};

const DB_SCHEMA_MISMATCH_MESSAGE =
  "데이터베이스 스키마가 현재 서버 코드와 맞지 않습니다. 운영 환경의 DB URL 설정과 prisma migrate deploy 적용 여부를 확인해 주세요.";
const DB_POOL_TIMEOUT_MESSAGE =
  "서버 DB 연결이 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.";

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
    normalized.includes("timed out fetching a new connection from the connection pool") ||
    normalized.includes("connection pool timeout")
  );
}

export function resolveDbRouteError(
  error: unknown,
  fallbackMessage = "데이터베이스 처리 중 오류가 발생했습니다."
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
      message:
        "데이터베이스 초기화에 실패했습니다. DB 연결 환경변수(DATABASE_URL/DIRECT_URL 또는 WELLNESSBOX_*)를 확인해 주세요.",
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
      message:
        "데이터베이스 연결 문자열 형식이 올바르지 않습니다. DATABASE_URL/DIRECT_URL 값을 확인해 주세요.",
    };
  }

  const rawMessage = normalizeErrorMessage(error).toLowerCase();
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
      message:
        "데이터베이스 연결 문자열 형식이 올바르지 않습니다. DATABASE_URL/DIRECT_URL 값을 확인해 주세요.",
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
