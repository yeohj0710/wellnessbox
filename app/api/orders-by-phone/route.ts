import { runOrdersByPhonePostRoute } from "@/lib/server/orders-by-phone-route";

export async function POST(request: Request) {
  return runOrdersByPhonePostRoute(request);
}
