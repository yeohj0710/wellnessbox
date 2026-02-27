import { runCustomerPushUnsubscribePostRoute } from "@/lib/server/push-subscribe-route";

export async function POST(req: Request) {
  return runCustomerPushUnsubscribePostRoute(req);
}
