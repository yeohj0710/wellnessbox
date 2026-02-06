import { NextRequest, NextResponse } from "next/server";
import {
  removePharmacySubscriptionsByEndpointExcept,
  removeSubscriptionsByEndpointExceptRole,
  savePharmacySubscription,
} from "@/lib/notification";
import { requirePharmSession } from "@/lib/server/route-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedPharmacyId = Number(body?.pharmacyId);
    const subscription = body?.subscription;
    const role = body?.role;
    if (
      !Number.isFinite(requestedPharmacyId) ||
      !subscription ||
      typeof subscription?.endpoint !== "string" ||
      role !== "pharm"
    ) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const auth = await requirePharmSession(requestedPharmacyId);
    if (!auth.ok) return auth.response;
    const pharmacyId = auth.data.pharmacyId;

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
