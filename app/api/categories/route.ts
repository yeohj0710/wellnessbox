import { runCategoriesGetRoute } from "@/lib/server/categories-route";

export const runtime = "nodejs";

export async function GET() {
  return runCategoriesGetRoute();
}
