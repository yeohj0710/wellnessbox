import { NextRequest, NextResponse } from "next/server";
import {
  removePharmacySubscriptionsByEndpointExcept,
  removeSubscriptionsByEndpointExceptRole,
  savePharmacySubscription,
} from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pharmacyId = Number(body?.pharmacyId);
    const subscription = body?.subscription;
    const role = body?.role;
    if (
      !Number.isFinite(pharmacyId) ||
      !subscription ||
      typeof subscription?.endpoint !== "string" ||
      role !== "pharm"
    ) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    await removeSubscriptionsByEndpointExceptRole(subscription.endpoint, role);
    await removePharmacySubscriptionsByEndpointExcept(
      subscription.endpoint,
      pharmacyId
    );
    await savePharmacySubscription(pharmacyId, subscription);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}
