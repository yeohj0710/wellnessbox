// /api/chat/suggest/route.ts
import { NextRequest } from "next/server";
import { getDefaultModel } from "@/lib/ai/models";

export const runtime = "nodejs";

function ensureEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not set`);
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = ensureEnv("OPENAI_KEY");
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text : "";
    const profile = body?.profile ?? null;
    const assessResult = body?.assessResult ?? null;
    const checkAiResult = body?.checkAiResult ?? null;
    const orders = Array.isArray(body?.orders) ? body.orders : [];
    const recentMessages = Array.isArray(body?.recentMessages)
      ? body.recentMessages.slice(-12)
      : [];
    const ctx = JSON.stringify({
      profile,
      assessResult,
      checkAiResult,
      orders,
      recentMessages,
    });
    const prompt = `
      사용자에 대한 Context:
      ${ctx}

      상담 AI 챗봇의 바로 직전 응답:
      ${text}

      다음 조건을 만족하는 후속 질문을 2개 생성하세요.
      - 챗봇의 답변에 대해 (사용자의 Context, 즉 건강 상태를 고려하여) 물어보면 유익한 질문 2가지
      - 한국어 존댓말(~요)
      - 길이 18~50자
      - 예/아니오로 끝나지 않음
      - 중복 금지, 구체적이고 실행 가능
      - 직전 대화, 프로필, 검사, 주문 내역을 반영
      - JSON 배열 형식으로만 출력
    `;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body?.model || (await getDefaultModel()),
        messages: [
          {
            role: "system",
            content:
              "건강기능식품 상담의 후속 질문을 제안하는 한국어 도우미입니다. 출력은 반드시 JSON 배열이어야 합니다.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    let suggestions: string[] = [];
    if (resp.ok) {
      const json = await resp.json();
      const txt = json?.choices?.[0]?.message?.content ?? "[]";
      try {
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed))
          suggestions = parsed.filter((s) => typeof s === "string").slice(0, 2);
      } catch {}
    }
    if (suggestions.length !== 2) {
      suggestions = [
        "추천받은 영양제에 대해 설명해주세요.",
        "추천받은 영양제의 용법에 대해 알려주세요.",
      ];
    }
    return new Response(JSON.stringify({ suggestions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({
        suggestions: [
          "추천받은 영양제에 대해 설명해주세요.",
          "추천받은 영양제의 용법에 대해 알려주세요.",
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
}
