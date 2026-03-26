import "server-only";

import { NextResponse } from "next/server";
import { getHomePageDataRouteSnapshot } from "@/lib/product/home-data";
import { buildPublicCacheControl } from "@/lib/server/public-cache";

const HOME_DATA_CACHE_HEADER = buildPublicCacheControl();

export async function runHomeDataGetRoute() {
  try {
    const snapshot = await getHomePageDataRouteSnapshot();

    if (snapshot.catalogState === "paused") {
      return NextResponse.json(snapshot, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    if (snapshot.catalogState === "unavailable") {
      return NextResponse.json(snapshot, {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      snapshot,
      {
        status: 200,
        headers: {
          "Cache-Control": HOME_DATA_CACHE_HEADER,
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        categories: [],
        products: [],
        catalogState: "unavailable",
        errorCode: "temporary_unavailable",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
