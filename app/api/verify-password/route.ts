import { runVerifyPasswordPostRoute } from "@/lib/server/verify-password-route";

export async function POST(req: Request) {
  return runVerifyPasswordPostRoute(req);
}
