import type { CartLineItem, CartPharmacy, CartProduct } from "./cart.types";

type BuildBulkChangeParams = {
  cartItems: CartLineItem[];
  allProducts: CartProduct[];
  selectedPharmacyId: number | null | undefined;
  targetOptionType: string;
};

function resolvePharmacyId(productOption: {
  pharmacyId?: number | null;
  pharmacy?: { id?: number } | null;
}) {
  return productOption.pharmacyId ?? productOption.pharmacy?.id;
}

function findNextOption(
  product: CartProduct | undefined,
  selectedPharmacyId: number | null | undefined,
  targetOptionType: string,
  requiredQuantity: number
) {
  if (!product?.pharmacyProducts?.length) return null;
  return (
    product.pharmacyProducts.find((option) => {
      const optionType =
        typeof option.optionType === "string" ? option.optionType : "";
      const stock = Number(option.stock);
      return (
        resolvePharmacyId(option) === selectedPharmacyId &&
        optionType.includes(targetOptionType) &&
        Number.isFinite(stock) &&
        stock >= requiredQuantity
      );
    }) ?? null
  );
}

export function filterRegisteredPharmacies(pharmacies: unknown): CartPharmacy[] {
  if (!Array.isArray(pharmacies)) return [];
  return pharmacies.filter((pharmacy): pharmacy is CartPharmacy => {
    if (!pharmacy || typeof pharmacy !== "object") return false;
    const candidate = pharmacy as Partial<CartPharmacy>;
    return candidate.registrationNumber !== null;
  });
}

export function buildBulkChangedCartItems({
  cartItems,
  allProducts,
  selectedPharmacyId,
  targetOptionType,
}: BuildBulkChangeParams) {
  const unavailableProductNames: string[] = [];

  const updatedItems = cartItems.map((item) => {
    const product = allProducts.find((candidate) => candidate.id === item.productId);
    const nextOption = findNextOption(
      product,
      selectedPharmacyId,
      targetOptionType,
      item.quantity
    );

    if (!nextOption) {
      const fallbackName =
        typeof product?.name === "string" && product.name.trim()
          ? product.name
          : item.productName;
      if (fallbackName) {
        unavailableProductNames.push(fallbackName);
      }
      return item;
    }

    const nextPrice = Number(nextOption.price);
    return {
      ...item,
      optionType: nextOption.optionType,
      price: Number.isFinite(nextPrice) ? nextPrice : item.price,
    };
  });

  return {
    updatedItems,
    unavailableProductNames,
  };
}
