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
    const prompt = `초기 상담 내용:\n${text}\n\n건강기능식품 상담에서 사용자가 이어서 물어볼 만한 간단한 질문 2개를 한국어로 제시하세요. 각 질문은 15자 이내여야 하며 JSON 배열 형식으로만 답하세요.`;

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
              "당신은 건강기능식품 상담에서 후속 질문을 제안하는 한국어 도우미입니다. JSON 배열로만 답변하세요.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    const json = await resp.json();
    let suggestions: string[] = [];
    try {
      const txt = json.choices?.[0]?.message?.content || "[]";
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) suggestions = parsed.filter((s) => typeof s === "string");
    } catch {}
    return new Response(JSON.stringify({ suggestions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ suggestions: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
