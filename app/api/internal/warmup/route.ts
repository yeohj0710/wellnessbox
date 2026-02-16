import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getHomePageData } from "@/lib/product/home-data";
import { requireCronSecret } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "unknown";
}

export async function GET(req: Request) {
  const auth = await requireCronSecret(req);
  if (!auth.ok) return auth.response;

  const startedAt = Date.now();
  const warmed = {
    dbConnection: false,
    homeDataCache: false,
  };

  try {
    await db.$queryRaw`SELECT 1`;
    warmed.dbConnection = true;

    const homeData = await getHomePageData();
    warmed.homeDataCache =
      Array.isArray(homeData.products) && Array.isArray(homeData.categories);

    return NextResponse.json(
      {
        ok: true,
        warmed,
        elapsedMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[warmup] failed", error);
    return NextResponse.json(
      {
        ok: false,
        warmed,
        elapsedMs: Date.now() - startedAt,
        error: normalizeErrorMessage(error),
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
