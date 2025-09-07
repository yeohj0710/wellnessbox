import { NextRequest } from "next/server";
import { getDefaultModel } from "@/lib/ai/model";

export const runtime = "nodejs";

function getOpenAIKey() {
  return process.env.OPENAI_KEY || "";
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = getOpenAIKey();
    const body = await req.json();
    const firstUserMessage =
      typeof body?.firstUserMessage === "string" ? body.firstUserMessage : "";
    const firstAssistantMessage =
      typeof body?.firstAssistantMessage === "string"
        ? body.firstAssistantMessage
        : "";
    const assistantReply =
      typeof body?.assistantReply === "string" ? body.assistantReply : "";

    if (!firstUserMessage || !firstAssistantMessage || !assistantReply) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prompt = [
      "아래의 대화 내용을 바탕으로 대화 제목을 10~18자 한국어로 구체적으로 지어주세요.",
      "특수문자, 따옴표, 마침표 제외",
      "핵심 증상·관심사·카테고리 중 최소 1개 포함",
      "보충제 대신 영양제, 건강기능식품이라는 표현 사용",
      "",
      `AI 챗봇: "${firstAssistantMessage.replace(/\n/g, " ").slice(0, 500)}"`,
      `User: "${firstUserMessage.replace(/\n/g, " ").slice(0, 500)}"`,
      `AI 챗봇: "${assistantReply.replace(/\n/g, " ").slice(0, 500)}"`,
      "",
      "제목만 출력",
    ].join("\n");

    if (!apiKey) {
      // Fallback: derive a short title locally when key is missing
      const text = [firstAssistantMessage, firstUserMessage, assistantReply]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 18);
      return new Response(JSON.stringify({ title: text || "상담" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

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
            content: "한국어로 간결하고 구체적인 대화 제목을 지어주세요.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        top_p: 0.9,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${resp.status} ${t}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const json = await resp.json();
    const raw = String(json.choices?.[0]?.message?.content || "").trim();
    const cleaned = raw
      .replace(/["'`\-_.]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 18);
    return new Response(JSON.stringify({ title: cleaned || "새 상담" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
