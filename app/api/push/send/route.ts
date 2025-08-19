import { NextRequest, NextResponse } from "next/server";
import { sendOrderNotification } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const { orderId, status } = await req.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    await sendOrderNotification(orderId, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
