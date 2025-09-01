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
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prompt = [
      "다음 사용자의 첫 질문을 기반으로 한 아주 간결한 상담 제목을 만들어주세요.",
      "조건:",
      "- 한국어로 12~20자 이내, 핵심만 표현",
      "- 따옴표, 마침표, 불필요한 수식어 금지",
      "- 예: '면역 보강 보충제', '피로 회복 영양제', '다이어트 보조'",
      "질문:",
      text,
    ].join("\n");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: await getDefaultModel(),
        messages: [
          { role: "system", content: "짧고 간결한 제목만 출력합니다." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return new Response(JSON.stringify({ error: `OpenAI error: ${resp.status} ${t}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const json = await resp.json();
    const raw = json.choices?.[0]?.message?.content || "";
    const title = String(raw).trim().replace(/^['"\s]+|['"\s]+$/g, "");
    return new Response(JSON.stringify({ title }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

