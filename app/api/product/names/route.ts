import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: {
        pharmacyProducts: {
          some: {
            stock: { gt: 0 },
          },
        },
      },
      select: {
        id: true,
        name: true,
        categories: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { importance: "desc" },
        { updatedAt: "desc" },
      ],
    });
    return NextResponse.json({
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        categories: product.categories
          .map((category) => category?.name || "")
          .filter(Boolean),
      })),
    });
  } catch (e) {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
