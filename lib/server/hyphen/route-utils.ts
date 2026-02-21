import "server-only";

import { NextResponse } from "next/server";
import {
  getHyphenCommon,
  isHyphenApiError,
} from "@/lib/server/hyphen/client";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export function hyphenErrorToResponse(
  error: unknown,
  fallbackMessage = "하이픈 연동 중 오류가 발생했습니다."
) {
  if (isHyphenApiError(error)) {
    console.error("[hyphen][route] request failed", {
      endpoint: error.endpoint,
      status: error.status,
      errCd: error.errCd,
      errMsg: error.errMsg,
      hyphenTrNo: error.hyphenTrNo,
      userTrNo: error.userTrNo,
    });
    return NextResponse.json(
      {
        ok: false,
        error: fallbackMessage,
        errCd: error.errCd ?? null,
        errMsg: error.errMsg ?? null,
      },
      {
        status: error.status >= 400 ? error.status : 502,
        headers: NO_STORE_HEADERS,
      }
    );
  }

  const knownCommon = getCommonFromUnknown(error);
  if (knownCommon) {
    console.error("[hyphen][route] common error payload", knownCommon);
    return NextResponse.json(
      {
        ok: false,
        error: fallbackMessage,
        errCd: knownCommon.errCd ?? null,
        errMsg: knownCommon.errMsg ?? null,
      },
      {
        status: 502,
        headers: NO_STORE_HEADERS,
      }
    );
  }

  console.error("[hyphen][route] unexpected error", {
    message: (error as any)?.message,
    stack: (error as any)?.stack,
  });
  return NextResponse.json(
    {
      ok: false,
      error: fallbackMessage,
    },
    {
      status: 500,
      headers: NO_STORE_HEADERS,
    }
  );
}

export function getErrorCodeMessage(error: unknown) {
  if (isHyphenApiError(error)) {
    return {
      code: error.errCd,
      message: error.errMsg || error.message,
    };
  }
  const knownCommon = getCommonFromUnknown(error);
  if (knownCommon) {
    return {
      code: knownCommon.errCd,
      message: knownCommon.errMsg,
    };
  }
  return {
    code: undefined,
    message: (error as any)?.message ?? "Unknown error",
  };
}

function getCommonFromUnknown(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const common = getHyphenCommon(value);
  if (!common.errCd && !common.errMsg && !common.hyphenTrNo && !common.userTrNo) {
    return null;
  }
  return common;
}

export function logHyphenError(label: string, error: unknown) {
  if (isHyphenApiError(error)) {
    console.error(label, {
      endpoint: error.endpoint,
      status: error.status,
      errCd: error.errCd,
      errMsg: error.errMsg,
      hyphenTrNo: error.hyphenTrNo,
      userTrNo: error.userTrNo,
    });
    return;
  }
  const common = getCommonFromUnknown(error);
  if (common) {
    console.error(label, common);
    return;
  }
  console.error(label, {
    message: (error as any)?.message,
  });
}
