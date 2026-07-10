import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { TIPS_LAB_STATES, type TipsLabState } from "@/lib/server/tips-lab/state";

const MAX_AGE_MS = 4 * 60 * 60 * 1000;

type StatePayload = { state: TipsLabState; issuedAt: number };

function secret() {
  const value = process.env.COOKIE_PASSWORD?.trim();
  if (!value) throw new Error("COOKIE_PASSWORD_missing");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(`tips-lab:${payload}`).digest("base64url");
}

export function createTipsLabStateToken(state: TipsLabState) {
  const payload = Buffer.from(JSON.stringify({ state, issuedAt: Date.now() })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyTipsLabStateToken(token: unknown): TipsLabState {
  if (typeof token !== "string" || token.length > 1_000) throw new Error("state_token_required");
  const [payload, received] = token.split(".");
  if (!payload || !received) throw new Error("state_token_invalid");
  const expected = signature(payload);
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("state_token_invalid");
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as StatePayload;
  if (!TIPS_LAB_STATES.includes(parsed.state) || !Number.isFinite(parsed.issuedAt)) {
    throw new Error("state_token_invalid");
  }
  if (Date.now() - parsed.issuedAt > MAX_AGE_MS || parsed.issuedAt > Date.now() + 60_000) {
    throw new Error("state_token_expired");
  }
  return parsed.state;
}

