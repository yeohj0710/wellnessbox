import type { ChatSession, UserProfile } from "@/types/chat";
import { CODE_TO_LABEL } from "@/lib/categories";
import { getOrCreateClientId } from "@/lib/client-id";

export const LS_SESSIONS_KEY = "wb_chat_sessions_v1";
export const LS_PROFILE_KEY = "wb_user_profile_v1";

export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getClientIdLocal(): string {
  return getOrCreateClientId();
}

export function getTzOffsetMinutes(): number {
  try {
    return -new Date().getTimezoneOffset();
  } catch {
    return 0;
  }
}

export function loadSessions(): ChatSession[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY) || "[]";
    const arr = JSON.parse(raw) as ChatSession[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions));
}

export function loadProfileLocal(): UserProfile | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(LS_PROFILE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return undefined;
  }
}

export function saveProfileLocal(p?: UserProfile) {
  if (typeof localStorage === "undefined") return;
  if (!p) return localStorage.removeItem(LS_PROFILE_KEY);
  localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(p));
}

export async function loadProfileServer(): Promise<UserProfile | undefined> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return undefined;
  }
  try {
    getClientIdLocal();
    const res = await fetch(`/api/user/profile`);
    if (!res.ok || res.status === 204) return undefined;
    const data = await res.json();
    return data?.profile as UserProfile;
  } catch {
    return undefined;
  }
}

export async function saveProfileServer(p?: UserProfile) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return;
  }
  try {
    getClientIdLocal();
    await fetch(`/api/user/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: p ?? null }),
    });
  } catch {}
}

export function formatAssessCat(code: string) {
  return CODE_TO_LABEL[code] || code;
}
