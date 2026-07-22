const SENSITIVE_KEY = /(?:authorization|cookie|email|name|phone|secret|token)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+?82[- ]?)?0?1[016789][- ]?\d{3,4}[- ]?\d{4}(?!\d)/g;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;

export const WB_RND_REDACTED = "[REDACTED]" as const;

const profileText = z.string().trim().min(1).max(128);
const storedProfileSchema = z
  .object({
    age: z.number().int().min(18).max(120).optional(),
    pregnant: z.boolean().optional(),
    medications: z.array(z.object({ name: profileText }).strict()).max(100).optional(),
    symptoms: z.array(profileText).max(100).optional(),
    conditions: z.array(profileText).max(100).optional(),
    allergies: z.array(profileText).max(100).optional(),
  })
  .strict();

export function minimizeWbRndStoredProfile(value: unknown) {
  const parsed = storedProfileSchema.safeParse(value ?? {});
  if (!parsed.success) throw new Error("invalid_profile_payload");
  return parsed.data;
}

function maskText(value: string) {
  return value
    .replace(BEARER, `Bearer ${WB_RND_REDACTED}`)
    .replace(EMAIL, WB_RND_REDACTED)
    .replace(PHONE, WB_RND_REDACTED);
}

export function sanitizeWbRndLogValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeWbRndLogValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? WB_RND_REDACTED : sanitizeWbRndLogValue(item),
      ])
    );
  }
  return typeof value === "string" ? maskText(value) : value;
}

export function logWbRndOperationalError(scope: string, error: unknown) {
  const detail = error instanceof Error
    ? { name: error.name, message: error.message }
    : { value: error };
  console.warn("[wb-rnd] request failed", sanitizeWbRndLogValue({ scope, detail }));
}

export function publicWbRndErrorCode(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return "R&D timeout";
  const code = error instanceof Error ? error.message : "";
  if (/^WB_RND_INTERIM_upstream_\d{3}$/.test(code)) return code;
  if (
    [
      "invalid_json_body",
      "invalid_request_body",
      "invalid_source_profile",
      "invalid_adapter_options",
      "invalid_profile_payload",
      "missing_required_profile_fields",
      "survey_recommendation_consent_required",
      "unsupported_profile_goal",
    ].includes(code)
  ) {
    return code;
  }
  return "R&D request failed";
}
import { z } from "zod";
