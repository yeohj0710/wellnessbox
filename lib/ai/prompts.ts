/**
 * @deprecated Chat prompt SSOT moved to `@/lib/chat/prompts`.
 * This shim remains only for backward compatibility.
 */
import type { UserProfile } from "@/types/chat";
import { buildSystemPrompt as buildChatSystemPrompt } from "@/lib/chat/prompts";

export function buildSystemPrompt(_profile?: UserProfile) {
  return buildChatSystemPrompt({ mode: "chat" });
}

export const SCHEMA_GUIDE = "";
export const ANSWER_STYLE_GUIDE = "";
export const PRODUCT_RECO_GUIDE = "";
export const INIT_GUIDE = "";
export const RAG_RULES = "";

export function makeTitleFromFirstUserMessage(text: string) {
  const trimmed = text.trim().slice(0, 50);
  return trimmed.length < 50 ? trimmed : `${trimmed}...`;
}
