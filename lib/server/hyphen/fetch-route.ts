import "server-only";

import {
  dedupeTargets,
  executeAndPersistNhisFetch,
  fetchSchema,
  resolveFailedNhisFetchResponse,
  resolveFetchExecutionContext,
} from "@/lib/server/hyphen/fetch-route-helpers";
import { resolveNhisEffectiveYearLimit } from "@/lib/server/hyphen/fetch-request-policy";
import { nhisNoStoreJson } from "@/lib/server/hyphen/nhis-route-responses";
import { requireNhisSession } from "@/lib/server/route-auth";

export async function runNhisFetchRoute(req: Request, appUserId: string) {
  const body = await req.json().catch(() => ({}));
  const parsed = fetchSchema.safeParse(body);
  if (!parsed.success) {
    return nhisNoStoreJson(
      { ok: false, error: parsed.error.issues[0]?.message || "입력값을 확인해 주세요." },
      400
    );
  }

  const targets = dedupeTargets(parsed.data?.targets);
  const effectiveYearLimit = resolveNhisEffectiveYearLimit(
    targets,
    parsed.data?.yearLimit
  );
  const forceRefresh = parsed.data?.forceRefresh === true;

  const execution = await resolveFetchExecutionContext({
    appUserId,
    targets,
    effectiveYearLimit,
    forceRefresh,
  });
  if (!execution.ready) return execution.response;

  const freshResult = await executeAndPersistNhisFetch({
    ...execution.context,
  });

  if (!freshResult.payload.ok) {
    return resolveFailedNhisFetchResponse({
      payload: freshResult.payload,
      statusCode: freshResult.statusCode,
    });
  }

  return nhisNoStoreJson(
    { ...freshResult.payload, cached: false, cache: { source: "fresh" } },
    freshResult.statusCode
  );
}

export async function runNhisFetchPostRoute(req: Request) {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;
  return runNhisFetchRoute(req, auth.data.appUserId);
}
