"use client";

import {
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFooter } from "@/components/common/footerContext";
import { useLoading } from "@/components/common/loadingContext.client";
import { useToast } from "@/components/common/toastContext.client";
import { useLandingPersonalization } from "@/components/common/useLandingPersonalization";
import { useOfferIntelligence } from "@/components/common/useOfferIntelligence";
import {
  buildClientCartSignature,
  mergeClientCartItems,
  readClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";
import { rankProductsForLandingPersonalization } from "@/lib/landing-personalization/engine";
import {
  resolveHomeOfferCard,
  type OfferAction,
} from "@/lib/offer-intelligence/engine";
import {
  calculateCartTotalForPharmacy,
} from "./homeProductSection.helpers";
import {
  HOME_PACKAGE_LABELS,
} from "./homeProductSection.copy";
import { useHomeProductFilters } from "./useHomeProductFilters";
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

  const { hideLoading } = useLoading();
  const { showToast } = useToast();
  const { focus } = useLandingPersonalization(categories);
  const offerIntelligence = useOfferIntelligence(categories.length > 0);
  const {
    selectedSymptoms,
    setSelectedSymptoms,
    selectedCategories,
    setSelectedCategories,
    selectedPackage,
    setSelectedPackage,
    deferredSelectedCategories,
    deferredSelectedPackage,
    isFilterUpdating,
    handleCategoryToggle,
    handleCategoryReset,
    handlePackageSelect,
    handleApplyRecommendedCategories,
    handleApplyRecommendedTrial,
    handleApplyRecommendedMonth,
  } = useHomeProductFilters(isLoading);

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

  const displayProducts = useMemo(() => {
    if (selectedCategories.length > 0) return products;
    if (selectedPackage !== HOME_PACKAGE_LABELS.all) return products;
    return rankProductsForLandingPersonalization(
      products,
      focus,
      selectedPharmacy?.id
    );
  }, [focus, products, selectedCategories.length, selectedPackage, selectedPharmacy?.id]);

  const homeOffer = useMemo(
    () =>
      selectedCategories.length === 0 &&
      selectedPackage === HOME_PACKAGE_LABELS.all &&
      !offerIntelligence.loading
        ? resolveHomeOfferCard({
            summary: offerIntelligence.summary,
            remoteResults: offerIntelligence.remoteResults,
            categories,
          })
        : null,
    [
      categories,
      offerIntelligence.loading,
      offerIntelligence.remoteResults,
      offerIntelligence.summary,
      selectedCategories.length,
      selectedPackage,
    ]
  );

  const handleHomeOfferAction = useCallback(
    (action: OfferAction) => {
      if (action.type !== "apply_package") return;

      if (action.packageTarget === "7") {
        handleApplyRecommendedTrial(action.categoryIds);
        return;
      }

      if (action.packageTarget === "30") {
        handleApplyRecommendedMonth(action.categoryIds);
        return;
      }

      handleApplyRecommendedCategories(action.categoryIds);
    },
    [
      handleApplyRecommendedCategories,
      handleApplyRecommendedMonth,
      handleApplyRecommendedTrial,
    ]
  );

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
      onApplyRecommendedCategories={handleApplyRecommendedCategories}
      onApplyRecommendedTrial={handleApplyRecommendedTrial}
      homeOffer={homeOffer}
      onHomeOfferAction={handleHomeOfferAction}
      deferredSelectedPackage={deferredSelectedPackage}
      onSelectPackage={handlePackageSelect}
      isFilterUpdating={isFilterUpdating}
      products={displayProducts}
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
