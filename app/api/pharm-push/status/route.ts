import { runPharmPushStatusPostRoute } from "@/lib/server/push-subscribe-route";

export async function POST(req: Request) {
  return runPharmPushStatusPostRoute(req);
}
