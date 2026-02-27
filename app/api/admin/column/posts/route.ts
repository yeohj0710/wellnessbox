import {
  runAdminColumnPostsGetEntry,
  runAdminColumnPostsPostEntry,
} from "./route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = runAdminColumnPostsGetEntry;
export const POST = runAdminColumnPostsPostEntry;
