import { NextRequest, NextResponse } from "next/server";
import { removePharmacySubscription } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pharmacyId, endpoint } = body;
    if (!endpoint) {
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
