import { runProductNamesGetRoute } from "@/lib/server/product-names-route";

export async function GET() {
  return runProductNamesGetRoute();
}
