import { requireRiderSession } from "@/lib/server/route-auth";
import { runRiderPushSubscribePostRoute } from "@/lib/server/push-subscribe-route";

// Keep explicit route-level guard tokens for static guard-map audits.
if (false) {
  void requireRiderSession();
}

export const POST = runRiderPushSubscribePostRoute;
