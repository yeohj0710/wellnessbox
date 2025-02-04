export const formatPriceRange = ({
  product,
  quantity = 1,
  optionType,
  pharmacy,
}: any) => {
  const effectiveOptionType =
    optionType === "전체"
      ? getLowestAverageOptionType({ product, pharmacy })
      : optionType;
  if (!effectiveOptionType) return "가격 정보 없음";
  const filteredPharmacyProducts = product.pharmacyProducts.filter(
    (pp: any) =>
      pp.optionType === effectiveOptionType &&
      (pharmacy ? pp.pharmacyId === pharmacy.id : true)
  );
  const prices = filteredPharmacyProducts
    ?.map((pp: any) => pp.price)
    .filter((price: any): price is number => price !== null);
  if (!prices || prices.length === 0) return "가격 정보 없음";
  const minPrice = Math.min(...prices) * quantity;
  const maxPrice = Math.max(...prices) * quantity;
  return minPrice === maxPrice
    ? `${minPrice.toLocaleString()}원`
    : `${minPrice.toLocaleString()}원 ~ ${maxPrice.toLocaleString()}원`;
};

export const getLowestAverageOptionType = ({ product, pharmacy }: any) => {
  const relevantProducts = pharmacy
    ? product.pharmacyProducts.filter(
        (pp: any) => pp.pharmacy?.id === pharmacy.id
      )
    : product.pharmacyProducts;
  const optionTypeGroups = relevantProducts.reduce(
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
  if (averages.length === 0) return null;
  const lowestAverage = averages.reduce((prev, current) =>
    prev.avgPrice < current.avgPrice ? prev : current
  );
  return lowestAverage.optionType || null;
};
