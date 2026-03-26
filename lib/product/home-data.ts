import { unstable_cache } from "next/cache";
import { getCategories, getProducts } from "@/lib/product";
import { sortByImportanceDesc } from "@/lib/utils";
import { measureServerTiming } from "@/lib/perf/timing";
import { PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS } from "@/lib/server/public-cache";

type HomeCategory = Awaited<ReturnType<typeof getCategories>>[number];
type HomeProduct = Awaited<ReturnType<typeof getProducts>>[number];

export type HomePageData = {
  categories: HomeCategory[];
  products: HomeProduct[];
  rankingProducts: HomeProduct[];
};

export type HomeDataRouteCatalogState = "live" | "paused" | "unavailable";
export type HomeDataRouteErrorCode =
  | "db_quota_exceeded"
  | "temporary_unavailable";

type HomePageDataLoadResult = {
  data: HomePageData;
  catalogState: HomeDataRouteCatalogState;
  errorCode: HomeDataRouteErrorCode | null;
};

const EMPTY_HOME_PAGE_DATA: HomePageData = {
  categories: [],
  products: [],
  rankingProducts: [],
};

const HOME_DATA_TIMEOUT_MS = Number.parseInt(
  process.env.WB_HOME_DATA_TIMEOUT_MS ?? "8000",
  10
);
const HOME_DATA_RETRY_COUNT = Math.max(
  0,
  Number.parseInt(process.env.WB_HOME_DATA_RETRY_COUNT ?? "1", 10)
);
const HOME_DATA_RETRY_DELAY_MS = Number.parseInt(
  process.env.WB_HOME_DATA_RETRY_DELAY_MS ?? "250",
  10
);

let lastSuccessfulHomeData: HomePageData | null = null;

class HomeDataTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HomeDataTimeoutError";
  }
}

function isFinitePositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}

async function withTimeout<T>(
  work: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  if (!isFinitePositiveNumber(timeoutMs)) {
    return work();
  }

  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new HomeDataTimeoutError(
              `Home data load timed out after ${timeoutMs}ms`
            )
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "unknown";
}

function isHomeDataQuotaExceededError(error: unknown) {
  const message = normalizeErrorMessage(error).toLowerCase();
  return (
    message.includes("compute time quota") ||
    message.includes("exceeded the compute time quota")
  );
}

function shouldUseEmptyHomeDataFallback(error: unknown) {
  const message = normalizeErrorMessage(error).toLowerCase();
  return (
    message.includes("compute time quota") ||
    message.includes("timed out after") ||
    message.includes("timed out fetching a new connection from the connection pool") ||
    message.includes("connection pool timeout") ||
    message.includes("can't reach database server") ||
    message.includes("cant reach database server") ||
    message.includes("please make sure your database server is running") ||
    message.includes("database server is running at") ||
    message.includes("error querying the database") ||
    message.includes("prismaclientinitializationerror")
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

const readHomePageData = unstable_cache(
  async (): Promise<HomePageData> => {
    return measureServerTiming("home:data:db", async () => {
      const [categories, products] = await Promise.all([
        getCategories(),
        getProducts(),
      ]);

      const sortedCategories = sortByImportanceDesc(categories);
      const sortedProducts = sortByImportanceDesc(products);

      return {
        categories: sortedCategories,
        products: sortedProducts,
        rankingProducts: sortedProducts.slice(0, 6),
      };
    });
  },
  ["home-page-data-v1"],
  { revalidate: PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS }
);

export async function getHomePageData(): Promise<HomePageData> {
  const result = await getHomePageDataLoadResult();
  return result.data;
}

export async function getHomePageDataRouteSnapshot(): Promise<{
  categories: HomeCategory[];
  products: HomeProduct[];
  catalogState: HomeDataRouteCatalogState;
  errorCode?: HomeDataRouteErrorCode;
}> {
  const result = await getHomePageDataLoadResult();
  return {
    categories: result.data.categories,
    products: result.data.products,
    catalogState: result.catalogState,
    ...(result.errorCode ? { errorCode: result.errorCode } : {}),
  };
}

async function getHomePageDataLoadResult(): Promise<HomePageDataLoadResult> {
  return measureServerTiming("home:data:total", async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= HOME_DATA_RETRY_COUNT; attempt += 1) {
      try {
        const data = await withTimeout(readHomePageData, HOME_DATA_TIMEOUT_MS);
        lastSuccessfulHomeData = data;
        return {
          data,
          catalogState: "live",
          errorCode: null,
        };
      } catch (error) {
        lastError = error;
        if (attempt >= HOME_DATA_RETRY_COUNT) break;
        const delayMs = HOME_DATA_RETRY_DELAY_MS * (attempt + 1);
        if (isFinitePositiveNumber(delayMs)) {
          await wait(delayMs);
        }
      }
    }

    if (lastSuccessfulHomeData) {
      console.warn("[perf] home:data fallback: using last snapshot", {
        reason: normalizeErrorMessage(lastError),
      });
      return {
        data: lastSuccessfulHomeData,
        catalogState: "live",
        errorCode: null,
      };
    }

    if (shouldUseEmptyHomeDataFallback(lastError)) {
      if (isHomeDataQuotaExceededError(lastError)) {
        console.warn("[perf] home:data fallback: catalog paused by db quota", {
          reason: normalizeErrorMessage(lastError),
        });
        return {
          data: EMPTY_HOME_PAGE_DATA,
          catalogState: "paused",
          errorCode: "db_quota_exceeded",
        };
      }

      console.warn("[perf] home:data fallback: using empty snapshot", {
        reason: normalizeErrorMessage(lastError),
      });
      return {
        data: EMPTY_HOME_PAGE_DATA,
        catalogState: "unavailable",
        errorCode: "temporary_unavailable",
      };
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to load home data");
  });
}
