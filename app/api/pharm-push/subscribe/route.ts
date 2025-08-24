import { NextRequest, NextResponse } from "next/server";
import { savePharmacySubscription } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pharmacyId, subscription, role } = body;
    if (!pharmacyId || !subscription || role !== "pharm") {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
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
