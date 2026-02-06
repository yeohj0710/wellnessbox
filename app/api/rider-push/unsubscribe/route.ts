import { NextRequest, NextResponse } from "next/server";
import { removeRiderSubscription } from "@/lib/notification";
import { requireRiderSession } from "@/lib/server/route-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedRiderId = Number(body?.riderId);
    const endpoint = body?.endpoint;
    const role = body?.role;
    if (typeof endpoint !== "string" || role !== "rider" || !Number.isFinite(requestedRiderId)) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    const auth = await requireRiderSession(requestedRiderId);
    if (!auth.ok) return auth.response;

    const riderId = auth.data.riderId;
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
