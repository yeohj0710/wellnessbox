import { NextRequest, NextResponse } from "next/server";
import { isSubscribed } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const { orderId, endpoint } = await req.json();
    if (!orderId || !endpoint) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    const subscribed = await isSubscribed(orderId, endpoint);
    return NextResponse.json({ subscribed });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 }
    );
  }
}
