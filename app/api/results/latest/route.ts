import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { resolveClientIdForRead } from "@/lib/server/client-link";
import { CHECK_AI_QUESTIONS, CHECK_AI_OPTIONS } from "@/lib/checkai";
import { sectionA, sectionB } from "@/app/assess/data/questions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qClientId = url.searchParams.get("clientId");
    const { clientId, cookieToSet } = await resolveClientIdForRead(
      req,
      qClientId,
      "query"
    );
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    const [assessRaw, checkAiRaw] = await Promise.all([
      db.assessmentResult.findFirst({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      }),
      db.checkAiResult.findFirst({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const allAssessQuestions = [...sectionA, ...sectionB];
    const assess = assessRaw
      ? {
          ...assessRaw,
          answersDetailed: Object.entries(assessRaw.answers || {}).map(
            ([id, val]) => {
              const q = allAssessQuestions.find((qq) => qq.id === id);
              let label: string;
              if (q?.type === "choice" && q.options) {
                const opt = q.options.find((o) => o.value === val);
                label = opt?.label ?? String(val);
              } else if (q?.type === "multi" && Array.isArray(val) && q.options) {
                label = val
                  .map(
                    (v: any) =>
                      q.options?.find((o) => o.value === v)?.label ?? String(v)
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
        }
      : null;

    const checkAi = checkAiRaw
      ? {
          ...checkAiRaw,
          answersDetailed: Array.isArray(checkAiRaw.answers)
            ? checkAiRaw.answers.map((val: any, idx: number) => {
                const q = CHECK_AI_QUESTIONS[idx];
                const opt = CHECK_AI_OPTIONS.find((o) => o.value === val);
                return {
                  index: idx,
                  question: q,
                  value: val,
                  answerLabel: opt?.label ?? String(val),
                };
              })
            : [],
        }
      : null;

    const res = NextResponse.json({ assess, checkAi });
    if (cookieToSet) {
      res.cookies.set(cookieToSet.name, cookieToSet.value, cookieToSet.options);
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
