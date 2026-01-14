import { NextRequest, NextResponse } from "next/server";
import { saveRiderSubscription } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const riderId = Number(body?.riderId);
    const subscription = body?.subscription;
    const role = body?.role;
    if (
      !Number.isFinite(riderId) ||
      !subscription ||
      typeof subscription?.endpoint !== "string" ||
      role !== "rider"
    ) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
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
