import { NextRequest, NextResponse } from "next/server";
import { removePharmacySubscription } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pharmacyId = Number(body?.pharmacyId);
    const endpoint = body?.endpoint;
    const role = body?.role;
    if (typeof endpoint !== "string" || role !== "pharm" || !Number.isFinite(pharmacyId)) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
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
