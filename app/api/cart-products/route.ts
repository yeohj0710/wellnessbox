import { runCartProductsPostRoute } from "@/lib/server/cart-products-route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return runCartProductsPostRoute(req);
}
