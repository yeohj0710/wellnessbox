export function parseCachedArray<T = any>(raw: string | null): T[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export const HOME_CACHE_TTL_MS = 60 * 1000;
export const HOME_STALE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const HOME_FETCH_TIMEOUT_MS = 8000;
export const HOME_FETCH_RETRIES = 3;

export type HomeDataResponse = {
  categories?: any[];
  products?: any[];
};

export function readCachedHomeData(maxAgeMs: number) {
  const cachedCategories = localStorage.getItem("categories");
  const cachedProducts = localStorage.getItem("products");
  const cacheTimestampRaw = localStorage.getItem("cacheTimestamp");
  const cacheTimestamp = Number.parseInt(cacheTimestampRaw || "", 10);

  if (
    !cachedCategories ||
    !cachedProducts ||
    !Number.isFinite(cacheTimestamp)
  ) {
    return null;
  }

  const ageMs = Date.now() - cacheTimestamp;
  if (ageMs < 0 || ageMs > maxAgeMs) return null;

  const parsedCategories = parseCachedArray(cachedCategories);
  const parsedProducts = parseCachedArray(cachedProducts);
  if (!parsedCategories || !parsedProducts || parsedProducts.length === 0) {
    return null;
  }

  return {
    categories: parsedCategories,
    products: parsedProducts,
    cacheTimestamp,
  };
}

export function filterHomeProducts(input: {
  allProducts: any[];
  selectedPharmacy: any;
  selectedPackage: string;
  selectedCategoryIds: number[];
}) {
  let filtered = [...input.allProducts];

  if (input.selectedPharmacy && input.selectedPackage !== "전체") {
    filtered = filtered.filter((product) =>
      product.pharmacyProducts.some(
        (pharmacyProduct: any) =>
          pharmacyProduct.pharmacy.id === input.selectedPharmacy.id &&
          pharmacyProduct.optionType === input.selectedPackage
      )
    );
  }

  if (input.selectedPharmacy) {
    filtered = filtered.filter((product) =>
      product.pharmacyProducts.some(
        (pharmacyProduct: any) =>
          pharmacyProduct.pharmacy.id === input.selectedPharmacy.id
      )
    );
  }

  if (input.selectedCategoryIds.length > 0) {
    filtered = filtered.filter((product) =>
      product.categories.some((category: any) =>
        input.selectedCategoryIds.includes(category.id)
      )
    );
  }

  if (input.selectedPackage === "7일 패키지") {
    filtered = filtered.filter((product: any) =>
      product.pharmacyProducts.some((pharmacyProduct: any) =>
        pharmacyProduct.optionType?.includes("7")
      )
    );
  } else if (input.selectedPackage === "30일 패키지") {
    filtered = filtered.filter((product: any) =>
      product.pharmacyProducts.some((pharmacyProduct: any) =>
        pharmacyProduct.optionType?.includes("30")
      )
    );
  } else if (input.selectedPackage === "일반 상품") {
    filtered = filtered.filter((product: any) =>
      product.pharmacyProducts.some(
        (pharmacyProduct: any) => pharmacyProduct.optionType === "일반 상품"
      )
    );
  }

  return filtered;
}

export function calculateCartTotalForPharmacy(input: {
  cartItems: any[];
  allProducts: any[];
  selectedPharmacy: any;
}) {
  if (!input.selectedPharmacy) return 0;

  return input.cartItems.reduce((acc, item) => {
    const matchingProduct = input.allProducts.find(
      (product) => product.id === item.productId
    );
    const matchingPharmacyProduct = matchingProduct?.pharmacyProducts.find(
      (pharmacyProduct: any) =>
        pharmacyProduct.pharmacy.id === input.selectedPharmacy.id &&
        pharmacyProduct.optionType === item.optionType
    );
    if (matchingPharmacyProduct) {
      return acc + matchingPharmacyProduct.price * item.quantity;
    }
    return acc;
  }, 0);
}
