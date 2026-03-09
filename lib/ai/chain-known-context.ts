import { CATEGORY_LABELS, CategoryKey, KEY_TO_CODE } from "@/lib/categories";

const CAT_ALIAS: Record<string, CategoryKey> = Object.fromEntries(
  Object.entries(KEY_TO_CODE).flatMap(([key, code]) => {
    const catKey = key as CategoryKey;
    const label = CATEGORY_LABELS[catKey];
    return [
      [key, catKey],
      [code, catKey],
      [label, catKey],
    ];
  })
) as Record<string, CategoryKey>;

function labelOf(keyOrCodeOrLabel: string) {
  const alias = (CAT_ALIAS[keyOrCodeOrLabel] ?? keyOrCodeOrLabel) as string;
  const label = CATEGORY_LABELS[alias as keyof typeof CATEGORY_LABELS];
  if (label) return label;
  const found = Object.values(CATEGORY_LABELS).find(
    (item) => item === keyOrCodeOrLabel
  );
  return found ?? keyOrCodeOrLabel;
}

function readHeader(
  headers: Headers | Record<string, string | null | undefined>,
  key: string
) {
  return typeof (headers as any)?.get === "function"
    ? (headers as any).get(key)
    : (headers as any)?.[key] ?? (headers as any)?.[key.toLowerCase()] ?? null;
}

export async function buildKnownContext(
  scope: { clientId?: string; appUserId?: string },
  headers: Headers | Record<string, string | null | undefined>,
  localAssessCats: string[] | undefined,
  localCheckAiTopLabels: string[] | undefined,
  actorContext?: { loggedIn?: boolean; phoneLinked?: boolean }
) {
  const clientId =
    typeof scope.clientId === "string" ? scope.clientId : undefined;
  const appUserId =
    typeof scope.appUserId === "string" ? scope.appUserId : undefined;
  if (!clientId && !appUserId) return "";

  try {
    const { ensureClient } = await import("@/lib/server/client");
    if (clientId) {
      await ensureClient(clientId, { userAgent: readHeader(headers, "user-agent") });
    }
  } catch {
    // ignore client-side context hydration failures
  }

  try {
    const { getLatestResultsByScope } = await import("@/lib/server/results");
    const latest = await getLatestResultsByScope({ appUserId, clientId });
    const parts: string[] = [];

    if (actorContext && typeof actorContext.loggedIn === "boolean") {
      if (!actorContext.loggedIn) {
        parts.push("데이터 범위: 비로그인 기기(clientId) 기반");
      } else if (actorContext.phoneLinked) {
        parts.push("데이터 범위: 로그인 계정 기반(주문 포함)");
      } else {
        parts.push("데이터 범위: 로그인 계정 기반(전화번호 연결 시 확장)");
      }
    }

    if (latest.assessCats?.length) {
      const cats = latest.assessCats.slice(0, 3);
      const summary = cats.map((cat) => labelOf(cat)).join(", ");
      parts.push(`평가 결과 상위 ${summary}`);
    } else if (Array.isArray(localAssessCats) && localAssessCats.length) {
      parts.push(
        `평가 결과(로컬) 상위 ${localAssessCats
          .slice(0, 3)
          .map((cat) => labelOf(cat))
          .join(", ")}`
      );
    }

    if (
      (!latest.assessCats || latest.assessCats.length === 0) &&
      latest.checkAiTopLabels?.length
    ) {
      parts.push(`빠른 검사 상위 ${latest.checkAiTopLabels.slice(0, 3).join(", ")}`);
    } else if (
      parts.length === 0 &&
      Array.isArray(localCheckAiTopLabels) &&
      localCheckAiTopLabels.length
    ) {
      parts.push(
        `빠른 검사(로컬) 상위 ${localCheckAiTopLabels.slice(0, 3).join(", ")}`
      );
    }

    return parts.length > 0 ? parts.join(" | ") : "";
  } catch {
    return "";
  }
}
