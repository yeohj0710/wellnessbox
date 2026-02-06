import { NextRequest, NextResponse } from "next/server";
import { removePharmacySubscription } from "@/lib/notification";
import { requirePharmSession } from "@/lib/server/route-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedPharmacyId = Number(body?.pharmacyId);
    const endpoint = body?.endpoint;
    const role = body?.role;
    if (typeof endpoint !== "string" || role !== "pharm" || !Number.isFinite(requestedPharmacyId)) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const auth = await requirePharmSession(requestedPharmacyId);
    if (!auth.ok) return auth.response;

    const pharmacyId = auth.data.pharmacyId;
    await removePharmacySubscription(endpoint, pharmacyId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
