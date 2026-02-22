import type { ChatSession, UserProfile } from "@/types/chat";
import { loadProfileLocal, loadProfileServer, loadSessions, saveProfileLocal } from "../utils";
import type { NormalizedAllResults } from "./useChat.results";
import { normalizeAllResultsPayload } from "./useChat.results";
import { createNewChatSession } from "./useChat.sessionActions";

export type BootstrapActorState = {
  loggedIn: boolean;
  appUserId: string | null;
  phoneLinked: boolean;
};

export function buildInitialSessionBootstrap(input: {
  actor: { loggedIn: boolean; appUserId: string | null };
}) {
  const existing = loadSessions();
  if (existing.length > 0) {
    const sorted = [...existing].sort(
      (left, right) =>
        (right.updatedAt || right.createdAt) - (left.updatedAt || left.createdAt)
    );
    const readyMap: Record<string, boolean> = {};
    sorted.forEach((session) => {
      readyMap[session.id] = true;
    });
    return {
      sessions: sorted,
      activeId: sorted[0].id,
      readyMap,
    };
  }

  const created = createNewChatSession({
    sessions: [],
    actor: input.actor,
  });
  return {
    sessions: created.nextSessions,
    activeId: created.id,
    readyMap: {
      [created.id]: false,
    },
  };
}

export async function resolveInitialProfile(remoteBootstrap: boolean) {
  let resolved: UserProfile | undefined = undefined;

  if (remoteBootstrap) {
    try {
      const remote = await loadProfileServer();
      if (remote) {
        resolved = remote;
        saveProfileLocal(remote);
      }
    } catch {}
  }

  if (!resolved) {
    const local = loadProfileLocal();
    if (local) resolved = local;
  }

  return resolved;
}

export async function fetchRemoteSessionBootstrap(input: {
  enabled: boolean;
  online: boolean;
}) {
  if (!input.enabled || !input.online) return null;

  try {
    const response = await fetch("/api/chat/save", { method: "GET" });
    if (!response.ok) return null;

    const json = await response.json().catch(() => ({} as Record<string, unknown>));
    const actorRaw =
      json && typeof json === "object" && "actor" in json
        ? (json.actor as Record<string, unknown> | null)
        : null;

    const actor: BootstrapActorState | null = actorRaw
      ? {
          loggedIn: !!actorRaw.loggedIn,
          appUserId:
            typeof actorRaw.appUserId === "string" ? actorRaw.appUserId : null,
          phoneLinked: !!actorRaw.phoneLinked,
        }
      : null;

    const sessionsRaw =
      json && typeof json === "object" && "sessions" in json ? json.sessions : [];
    const sessions = Array.isArray(sessionsRaw) ? sessionsRaw : [];

    return {
      actor,
      sessions,
    };
  } catch {
    return null;
  }
}

export async function fetchAllResultsBootstrap(input: {
  enabled: boolean;
  online: boolean;
  signal: AbortSignal;
}): Promise<NormalizedAllResults | null> {
  if (!input.enabled || !input.online) return null;

  try {
    const response = await fetch("/api/user/all-results", { signal: input.signal });
    if (!response.ok) return normalizeAllResultsPayload({});

    const data = await response.json().catch(() => ({}));
    return normalizeAllResultsPayload(data);
  } catch {
    return null;
  }
}
