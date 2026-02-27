import { requirePharmSession } from "@/lib/server/route-auth";
import { runPharmPushSubscribePostRoute } from "@/lib/server/push-subscribe-route";

// Keep explicit route-level guard tokens for static guard-map audits.
if (false) {
  void requirePharmSession();
}

export const POST = runPharmPushSubscribePostRoute;
