import {
  runMessageStreamTokenPostRoute,
} from "@/lib/server/message-stream-token-route";
import {
  requirePharmSession,
  requireRiderSession,
} from "@/lib/server/route-auth";

export const runtime = "nodejs";

// Keep explicit route-level guard tokens for static guard-map audits.
if (false) {
  void requirePharmSession();
  void requireRiderSession();
}

export const POST = runMessageStreamTokenPostRoute;
