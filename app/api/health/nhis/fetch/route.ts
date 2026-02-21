import { NextResponse } from "next/server";
import { z } from "zod";
import type { HyphenApiResponse } from "@/lib/server/hyphen/client";
import {
  fetchCheckupOverview,
  fetchCheckupResultList,
  fetchCheckupYearlyResult,
  fetchHealthAge,
  fetchMedicalInfo,
  fetchMedicationInfo,
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
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import { getPendingEasyAuth } from "@/lib/server/hyphen/session";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

const targetEnum = z.enum([
  "medical",
  "medication",
  "checkupList",
  "checkupYearly",
  "checkupOverview",
  "healthAge",
]);

const fetchSchema = z
  .object({
    targets: z.array(targetEnum).min(1).optional(),
  })
  .optional();

type FetchTarget = z.infer<typeof targetEnum>;
type FailedItem = { target: FetchTarget; errCd?: string; errMsg?: string };

type DetailKeyPair = {
  detailKey: string;
  detailKey2?: string;
};

const DEFAULT_TARGETS: FetchTarget[] = ["checkupOverview"];

function getErrorBody(error: unknown): unknown | null {
  if (!error || typeof error !== "object") return null;
  const candidate = (error as { body?: unknown }).body;
  return candidate ?? null;
}

function dedupeTargets(input?: FetchTarget[]) {
  if (!input || input.length === 0) return DEFAULT_TARGETS;
  return Array.from(new Set(input));
}

function emptyPayload(): HyphenApiResponse {
  return { data: {} };
}

function parseYears(fromDate?: string, toDate?: string, maxYears = 15) {
  const fromYear = Number((fromDate || "").slice(0, 4));
  const toYear = Number((toDate || "").slice(0, 4));
  const currentYear = new Date().getFullYear();

  if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) {
    return [String(currentYear)];
  }

  const start = Math.max(1900, Math.min(fromYear, toYear));
  const end = Math.min(2100, Math.max(fromYear, toYear));
  const years: string[] = [];
  for (let year = end; year >= start; year -= 1) {
    years.push(String(year));
    if (years.length >= maxYears) break;
  }
  return years;
}

function toNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function collectDetailKeyPairs(input: unknown, maxPairs = 20): DetailKeyPair[] {
  const out: DetailKeyPair[] = [];
  const seen = new Set<string>();

  function visit(value: unknown, depth: number) {
    if (depth > 8 || out.length >= maxPairs) return;
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (out.length >= maxPairs) break;
        visit(item, depth + 1);
      }
      return;
    }

    const record = value as Record<string, unknown>;
    const detailKey =
      toNonEmptyText(record.detailKey) ??
      toNonEmptyText(record.detail_key) ??
      toNonEmptyText(record.detailkey);
    const detailKey2 =
      toNonEmptyText(record.detailKey2) ??
      toNonEmptyText(record.detail_key2) ??
      toNonEmptyText(record.detailkey2);

    if (detailKey) {
      const signature = `${detailKey}|${detailKey2 ?? ""}`;
      if (!seen.has(signature)) {
        seen.add(signature);
        out.push({ detailKey, detailKey2: detailKey2 ?? undefined });
      }
    }

    for (const child of Object.values(record)) {
      if (out.length >= maxPairs) break;
      visit(child, depth + 1);
    }
  }

  visit(input, 0);
  return out;
}

function mergeListPayloads(payloads: HyphenApiResponse[]) {
  const mergedList: unknown[] = [];
  const years: string[] = [];

  for (const payload of payloads) {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const list = Array.isArray(data.list) ? data.list : [];
    mergedList.push(...list);

    const yyyy = toNonEmptyText(data.yyyy ?? data.year ?? data.businessYear);
    if (yyyy) years.push(yyyy);
  }

  return {
    data: {
      list: mergedList,
      years,
    },
  } as HyphenApiResponse;
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
  const requestDefaults = buildNhisRequestDefaults();

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
    ...requestDefaults,
    cookieData: link.cookieData ?? undefined,
    showCookie: "Y" as const,
  };

  const detailPayload = {
    ...basePayload,
    detailYn: "Y" as const,
    imgYn: "N" as const,
  };

  const successful = new Map<FetchTarget, unknown>();
  const failed: FailedItem[] = [];
  const rawFailures = new Map<FetchTarget, unknown>();

  const markFailure = (target: FetchTarget, reason: unknown, fallbackMessage?: string) => {
    logHyphenError(`[hyphen][fetch] target=${target} failed`, reason);
    const errorInfo = getErrorCodeMessage(reason);
    const errorBody = getErrorBody(reason);
    if (errorBody !== null) {
      rawFailures.set(target, errorBody);
    }
    failed.push({
      target,
      errCd: errorInfo.code,
      errMsg: errorInfo.message || fallbackMessage,
    });
  };

  const independentJobs: Promise<void>[] = [];

  const runIndependentTarget = (
    target: FetchTarget,
    runner: () => Promise<unknown>,
    fallbackMessage: string
  ) => {
    if (!targets.includes(target)) return;
    independentJobs.push(
      (async () => {
        try {
          const result = await runner();
          successful.set(target, result);
        } catch (error) {
          markFailure(target, error, fallbackMessage);
        }
      })()
    );
  };

  runIndependentTarget("medical", () => fetchMedicalInfo(detailPayload), "진료 정보 조회 실패");
  runIndependentTarget(
    "medication",
    () => fetchMedicationInfo(detailPayload),
    "투약 정보 조회 실패"
  );
  runIndependentTarget(
    "checkupOverview",
    () => fetchCheckupOverview(basePayload),
    "건강검진 결과 한눈에 보기 조회 실패"
  );
  runIndependentTarget("healthAge", () => fetchHealthAge(basePayload), "건강나이 조회 실패");

  const shouldLoadCheckupList = targets.includes("checkupList") || targets.includes("checkupYearly");
  let checkupListPayloads: HyphenApiResponse[] = [];
  let checkupListRawByYear: Record<string, unknown> = {};

  if (shouldLoadCheckupList) {
    const years = parseYears(requestDefaults.fromDate, requestDefaults.toDate);
    const settled = await Promise.allSettled(
      years.map((year) => fetchCheckupResultList({ ...basePayload, yyyy: year }))
    );

    const yearFailures: string[] = [];
    checkupListRawByYear = {};

    settled.forEach((result, index) => {
      const year = years[index]!;
      if (result.status === "fulfilled") {
        checkupListPayloads.push(result.value);
        checkupListRawByYear[year] = result.value;
        return;
      }
      const reason = result.reason;
      const errorInfo = getErrorCodeMessage(reason);
      yearFailures.push(`${year}: ${errorInfo.message || "조회 실패"}`);
      const errorBody = getErrorBody(reason);
      if (errorBody !== null) {
        checkupListRawByYear[year] = errorBody;
      }
    });

    if (checkupListPayloads.length > 0) {
      successful.set("checkupList", checkupListPayloads);
      if (yearFailures.length > 0) {
        failed.push({
          target: "checkupList",
          errMsg: `건강검진결과목록 일부 연도 실패 (${yearFailures.slice(0, 4).join(", ")})`,
        });
      }
    } else {
      failed.push({
        target: "checkupList",
        errMsg: "건강검진결과목록 조회 실패",
      });
      rawFailures.set("checkupList", checkupListRawByYear);
    }
  }

  if (targets.includes("checkupYearly")) {
    const yearlyPayloads: HyphenApiResponse[] = [];
    const yearlyRaw: unknown[] = [];

    const keyPairs = collectDetailKeyPairs(checkupListPayloads);
    if (keyPairs.length > 0) {
      const settled = await Promise.allSettled(
        keyPairs.map((pair) =>
          fetchCheckupYearlyResult({
            ...basePayload,
            detailKey: pair.detailKey,
            detailKey2: pair.detailKey2,
          })
        )
      );

      settled.forEach((result) => {
        if (result.status === "fulfilled") {
          yearlyPayloads.push(result.value);
          yearlyRaw.push(result.value);
          return;
        }
        const reason = result.reason;
        const bodyValue = getErrorBody(reason);
        if (bodyValue !== null) {
          yearlyRaw.push(bodyValue);
        }
      });
    } else {
      try {
        const payload = await fetchCheckupYearlyResult(basePayload);
        yearlyPayloads.push(payload);
        yearlyRaw.push(payload);
      } catch (error) {
        const bodyValue = getErrorBody(error);
        if (bodyValue !== null) yearlyRaw.push(bodyValue);
      }
    }

    if (yearlyPayloads.length > 0) {
      successful.set("checkupYearly", yearlyPayloads);
    } else {
      failed.push({
        target: "checkupYearly",
        errMsg: "연도별건강검진결과 상세 조회 실패",
      });
      rawFailures.set("checkupYearly", yearlyRaw);
    }
  }

  await Promise.all(independentJobs);

  if (successful.size === 0) {
    const firstFailed = failed[0];
    await saveNhisLinkError(auth.data.appUserId, {
      code: firstFailed?.errCd ?? undefined,
      message: firstFailed?.errMsg ?? "데이터 조회 실패",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "데이터 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        failed,
      },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }

  const checkupListPayload = (successful.get("checkupList") as HyphenApiResponse[] | undefined) ?? [];
  const checkupYearlyPayload =
    (successful.get("checkupYearly") as HyphenApiResponse[] | undefined) ?? [];
  const normalized = normalizeNhisPayload({
    medical: (successful.get("medical") as HyphenApiResponse | undefined) ?? emptyPayload(),
    medication: (successful.get("medication") as HyphenApiResponse | undefined) ?? emptyPayload(),
    checkupList: checkupListPayload,
    checkupYearly: checkupYearlyPayload,
    checkupOverview:
      (successful.get("checkupOverview") as HyphenApiResponse | undefined) ?? emptyPayload(),
    healthAge: (successful.get("healthAge") as HyphenApiResponse | undefined) ?? emptyPayload(),
  });

  const firstFailed = failed[0];
  await upsertNhisLink(auth.data.appUserId, {
    lastFetchedAt: new Date(),
    lastErrorCode: firstFailed?.errCd ?? null,
    lastErrorMessage: firstFailed?.errMsg ?? null,
  });

  return NextResponse.json(
    {
      ok: true,
      partial: failed.length > 0,
      failed,
      data: {
        normalized,
        raw: {
          medical: successful.get("medical") ?? rawFailures.get("medical") ?? null,
          medication: successful.get("medication") ?? rawFailures.get("medication") ?? null,
          checkupList:
            (checkupListPayload.length > 0
              ? mergeListPayloads(checkupListPayload)
              : rawFailures.get("checkupList")) ?? null,
          checkupYearly:
            (checkupYearlyPayload.length > 0
              ? checkupYearlyPayload
              : rawFailures.get("checkupYearly")) ?? null,
          checkupOverview:
            successful.get("checkupOverview") ?? rawFailures.get("checkupOverview") ?? null,
          healthAge: successful.get("healthAge") ?? rawFailures.get("healthAge") ?? null,
          checkupListByYear: checkupListRawByYear,
        },
      },
    },
    {
      status: 200,
      headers: NO_STORE_HEADERS,
    }
  );
}
