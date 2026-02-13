import HomeProductSectionHydrated from "@/app/(components)/homeProductSectionHydrated.client";
import { getHomePageData } from "@/lib/product/home-data";

export default async function HomeProductSectionServer() {
  const { categories, products } = await getHomePageData();

  return (
    <HomeProductSectionHydrated
      initialCategories={categories}
      initialProducts={products}
    />
  );
}
