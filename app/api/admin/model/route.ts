import {
  runAdminModelAuthedGetRoute,
  runAdminModelAuthedPostRoute,
} from "@/lib/server/admin-model-route";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

if (false) {
  void requireAdminSession();
}

export const GET = runAdminModelAuthedGetRoute;
export const POST = runAdminModelAuthedPostRoute;
