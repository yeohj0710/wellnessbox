import "server-only";

import {
  buildColumnPostNotFoundResponse,
  buildColumnValidationErrorResponse,
  parseColumnRouteBody,
  runWithColumnDbError,
} from "@/lib/column/admin-route-helpers";
import { requireAdminSession } from "@/lib/server/route-auth";
import { noStoreJson } from "@/lib/server/no-store";
import { updatePostSchema } from "../_shared";
import {
  deleteAdminColumnPostById,
  getAdminColumnPostById,
  patchAdminColumnPostById,
} from "./route-service";

export type AdminColumnPostRouteContext = {
  params: Promise<{ id: string }>;
};

const COLUMN_POST_GET_ERROR =
  "\uAC8C\uC2DC\uAE00\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";
const COLUMN_POST_PATCH_ERROR =
  "\uAC8C\uC2DC\uAE00 \uC218\uC815\uC774 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
const COLUMN_POST_DELETE_ERROR =
  "\uAC8C\uC2DC\uAE00 \uC0AD\uC81C\uAC00 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";

export async function runAdminColumnPostGetRoute(
  ctx: AdminColumnPostRouteContext
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const post = await getAdminColumnPostById(id);
  if (!post) return buildColumnPostNotFoundResponse();

  return noStoreJson({ ok: true, post });
}

export async function runAdminColumnPostPatchRoute(
  req: Request,
  ctx: AdminColumnPostRouteContext
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const parsed = await parseColumnRouteBody(req, updatePostSchema, null);
  if (!parsed.success) {
    return buildColumnValidationErrorResponse(parsed.error);
  }

  const { id } = await ctx.params;
  const post = await patchAdminColumnPostById({
    id,
    patch: parsed.data,
  });
  if (!post) return buildColumnPostNotFoundResponse();

  return noStoreJson({ ok: true, post });
}

export async function runAdminColumnPostDeleteRoute(
  ctx: AdminColumnPostRouteContext
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const deleted = await deleteAdminColumnPostById(id);
  if (!deleted) return buildColumnPostNotFoundResponse();

  return noStoreJson({ ok: true });
}

export async function runAdminColumnPostGetEntry(
  _req: Request,
  ctx: AdminColumnPostRouteContext
) {
  return runWithColumnDbError(COLUMN_POST_GET_ERROR, () =>
    runAdminColumnPostGetRoute(ctx)
  );
}

export async function runAdminColumnPostPatchEntry(
  req: Request,
  ctx: AdminColumnPostRouteContext
) {
  return runWithColumnDbError(COLUMN_POST_PATCH_ERROR, () =>
    runAdminColumnPostPatchRoute(req, ctx)
  );
}

export async function runAdminColumnPostDeleteEntry(
  _req: Request,
  ctx: AdminColumnPostRouteContext
) {
  return runWithColumnDbError(COLUMN_POST_DELETE_ERROR, () =>
    runAdminColumnPostDeleteRoute(ctx)
  );
}
