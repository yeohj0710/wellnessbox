import { NextRequest, NextResponse } from "next/server";
import {
  removeSubscriptionsByEndpoint,
  removeSubscriptionsByEndpointAll,
} from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = body?.endpoint;
    const role = body?.role;

    if (typeof endpoint !== "string" || !endpoint) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    if (typeof role === "string" && role.length > 0) {
      await removeSubscriptionsByEndpoint(endpoint, role);
    } else {
      await removeSubscriptionsByEndpointAll(endpoint);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to detach subscription" },
      { status: 500 }
    );
  }
}
