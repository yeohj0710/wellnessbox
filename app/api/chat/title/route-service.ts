import { getDefaultModel } from "@/lib/ai/model";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat/constants";
import { buildTitleMessages } from "@/lib/chat/prompts";

type TitleInput = {
  firstUserMessage: string;
  firstAssistantMessage: string;
  assistantReply: string;
};

type TitleParseResult =
  | { ok: true; input: TitleInput }
  | { ok: false; error: string; status: number };

type TitleResolveResult =
  | { ok: true; title: string }
  | { ok: false; error: string; status: number };

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
}

function parseTitleInput(rawBody: unknown): TitleParseResult {
  const body =
    rawBody && typeof rawBody === "object" ? (rawBody as Record<string, unknown>) : {};

  const firstUserMessage =
    typeof body.firstUserMessage === "string" ? body.firstUserMessage : "";
  const firstAssistantMessage =
    typeof body.firstAssistantMessage === "string" ? body.firstAssistantMessage : "";
  const assistantReply = typeof body.assistantReply === "string" ? body.assistantReply : "";

  if (!firstUserMessage || !firstAssistantMessage || !assistantReply) {
    return { ok: false, error: "Missing messages", status: 400 };
  }

  return {
    ok: true,
    input: {
      firstUserMessage,
      firstAssistantMessage,
      assistantReply,
    },
  };
}

function sanitizeTitle(raw: string) {
  const cleaned = raw
    .replace(/["'`\-_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  return cleaned || DEFAULT_CHAT_TITLE;
}

function buildFallbackTitle(input: TitleInput) {
  const text = [input.firstAssistantMessage, input.firstUserMessage, input.assistantReply]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  return text || DEFAULT_CHAT_TITLE;
}

async function requestModelTitle(
  apiKey: string,
  input: TitleInput,
  modelOverride: unknown
): Promise<TitleResolveResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelOverride || (await getDefaultModel()),
      messages: buildTitleMessages(input),
      temperature: 0.5,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return {
      ok: false,
      error: `OpenAI error: ${response.status} ${text}`,
      status: 500,
    };
  }

  const json = await response.json().catch(() => ({}));
  const raw = String(json?.choices?.[0]?.message?.content || "").trim();
  return {
    ok: true,
    title: sanitizeTitle(raw),
  };
}

export async function resolveChatTitle(rawBody: unknown): Promise<TitleResolveResult> {
  const parsed = parseTitleInput(rawBody);
  if (!parsed.ok) return parsed;

  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return {
      ok: true,
      title: buildFallbackTitle(parsed.input),
    };
  }

  const modelOverride =
    rawBody && typeof rawBody === "object"
      ? (rawBody as Record<string, unknown>).model
      : undefined;

  return requestModelTitle(apiKey, parsed.input, modelOverride);
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function runChatTitlePostRoute(req: Request) {
  try {
    const body = await req.json();
    const resolved = await resolveChatTitle(body);
    if (!resolved.ok) {
      return jsonResponse({ error: resolved.error }, resolved.status);
    }
    return jsonResponse({ title: resolved.title });
  } catch (error: unknown) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
}
