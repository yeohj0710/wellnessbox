import { runSuggestPostRoute } from "./suggest-route-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return runSuggestPostRoute(req, 2);
}
