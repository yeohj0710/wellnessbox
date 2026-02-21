import "server-only";

import { NextResponse } from "next/server";
import { getHyphenCommon, isHyphenApiError } from "@/lib/server/hyphen/client";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

const BR_TAG_PATTERN = /<br\s*\/?>/gi;
const HTML_TAG_PATTERN = /<\/?[^>]+>/g;
const MULTI_SPACE_PATTERN = /\s{2,}/g;
const ERROR_CODE_PREFIX_PATTERN = /^\s*\[([A-Za-z0-9-]+)\]\s*/;
const PRECONDITION_ERROR_CODES = new Set(["C0012-001"]);

export function sanitizeHyphenMessage(
  message: string | null | undefined
): string | undefined {
  if (!message) return undefined;
  const cleaned = message
    .replace(BR_TAG_PATTERN, "\n")
    .replace(HTML_TAG_PATTERN, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(MULTI_SPACE_PATTERN, " ")
    .trim();
  return cleaned || undefined;
}

function extractHyphenErrCode(
  errCd: string | null | undefined,
  errMsg: string | null | undefined
): string | undefined {
  const fromCode = (errCd || "").trim();
  if (fromCode) return fromCode;
  const fromMessage = sanitizeHyphenMessage(errMsg);
  if (!fromMessage) return undefined;
  const matched = fromMessage.match(ERROR_CODE_PREFIX_PATTERN);
  return matched?.[1];
}

export function hyphenErrorToResponse(
  error: unknown,
  fallbackMessage = "Failed to process Hyphen request."
) {
  const safeFallback =
    sanitizeHyphenMessage(fallbackMessage) ?? "Failed to process Hyphen request.";

  if (isHyphenApiError(error)) {
    const safeErrMsg = sanitizeHyphenMessage(error.errMsg);
    const resolvedErrCd = extractHyphenErrCode(error.errCd, error.errMsg);
    console.error("[hyphen][route] request failed", {
      endpoint: error.endpoint,
      status: error.status,
      errCd: resolvedErrCd ?? error.errCd,
      errMsg: error.errMsg,
      hyphenTrNo: error.hyphenTrNo,
      userTrNo: error.userTrNo,
    });
    const responseStatus = resolveRouteStatus(error.status, resolvedErrCd);
    return NextResponse.json(
      {
        ok: false,
        error: safeFallback,
        errCd: resolvedErrCd ?? null,
        errMsg: safeErrMsg ?? null,
      },
      {
        status: responseStatus,
        headers: NO_STORE_HEADERS,
      }
    );
  }

  const knownCommon = getCommonFromUnknown(error);
  if (knownCommon) {
    console.error("[hyphen][route] common error payload", knownCommon);
    const safeErrMsg = sanitizeHyphenMessage(knownCommon.errMsg);
    const resolvedErrCd = extractHyphenErrCode(knownCommon.errCd, knownCommon.errMsg);
    const responseStatus = resolveRouteStatus(422, resolvedErrCd);
    return NextResponse.json(
      {
        ok: false,
        error: safeFallback,
        errCd: resolvedErrCd ?? null,
        errMsg: safeErrMsg ?? null,
      },
      {
        status: responseStatus,
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
      error: safeFallback,
    },
    {
      status: 500,
      headers: NO_STORE_HEADERS,
    }
  );
}

function resolveRouteStatus(sourceStatus: number, errCode?: string) {
  if (errCode && PRECONDITION_ERROR_CODES.has(errCode)) {
    return 412;
  }
  return sourceStatus >= 400 ? sourceStatus : 422;
}

export function getErrorCodeMessage(error: unknown) {
  if (isHyphenApiError(error)) {
    return {
      code: extractHyphenErrCode(error.errCd, error.errMsg),
      message: sanitizeHyphenMessage(error.errMsg) || error.message,
    };
  }
  const knownCommon = getCommonFromUnknown(error);
  if (knownCommon) {
    return {
      code: extractHyphenErrCode(knownCommon.errCd, knownCommon.errMsg),
      message: sanitizeHyphenMessage(knownCommon.errMsg),
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
    const resolvedErrCd = extractHyphenErrCode(error.errCd, error.errMsg);
    console.error(label, {
      endpoint: error.endpoint,
      status: error.status,
      errCd: resolvedErrCd ?? error.errCd,
      errMsg: sanitizeHyphenMessage(error.errMsg) ?? error.errMsg,
      hyphenTrNo: error.hyphenTrNo,
      userTrNo: error.userTrNo,
    });
    return;
  }
  const common = getCommonFromUnknown(error);
  if (common) {
    const resolvedErrCd = extractHyphenErrCode(common.errCd, common.errMsg);
    console.error(label, {
      ...common,
      errCd: resolvedErrCd ?? common.errCd,
      errMsg: sanitizeHyphenMessage(common.errMsg) ?? common.errMsg,
    });
    return;
  }
  console.error(label, {
    message: (error as any)?.message,
  });
}
