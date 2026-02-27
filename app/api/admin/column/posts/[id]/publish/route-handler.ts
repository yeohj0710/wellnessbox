import "server-only";

import {
  buildColumnPostNotFoundResponse,
  buildColumnValidationErrorResponse,
  parseColumnRouteBody,
  runWithColumnDbError,
} from "@/lib/column/admin-route-helpers";
import { requireAdminSession } from "@/lib/server/route-auth";
import { noStoreJson } from "@/lib/server/no-store";
import { publishPostSchema } from "../../_shared";
import { publishAdminColumnPostById } from "../route-service";

export type AdminColumnPostPublishRouteContext = {
  params: Promise<{ id: string }>;
};

const PUBLISH_UPDATE_FAILED_ERROR =
  "\uBC1C\uD589 \uC0C1\uD0DC \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";

export async function runAdminColumnPostPublishRoute(
  req: Request,
  ctx: AdminColumnPostPublishRouteContext
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const parsed = await parseColumnRouteBody(req, publishPostSchema, {});
  if (!parsed.success) {
    return buildColumnValidationErrorResponse(parsed.error);
  }

  const { id } = await ctx.params;
  const post = await publishAdminColumnPostById({
    id,
    publish: parsed.data.publish === true,
  });
  if (!post) return buildColumnPostNotFoundResponse();

  return noStoreJson({ ok: true, post });
}

export async function runAdminColumnPostPublishEntry(
  req: Request,
  ctx: AdminColumnPostPublishRouteContext
) {
  return runWithColumnDbError(PUBLISH_UPDATE_FAILED_ERROR, () =>
    runAdminColumnPostPublishRoute(req, ctx)
  );
}
