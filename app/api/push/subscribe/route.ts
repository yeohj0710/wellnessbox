import { NextRequest, NextResponse } from "next/server";
import {
  removeSubscriptionsByEndpointExceptRole,
  saveSubscription,
} from "@/lib/notification";
import { requireCustomerOrderAccess } from "@/lib/server/route-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = Number(body?.orderId);
    const subscription = body?.subscription;
    const role = body?.role;
    if (
      !Number.isFinite(orderId) ||
      !subscription ||
      typeof subscription?.endpoint !== "string" ||
      role !== "customer"
    ) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const auth = await requireCustomerOrderAccess(orderId);
    if (!auth.ok) return auth.response;

    await removeSubscriptionsByEndpointExceptRole(subscription.endpoint, role);
    await saveSubscription(orderId, subscription, role);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}
