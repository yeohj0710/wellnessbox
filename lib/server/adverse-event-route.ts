import "server-only";

import { AdverseEventSeverity } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { resolveActorForRequest } from "@/lib/server/actor";

const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_SYMPTOM_LENGTH = 2000;
const MAX_CONTACT_LENGTH = 200;
const MAX_ORDER_ID_LENGTH = 100;

const SEVERITY_VALUES = new Set<string>(Object.values(AdverseEventSeverity));

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function trimmedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return trimmedString(value, maxLength);
}

function optionalDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  // 미래 날짜는 오기이므로 받지 않는다.
  if (parsed.getTime() > Date.now()) return undefined;
  return parsed;
}

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function runAdverseEventReportRoute(req: NextRequest) {
  try {
    const body = asRecord(await req.json());

    const productName = trimmedString(body.productName, MAX_PRODUCT_NAME_LENGTH);
    if (!productName) return badRequest("제품명을 입력해 주세요.");

    const symptomText = trimmedString(body.symptomText, MAX_SYMPTOM_LENGTH);
    if (!symptomText) return badRequest("어떤 증상이 있었는지 적어 주세요.");

    const severityRaw = typeof body.severity === "string" ? body.severity : "";
    if (!SEVERITY_VALUES.has(severityRaw)) return badRequest("증상 정도를 골라 주세요.");
    const severity = severityRaw as AdverseEventSeverity;

    const onsetAt = optionalDate(body.onsetAt);
    if (onsetAt === undefined) return badRequest("증상이 생긴 날짜를 다시 확인해 주세요.");

    // 연락처는 후속 확인용이라 선택이지만, 남기면 개인정보 동의가 있어야 한다.
    const contactEmail = optionalString(body.contactEmail, MAX_CONTACT_LENGTH);
    const contactPhone = optionalString(body.contactPhone, MAX_CONTACT_LENGTH);
    const privacyConsented = body.privacyConsented === true;
    if ((contactEmail || contactPhone) && !privacyConsented) {
      return badRequest("연락처를 남기시려면 개인정보 수집에 동의해 주세요.");
    }

    const actor = await resolveActorForRequest(req, {});

    const report = await db.adverseEventReport.create({
      data: {
        clientId: actor.deviceClientId ?? null,
        appUserId: actor.appUserId ?? null,
        productName,
        symptomText,
        severity,
        onsetAt,
        stillTaking: body.stillTaking === true,
        relatedToRecommendation: body.relatedToRecommendation === true,
        orderId: optionalString(body.orderId, MAX_ORDER_ID_LENGTH),
        contactEmail,
        contactPhone,
        privacyConsented,
        // 중대 이상반응은 접수와 동시에 확인 대상으로 올린다.
        status: severity === AdverseEventSeverity.SERIOUS ? "ESCALATED" : "RECEIVED",
      },
      select: { id: true, status: true },
    });

    return NextResponse.json({ ok: true, id: report.id, status: report.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "신고를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
