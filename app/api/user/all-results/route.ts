import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { resolveActorForRequest } from "@/lib/server/actor";
import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    const appUserId = actor.appUserId;
    const clientId = actor.deviceClientId;

    let scope: { appUserId: string } | { clientId: string };
    if (actor.loggedIn) {
      if (!appUserId) {
        return NextResponse.json({ error: "Missing appUserId" }, { status: 500 });
      }
      scope = { appUserId };
    } else {
      if (!clientId) {
        return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
      }
      scope = { clientId };
    }

    const orderWhere = actor.loggedIn
      ? actor.phoneLinked && appUserId
        ? { appUserId }
        : { id: -1 }
      : clientId
      ? { endpoint: clientId }
      : { id: -1 };

    const [assessRaw, checkAiRaw, orders] = await Promise.all([
      db.assessmentResult.findFirst({
        where: scope,
        orderBy: { createdAt: "desc" },
      }),
      db.checkAiResult.findFirst({
        where: scope,
        orderBy: { createdAt: "desc" },
      }),
      db.order.findMany({
        where: orderWhere,
        orderBy: { updatedAt: "desc" },
        include: {
          orderItems: {
            include: { pharmacyProduct: { include: { product: true } } },
          },
        },
      }),
    ]);

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
      clientId,
      assess,
      checkAi,
      orders,
      actor: {
        loggedIn: actor.loggedIn,
        appUserId,
        deviceClientId: clientId,
        phoneLinked: actor.phoneLinked,
      },
      scope: {
        result: actor.loggedIn ? "account" : "device",
        order: actor.loggedIn
          ? actor.phoneLinked
            ? "account"
            : "none"
          : "device",
      },
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
