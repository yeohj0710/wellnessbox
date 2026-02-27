import { runSearchAddressGetRoute } from "@/lib/server/search-address-route";

export async function GET(req: Request) {
  return runSearchAddressGetRoute(req);
}
