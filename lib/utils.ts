export const formatPriceRange = ({
  product,
  quantity = 1,
  optionType,
}: any) => {
  const effectiveOptionType = optionType || getLowestAverageOptionType(product);
  if (!effectiveOptionType) return "가격 정보 없음";
  const filteredPharmacyProducts = product.pharmacyProducts.filter(
    (pp: any) => pp.optionType === effectiveOptionType
  );
  const prices = filteredPharmacyProducts
    ?.map((pp: any) => pp.price)
    .filter((price: any): price is number => price !== null);
  if (!prices || prices.length === 0) return "가격 정보 없음";
  const minPrice = Math.min(...prices) * quantity;
  const maxPrice = Math.max(...prices) * quantity;
  return minPrice === maxPrice
    ? `₩${minPrice.toLocaleString()}`
    : `₩${minPrice.toLocaleString()} ~ ₩${maxPrice.toLocaleString()}`;
};

export const getLowestAverageOptionType = (product: any) => {
  const optionTypeGroups = product.pharmacyProducts.reduce(
    (acc: Record<string, any[]>, pp: any) => {
      const key = pp.optionType || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(pp);
      return acc;
    },
    {}
  );
  const averages = Object.entries(optionTypeGroups).map(
    ([type, products]: any) => {
      const avgPrice =
        products.reduce((sum: number, pp: any) => sum + (pp.price || 0), 0) /
        products.length;
      return { optionType: type, avgPrice };
    }
  );
  const lowestAverage = averages.reduce((prev, current) =>
    prev.avgPrice < current.avgPrice ? prev : current
  );
  return lowestAverage.optionType || null;
};
