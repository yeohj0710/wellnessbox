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
import ProductDetail from "@/components/product/productDetail";
import Cart from "@/components/order/cart";
import { sortByImportanceDesc } from "@/lib/utils";
import { useFooter } from "@/components/common/footerContext";
import { getLowestAverageOptionType } from "@/lib/utils";
import { useLoading } from "@/components/common/loadingContext.client";
import { useToast } from "@/components/common/toastContext.client";

import AddressSection from "@/app/(components)/addressSection";
import PharmacySelector from "@/app/(components)/pharmacySelector";
import CategoryFilter from "@/app/(components)/categoryFilter";
import PackageFilter from "@/app/(components)/packageFilter";
import ProductGrid from "@/app/(components)/productGrid";
import FooterCartBar from "@/app/(components)/footerCartBar";
import FooterCartBarLoading from "@/app/(components)/footerCartBarLoading";
import SymptomFilter from "@/app/(components)/symptomFilter";
import {
  fetchJsonWithTimeout,
  FetchTimeoutError,
  runWithRetry,
} from "@/lib/client/fetch-utils";
import {
  mergeClientCartItems,
  readClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";
import {
  HOME_CACHE_TTL_MS,
  HOME_FETCH_RETRIES,
  HOME_FETCH_TIMEOUT_MS,
  HOME_STALE_CACHE_TTL_MS,
  type HomeDataResponse,
  readCachedHomeData,
} from "./homeProductSection.helpers";
import {
  HomeProductsStatusState,
  SelectedPharmacyNotice,
} from "./homeProductSection.view";
import {
  HOME_PACKAGE_LABELS,
  HOME_PRODUCT_COPY,
} from "./homeProductSection.copy";
import { useHomeProductPharmacy } from "./useHomeProductPharmacy";
import {
  useHomeProductComputationEffects,
  useHomeProductLifecycleEffects,
  useHomeProductQuerySyncEffects,
  useHomeProductUiSyncEffects,
} from "./useHomeProductSectionEffects";
import { useHomeProductActions } from "./useHomeProductActions";

interface HomeProductSectionProps {
  initialCategories?: any[];
  initialProducts?: any[];
}

function toCartSignature(items: any[]) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((item) => {
      const productId = Number(item?.productId);
      const optionType =
        typeof item?.optionType === "string" ? item.optionType.trim() : "";
      const quantity = Number(item?.quantity);
      return `${Number.isFinite(productId) ? productId : 0}:${optionType}:${
        Number.isFinite(quantity) ? quantity : 0
      }`;
    })
    .sort()
    .join("|");
}

export default function HomeProductSection({
  initialCategories = [],
  initialProducts = [],
}: HomeProductSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hideFooter, showFooter } = useFooter();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [categories, setCategories] = useState<any[]>(() =>
    sortByImportanceDesc(initialCategories)
  );
  const [products, setProducts] = useState<any[]>(() =>
    sortByImportanceDesc(initialProducts)
  );
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<any[]>(() =>
    sortByImportanceDesc(initialProducts)
  );
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
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>(() =>
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
      toCartSignature(prev) === toCartSignature(next) ? prev : next
    );
  }, []);

  const [isRecovering, setIsRecovering] = useState(false);
  const filterInteractionStartedRef = useRef<number | null>(null);
  const homeFetchSeqRef = useRef(0);

  const applyHomeData = useCallback(
    (
      nextCategories: any[],
      nextProducts: any[],
      cacheTimestamp = Date.now()
    ) => {
      const sortedCategories = sortByImportanceDesc(nextCategories);
      const sortedProducts = sortByImportanceDesc(nextProducts);
      setCategories(sortedCategories);
      setAllProducts(sortedProducts);
      setProducts(sortedProducts);
      localStorage.setItem("categories", JSON.stringify(sortedCategories));
      localStorage.setItem("products", JSON.stringify(sortedProducts));
      localStorage.setItem("cacheTimestamp", cacheTimestamp.toString());
    },
    []
  );

  const fetchData = useCallback(
    async (reason: "initial" | "recovery" = "initial"): Promise<void> => {
      const requestSeq = ++homeFetchSeqRef.current;
      setIsLoading(true);
      setError(null);
      if (reason === "recovery") setIsRecovering(true);

      const freshCache =
        typeof window === "undefined"
          ? null
          : readCachedHomeData(HOME_CACHE_TTL_MS);
      if (reason === "initial" && freshCache) {
        if (requestSeq === homeFetchSeqRef.current) {
          applyHomeData(
            freshCache.categories,
            freshCache.products,
            freshCache.cacheTimestamp
          );
          setIsLoading(false);
          setIsRecovering(false);
        }
        return;
      }

      const staleCache =
        typeof window === "undefined"
          ? null
          : readCachedHomeData(HOME_STALE_CACHE_TTL_MS);

      try {
        const result = await runWithRetry(
          async () => {
            const { response, payload } =
              await fetchJsonWithTimeout<HomeDataResponse>(
                "/api/home-data",
                {
                  method: "GET",
                  headers: { Accept: "application/json" },
                  cache: "no-store",
                },
                { timeoutMs: HOME_FETCH_TIMEOUT_MS }
              );

            const fetchedCategories = Array.isArray(payload?.categories)
              ? payload.categories
              : [];
            const fetchedProducts = Array.isArray(payload?.products)
              ? payload.products
              : [];

            if (!response.ok) {
              throw new Error(`home-data status ${response.status}`);
            }
            if (fetchedProducts.length === 0) {
              throw new Error("home-data empty products");
            }

            return { fetchedCategories, fetchedProducts };
          },
          {
            retries: HOME_FETCH_RETRIES,
            baseDelayMs: 800,
            maxDelayMs: 5000,
            shouldRetry: (error) => {
              return !(
                error instanceof DOMException && error.name === "AbortError"
              );
            },
          }
        );

        if (requestSeq !== homeFetchSeqRef.current) return;
        applyHomeData(result.fetchedCategories, result.fetchedProducts);
        setIsRecovering(false);
      } catch (error) {
        if (requestSeq !== homeFetchSeqRef.current) return;
        console.error("Failed to load home data", error);

        if (staleCache) {
          applyHomeData(
            staleCache.categories,
            staleCache.products,
            staleCache.cacheTimestamp
          );
          setError(HOME_PRODUCT_COPY.connectionSlowUsingCache);
          setIsRecovering(true);
          return;
        }

        if (error instanceof FetchTimeoutError) {
          setError(HOME_PRODUCT_COPY.loadingTimeout);
        } else {
          setError(HOME_PRODUCT_COPY.loadFailed);
        }
      } finally {
        if (requestSeq === homeFetchSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [applyHomeData]
  );

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

  const handleAddToCart = (cartItem: any) => {
    setIsCartBarLoading(true);
    setCartItems((prev) => {
      const updated = mergeClientCartItems(prev, [cartItem]);
      writeClientCartItems(updated);
      window.dispatchEvent(new Event("cartUpdated"));
      return updated;
    });
  };
  return (
    <div
      id="home-products"
      data-filter-updating={isFilterUpdating ? "true" : "false"}
      className={`w-full max-w-[640px] mx-auto mt-2 bg-white ${
        totalPrice > 0 ? "pb-20" : ""
      }`}
    >
      <AddressSection
        roadAddress={roadAddress}
        setRoadAddress={setRoadAddress}
        isAddressModalOpen={isAddressModalOpen}
        setIsAddressModalOpen={setIsAddressModalOpen}
      />

      {cartItems.length > 0 && pharmacies.length > 0 && (
        <PharmacySelector
          pharmacies={pharmacies}
          selectedPharmacy={selectedPharmacy}
          setSelectedPharmacy={setSelectedPharmacy}
        />
      )}

      <SymptomFilter
        selectedSymptoms={selectedSymptoms}
        setSelectedSymptoms={setSelectedSymptoms}
      />

      <CategoryFilter
        categories={categories}
        isLoading={isLoading}
        selectedCategories={selectedCategories}
        onToggleCategory={handleCategoryToggle}
        onResetCategories={handleCategoryReset}
      />

      <PackageFilter
        selectedPackage={selectedPackage}
        setSelectedPackage={handlePackageSelect}
      />

      <SelectedPharmacyNotice
        visible={cartItems.length > 0 && !!selectedPharmacy}
        pharmacyName={selectedPharmacy?.name}
        distanceKm={
          typeof selectedPharmacy?.distance === "number"
            ? selectedPharmacy.distance
            : null
        }
      />

      <ProductGrid
        isLoading={isLoading && allProducts.length === 0}
        isUpdating={isFilterUpdating}
        products={products}
        selectedPackage={deferredSelectedPackage}
        selectedPharmacy={selectedPharmacy}
        setSelectedProduct={openProductDetail}
      />

      <HomeProductsStatusState
        error={error}
        isLoading={isLoading}
        isRecovering={isRecovering}
        hasProducts={allProducts.length > 0}
        onRetry={() => void fetchData("recovery")}
      />

      {selectedPharmacy &&
        !selectedProduct &&
        (totalPrice > 0 || isCartBarLoading) &&
        (isCartBarLoading ? (
          <FooterCartBarLoading />
        ) : (
          <FooterCartBar totalPrice={totalPrice} setIsCartVisible={openCart} />
        ))}

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          optionType={
            selectedPackage === HOME_PACKAGE_LABELS.all
              ? getLowestAverageOptionType({
                  product: selectedProduct,
                  pharmacy: selectedPharmacy,
                })
              : selectedPackage
          }
          pharmacy={selectedPharmacy}
          onClose={closeProductDetail}
          onAddToCart={(cartItem: any) => {
            handleAddToCart(cartItem);
          }}
          onAddressSaved={(addr: string) => {
            setRoadAddress((addr || "").trim());
          }}
        />
      )}

      {isCartVisible && (
        <div className="fixed inset-x-0 bottom-0 top-14 flex">
          <div
            className="bg-white w-full h-full overflow-y-auto"
            ref={cartContainerRef}
          >
            <Cart
              cartItems={cartItems}
              totalPrice={totalPrice}
              selectedPharmacy={selectedPharmacy}
              allProducts={allProducts}
              isPharmacyLoading={isPharmacyLoading}
              pharmacyError={pharmacyError}
              onRetryPharmacyResolve={retryPharmacyResolve}
              roadAddress={roadAddress}
              setRoadAddress={setRoadAddress}
              setSelectedPharmacy={setSelectedPharmacy}
              containerRef={cartContainerRef}
              onBack={closeCart}
              onUpdateCart={(updatedItems: any) => {
                const normalized = writeClientCartItems(updatedItems);
                setCartItems(normalized);
                const updatedTotalPrice = normalized.reduce(
                  (acc: number, item: any) =>
                    acc + (Number(item.price) || 0) * item.quantity,
                  0
                );
                setTotalPrice(updatedTotalPrice);
                window.dispatchEvent(new Event("cartUpdated"));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
