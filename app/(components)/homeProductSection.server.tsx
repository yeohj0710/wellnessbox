import HomeProductSectionHydrated from "@/app/(components)/homeProductSectionHydrated.client";
import { getHomePageData, type HomePageData } from "@/lib/product/home-data";

interface HomeProductSectionServerProps {
  homeDataPromise?: Promise<HomePageData>;
}

export default async function HomeProductSectionServer({
  homeDataPromise,
}: HomeProductSectionServerProps) {
  const { categories, products } = await (homeDataPromise ?? getHomePageData());

  return (
    <HomeProductSectionHydrated
      initialCategories={categories}
      initialProducts={products}
    />
  );
}
