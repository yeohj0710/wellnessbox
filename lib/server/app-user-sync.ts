import db from "@/lib/db";
import { normalizePhone } from "@/lib/otp";

function buildPhoneCandidates(rawPhone?: string | null) {
  const normalized = normalizePhone(rawPhone ?? "");
  const digitsOnly = normalized.replace(/\D/g, "");
  const trimmedRaw =
    typeof rawPhone === "string" ? rawPhone.trim() : undefined;
  const localDigits = digitsOnly.startsWith("82")
    ? `0${digitsOnly.slice(2)}`
    : digitsOnly;
  const intlDigits = digitsOnly.startsWith("0")
    ? `82${digitsOnly.slice(1)}`
    : digitsOnly;
  const formattedWithHyphens = (() => {
    if (localDigits.length === 10) {
      return `${localDigits.slice(0, 3)}-${localDigits.slice(
        3,
        6
      )}-${localDigits.slice(6)}`;
    }
    if (localDigits.length === 11) {
      return `${localDigits.slice(0, 3)}-${localDigits.slice(
        3,
        7
      )}-${localDigits.slice(7)}`;
    }
    return "";
  })();

  return Array.from(
    new Set(
      [
        trimmedRaw,
        normalized,
        digitsOnly,
        localDigits,
        intlDigits,
        formattedWithHyphens,
        intlDigits ? `+${intlDigits}` : "",
        intlDigits && intlDigits.length > 2
          ? `+${intlDigits.slice(0, 2)} ${intlDigits.slice(2)}`
          : "",
      ]
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );
}

export async function backfillOrdersForAppUser(
  appUserId: string,
  rawPhone?: string | null
) {
  const phoneCandidates = buildPhoneCandidates(rawPhone);
  if (!appUserId || phoneCandidates.length === 0) return 0;
  const result = await db.order.updateMany({
    where: {
      appUserId: null,
      OR: phoneCandidates.map((candidate) => ({ phone: candidate })),
    },
    data: { appUserId },
  });
  return result.count;
}

export async function backfillChatSessionsForAppUser(
  appUserId: string,
  clientId?: string | null
) {
  if (!appUserId || !clientId) return 0;
  const result = await db.chatSession.updateMany({
    where: { clientId, appUserId: null },
    data: { appUserId },
  });
  return result.count;
}

export async function backfillAssessmentResultsForAppUser(
  appUserId: string,
  clientId?: string | null
) {
  if (!appUserId || !clientId) return 0;
  const result = await db.assessmentResult.updateMany({
    where: { clientId, appUserId: null },
    data: { appUserId },
  });
  return result.count;
}

export async function backfillCheckAiResultsForAppUser(
  appUserId: string,
  clientId?: string | null
) {
  if (!appUserId || !clientId) return 0;
  const result = await db.checkAiResult.updateMany({
    where: { clientId, appUserId: null },
    data: { appUserId },
  });
  return result.count;
}

export async function backfillLoginDataForAppUser(options: {
  appUserId: string;
  clientId?: string | null;
}) {
  const { appUserId, clientId } = options;
  await Promise.all([
    backfillAssessmentResultsForAppUser(appUserId, clientId),
    backfillCheckAiResultsForAppUser(appUserId, clientId),
  ]);
}
