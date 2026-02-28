import { CATEGORY_LABELS } from "@/lib/categories";
import { HOME_PACKAGE_LABELS } from "./homeProductSection.copy";
import type {
  HomeCartItem,
  HomeCategory,
  HomeDataResponse as HomeDataResponsePayload,
  HomePharmacy,
  HomePharmacyProduct,
  HomeProduct,
} from "./homeProductSection.types";

type SymptomCategoryPair = {
  symptom: string;
  categories: string[];
};

function resolvePharmacyId(option: Pick<HomePharmacyProduct, "pharmacyId" | "pharmacy">) {
  return option.pharmacyId ?? option.pharmacy?.id;
}

export function parseCachedArray<T = unknown>(raw: string | null): T[] | null {
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

export const HOME_SYMPTOM_CATEGORY_PAIRS: SymptomCategoryPair[] = [
  {
    symptom: "\uD53C\uB85C\uAC10",
    categories: [
      CATEGORY_LABELS.vitaminB,
      CATEGORY_LABELS.coenzymeQ10,
      CATEGORY_LABELS.iron,
    ],
  },
  {
    symptom: "\uB208 \uAC74\uAC15",
    categories: [CATEGORY_LABELS.lutein, CATEGORY_LABELS.vitaminA],
  },
  {
    symptom: "\uD53C\uBD80 \uAC74\uAC15",
    categories: [
      CATEGORY_LABELS.collagen,
      CATEGORY_LABELS.vitaminC,
      CATEGORY_LABELS.zinc,
    ],
  },
  {
    symptom: "\uCCB4\uC9C0\uBC29",
    categories: [CATEGORY_LABELS.garcinia, CATEGORY_LABELS.psyllium],
  },
  {
    symptom: "\uD608\uAD00 & \uD608\uC561\uC21C\uD658",
    categories: [CATEGORY_LABELS.omega3, CATEGORY_LABELS.coenzymeQ10],
  },
  {
    symptom: "\uAC04 \uAC74\uAC15",
    categories: [CATEGORY_LABELS.milkThistle],
  },
  {
    symptom: "\uC7A5 \uAC74\uAC15",
    categories: [CATEGORY_LABELS.probiotics, CATEGORY_LABELS.psyllium],
  },
  {
    symptom: "\uC2A4\uD2B8\uB808\uC2A4 & \uC218\uBA74",
    categories: [
      CATEGORY_LABELS.magnesium,
      CATEGORY_LABELS.phosphatidylserine,
    ],
  },
  {
    symptom: "\uBA74\uC5ED \uAE30\uB2A5",
    categories: [
      CATEGORY_LABELS.vitaminD,
      CATEGORY_LABELS.zinc,
      CATEGORY_LABELS.vitaminC,
    ],
  },
  {
    symptom: "\uD608\uC911 \uCF5C\uB808\uC2A4\uD14C\uB864",
    categories: [CATEGORY_LABELS.omega3],
  },
];

export type HomeDataResponse = HomeDataResponsePayload;

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

  const parsedCategories = parseCachedArray<HomeCategory>(cachedCategories);
  const parsedProducts = parseCachedArray<HomeProduct>(cachedProducts);
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
  allProducts: HomeProduct[];
  selectedPharmacy: HomePharmacy | null;
  selectedPackage: string;
  selectedCategoryIds: number[];
}) {
  const { allProducts, selectedPharmacy, selectedPackage, selectedCategoryIds } =
    input;
  let filtered = [...allProducts];

  if (selectedPharmacy && selectedPackage !== HOME_PACKAGE_LABELS.all) {
    filtered = filtered.filter((product) =>
      product.pharmacyProducts.some(
        (pharmacyProduct) =>
          resolvePharmacyId(pharmacyProduct) === selectedPharmacy.id &&
          pharmacyProduct.optionType === selectedPackage
      )
    );
  }

  if (selectedPharmacy) {
    filtered = filtered.filter((product) =>
      product.pharmacyProducts.some(
        (pharmacyProduct) =>
          resolvePharmacyId(pharmacyProduct) === selectedPharmacy.id
      )
    );
  }

  if (selectedCategoryIds.length > 0) {
    filtered = filtered.filter((product) =>
      product.categories.some((category) => selectedCategoryIds.includes(category.id))
    );
  }

  if (selectedPackage === HOME_PACKAGE_LABELS.days7) {
    filtered = filtered.filter((product) =>
      product.pharmacyProducts.some((pharmacyProduct) =>
        pharmacyProduct.optionType?.includes("7")
      )
    );
  } else if (selectedPackage === HOME_PACKAGE_LABELS.days30) {
    filtered = filtered.filter((product) =>
      product.pharmacyProducts.some((pharmacyProduct) =>
        pharmacyProduct.optionType?.includes("30")
      )
    );
  } else if (selectedPackage === HOME_PACKAGE_LABELS.normal) {
    filtered = filtered.filter((product) =>
      product.pharmacyProducts.some(
        (pharmacyProduct) => pharmacyProduct.optionType === HOME_PACKAGE_LABELS.normal
      )
    );
  }

  return filtered;
}

export function calculateCartTotalForPharmacy(input: {
  cartItems: HomeCartItem[];
  allProducts: HomeProduct[];
  selectedPharmacy: HomePharmacy | null;
}) {
  const { cartItems, allProducts, selectedPharmacy } = input;
  if (!selectedPharmacy) return 0;

  return cartItems.reduce((acc, item) => {
    const matchingProduct = allProducts.find((product) => product.id === item.productId);
    const matchingPharmacyProduct = matchingProduct?.pharmacyProducts.find(
      (pharmacyProduct) =>
        resolvePharmacyId(pharmacyProduct) === selectedPharmacy.id &&
        pharmacyProduct.optionType === item.optionType
    );

    if (!matchingPharmacyProduct) return acc;

    const price = Number(matchingPharmacyProduct.price);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(price) || !Number.isFinite(quantity)) return acc;
    return acc + price * quantity;
  }, 0);
}

export function resolveCategoryIdsFromSymptoms(input: {
  selectedSymptoms: string[];
  categories: HomeCategory[];
  symptomCategoryPairs?: SymptomCategoryPair[];
}) {
  if (
    !Array.isArray(input.selectedSymptoms) ||
    input.selectedSymptoms.length === 0
  ) {
    return [];
  }

  const pairs = input.symptomCategoryPairs ?? HOME_SYMPTOM_CATEGORY_PAIRS;
  const mappedCategoryNames = input.selectedSymptoms.reduce<string[]>(
    (acc, symptom) => {
      const categories = pairs.reduce<string[]>((bucket, entry) => {
        if (entry.symptom !== symptom) return bucket;
        return [...bucket, ...entry.categories];
      }, []);
      return [...acc, ...categories];
    },
    []
  );

  const categoryNameSet = new Set(mappedCategoryNames);
  return input.categories
    .filter((category) => categoryNameSet.has(category.name))
    .map((category) => category.id);
}

export function filterCartItemsByPharmacyStock(input: {
  cartItems: HomeCartItem[];
  allProducts: HomeProduct[];
  selectedPharmacy: HomePharmacy | null;
}) {
  const { cartItems, allProducts, selectedPharmacy } = input;
  if (!selectedPharmacy || !Array.isArray(cartItems)) {
    return cartItems ?? [];
  }

  return cartItems.filter((item) => {
    const product = allProducts.find((candidate) => candidate.id === item.productId);
    if (!product) return false;

    return product.pharmacyProducts?.some(
      (pharmacyProduct) =>
        resolvePharmacyId(pharmacyProduct) === selectedPharmacy.id &&
        pharmacyProduct.optionType === item.optionType
    );
  });
}

export function buildCategoryRecommendationToast(input: {
  categoryIds: number[];
  categories: HomeCategory[];
}) {
  const names = input.categories
    .filter((category) => input.categoryIds.includes(category.id))
    .map((category) => category.name);

  if (names.length > 0) {
    return `\uAC80\uC0AC \uACB0\uACFC\uB85C \uCD94\uCC9C\uB41C ${names.join(
      ", "
    )} \uCE74\uD14C\uACE0\uB9AC\uC758 \uC0C1\uD488\uB4E4\uC774\uC5D0\uC694.`;
  }
  return "\uAC80\uC0AC \uACB0\uACFC\uB85C \uCD94\uCC9C\uB41C \uCE74\uD14C\uACE0\uB9AC\uC758 \uC0C1\uD488\uB4E4\uC774\uC5D0\uC694.";
}
