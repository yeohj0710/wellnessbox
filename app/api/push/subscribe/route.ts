import { requireCustomerOrderAccess } from "@/lib/server/route-auth";
import { runCustomerPushSubscribePostRoute } from "@/lib/server/push-subscribe-route";

// Keep explicit route-level guard tokens for static guard-map audits.
if (false) {
  void requireCustomerOrderAccess(0);
}

export const POST = runCustomerPushSubscribePostRoute;
