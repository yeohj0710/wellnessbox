import "server-only";

import { NextResponse } from "next/server";
import db from "@/lib/db";

type ProductNameRow = {
  id: number;
  name: string | null;
  categories: Array<{ name: string | null }>;
};

function serializeProductNames(products: ProductNameRow[]) {
  return products.map((product) => ({
    id: product.id,
    name: product.name || "",
    categories: product.categories
      .map((category) => category?.name || "")
      .filter(Boolean),
  }));
}

export async function runProductNamesGetRoute() {
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
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({
      products: serializeProductNames(products),
    });
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
