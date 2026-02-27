import { runGetPaymentInfoPostRoute } from "@/lib/server/payment-info-route";

export async function POST(req: Request) {
  return runGetPaymentInfoPostRoute(req);
}
