import "server-only";

import { Prisma } from "@prisma/client";
import { resolvePrismaEnvErrorMessage } from "@/lib/db-env";

export type DbRouteError = {
  status: number;
  code: "DB_ENV_INVALID" | "DB_QUERY_FAILED";
  message: string;
};

function normalizeErrorMessage(value: unknown) {
  if (value instanceof Error) return value.message;
  return "";
}

export function resolveDbRouteError(
  error: unknown,
  fallbackMessage = "데이터베이스 처리 중 오류가 발생했습니다."
): DbRouteError {
  const envMessage = resolvePrismaEnvErrorMessage(error);
  if (envMessage) {
    return {
      status: 503,
      code: "DB_ENV_INVALID",
      message: envMessage,
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      code: "DB_ENV_INVALID",
      message:
        "데이터베이스 초기화에 실패했습니다. DB 연결 환경변수(DATABASE_URL/DIRECT_URL)를 확인해 주세요.",
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P6001") {
    return {
      status: 503,
      code: "DB_ENV_INVALID",
      message:
        "데이터베이스 연결 문자열 형식이 올바르지 않습니다. DATABASE_URL/DIRECT_URL 값을 확인해 주세요.",
    };
  }

  const rawMessage = normalizeErrorMessage(error).toLowerCase();
  if (rawMessage.includes("p6001")) {
    return {
      status: 503,
      code: "DB_ENV_INVALID",
      message:
        "데이터베이스 연결 문자열 형식이 올바르지 않습니다. DATABASE_URL/DIRECT_URL 값을 확인해 주세요.",
    };
  }

  return {
    status: 500,
    code: "DB_QUERY_FAILED",
    message: fallbackMessage,
  };
}

