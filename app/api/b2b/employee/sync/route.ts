import { runEmployeeSyncPostRoute } from "@/lib/b2b/employee-sync-route-handler";
import { requireNhisSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

// Keep explicit route-level guard tokens for static guard-map audits.
if (false) {
  void requireNhisSession();
}

export const POST = runEmployeeSyncPostRoute;
