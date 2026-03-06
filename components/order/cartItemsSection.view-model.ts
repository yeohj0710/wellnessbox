import type {
  CartLineItem,
  CartPharmacyProduct,
  CartProduct,
} from "./cart.types";

export type ResolvedCartItemRow = {
  key: number;
  item: CartLineItem;
  product: CartProduct;
  pharmacyProduct: CartPharmacyProduct;
};

type BuildResolvedCartItemRowsParams = {
  cartItems: CartLineItem[];
  products: CartProduct[];
  selectedPharmacyId: number | null | undefined;
};

export function buildResolvedCartItemRows({
  cartItems,
  products,
  selectedPharmacyId,
}: BuildResolvedCartItemRowsParams): ResolvedCartItemRow[] {
  if (!Array.isArray(cartItems) || !Array.isArray(products)) return [];
  return cartItems
    .map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      const pharmacyProduct = product?.pharmacyProducts?.find(
        (candidate) =>
          candidate.optionType === item.optionType &&
          candidate.pharmacy?.id === selectedPharmacyId
      );
      return pharmacyProduct && product
        ? { key: pharmacyProduct.id, item, product, pharmacyProduct }
        : null;
    })
    .filter((row): row is ResolvedCartItemRow => row !== null);
}

type BuildCartItemsSectionViewStateParams = {
  cartItemsCount: number;
  selectedPharmacyId: number | null | undefined;
  isLoading: boolean;
  isResolvingProducts: boolean;
  isPharmacyLoading: boolean;
  resolvedItemsCount: number;
};

export type CartItemsSectionViewState = {
  hasCartItems: boolean;
  waitingForProducts: boolean;
  waitingForPharmacy: boolean;
  resolving: boolean;
  missingPharmacy: boolean;
  unresolvedItems: boolean;
};

export function buildCartItemsSectionViewState({
  cartItemsCount,
  selectedPharmacyId,
  isLoading,
  isResolvingProducts,
  isPharmacyLoading,
  resolvedItemsCount,
}: BuildCartItemsSectionViewStateParams): CartItemsSectionViewState {
  const hasCartItems = cartItemsCount > 0;
  const waitingForProducts = hasCartItems && isResolvingProducts;
  const waitingForPharmacy =
    hasCartItems && !selectedPharmacyId && isPharmacyLoading;
  const resolving = isLoading || waitingForProducts || waitingForPharmacy;
  const missingPharmacy =
    hasCartItems && !selectedPharmacyId && !isPharmacyLoading;
  const unresolvedItems =
    hasCartItems && !!selectedPharmacyId && !resolving && resolvedItemsCount === 0;

  return {
    hasCartItems,
    waitingForProducts,
    waitingForPharmacy,
    resolving,
    missingPharmacy,
    unresolvedItems,
  };
}

type BuildStockLimitAlertMessageParams = {
  pharmacyName?: string | null;
  productName: string;
  optionType: string;
};

export function buildStockLimitAlertMessage({
  pharmacyName,
  productName,
  optionType,
}: BuildStockLimitAlertMessageParams) {
  const resolvedPharmacyName = pharmacyName || "\uC120\uD0DD \uC57D\uAD6D";
  return `${resolvedPharmacyName}\uC5D0\uC11C \uB2F4\uC744 \uC218 \uC788\uB294 ${productName} (${optionType})\uC758 \uCD5C\uB300 \uAC1C\uC218\uC608\uC694.`;
}
