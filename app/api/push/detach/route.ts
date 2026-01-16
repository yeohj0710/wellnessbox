import { NextRequest, NextResponse } from "next/server";
import { removeSubscriptionsByEndpoint } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = body?.endpoint;
    const role = body?.role;
    if (typeof endpoint !== "string" || role !== "customer") {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    await removeSubscriptionsByEndpoint(endpoint, role);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to detach subscription" },
      { status: 500 }
    );
  }
}
