import db from "@/lib/db";
import getSession from "@/lib/session";
import { sign } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role } = body;
    if (role === "customer") {
      const { orderId, phone, password } = body;
      const parsedOrderId = Number(orderId);
      if (!Number.isFinite(parsedOrderId) || !phone || !password)
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      const order = await db.order.findFirst({
        where: { id: parsedOrderId, phone, password },
      });
      if (!order)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const { token, exp } = sign({ role: "customer", orderId: parsedOrderId });
      return NextResponse.json({ token, exp });
    }
    if (role === "pharm") {
      const { orderId } = body;
      const parsedOrderId = Number(orderId);
      const session = await getSession();
      const pharmId = session.pharm?.id;
      if (!pharmId || !Number.isFinite(parsedOrderId))
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const order = await db.order.findFirst({
        where: { id: parsedOrderId, pharmacyId: pharmId },
      });
      if (!order)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const { token, exp } = sign({
        role: "pharm",
        pharmacyId: pharmId,
        orderId: parsedOrderId,
      });
      return NextResponse.json({ token, exp });
    }
    if (role === "rider") {
      const { orderId } = body;
      const parsedOrderId = Number(orderId);
      const session = await getSession();
      const riderId = session.rider?.id;
      if (!riderId || !Number.isFinite(parsedOrderId))
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const order = await db.order.findFirst({
        where: { id: parsedOrderId, riderId },
      });
      if (!order)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const { token, exp } = sign({ role: "rider", riderId, orderId: parsedOrderId });
      return NextResponse.json({ token, exp });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
