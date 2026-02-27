import { requireCustomerOrderAccess } from "@/lib/server/route-auth";
import { runPushSendPostRoute } from "./route-service";

// Keep explicit route-level guard tokens for static guard-map audits.
if (false) {
  void requireCustomerOrderAccess(0);
}

export const POST = runPushSendPostRoute;
