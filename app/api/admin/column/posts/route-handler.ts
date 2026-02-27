import "server-only";

import {
  buildColumnValidationErrorResponse,
  parseColumnRouteBody,
  runWithColumnDbError,
} from "@/lib/column/admin-route-helpers";
import { requireAdminSession } from "@/lib/server/route-auth";
import { noStoreJson } from "@/lib/server/no-store";
import { createPostSchema } from "./_shared";
import {
  createAdminColumnPost,
  listAdminColumnPosts,
  syncFileColumnsToDb,
} from "./route-service";

const COLUMN_POST_LIST_ERROR =
  "\uAC8C\uC2DC\uAE00 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";
const COLUMN_POST_CREATE_ERROR =
  "\uAC8C\uC2DC\uAE00 \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";

export async function runAdminColumnPostsGetRoute(req: Request) {
  await syncFileColumnsToDb();
  const posts = await listAdminColumnPosts(req.url);
  return noStoreJson({ ok: true, posts });
}

export async function runAdminColumnPostsPostRoute(req: Request) {
  const parsed = await parseColumnRouteBody(req, createPostSchema, null);
  if (!parsed.success) {
    return buildColumnValidationErrorResponse(parsed.error);
  }

  const post = await createAdminColumnPost(parsed.data);
  return noStoreJson({ ok: true, post });
}

export async function runAdminColumnPostsGetEntry(req: Request) {
  return runWithColumnDbError(COLUMN_POST_LIST_ERROR, async () => {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;
    return runAdminColumnPostsGetRoute(req);
  });
}

export async function runAdminColumnPostsPostEntry(req: Request) {
  return runWithColumnDbError(COLUMN_POST_CREATE_ERROR, async () => {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;
    return runAdminColumnPostsPostRoute(req);
  });
}
