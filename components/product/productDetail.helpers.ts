type PharmacyProduct = {
  pharmacy?: { id?: number } | null;
  optionType?: string | null;
  capacity?: string | null;
};

export function getRelevantPharmacyProducts(
  pharmacyProducts: PharmacyProduct[] = [],
  pharmacy?: { id?: number } | null
) {
  if (!pharmacy || typeof pharmacy.id !== "number") return pharmacyProducts;
  return pharmacyProducts.filter((item) => item.pharmacy?.id === pharmacy.id);
}

function scoreOptionType(optionType: string) {
  if (/일반/.test(optionType)) {
    return { group: 2, n: Number.POSITIVE_INFINITY };
  }
  const match = optionType.match(/(\d+)\s*(일|정)/);
  if (match) {
    return { group: 0, n: parseInt(match[1], 10) };
  }
  return { group: 1, n: Number.POSITIVE_INFINITY - 1 };
}

export function sortOptionTypes(optionTypes: string[]) {
  return [...optionTypes].sort((left, right) => {
    const leftScore = scoreOptionType(left);
    const rightScore = scoreOptionType(right);
    if (leftScore.group !== rightScore.group) {
      return leftScore.group - rightScore.group;
    }
    return leftScore.n - rightScore.n;
  });
}

export function getCapacityByOptionType(
  pharmacyProducts: PharmacyProduct[],
  optionType: string
) {
  return pharmacyProducts.find((item) => item.optionType === optionType)?.capacity;
}

export function readCartSnapshotSafe() {
  try {
    const snapshotRaw = localStorage.getItem("cartItems");
    const parsed = snapshotRaw ? JSON.parse(snapshotRaw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
