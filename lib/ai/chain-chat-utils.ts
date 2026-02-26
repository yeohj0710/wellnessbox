import { toPlainText } from "@/lib/chat/context";

export type ChatHistoryMessage = {
  role: string;
  content: string;
};

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise.catch(() => fallback);
  }

  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

export function normalizeHistory(messages: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => {
      const role = (message as any)?.role;
      return role === "user" || role === "assistant";
    })
    .map((message) => {
      const role = String((message as any)?.role || "");
      const content = toPlainText((message as any)?.content).trim();
      return { role, content };
    })
    .filter((message) => Boolean(message.content));
}

export function lastUserText(messages: ChatHistoryMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    if (message.content) return message.content;
  }
  return "";
}

export function limitPromptMessages(messages: ChatHistoryMessage[], maxMessages: number) {
  if (messages.length <= maxMessages) return messages;

  const system = messages.filter((message) => message.role === "system");
  const convo = messages.filter((message) => message.role !== "system");

  if (system.length >= maxMessages) {
    return system.slice(0, maxMessages);
  }

  const roomForConvo = Math.max(1, maxMessages - system.length);
  return [...system, ...convo.slice(-roomForConvo)];
}
