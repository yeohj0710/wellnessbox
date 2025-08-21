import { NextRequest, NextResponse } from "next/server";
import { isPharmacySubscribed } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pharmacyId, endpoint } = body;
    if (!pharmacyId || !endpoint) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    const subscribed = await isPharmacySubscribed(pharmacyId, endpoint);
    return NextResponse.json({ subscribed });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 }
    );
  }
}
