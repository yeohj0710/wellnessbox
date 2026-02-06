import { NextRequest, NextResponse } from "next/server";
import { getPharmacySubscriptionStatus } from "@/lib/notification";
import { requirePharmSession } from "@/lib/server/route-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedPharmacyId = Number(body?.pharmacyId);
    const endpoint = body?.endpoint;
    const role = body?.role;
    if (!Number.isFinite(requestedPharmacyId) || typeof endpoint !== "string" || role !== "pharm") {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const auth = await requirePharmSession(requestedPharmacyId);
    if (!auth.ok) return auth.response;

    const pharmacyId = auth.data.pharmacyId;
    const status = await getPharmacySubscriptionStatus(pharmacyId, endpoint);
    return NextResponse.json(status);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 }
    );
  }
}
