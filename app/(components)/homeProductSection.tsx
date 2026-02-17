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
import axios from "axios";
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
import { CATEGORY_LABELS } from "@/lib/categories";
import {
  fetchJsonWithTimeout,
  FetchTimeoutError,
  runWithRetry,
} from "@/lib/client/fetch-utils";
import {
  mergeClientCartItems,
  parseClientCartItems,
  readClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";
import {
  clearCartReturnState,
  consumeCartReturnState,
  getCurrentPathWithSearchFromWindow,
  queueCartScrollRestore,
} from "@/lib/client/cart-navigation";
import {
  calculateCartTotalForPharmacy,
  filterHomeProducts,
  HOME_CACHE_TTL_MS,
  HOME_FETCH_RETRIES,
  HOME_FETCH_TIMEOUT_MS,
  HOME_STALE_CACHE_TTL_MS,
  type HomeDataResponse,
  readCachedHomeData,
} from "./homeProductSection.helpers";

interface HomeProductSectionProps {
  initialCategories?: any[];
  initialProducts?: any[];
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
  const [selectedPackage, setSelectedPackage] = useState<string>("전체");
  const deferredSelectedCategories = useDeferredValue(selectedCategories);
  const deferredSelectedPackage = useDeferredValue(selectedPackage);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isCartBarLoading, setIsCartBarLoading] = useState(false);
  const [roadAddress, setRoadAddress] = useState("");
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [pharmacyResolveToken, setPharmacyResolveToken] = useState(0);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>(() =>
    typeof window !== "undefined" ? readClientCartItems() : []
  );

  const [mounted, setMounted] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const filterInteractionStartedRef = useRef<number | null>(null);
  const missingAddressPromptedRef = useRef(false);
  const homeFetchSeqRef = useRef(0);
  useEffect(() => {
    setMounted(true);
  }, []);

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
          setError("Connection is slow. Showing cached products.");
          setIsRecovering(true);
          return;
        }

        if (error instanceof FetchTimeoutError) {
          setError("Loading products timed out. Please try again.");
        } else {
          setError("Failed to load products. Please retry.");
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

  const restoreScroll = useCallback((y: number) => {
    const el = document.documentElement;
    const prev = el.style.scrollBehavior;

    el.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
    el.style.scrollBehavior = prev;
  }, []);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("openCart") === "true"
    ) {
      const stored = sessionStorage.getItem("scrollPos");
      if (stored) scrollPositionRef.current = parseInt(stored, 10);
      setIsCartVisible(true);
      localStorage.removeItem("openCart");
    }
  }, []);

  const [isSymptomModalVisible, setIsSymptomModalVisible] = useState(false);

  const openProductDetail = (product: any) => {
    if (typeof window !== "undefined") {
      const y = window.scrollY;
      scrollPositionRef.current = y;
      sessionStorage.setItem("scrollPos", String(y));
    }
    setSelectedProduct(product);
  };

  const closeProductDetail = () => {
    const y = scrollPositionRef.current;

    setSelectedProduct(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("product");
      window.history.replaceState({}, "", url.toString());
      sessionStorage.removeItem("scrollPos");

      requestAnimationFrame(() => restoreScroll(y));
    }
  };

  const openCart = useCallback(() => {
    if (typeof window !== "undefined") {
      clearCartReturnState();
      const y = window.scrollY;
      scrollPositionRef.current = y;
      sessionStorage.setItem("scrollPos", String(y));
      localStorage.setItem("openCart", "true");
    }
    hideLoading();
    setIsCartVisible(true);
  }, [hideLoading]);

  const closeCart = useCallback(() => {
    const y = scrollPositionRef.current;
    setIsCartVisible(false);
    if (typeof window === "undefined") return;

    localStorage.removeItem("openCart");

    const currentPathWithSearch = getCurrentPathWithSearchFromWindow();
    const returnState = consumeCartReturnState();

    const url = new URL(window.location.href);
    url.searchParams.delete("cart");
    window.history.replaceState({}, "", url.toString());
    sessionStorage.removeItem("scrollPos");

    if (
      returnState &&
      returnState.pathWithSearch &&
      returnState.pathWithSearch !== currentPathWithSearch
    ) {
      queueCartScrollRestore(returnState.pathWithSearch, returnState.scrollY);
      router.replace(returnState.pathWithSearch, { scroll: false });
      return;
    }

    requestAnimationFrame(() => restoreScroll(y));
  }, [restoreScroll, router]);

  useEffect(() => {
    const handleOpen = () => openCart();
    window.addEventListener("openCart", handleOpen);
    return () => window.removeEventListener("openCart", handleOpen);
  }, [openCart]);

  useEffect(() => {
    const pkg = searchParams.get("package");
    if (pkg === "7") setSelectedPackage("7일 패키지");
    else if (pkg === "30") setSelectedPackage("30일 패키지");
    else if (pkg === "normal") setSelectedPackage("일반 상품");
  }, [searchParams]);

  const didHashScrollRef = useRef(false);
  useEffect(() => {
    if (didHashScrollRef.current) return;
    if (typeof window === "undefined") return;
    if (isLoading) return;
    if (window.location.hash !== "#home-products") return;

    didHashScrollRef.current = true;

    document.getElementById("home-products")?.scrollIntoView();

    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState({}, "", url.toString());

    hideLoading();
  }, [isLoading, hideLoading]);

  const toastShownRef = useRef(false);
  useEffect(() => {
    if (toastShownRef.current) return;
    const catsParam = searchParams.get("categories");
    const singleCat = searchParams.get("category");
    if (catsParam) {
      const ids = catsParam
        .split(",")
        .map((n) => parseInt(n, 10))
        .filter((n) => !isNaN(n));
      setSelectedCategories(ids);
      if (categories.length) {
        const names = categories
          .filter((cat: any) => ids.includes(cat.id))
          .map((cat: any) => cat.name);
        if (names.length)
          showToast(
            `검사 결과로 추천된 ${names.join(", ")} 카테고리의 상품들이에요.`
          );
        else showToast(`검사 결과로 추천된 카테고리의 상품들이에요.`);
        toastShownRef.current = true;
      }
    } else if (singleCat) {
      const id = parseInt(singleCat, 10);
      if (!isNaN(id)) setSelectedCategories([id]);
    }
  }, [searchParams, categories, showToast]);

  useEffect(() => {
    const prod = searchParams.get("product");
    if (prod && allProducts.length > 0) {
      const id = parseInt(prod, 10);
      const target = allProducts.find((p) => p.id === id);
      if (target) {
        const stored = sessionStorage.getItem("scrollPos");
        if (stored) scrollPositionRef.current = parseInt(stored, 10);
        setSelectedProduct(target);
      }
    }
  }, [searchParams, allProducts]);

  useEffect(() => {
    const cart = searchParams.get("cart");
    if (cart === "open") {
      hideLoading();
      const stored = sessionStorage.getItem("scrollPos");
      if (stored) scrollPositionRef.current = parseInt(stored, 10);
      localStorage.setItem("openCart", "true");
      setIsCartVisible(true);
      const url = new URL(window.location.toString());
      url.searchParams.delete("cart");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, hideLoading]);

  useEffect(() => {
    const timestampKey = "cartTimestamp";
    const now = Date.now();
    const storedTimestamp = localStorage.getItem(timestampKey);

    const restoring = localStorage.getItem("restoreCartFromBackup") === "1";
    const inCheckout = localStorage.getItem("checkoutInProgress") === "1";
    if (restoring || inCheckout) {
      localStorage.setItem(timestampKey, now.toString());
      return;
    }

    const STALE = 7 * 24 * 60 * 60 * 1000;
    if (!storedTimestamp || now - parseInt(storedTimestamp, 10) > STALE) {
      ["categories", "products", "cacheTimestamp"].forEach((k) =>
        localStorage.removeItem(k)
      );
    }
    localStorage.setItem(timestampKey, now.toString());
  }, []);

  useEffect(() => {
    const needRestore = localStorage.getItem("restoreCartFromBackup") === "1";
    const backup = localStorage.getItem("cartBackup");
    if (needRestore && backup && backup !== "[]") {
      try {
        const parsed = parseClientCartItems(JSON.parse(backup));
        if (parsed.length > 0) {
          setCartItems(parsed);
          writeClientCartItems(parsed);
          window.dispatchEvent(new Event("cartUpdated"));
        }
      } catch {}
    }
    localStorage.removeItem("restoreCartFromBackup");
    localStorage.removeItem("checkoutInProgress");
  }, []);

  useEffect(() => {
    const storedRoadAddress = localStorage.getItem("roadAddress") || "";
    setRoadAddress(storedRoadAddress.trim());
    if (initialCategories.length > 0 && initialProducts.length > 0) {
      const sortedCategories = sortByImportanceDesc(initialCategories);
      const sortedProducts = sortByImportanceDesc(initialProducts);
      const now = Date.now().toString();
      setCategories(sortedCategories);
      setAllProducts(sortedProducts);
      setProducts(sortedProducts);
      setIsLoading(false);
      setIsRecovering(false);
      localStorage.setItem("categories", JSON.stringify(sortedCategories));
      localStorage.setItem("products", JSON.stringify(sortedProducts));
      localStorage.setItem("cacheTimestamp", now);
      return;
    }
    void fetchData("initial");
  }, [fetchData, initialCategories, initialProducts]);

  useEffect(() => {
    const handleCleared = () => {
      setRoadAddress("");
      setPharmacies([]);
      setSelectedPharmacy(null);
      setPharmacyError(null);
      setCartItems([]);
      setIsCartVisible(false);
      setTotalPrice(0);
      localStorage.removeItem("cartItems");
      localStorage.removeItem("openCart");
      window.dispatchEvent(new Event("cartUpdated"));
    };
    window.addEventListener("addressCleared", handleCleared);
    return () => window.removeEventListener("addressCleared", handleCleared);
  }, [allProducts]);

  useEffect(() => {
    if (roadAddress.trim() || cartItems.length === 0) {
      missingAddressPromptedRef.current = false;
      return;
    }
    if (!isCartVisible) return;
    if (missingAddressPromptedRef.current) return;

    missingAddressPromptedRef.current = true;
    setIsAddressModalOpen(true);
  }, [cartItems.length, isCartVisible, roadAddress]);

  useEffect(() => {
    if (roadAddress) {
      localStorage.setItem("roadAddress", roadAddress);
    }
  }, [roadAddress]);

  useEffect(() => {
    if (isLoading) return;
    if (allProducts.length > 0 && !isRecovering) return;

    const timer = setTimeout(() => {
      void fetchData("recovery");
    }, 3500);
    return () => clearTimeout(timer);
  }, [allProducts.length, fetchData, isLoading, isRecovering]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      if (isLoading) return;
      if (allProducts.length > 0 && !isRecovering) return;
      void fetchData("recovery");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [allProducts.length, fetchData, isLoading, isRecovering]);

  useEffect(() => {
    if (!selectedPharmacy) {
      setTotalPrice(0);
      return;
    }
    const total = calculateCartTotalForPharmacy({
      cartItems,
      allProducts,
      selectedPharmacy,
    });
    setTotalPrice(total);
    setIsCartBarLoading(false);
  }, [cartItems, selectedPharmacy, allProducts]);

  useEffect(() => {
    if (selectedSymptoms.length === 0) return;
    const mappedCategoryNames = selectedSymptoms.reduce<string[]>(
      (acc, item) => {
        const cats = symptomCategoryPairs.reduce<string[]>((bucket, entry) => {
          if (entry.symptom !== item) return bucket;
          return [...bucket, ...entry.categories];
        }, []);
        return [...acc, ...cats];
      },
      []
    );
    const matchedCategories = categories.filter((cat: any) =>
      mappedCategoryNames.includes(cat.name)
    );
    setSelectedCategories(matchedCategories.map((cat: any) => cat.id));
  }, [selectedSymptoms, categories]);

  useEffect(() => {
    if (!selectedPharmacy) return;
    if (isLoading || allProducts.length === 0) return;

    const filteredCartItems = cartItems.filter((item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      if (!product) return false;
      const hasMatch = product.pharmacyProducts?.some(
        (pp: any) =>
          (pp.pharmacyId ?? pp.pharmacy?.id) === selectedPharmacy.id &&
          pp.optionType === item.optionType
      );
      return !!hasMatch;
    });

    if (filteredCartItems.length !== cartItems.length) {
      const normalized = writeClientCartItems(filteredCartItems);
      setCartItems(normalized);
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [selectedPharmacy, isLoading, allProducts.length, cartItems]);

  const [isPharmacyLoading, setIsPharmacyLoading] = useState(false);
  const retryPharmacyResolve = useCallback(() => {
    setPharmacyResolveToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) {
      setPharmacies([]);
      setSelectedPharmacy(null);
      setPharmacyError(null);
      setIsPharmacyLoading(false);
      return;
    }
    if (!roadAddress) {
      setPharmacies([]);
      setSelectedPharmacy(null);
      setPharmacyError(
        "주소를 설정해 주세요! 해당 상품을 주문할 수 있는 약국을 보여드릴게요."
      );
      setIsPharmacyLoading(false);
      return;
    }

    const controller = new AbortController();
    let alive = true;

    setIsPharmacyLoading(true);
    setPharmacyError(null);
    (async () => {
      try {
        const response = await axios.post(
          "/api/get-sorted-pharmacies",
          { cartItem: cartItems[0], roadAddress },
          { signal: controller.signal, timeout: 9000 }
        );
        const sortedPharmacies = response.data?.pharmacies || [];
        const filteredPharmacies = sortedPharmacies.filter(
          (pharmacy: any) => pharmacy.registrationNumber !== null
        );
        if (!alive) return;

        if (!filteredPharmacies.length) {
          alert(
            "선택하신 상품의 해당량만큼의 재고를 보유한 약국이 존재하지 않아요. 해당 상품을 장바구니에서 제외할게요."
          );
          setPharmacyError("No nearby pharmacy has stock for this item.");
          const updatedCartItems = writeClientCartItems(cartItems.slice(1));
          setCartItems(updatedCartItems);
          window.dispatchEvent(new Event("cartUpdated"));
          return;
        }

        setPharmacies(filteredPharmacies);
        if (
          !selectedPharmacy ||
          !filteredPharmacies.some((p: any) => p.id === selectedPharmacy.id)
        ) {
          setSelectedPharmacy(filteredPharmacies[0]);
        }
      } catch (e: any) {
        if (e?.name === "CanceledError") return;
        if (alive) {
          setPharmacyError("Failed to load nearby pharmacies. Retry.");
        }
        console.error("약국 정보를 가져오는 데 실패했습니다:", e);
      } finally {
        if (alive) setIsPharmacyLoading(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [roadAddress, cartItems, selectedPharmacy?.id, pharmacyResolveToken]);

  useEffect(() => {
    const filtered = filterHomeProducts({
      allProducts,
      selectedPharmacy,
      selectedPackage: deferredSelectedPackage,
      selectedCategoryIds: deferredSelectedCategories,
    });
    setProducts(filtered);
  }, [
    allProducts,
    deferredSelectedCategories,
    deferredSelectedPackage,
    selectedPharmacy,
  ]);

  useEffect(() => {
    if (totalPrice > 0 || isCartVisible) {
      hideFooter();
    } else {
      showFooter();
    }
  }, [totalPrice, isCartVisible, hideFooter, showFooter]);

  const handleAddToCart = (cartItem: any) => {
    setIsCartBarLoading(true);
    setCartItems((prev) => {
      const updated = mergeClientCartItems(prev, [cartItem]);
      writeClientCartItems(updated);
      window.dispatchEvent(new Event("cartUpdated"));
      return updated;
    });
  };

  const symptomCategoryPairs: Array<{ symptom: string; categories: string[] }> =
    [
      {
        symptom: "?쇰줈媛?",
        categories: [
          CATEGORY_LABELS.vitaminB,
          CATEGORY_LABELS.coenzymeQ10,
          CATEGORY_LABELS.iron,
        ],
      },
      {
        symptom: "??嫄닿컯",
        categories: [CATEGORY_LABELS.lutein, CATEGORY_LABELS.vitaminA],
      },
      {
        symptom: "?쇰? 嫄닿컯",
        categories: [
          CATEGORY_LABELS.collagen,
          CATEGORY_LABELS.vitaminC,
          CATEGORY_LABELS.zinc,
        ],
      },
      {
        symptom: "泥댁?諛?",
        categories: [CATEGORY_LABELS.garcinia, CATEGORY_LABELS.psyllium],
      },
      {
        symptom: "?덇? & ?덉븸?쒗솚",
        categories: [CATEGORY_LABELS.omega3, CATEGORY_LABELS.coenzymeQ10],
      },
      {
        symptom: "媛?嫄닿컯",
        categories: [CATEGORY_LABELS.milkThistle],
      },
      {
        symptom: "??嫄닿컯",
        categories: [CATEGORY_LABELS.probiotics, CATEGORY_LABELS.psyllium],
      },
      {
        symptom: "?ㅽ듃?덉뒪 & ?섎㈃",
        categories: [
          CATEGORY_LABELS.magnesium,
          CATEGORY_LABELS.phosphatidylserine,
        ],
      },
      {
        symptom: "硫댁뿭 湲곕뒫",
        categories: [
          CATEGORY_LABELS.vitaminD,
          CATEGORY_LABELS.zinc,
          CATEGORY_LABELS.vitaminC,
        ],
      },
      {
        symptom: "?덉쨷 肄쒕젅?ㅽ뀒濡?",
        categories: [CATEGORY_LABELS.omega3],
      },
    ];

  const handleSearchSelect = (selectedItems: string[]) => {
    setSelectedSymptoms(selectedItems);
    setIsSymptomModalVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("visited", "true");
    }
  };

  return (
    <div
      id="home-products"
      data-filter-updating={isFilterUpdating ? "true" : "false"}
      className={`w-full max-w-[640px] mx-auto mt-2 bg-white ${
        totalPrice > 0 ? "pb-20" : ""
      }`}
    >
      {mounted &&
        isSymptomModalVisible &&
        cartItems.length === 0 &&
        !isCartVisible && (
          <></>
          // <SymptomModal
          //   onSelect={handleSearchSelect}
          //   onClose={() => setIsSymptomModalVisible(false)}
          // />
        )}

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

      {cartItems.length > 0 && selectedPharmacy && (
        <div className="mx-2 sm:mx-0 bg-gray-100 px-3 py-2 mt-1.5 mb-4 rounded-md text-sm text-gray-700">
          Selected pharmacy near your address:{" "}
          <strong className="text-sky-500">
            {selectedPharmacy.distance?.toFixed(1)}km
          </strong>{" "}
          away,{" "}
          <strong className="text-sky-500">{selectedPharmacy.name}</strong>.
        </div>
      )}

      <ProductGrid
        isLoading={isLoading && allProducts.length === 0}
        isUpdating={isFilterUpdating}
        products={products}
        selectedPackage={deferredSelectedPackage}
        selectedPharmacy={selectedPharmacy}
        setSelectedProduct={openProductDetail}
      />

      {error && !isLoading && (
        <div className="min-h-[30vh] mb-12 flex flex-col items-center justify-center py-10">
          <p className="text-gray-500 text-sm mb-2">{error}</p>
          {isRecovering && (
            <p className="text-xs text-gray-400 mb-3">
              Auto-retrying in the background.
            </p>
          )}
          <button
            className="text-sky-500 text-sm"
            onClick={() => void fetchData("recovery")}
          >
            Retry
          </button>
        </div>
      )}

      {!error && allProducts.length === 0 && !isLoading && (
        <div className="min-h-[30vh] mb-12 flex flex-col items-center justify-center gap-6 py-10">
          <p className="text-sm text-gray-500">
            Products are taking longer than expected.
          </p>
          <button
            className="text-sky-500 text-sm"
            onClick={() => void fetchData("recovery")}
          >
            Retry now
          </button>
        </div>
      )}

      {selectedPharmacy &&
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
            selectedPackage === "전체"
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
        <div className="fixed inset-0 flex">
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
