import { NextRequest, NextResponse } from "next/server";
import { removeRiderSubscription } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const riderId = Number(body?.riderId);
    const endpoint = body?.endpoint;
    const role = body?.role;
    if (typeof endpoint !== "string" || role !== "rider" || !Number.isFinite(riderId)) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    await removeRiderSubscription(endpoint, riderId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
