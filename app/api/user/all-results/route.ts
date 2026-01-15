import { NextRequest, NextResponse } from "next/server";
import { resolveActorForRequest } from "@/lib/server/actor";
import {
  buildChatContextPayload,
  getUserDataForActor,
} from "@/lib/server/chat-context";
import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    if (actor.loggedIn && !actor.appUserId) {
      return NextResponse.json({ error: "Missing appUserId" }, { status: 500 });
    }
    if (!actor.loggedIn && !actor.deviceClientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    const userData = await getUserDataForActor(actor);
    const chatContext = buildChatContextPayload(userData);
    const assessRaw = userData.assess;
    const checkAiRaw = userData.checkAi;

    const assess = assessRaw
      ? (() => {
          const normalized = normalizeAssessmentResult(assessRaw);
          return {
            ...assessRaw,
            normalized,
            answersDetailed: Object.entries(assessRaw.answers || {}).map(
              ([id, val]) => {
                const q = normalized.questions.find((qq) => qq.id === id);
                let label: string;
                if (q?.type === "choice" && q.options) {
                  const opt = q.options.find((o) => o.value === val);
                  label = opt?.label ?? String(val);
                } else if (
                  q?.type === "multi" &&
                  Array.isArray(val) &&
                  q.options
                ) {
                  label = val
                    .map(
                      (v: any) =>
                        q.options?.find((o) => o.value === v)?.label ??
                        String(v)
                    )
                    .join(", ");
                } else {
                  label = String(val);
                }
                return {
                  id,
                  question: q?.text ?? id,
                  value: val,
                  answerLabel: label,
                };
              }
            ),
          };
        })()
      : null;

    const checkAi = checkAiRaw
      ? (() => {
          const normalized = normalizeCheckAiResult(checkAiRaw);
          return {
            ...checkAiRaw,
            normalized,
            answersDetailed: Array.isArray(checkAiRaw.answers)
              ? checkAiRaw.answers.map((val: any, idx: number) => {
                  const q = normalized.questions[idx];
                  const opt = normalized.options.find((o) => o.value === val);
                  return {
                    index: idx,
                    question: q?.text ?? String(idx + 1),
                    value: val,
                    answerLabel: opt?.label ?? String(val),
                  };
                })
              : [],
          };
        })()
      : null;

    const res = NextResponse.json({
      clientId: actor.deviceClientId,
      assess,
      checkAi,
      orders: chatContext.orders,
    });
    if (actor.cookieToSet) {
      res.cookies.set(
        actor.cookieToSet.name,
        actor.cookieToSet.value,
        actor.cookieToSet.options
      );
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
