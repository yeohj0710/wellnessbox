import "server-only";

import { ProOutcomePhase } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { resolveActorForRequest } from "@/lib/server/actor";

/**
 * 복용 전후 PRO 접수. KPI-2(효과 개선도) 표본을 쌓는 경로다.
 *
 * 이름과 연락처를 새로 받지 않는다. 전과 후를 짝지을 수 있으면 그것으로 충분하고,
 * 짝짓기는 participantToken 하나로 한다.
 */

const MAX_TOKEN_LENGTH = 64;
const MIN_TOKEN_LENGTH = 16;
const MAX_GOAL_KEY_LENGTH = 40;
const MAX_NOTE_LENGTH = 500;
const MAX_ORDER_ID_LENGTH = 100;

/** 지금 받고 있는 동의문 판. 문구가 바뀌면 이 값을 올리고 옛 판은 그대로 둔다. */
export const PRO_CONSENT_VERSION = "pro-consent-2026-08-25";

/** 목표는 성분이 아니라 상태로 받는다. 성분으로 받으면 엔진 추천을 되묻는 꼴이 된다. */
export const PRO_GOAL_KEYS = [
  "sleep",
  "fatigue",
  "digestion",
  "immunity",
  "joint",
  "stress",
  "blood_sugar",
  "other",
] as const;

const GOAL_KEY_SET = new Set<string>(PRO_GOAL_KEYS);
const PHASE_SET = new Set<string>(Object.values(ProOutcomePhase));

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

/** 0~10 자기평가. 정수만 받는다. 소수나 범위 밖은 오기이므로 거른다. */
function score0to10(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > 10) return null;
  return value;
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function optionalBoundedInt(
  value: unknown,
  min: number,
  max: number
): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < min || value > max) return undefined;
  return value;
}

export async function runProOutcomeRoute(req: NextRequest) {
  try {
    const body = asRecord(await req.json());

    const phaseRaw = typeof body.phase === "string" ? body.phase : "";
    if (!PHASE_SET.has(phaseRaw)) return badRequest("응답 시점을 확인할 수 없습니다.");
    const phase = phaseRaw as ProOutcomePhase;

    const participantToken = optionalString(body.participantToken, MAX_TOKEN_LENGTH);
    if (!participantToken || participantToken.length < MIN_TOKEN_LENGTH) {
      return badRequest("참여 링크가 올바르지 않습니다. 받으신 링크로 다시 들어와 주세요.");
    }

    const goalKey = typeof body.goalKey === "string" ? body.goalKey : "";
    if (!GOAL_KEY_SET.has(goalKey)) return badRequest("개선하고 싶은 것을 골라 주세요.");

    const goalScore = score0to10(body.goalScore);
    const generalScore = score0to10(body.generalScore);
    const sleepScore = score0to10(body.sleepScore);
    const digestionScore = score0to10(body.digestionScore);
    const energyScore = score0to10(body.energyScore);
    if (
      goalScore === null ||
      generalScore === null ||
      sleepScore === null ||
      digestionScore === null ||
      energyScore === null
    ) {
      return badRequest("모든 문항에 0에서 10 사이로 답해 주세요.");
    }

    // 연구 이용에 동의하지 않으면 저장하지 않는다. 동의 없이 받아 두고 나중에
    // 집계에서 빼는 방식은 쓰지 않는다. 받지 않는 것이 맞다.
    if (body.researchConsented !== true) {
      return badRequest("연구 이용 동의가 있어야 답변을 남길 수 있습니다.");
    }

    const daysTaken =
      phase === "FOLLOWUP" ? optionalBoundedInt(body.daysTaken, 0, 365) : null;
    if (daysTaken === undefined) return badRequest("복용한 날수를 다시 확인해 주세요.");

    const adherencePercent =
      phase === "FOLLOWUP" ? optionalBoundedInt(body.adherencePercent, 0, 100) : null;
    if (adherencePercent === undefined) {
      return badRequest("얼마나 챙겨 드셨는지 다시 확인해 주세요.");
    }

    const note = optionalString(body.note, MAX_NOTE_LENGTH);
    const orderId = optionalString(body.orderId, MAX_ORDER_ID_LENGTH);

    const actor = await resolveActorForRequest(req, {}).catch(() => null);

    // 후속 응답인데 복용 전 응답이 없으면 짝을 지을 수 없다. 그대로 받으면
    // 짝 없는 행만 쌓인다.
    if (phase === "FOLLOWUP") {
      const baseline = await db.proOutcomeResponse.findUnique({
        where: {
          participantToken_phase: { participantToken, phase: "BASELINE" },
        },
        select: { id: true },
      });
      if (!baseline) {
        return badRequest("복용 전 응답이 없습니다. 먼저 복용 전 설문에 답해 주세요.");
      }
    }

    const data = {
      participantToken,
      phase,
      goalKey,
      goalScore,
      generalScore,
      sleepScore,
      digestionScore,
      energyScore,
      daysTaken,
      adherencePercent,
      note,
      researchConsented: true,
      consentVersion: PRO_CONSENT_VERSION,
      clientId: actor?.deviceClientId ?? null,
      appUserId: actor?.appUserId ?? null,
      orderId,
    };

    // 같은 사람이 같은 단계를 다시 내면 갱신한다. 두 벌이 쌓이면 어느 쪽이
    // 진짜인지 알 수 없어 짝짓기가 흔들린다.
    const saved = await db.proOutcomeResponse.upsert({
      where: { participantToken_phase: { participantToken, phase } },
      create: data,
      update: data,
      select: { id: true, phase: true },
    });

    return NextResponse.json({ ok: true, id: saved.id, phase: saved.phase });
  } catch {
    return NextResponse.json(
      { ok: false, error: "답변을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
