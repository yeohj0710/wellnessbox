"use client";

import { CHAT_ACTION_TYPES, type ChatActionType } from "@/lib/chat/agent-actions";

type ActionMemoryItem = {
  count: number;
  lastAt: number;
};

export type ActionMemoryMap = Partial<Record<ChatActionType, ActionMemoryItem>>;

const ACTION_MEMORY_STORAGE_KEY = "wb_chat_action_memory_v1";
const MAX_MEMORY_ACTIONS = 16;
const STALE_MEMORY_MS = 1000 * 60 * 60 * 24 * 45;
const ACTION_SET = new Set<string>(CHAT_ACTION_TYPES);

function sanitizeMemory(raw: unknown): ActionMemoryMap {
  if (!raw || typeof raw !== "object") return {};
  const entries = Object.entries(raw as Record<string, unknown>);
  const now = Date.now();
  const normalized: Array<[ChatActionType, ActionMemoryItem]> = [];

  for (const [key, value] of entries) {
    if (!ACTION_SET.has(key)) continue;
    if (!value || typeof value !== "object") continue;

    const item = value as Record<string, unknown>;
    const count = typeof item.count === "number" ? Math.max(0, Math.floor(item.count)) : 0;
    const lastAt = typeof item.lastAt === "number" ? Math.floor(item.lastAt) : 0;
    if (!count || !lastAt) continue;
    if (now - lastAt > STALE_MEMORY_MS) continue;

    normalized.push([
      key as ChatActionType,
      {
        count: Math.min(99, count),
        lastAt,
      },
    ]);
  }

  normalized.sort((left, right) => right[1].lastAt - left[1].lastAt);
  return Object.fromEntries(normalized.slice(0, MAX_MEMORY_ACTIONS)) as ActionMemoryMap;
}

function persistMemory(memory: ActionMemoryMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTION_MEMORY_STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // ignore storage failures
  }
}

export function readActionMemory(): ActionMemoryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ACTION_MEMORY_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeMemory(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function rememberActionMemory(
  action: ChatActionType,
  prev: ActionMemoryMap
): ActionMemoryMap {
  const now = Date.now();
  const base = sanitizeMemory(prev);
  const existing = base[action];
  const next: ActionMemoryMap = {
    ...base,
    [action]: {
      count: Math.min(99, (existing?.count || 0) + 1),
      lastAt: now,
    },
  };
  const sanitized = sanitizeMemory(next);
  persistMemory(sanitized);
  return sanitized;
}

export function rememberActionMemoryList(
  actions: ChatActionType[],
  prev: ActionMemoryMap
): ActionMemoryMap {
  if (!Array.isArray(actions) || actions.length === 0) return sanitizeMemory(prev);
  const now = Date.now();
  const base = sanitizeMemory(prev);
  const next: ActionMemoryMap = { ...base };

  for (const action of actions) {
    if (!ACTION_SET.has(action)) continue;
    const existing = next[action];
    next[action] = {
      count: Math.min(99, (existing?.count || 0) + 1),
      lastAt: Math.max(now, existing?.lastAt || 0),
    };
  }

  const sanitized = sanitizeMemory(next);
  persistMemory(sanitized);
  return sanitized;
}

export function scoreActionMemory(
  action: ChatActionType,
  memory: ActionMemoryMap
): number {
  const item = memory[action];
  if (!item) return 0;

  const ageMs = Date.now() - item.lastAt;
  const ageHours = ageMs / (1000 * 60 * 60);

  const recencyScore =
    ageHours <= 6
      ? 22
      : ageHours <= 24
        ? 16
        : ageHours <= 72
          ? 10
          : ageHours <= 24 * 7
            ? 6
            : 2;

  const frequencyScore = Math.min(14, item.count * 2);
  return recencyScore + frequencyScore;
}

export function sortActionsByMemory<T extends { type: ChatActionType }>(
  rows: T[],
  memory: ActionMemoryMap
): T[] {
  return [...rows].sort((left, right) => {
    const diff = scoreActionMemory(right.type, memory) - scoreActionMemory(left.type, memory);
    if (diff !== 0) return diff;
    return 0;
  });
}
