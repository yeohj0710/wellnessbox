import "server-only";

import { createHmac } from "node:crypto";

const DEFAULT_TIMEOUT_MS = 7_500;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 15_000;

export const WB_RND_INTERIM_MODE = "PROXY_GOLD_SIMULATION" as const;

type InterimMethod = "GET" | "POST";

function truthy(value: string | undefined) {
  return ["1", "true", "yes"].includes((value ?? "").trim().toLowerCase());
}

export function isWbRndInterimEnabled() {
  return truthy(process.env.WB_RND_INTERIM_ENABLED);
}

function baseUrl() {
  const raw = (process.env.WB_RND_INTERIM_BASE_URL ?? "").trim();
  if (!raw) throw new Error("WB_RND_INTERIM_BASE_URL_missing");
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("WB_RND_INTERIM_BASE_URL_invalid_protocol");
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function timeoutMs() {
  const value = Number.parseInt(process.env.WB_RND_INTERIM_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, value));
}

function token() {
  const value = (process.env.WB_RND_INTERIM_TOKEN ?? "").trim();
  if (!value) throw new Error("WB_RND_INTERIM_TOKEN_missing");
  return value;
}

export function pseudonymizeInterimSubjectId(subjectId: string) {
  const salt = (process.env.WB_RND_INTERIM_PSEUDONYM_SALT ?? "").trim();
  if (!salt) throw new Error("WB_RND_INTERIM_PSEUDONYM_SALT_missing");
  return `usr_${createHmac("sha256", salt).update(subjectId).digest("hex").slice(0, 32)}`;
}

export function pseudonymizeInterimUserId(appUserId: string) {
  return pseudonymizeInterimSubjectId(appUserId);
}

export type WbRndCounselingTurn = {
  schema_version: "counseling_turn_response_v1";
  service_session_id: string;
  turn_id: string;
  agent_run_id: string;
  answer: { answer_text: string; status: string; [key: string]: unknown };
  verification: { passed: boolean; [key: string]: unknown };
  answer_execution: {
    schema_version: "counseling_answer_execution_v1";
    provider: "openai_responses_api" | "deterministic_template_fallback";
    fallback_reason: string | null;
    attempted_live_call: boolean;
    model: string | null;
    evidence_chunk_ids: string[];
    evidence_reference_ids: string[];
    live_failure: null | {
      failure_stage: "http_request" | "response_parse";
      exception_class: string;
      exception_message: string;
      status_code: number | null;
      response_body_excerpt: string | null;
    };
  };
  recommendation_execution: null | {
    run_id: string;
    status: string;
    simulation: boolean;
  };
  session_binding_sha256: string;
  deduplicated: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateCounselingTurn(value: unknown): WbRndCounselingTurn {
  if (!isRecord(value) || value.schema_version !== "counseling_turn_response_v1") {
    throw new Error("WB_RND_COUNSELING_invalid_contract");
  }
  const answer = value.answer;
  const verification = value.verification;
  const answerExecution = value.answer_execution;
  if (
    !isRecord(answer) ||
    typeof answer.answer_text !== "string" ||
    !answer.answer_text ||
    !isRecord(verification) ||
    verification.passed !== true ||
    !isRecord(answerExecution) ||
    answerExecution.schema_version !== "counseling_answer_execution_v1" ||
    !["openai_responses_api", "deterministic_template_fallback"].includes(
      String(answerExecution.provider)
    ) ||
    !(
      answerExecution.fallback_reason === null ||
      typeof answerExecution.fallback_reason === "string"
    ) ||
    typeof answerExecution.attempted_live_call !== "boolean" ||
    !(answerExecution.model === null || typeof answerExecution.model === "string") ||
    !Array.isArray(answerExecution.evidence_chunk_ids) ||
    answerExecution.evidence_chunk_ids.some((item) => typeof item !== "string") ||
    !Array.isArray(answerExecution.evidence_reference_ids) ||
    answerExecution.evidence_reference_ids.some((item) => typeof item !== "string") ||
    typeof value.service_session_id !== "string" ||
    typeof value.turn_id !== "string" ||
    typeof value.agent_run_id !== "string" ||
    typeof value.session_binding_sha256 !== "string"
  ) {
    throw new Error("WB_RND_COUNSELING_invalid_contract");
  }
  const liveFailure = answerExecution.live_failure;
  if (
    liveFailure !== null &&
    (!isRecord(liveFailure) ||
      !["http_request", "response_parse"].includes(String(liveFailure.failure_stage)) ||
      typeof liveFailure.exception_class !== "string" ||
      typeof liveFailure.exception_message !== "string" ||
      !(liveFailure.status_code === null || typeof liveFailure.status_code === "number") ||
      !(
        liveFailure.response_body_excerpt === null ||
        typeof liveFailure.response_body_excerpt === "string"
      ))
  ) {
    throw new Error("WB_RND_COUNSELING_invalid_contract");
  }
  const execution = value.recommendation_execution;
  if (
    execution !== null &&
    (!isRecord(execution) ||
      typeof execution.run_id !== "string" ||
      typeof execution.status !== "string" ||
      typeof execution.simulation !== "boolean")
  ) {
    throw new Error("WB_RND_COUNSELING_invalid_contract");
  }
  return value as WbRndCounselingTurn;
}

export async function callWbRndCounselingTurn(body: unknown) {
  return validateCounselingTurn(
    await callWbRndInterim<unknown>("/v1/interim/counseling/turns", "POST", body)
  );
}

export async function callWbRndInterim<T>(
  path: string,
  method: InterimMethod,
  body?: unknown
): Promise<T> {
  if (!isWbRndInterimEnabled()) throw new Error("WB_RND_INTERIM_disabled");
  if (!path.startsWith("/v1/interim/") || path.includes("..") || path.includes("//")) {
    throw new Error("WB_RND_INTERIM_path_rejected");
  }
  const origin = baseUrl();
  const url = new URL(path, `${origin.origin}/`);
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-wb-rnd-token": token(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`WB_RND_INTERIM_upstream_${response.status}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(handle);
  }
}
