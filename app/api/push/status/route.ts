import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionStatus } from "@/lib/notification";
import { requireCustomerOrderAccess } from "@/lib/server/route-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = Number(body?.orderId);
    const endpoint = body?.endpoint;
    const role = body?.role;
    if (!Number.isFinite(orderId) || typeof endpoint !== "string" || role !== "customer") {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const auth = await requireCustomerOrderAccess(orderId);
    if (!auth.ok) return auth.response;

    const status = await getSubscriptionStatus(orderId, endpoint, role);
    return NextResponse.json(status);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 }
    );
  }
}
