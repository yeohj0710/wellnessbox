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
    const body = await req.json();
    const { firstUserMessage, firstAssistantMessage } = body || {};
    if (
      !firstUserMessage ||
      typeof firstUserMessage !== "string" ||
      !firstAssistantMessage ||
      typeof firstAssistantMessage !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: "Missing firstUserMessage or firstAssistantMessage" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const prompt = `아래 첫 대화 내용을 보고 대화 제목을 10~18자 이내 한국어로 간결하게 지어주세요.\n- 마케팅 문구 금지\n- 특수문자, 따옴표, 마침표 제외\n- 핵심 주제만 담기\n\n사용자: "${firstUserMessage.replace(/\n/g, " ").slice(0, 500)}"\n상담사: "${firstAssistantMessage.replace(/\n/g, " ").slice(0, 500)}"`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body?.model || (await getDefaultModel()),
        messages: [
          { role: "system", content: "당신은 한국어 제목을 간결하게 짓는 도우미입니다." },
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
    const title: string = json.choices?.[0]?.message?.content?.trim?.() || "새 대화";
    const cleaned = title.replace(/["'`\-_.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 18);
    return new Response(JSON.stringify({ title: cleaned || "새 대화" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

