import { NextRequest, NextResponse } from "next/server";
import { isSubscribed } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const { orderId, endpoint, role } = await req.json();
    if (!orderId || !endpoint || role !== "customer") {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    const subscribed = await isSubscribed(orderId, endpoint, role);
    return NextResponse.json({ subscribed });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 }
    );
  }
}
