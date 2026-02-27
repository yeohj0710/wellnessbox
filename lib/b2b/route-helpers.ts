import { z } from "zod";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";

export async function parseRouteBodyWithSchema<TSchema extends z.ZodTypeAny>(
  req: Request,
  schema: TSchema,
  fallbackBody: unknown
) {
  const body = await req.json().catch(() => fallbackBody);
  return schema.safeParse(body);
}

export function buildValidationErrorResponse(
  error: z.ZodError,
  fallbackMessage: string
) {
  return noStoreJson(
    { ok: false, error: error.issues[0]?.message || fallbackMessage },
    400
  );
}

export function buildDbErrorResponse(error: unknown, fallbackMessage: string) {
  const dbError = resolveDbRouteError(error, fallbackMessage);
  return noStoreJson(
    { ok: false, code: dbError.code, error: dbError.message },
    dbError.status
  );
}

export async function runWithDbRouteError(
  fallbackMessage: string,
  work: () => Promise<Response>
) {
  try {
    return await work();
  } catch (error) {
    return buildDbErrorResponse(error, fallbackMessage);
  }
}

export function withDbRouteError<TArgs extends unknown[]>(
  fallbackMessage: string,
  work: (...args: TArgs) => Promise<Response>
) {
  return (...args: TArgs) =>
    runWithDbRouteError(fallbackMessage, () => work(...args));
}
