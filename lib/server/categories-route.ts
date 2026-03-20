import "server-only";

import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  buildPublicCacheControl,
  PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS,
} from "@/lib/server/public-cache";

const CATEGORIES_QUERY_TIMEOUT_MS = Number.parseInt(
  process.env.WB_CATEGORIES_TIMEOUT_MS ?? "7000",
  10
);

function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return work;

  let timer: NodeJS.Timeout | null = null;
  return Promise.race([
    work,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`categories timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

const readCategories = unstable_cache(
  async () =>
    withTimeout(
      db.category.findMany({
        select: {
          id: true,
          name: true,
          image: true,
          importance: true,
        },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      }),
      CATEGORIES_QUERY_TIMEOUT_MS
    ),
  ["api-categories-v1"],
  { revalidate: PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS }
);

export async function runCategoriesGetRoute() {
  try {
    const categories = await readCategories();

    return NextResponse.json(
      { categories },
      {
        status: 200,
        headers: {
          "Cache-Control": buildPublicCacheControl(),
        },
      }
    );
  } catch {
    return NextResponse.json({ categories: [] }, { status: 503 });
  }
}
