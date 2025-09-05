import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }
    const products = await db.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        images: true,
        categories: { select: { id: true, name: true } },
        pharmacyProducts: {
          select: {
            id: true,
            price: true,
            optionType: true,
            capacity: true,
            stock: true,
            pharmacyId: true,
            pharmacy: { select: { id: true, name: true, address: true } },
          },
        },
      },
    });
    return NextResponse.json({ products }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
