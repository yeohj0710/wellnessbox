import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const products = await db.product.findMany({
      select: { id: true, name: true },
    });
    return NextResponse.json({ products });
  } catch (e) {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
