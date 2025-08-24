import db from "@/lib/db";
import getSession from "@/lib/session";
import { sign } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role } = body;
    if (role === "customer") {
      const { orderId, phone, password } = body;
      if (!orderId || !phone || !password)
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      const order = await db.order.findFirst({
        where: { id: orderId, phone, password },
      });
      if (!order) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const token = sign({ role: "customer", orderId });
      return NextResponse.json({ token });
    }
    if (role === "pharm") {
      const { orderId } = body;
      const session = await getSession();
      const pharmId = session.pharm?.id;
      if (!pharmId || !orderId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const order = await db.order.findFirst({
        where: { id: orderId, pharmacyId: pharmId },
      });
      if (!order) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const token = sign({ role: "pharm", pharmacyId: pharmId });
      return NextResponse.json({ token });
    }
    if (role === "rider") {
      const { orderId } = body;
      const session = await getSession();
      const riderId = session.rider?.id;
      if (!riderId || !orderId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const order = await db.order.findFirst({
        where: { id: orderId, riderId },
      });
      if (!order) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const token = sign({ role: "rider", riderId });
      return NextResponse.json({ token });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
