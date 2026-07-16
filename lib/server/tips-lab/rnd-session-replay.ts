import "server-only";

import {
  callWbRndInterim,
  isWbRndInterimEnabled,
} from "@/lib/server/wb-rnd-interim-client";

const EXECUTION_ID_PATTERN = /^exec_[a-f0-9]{32}$/;
const REPLAY_STATUSES = new Set(["MATCH", "MISMATCH", "VERSION_MISMATCH"]);

type ReplayStatus = "MATCH" | "MISMATCH" | "VERSION_MISMATCH";
type JsonRecord = Record<string, unknown>;

export type RndSavedSession = {
  executionId: string;
  createdAt: string;
  replayAvailable: boolean;
  lastReplayStatus: ReplayStatus | null;
  lastReplayedAt: string | null;
};

export type RndSessionSummary = {
  connected: boolean;
  availability: "CONNECTED" | "DISABLED" | "UNAVAILABLE";
  totalSavedSessions: number;
  replayableSessions: number;
  unavailableSessions: number;
  replayRunCount: number;
  recentSessions: RndSavedSession[];
};

export type RndSessionReplayResult = {
  connected: boolean;
  availability: "CONNECTED" | "DISABLED" | "UNAVAILABLE";
  executionId: string | null;
  status: ReplayStatus | null;
  inputMatch: boolean | null;
  versionMatch: boolean | null;
  outputMatch: boolean | null;
  replayedAt: string | null;
};

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function count(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function replayStatus(value: unknown): ReplayStatus | null {
  return typeof value === "string" && REPLAY_STATUSES.has(value)
    ? (value as ReplayStatus)
    : null;
}

function savedSession(value: unknown): RndSavedSession | null {
  const item = record(value);
  if (
    !item ||
    typeof item.execution_id !== "string" ||
    !EXECUTION_ID_PATTERN.test(item.execution_id) ||
    typeof item.created_at !== "string" ||
    typeof item.replay_available !== "boolean"
  ) {
    return null;
  }
  const lastReplayStatus = replayStatus(item.last_replay_status);
  if (item.last_replay_status !== null && lastReplayStatus === null) return null;
  if (
    item.last_replayed_at !== null &&
    typeof item.last_replayed_at !== "string"
  ) {
    return null;
  }
  return {
    executionId: item.execution_id,
    createdAt: item.created_at,
    replayAvailable: item.replay_available,
    lastReplayStatus,
    lastReplayedAt:
      typeof item.last_replayed_at === "string"
        ? item.last_replayed_at
        : null,
  };
}

function replayResultIsConsistent(
  status: ReplayStatus,
  inputMatch: boolean,
  versionMatch: boolean,
  outputMatch: boolean | null
) {
  if (!inputMatch) return false;
  if (status === "MATCH") return versionMatch && outputMatch === true;
  if (status === "MISMATCH") return versionMatch && outputMatch === false;
  return !versionMatch && outputMatch === null;
}

function disconnectedSummary(
  availability: "DISABLED" | "UNAVAILABLE"
): RndSessionSummary {
  return {
    connected: false,
    availability,
    totalSavedSessions: 0,
    replayableSessions: 0,
    unavailableSessions: 0,
    replayRunCount: 0,
    recentSessions: [],
  };
}

function disconnectedReplay(
  availability: "DISABLED" | "UNAVAILABLE"
): RndSessionReplayResult {
  return {
    connected: false,
    availability,
    executionId: null,
    status: null,
    inputMatch: null,
    versionMatch: null,
    outputMatch: null,
    replayedAt: null,
  };
}

export async function listRndSavedSessions(): Promise<RndSessionSummary> {
  if (!isWbRndInterimEnabled()) return disconnectedSummary("DISABLED");
  try {
    const payload = record(
      await callWbRndInterim<unknown>("/v1/interim/executions?limit=20", "GET")
    );
    if (!payload) return disconnectedSummary("UNAVAILABLE");
    const totalSavedSessions = count(payload.total_saved_sessions);
    const replayableSessions = count(payload.replayable_sessions);
    const unavailableSessions = count(payload.unavailable_sessions);
    const replayRunCount = count(payload.replay_run_count);
    if (
      totalSavedSessions === null ||
      replayableSessions === null ||
      unavailableSessions === null ||
      replayRunCount === null ||
      totalSavedSessions !== replayableSessions + unavailableSessions
    ) {
      return disconnectedSummary("UNAVAILABLE");
    }
    if (!Array.isArray(payload.items) || payload.items.length > 20) {
      return disconnectedSummary("UNAVAILABLE");
    }
    const parsedSessions = payload.items.map(savedSession);
    if (parsedSessions.some((item) => item === null)) {
      return disconnectedSummary("UNAVAILABLE");
    }
    const recentSessions = parsedSessions as RndSavedSession[];
    return {
      connected: true,
      availability: "CONNECTED",
      totalSavedSessions,
      replayableSessions,
      unavailableSessions,
      replayRunCount,
      recentSessions,
    };
  } catch {
    return disconnectedSummary("UNAVAILABLE");
  }
}

export async function replayRndSavedSession(
  executionId: string
): Promise<RndSessionReplayResult> {
  if (!EXECUTION_ID_PATTERN.test(executionId)) {
    throw new Error("invalid_rnd_execution_id");
  }
  if (!isWbRndInterimEnabled()) return disconnectedReplay("DISABLED");
  try {
    const payload = record(
      await callWbRndInterim<unknown>(
        `/v1/interim/executions/${executionId}/replay`,
        "POST"
      )
    );
    const status = replayStatus(payload?.status);
    if (
      !payload ||
      payload.execution_id !== executionId ||
      !status ||
      typeof payload.input_match !== "boolean" ||
      typeof payload.version_match !== "boolean" ||
      (payload.output_match !== null &&
        typeof payload.output_match !== "boolean") ||
      typeof payload.replayed_at !== "string" ||
      !replayResultIsConsistent(
        status,
        payload.input_match,
        payload.version_match,
        payload.output_match as boolean | null
      )
    ) {
      return disconnectedReplay("UNAVAILABLE");
    }
    return {
      connected: true,
      availability: "CONNECTED",
      executionId,
      status,
      inputMatch: payload.input_match,
      versionMatch: payload.version_match,
      outputMatch: payload.output_match as boolean | null,
      replayedAt: payload.replayed_at,
    };
  } catch {
    return disconnectedReplay("UNAVAILABLE");
  }
}
