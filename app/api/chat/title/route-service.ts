import { getDefaultModel } from "@/lib/ai/model";
import { resolveGovernedModel } from "@/lib/ai/governance";
import { callOpenAIChatCompletions } from "@/lib/ai/openai-chat-compat";
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

/**
 * Title used when the model is unavailable.
 *
 * Built from what the user actually asked, clipped at a word boundary. Joining
 * every message and slicing produced titles cut mid-word out of the assistant's
 * greeting, which said nothing about the conversation.
 */
function buildFallbackTitle(input: TitleInput) {
  const source = (input.firstUserMessage || input.assistantReply)
    .replace(/\s+/g, " ")
    .trim();
  if (!source) return DEFAULT_CHAT_TITLE;
  if (source.length <= 18) return source;

  const clipped = source.slice(0, 18);
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace > 8 ? clipped.slice(0, lastSpace) : clipped).trim() || DEFAULT_CHAT_TITLE;
}

async function requestModelTitle(
  apiKey: string,
  input: TitleInput
): Promise<TitleResolveResult> {
  const model = resolveGovernedModel({
    task: "chat_title",
    configuredModel: await getDefaultModel(),
  }).resolvedModel;
  const response = await callOpenAIChatCompletions(
    apiKey,
    {
      model,
      messages: buildTitleMessages(input),
      temperature: 0.5,
      top_p: 0.9,
    },
    10_000
  );

  if (!response.ok) {
    // Provider responses carry request details; log them, and let the caller
    // fall back to a title derived from the conversation itself.
    const text = await response.text().catch(() => "");
    console.error("[chat:title] provider error", response.status, text.slice(0, 500));
    return { ok: true, title: buildFallbackTitle(input) };
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
  return requestModelTitle(apiKey, parsed.input);
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
    console.error("[chat:title] request failed", error);
    // A missing title is cosmetic, so never surface an error to the chat UI.
    return jsonResponse({ title: DEFAULT_CHAT_TITLE });
  }
}
