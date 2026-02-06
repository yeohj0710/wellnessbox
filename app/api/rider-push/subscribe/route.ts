import { NextRequest, NextResponse } from "next/server";
import {
  removeRiderSubscriptionsByEndpointExcept,
  removeSubscriptionsByEndpointExceptRole,
  saveRiderSubscription,
} from "@/lib/notification";
import { requireRiderSession } from "@/lib/server/route-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedRiderId = Number(body?.riderId);
    const subscription = body?.subscription;
    const role = body?.role;
    if (
      !Number.isFinite(requestedRiderId) ||
      !subscription ||
      typeof subscription?.endpoint !== "string" ||
      role !== "rider"
    ) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const auth = await requireRiderSession(requestedRiderId);
    if (!auth.ok) return auth.response;
    const riderId = auth.data.riderId;

    await removeSubscriptionsByEndpointExceptRole(subscription.endpoint, role);
    await removeRiderSubscriptionsByEndpointExcept(
      subscription.endpoint,
      riderId
    );
    await saveRiderSubscription(riderId, subscription);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}
