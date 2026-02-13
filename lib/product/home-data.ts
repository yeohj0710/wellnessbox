import { unstable_cache } from "next/cache";
import { getCategories, getProducts } from "@/lib/product";
import { sortByImportanceDesc } from "@/lib/utils";
import { measureServerTiming } from "@/lib/perf/timing";

type HomeCategory = Awaited<ReturnType<typeof getCategories>>[number];
type HomeProduct = Awaited<ReturnType<typeof getProducts>>[number];

export type HomePageData = {
  categories: HomeCategory[];
  products: HomeProduct[];
  rankingProducts: HomeProduct[];
};

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
  { revalidate: 60 }
);

export async function getHomePageData(): Promise<HomePageData> {
  return measureServerTiming("home:data:total", readHomePageData);
}
