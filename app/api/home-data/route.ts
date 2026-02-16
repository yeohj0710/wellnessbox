import { NextResponse } from "next/server";
import { getHomePageData } from "@/lib/product/home-data";

export const runtime = "nodejs";
const HOME_DATA_CACHE_HEADER = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET() {
  try {
    const { categories, products } = await getHomePageData();
    return NextResponse.json(
      { categories, products },
      {
        status: 200,
        headers: {
          "Cache-Control": HOME_DATA_CACHE_HEADER,
        },
      }
    );
  } catch {
    return NextResponse.json(
      { categories: [], products: [] },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
