import { NextResponse } from "next/server";
import { z } from "zod";
import type { HyphenApiResponse } from "@/lib/server/hyphen/client";
import {
  fetchCheckupList,
  fetchHealthAge,
  fetchLifestyle,
} from "@/lib/server/hyphen/client";
import {
  getNhisLink,
  saveNhisLinkError,
  upsertNhisLink,
} from "@/lib/server/hyphen/link";
import { normalizeNhisPayload } from "@/lib/server/hyphen/normalize";
import {
  getErrorCodeMessage,
  logHyphenError,
  NO_STORE_HEADERS,
} from "@/lib/server/hyphen/route-utils";
import { getPendingEasyAuth } from "@/lib/server/hyphen/session";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

const targetEnum = z.enum(["checkup", "lifestyle", "healthAge"]);
const fetchSchema = z
  .object({
    targets: z.array(targetEnum).min(1).optional(),
  })
  .optional();

type FetchTarget = z.infer<typeof targetEnum>;

function dedupeTargets(input?: FetchTarget[]) {
  if (!input || input.length === 0) {
    return ["checkup", "lifestyle", "healthAge"] as FetchTarget[];
  }
  return Array.from(new Set(input));
}

function emptyPayload(): HyphenApiResponse {
  return { data: {} };
}

export async function POST(req: Request) {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = fetchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const targets = dedupeTargets(parsed.data?.targets);
  const [link, pendingEasyAuth] = await Promise.all([
    getNhisLink(auth.data.appUserId),
    getPendingEasyAuth(),
  ]);

  if (!link?.linked) {
    return NextResponse.json(
      {
        ok: false,
        error: "연동이 완료되지 않았습니다. init/sign 단계를 먼저 진행해 주세요.",
      },
      { status: 409, headers: NO_STORE_HEADERS }
    );
  }

  const basePayload = {
    loginMethod: (link.loginMethod as "EASY" | "CERT" | null) ?? "EASY",
    loginOrgCd: pendingEasyAuth?.loginOrgCd ?? link.loginOrgCd ?? undefined,
    resNm: pendingEasyAuth?.resNm,
    resNo: pendingEasyAuth?.resNo,
    mobileNo: pendingEasyAuth?.mobileNo,
    mobileCo: pendingEasyAuth?.mobileCo,
    cookieData: link.cookieData ?? undefined,
    showCookie: "Y" as const,
  };

  const requestEntries = targets.map((target) => {
    if (target === "checkup") {
      return {
        target,
        promise: fetchCheckupList(basePayload),
      };
    }
    if (target === "lifestyle") {
      return {
        target,
        promise: fetchLifestyle(basePayload),
      };
    }
    return {
      target,
      promise: fetchHealthAge(basePayload),
    };
  });

  const settled = await Promise.allSettled(requestEntries.map((entry) => entry.promise));

  const successful = new Map<FetchTarget, HyphenApiResponse>();
  const failed: Array<{
    target: FetchTarget;
    errCd?: string;
    errMsg?: string;
  }> = [];

  settled.forEach((result, index) => {
    const target = requestEntries[index]!.target;
    if (result.status === "fulfilled") {
      successful.set(target, result.value);
      return;
    }
    const reason = result.reason;
    logHyphenError(`[hyphen][fetch] target=${target} failed`, reason);
    const errorInfo = getErrorCodeMessage(reason);
    failed.push({
      target,
      errCd: errorInfo.code,
      errMsg: errorInfo.message,
    });
  });

  if (failed.length === requestEntries.length) {
    const firstError = settled[0];
    if (firstError?.status === "rejected") {
      const errorInfo = getErrorCodeMessage(firstError.reason);
      await saveNhisLinkError(auth.data.appUserId, {
        code: errorInfo.code,
        message: errorInfo.message,
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: "데이터 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        failed,
      },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }

  const normalized = normalizeNhisPayload({
    checkup: successful.get("checkup") ?? emptyPayload(),
    lifestyle: successful.get("lifestyle") ?? emptyPayload(),
    healthAge: successful.get("healthAge") ?? emptyPayload(),
  });

  const firstFailed = failed[0];
  await upsertNhisLink(auth.data.appUserId, {
    lastFetchedAt: new Date(),
    lastErrorCode: firstFailed?.errCd ?? null,
    lastErrorMessage: firstFailed?.errMsg ?? null,
  });

  const hasPartialFailure = failed.length > 0;

  return NextResponse.json(
    {
      ok: true,
      partial: hasPartialFailure,
      failed,
      data: {
        normalized,
        raw: {
          checkup: successful.get("checkup") ?? null,
          lifestyle: successful.get("lifestyle") ?? null,
          healthAge: successful.get("healthAge") ?? null,
        },
      },
    },
    {
      status: 200,
      headers: NO_STORE_HEADERS,
    }
  );
}
