import { runRiderPushStatusPostRoute } from "@/lib/server/push-subscribe-route";

export async function POST(req: Request) {
  return runRiderPushStatusPostRoute(req);
}
