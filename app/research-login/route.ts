import { runLocalResearchLoginGetRoute } from "@/lib/server/verify-password-route";

export async function GET(req: Request) {
  return runLocalResearchLoginGetRoute(req);
}
