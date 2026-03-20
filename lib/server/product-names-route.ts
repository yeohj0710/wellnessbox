import "server-only";

import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  buildPublicCacheControl,
  PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS,
} from "@/lib/server/public-cache";

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

const readProductNames = unstable_cache(
  async () =>
    db.product.findMany({
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
    }),
  ["api-product-names-v1"],
  { revalidate: PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS }
);

export async function runProductNamesGetRoute() {
  try {
    const products = await readProductNames();

    return NextResponse.json(
      {
        products: serializeProductNames(products),
      },
      {
        headers: {
          "Cache-Control": buildPublicCacheControl(),
        },
      }
    );
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
