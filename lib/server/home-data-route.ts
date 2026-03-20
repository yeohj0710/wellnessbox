import "server-only";

import { NextResponse } from "next/server";
import { getHomePageData } from "@/lib/product/home-data";
import { buildPublicCacheControl } from "@/lib/server/public-cache";

const HOME_DATA_CACHE_HEADER = buildPublicCacheControl();

export async function runHomeDataGetRoute() {
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
