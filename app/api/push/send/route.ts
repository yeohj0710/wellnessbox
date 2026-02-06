import { NextRequest, NextResponse } from "next/server";
import { sendOrderNotification } from "@/lib/notification";
import { requireCustomerOrderAccess } from "@/lib/server/route-auth";

export async function POST(req: NextRequest) {
  try {
    const { orderId, status, image } = await req.json();
    const parsedOrderId = Number(orderId);
    if (!Number.isFinite(parsedOrderId) || !status) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const auth = await requireCustomerOrderAccess(parsedOrderId);
    if (!auth.ok) return auth.response;

    await sendOrderNotification(parsedOrderId, status, image);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
