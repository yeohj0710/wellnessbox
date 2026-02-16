import { NextRequest } from "next/server";
import { getDefaultModel } from "@/lib/ai/model";
import { buildTitleMessages } from "@/lib/chat/prompts";

export const runtime = "nodejs";

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
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
        messages: buildTitleMessages({
          firstUserMessage,
          firstAssistantMessage,
          assistantReply,
        }),
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
