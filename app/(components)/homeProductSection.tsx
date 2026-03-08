"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useDeferredValue,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFooter } from "@/components/common/footerContext";
import { useLoading } from "@/components/common/loadingContext.client";
import { useToast } from "@/components/common/toastContext.client";
import {
  buildClientCartSignature,
  mergeClientCartItems,
  readClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";
import {
  calculateCartTotalForPharmacy,
} from "./homeProductSection.helpers";
import {
  HOME_PACKAGE_LABELS,
} from "./homeProductSection.copy";
import { useHomeProductPharmacy } from "./useHomeProductPharmacy";
import {
  useHomeProductComputationEffects,
  useHomeProductLifecycleEffects,
  useHomeProductQuerySyncEffects,
  useHomeProductUiSyncEffects,
} from "./useHomeProductSectionEffects";
import { useHomeProductActions } from "./useHomeProductActions";
import { useHomeProductSectionData } from "./useHomeProductSectionData";
import { HomeProductSectionContent } from "./homeProductSection.content";
import type {
  HomeCartItem,
  HomeCategory,
  HomePharmacy,
  HomeProduct,
} from "./homeProductSection.types";

interface HomeProductSectionProps {
  initialCategories?: HomeCategory[];
  initialProducts?: HomeProduct[];
}

export default function HomeProductSection({
  initialCategories = [],
  initialProducts = [],
}: HomeProductSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hideFooter, showFooter } = useFooter();
  const {
    categories,
    setCategories,
    products,
    setProducts,
    allProducts,
    setAllProducts,
    isLoading,
    setIsLoading,
    error,
    isRecovering,
    setIsRecovering,
    fetchData,
  } = useHomeProductSectionData({
    initialCategories,
    initialProducts,
  });
  const [selectedProduct, setSelectedProduct] = useState<HomeProduct | null>(
    null
  );
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>(
    HOME_PACKAGE_LABELS.all
  );
  const deferredSelectedCategories = useDeferredValue(selectedCategories);
  const deferredSelectedPackage = useDeferredValue(selectedPackage);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isCartBarLoading, setIsCartBarLoading] = useState(false);
  const [roadAddress, setRoadAddress] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState<HomePharmacy | null>(
    null
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState<HomeCartItem[]>(() =>
    typeof window !== "undefined" ? readClientCartItems() : []
  );
  const {
    pharmacies,
    pharmacyError,
    isPharmacyLoading,
    retryPharmacyResolve,
    resetPharmacyState,
  } = useHomeProductPharmacy({
    cartItems,
    roadAddress,
    selectedPharmacy,
    setSelectedPharmacy,
    setCartItems,
  });
  const syncCartItemsFromStorage = useCallback(() => {
    const next = readClientCartItems();
    setCartItems((prev) =>
      buildClientCartSignature(prev) === buildClientCartSignature(next)
        ? prev
        : next
    );
  }, []);
  const filterInteractionStartedRef = useRef<number | null>(null);

  const { hideLoading } = useLoading();
  const { showToast } = useToast();

  const scrollPositionRef = useRef(0);
  const cartContainerRef = useRef<HTMLDivElement>(null);
  const { openProductDetail, closeProductDetail, openCart, closeCart } =
    useHomeProductActions({
      hideLoading,
      syncCartItemsFromStorage,
      scrollPositionRef,
      setSelectedProduct,
      setIsCartVisible,
      replaceRoute: (pathWithSearch) =>
        router.replace(pathWithSearch, { scroll: false }),
    });
  const isFilterUpdating = useMemo(() => {
    if (isLoading) return true;
    if (deferredSelectedPackage !== selectedPackage) return true;
    if (deferredSelectedCategories.length !== selectedCategories.length) {
      return true;
    }
    return deferredSelectedCategories.some(
      (categoryId, index) => categoryId !== selectedCategories[index]
    );
  }, [
    deferredSelectedCategories,
    deferredSelectedPackage,
    isLoading,
    selectedCategories,
    selectedPackage,
  ]);

  const handleCategoryToggle = useCallback((categoryId: number) => {
    filterInteractionStartedRef.current = performance.now();
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id: number) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleCategoryReset = useCallback(() => {
    filterInteractionStartedRef.current = performance.now();
    setSelectedCategories([]);
  }, []);

  const handlePackageSelect = useCallback((pkg: string) => {
    filterInteractionStartedRef.current = performance.now();
    setSelectedPackage(pkg);
  }, []);
  useEffect(() => {
    if (isFilterUpdating) return;
    if (filterInteractionStartedRef.current === null) return;
    const elapsedMs = performance.now() - filterInteractionStartedRef.current;
    console.info(`[perf] home:filter-visible ${elapsedMs.toFixed(1)}ms`);
    filterInteractionStartedRef.current = null;
  }, [isFilterUpdating]);

  useHomeProductUiSyncEffects({
    syncCartItemsFromStorage,
    setIsCartBarLoading,
    setIsCartVisible,
    scrollPositionRef,
    showToast,
    isLoading,
    hideLoading,
    openCart,
    totalPrice,
    isCartVisible,
    hideFooter,
    showFooter,
  });

  useHomeProductQuerySyncEffects({
    searchParams,
    setSelectedPackage,
    categories,
    showToast,
    setSelectedCategories,
    allProducts,
    setSelectedProduct,
    hideLoading,
    scrollPositionRef,
    syncCartItemsFromStorage,
    setIsCartVisible,
  });

  useHomeProductLifecycleEffects({
    initialCategories,
    initialProducts,
    setRoadAddress,
    setCategories,
    setAllProducts,
    setProducts,
    setIsLoading,
    setIsRecovering,
    fetchData,
    resetPharmacyState,
    setCartItems,
    setIsCartVisible,
    setTotalPrice,
    roadAddress,
    cartItemsLength: cartItems.length,
    isCartVisible,
    setIsAddressModalOpen,
    isLoading,
    allProductsLength: allProducts.length,
    isRecovering,
  });

  useHomeProductComputationEffects({
    selectedPharmacy,
    cartItems,
    allProducts,
    setTotalPrice,
    setIsCartBarLoading,
    selectedSymptoms,
    categories,
    setSelectedCategories,
    isLoading,
    setCartItems,
    deferredSelectedPackage,
    deferredSelectedCategories,
    setProducts,
  });

  const persistCartItems = useCallback((nextItems: HomeCartItem[]) => {
    const normalized = writeClientCartItems(nextItems);
    window.dispatchEvent(new Event("cartUpdated"));
    return normalized;
  }, []);

  const handleAddToCart = (cartItem: HomeCartItem) => {
    setIsCartBarLoading(true);
    setCartItems((prev) => {
      const updated = mergeClientCartItems(prev, [cartItem]);
      return persistCartItems(updated);
    });
  };
  return (
    <HomeProductSectionContent
      roadAddress={roadAddress}
      setRoadAddress={setRoadAddress}
      isAddressModalOpen={isAddressModalOpen}
      setIsAddressModalOpen={setIsAddressModalOpen}
      cartItems={cartItems}
      pharmacies={pharmacies}
      selectedPharmacy={selectedPharmacy}
      setSelectedPharmacy={setSelectedPharmacy}
      selectedSymptoms={selectedSymptoms}
      setSelectedSymptoms={setSelectedSymptoms}
      categories={categories}
      isLoading={isLoading}
      selectedCategories={selectedCategories}
      onToggleCategory={handleCategoryToggle}
      onResetCategories={handleCategoryReset}
      selectedPackage={selectedPackage}
      deferredSelectedPackage={deferredSelectedPackage}
      onSelectPackage={handlePackageSelect}
      isFilterUpdating={isFilterUpdating}
      products={products}
      allProducts={allProducts}
      error={error}
      isRecovering={isRecovering}
      onRetryLoad={() => void fetchData("recovery")}
      totalPrice={totalPrice}
      isCartBarLoading={isCartBarLoading}
      onOpenCart={openCart}
      selectedProduct={selectedProduct}
      onOpenProductDetail={openProductDetail}
      onCloseProductDetail={closeProductDetail}
      onAddToCart={handleAddToCart}
      isCartVisible={isCartVisible}
      cartContainerRef={cartContainerRef}
      isPharmacyLoading={isPharmacyLoading}
      pharmacyError={pharmacyError}
      onRetryPharmacyResolve={retryPharmacyResolve}
      onCloseCart={closeCart}
      onCartUpdate={(updatedItems: HomeCartItem[]) => {
        const normalized = persistCartItems(updatedItems);
        setCartItems(normalized);
        const updatedTotalPrice = calculateCartTotalForPharmacy({
          cartItems: normalized,
          allProducts,
          selectedPharmacy,
        });
        setTotalPrice(updatedTotalPrice);
      }}
    />
  );
}
