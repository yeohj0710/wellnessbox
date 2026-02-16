import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";

const CART_PRODUCTS_QUERY_TIMEOUT_MS = Number.parseInt(
  process.env.WB_CART_PRODUCTS_TIMEOUT_MS ?? "8000",
  10
);

function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return work;

  let timer: NodeJS.Timeout | null = null;
  return Promise.race([
    work,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`cart-products timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }
    const products = await withTimeout(
      db.product.findMany({
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
      }),
      CART_PRODUCTS_QUERY_TIMEOUT_MS
    );
    return NextResponse.json({ products }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ products: [] }, { status: 503 });
  }
}
