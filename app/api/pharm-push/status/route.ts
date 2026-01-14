import { NextRequest, NextResponse } from "next/server";
import { getPharmacySubscriptionStatus } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pharmacyId = Number(body?.pharmacyId);
    const endpoint = body?.endpoint;
    const role = body?.role;
    if (!Number.isFinite(pharmacyId) || typeof endpoint !== "string" || role !== "pharm") {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
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
