import { z } from "zod";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";

export const COLUMN_POST_NOT_FOUND_ERROR =
  "\uAC8C\uC2DC\uAE00\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
export const COLUMN_INPUT_INVALID_ERROR =
  "\uC785\uB825\uAC12\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";

export async function parseColumnRouteBody<TSchema extends z.ZodTypeAny>(
  req: Request,
  schema: TSchema,
  fallbackBody: unknown
) {
  const body = await req.json().catch(() => fallbackBody);
  return schema.safeParse(body);
}

export function buildColumnValidationErrorResponse(
  error: z.ZodError,
  fallbackMessage = COLUMN_INPUT_INVALID_ERROR
) {
  return noStoreJson(
    { ok: false, error: error.issues[0]?.message || fallbackMessage },
    400
  );
}

export function buildColumnDbErrorResponse(error: unknown, fallbackMessage: string) {
  const dbError = resolveDbRouteError(error, fallbackMessage);
  return noStoreJson(
    { ok: false, code: dbError.code, error: dbError.message },
    dbError.status
  );
}

export function buildColumnPostNotFoundResponse() {
  return noStoreJson({ ok: false, error: COLUMN_POST_NOT_FOUND_ERROR }, 404);
}

export async function runWithColumnDbError(
  fallbackMessage: string,
  work: () => Promise<Response>
) {
  try {
    return await work();
  } catch (error) {
    return buildColumnDbErrorResponse(error, fallbackMessage);
  }
}
