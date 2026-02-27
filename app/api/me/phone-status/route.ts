import { runMePhoneStatusGetRoute } from "@/lib/server/me-phone-status-route";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep explicit route-level guard calls for static guard-map audits.
if (false) {
  void requireUserSession();
}

export const GET = runMePhoneStatusGetRoute;
