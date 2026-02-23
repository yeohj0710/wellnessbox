"use client";

import {
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { sortByImportanceDesc } from "@/lib/utils";
import {
  useChatPageActionListener,
} from "@/lib/chat/useChatPageActionListener";
import {
  parseClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";
import {
  buildCategoryRecommendationToast,
  calculateCartTotalForPharmacy,
  filterCartItemsByPharmacyStock,
  filterHomeProducts,
  HOME_SYMPTOM_CATEGORY_PAIRS,
  resolveCategoryIdsFromSymptoms,
} from "./homeProductSection.helpers";
import {
  HOME_PRODUCT_COPY,
  resolvePackageFromQueryParam,
} from "./homeProductSection.copy";

type SearchParamReader = {
  get: (key: string) => string | null;
};

type HomeDataReason = "initial" | "recovery";

type FetchHomeData = (reason?: HomeDataReason) => Promise<void>;

type SetAnyArray = Dispatch<SetStateAction<any[]>>;

type SetBoolean = Dispatch<SetStateAction<boolean>>;

type SetString = Dispatch<SetStateAction<string>>;

type SetNullableAny = Dispatch<SetStateAction<any>>;

export function useHomeProductUiSyncEffects(input: {
  syncCartItemsFromStorage: () => void;
  setIsCartBarLoading: SetBoolean;
  setIsCartVisible: SetBoolean;
  scrollPositionRef: MutableRefObject<number>;
  showToast: (message: string) => void;
  isLoading: boolean;
  hideLoading: () => void;
  openCart: () => void;
  totalPrice: number;
  isCartVisible: boolean;
  hideFooter: () => void;
  showFooter: () => void;
}) {
  const {
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
  } = input;
  const didHashScrollRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      syncCartItemsFromStorage();
      setIsCartBarLoading(false);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "cartItems") return;
      sync();
    };

    sync();
    window.addEventListener("cartUpdated", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cartUpdated", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [setIsCartBarLoading, syncCartItemsFromStorage]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("openCart") === "true"
    ) {
      const stored = sessionStorage.getItem("scrollPos");
      if (stored) scrollPositionRef.current = parseInt(stored, 10);
      syncCartItemsFromStorage();
      setIsCartVisible(true);
      localStorage.removeItem("openCart");
    }
  }, [scrollPositionRef, setIsCartVisible, syncCartItemsFromStorage]);

  useChatPageActionListener((detail) => {
    if (detail.action !== "focus_home_products") return;

    const target = document.getElementById("home-products");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(HOME_PRODUCT_COPY.movedToProductSection);
  });

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
  }, [hideLoading, isLoading]);

  useEffect(() => {
    const handleOpen = () => openCart();
    window.addEventListener("openCart", handleOpen);
    return () => window.removeEventListener("openCart", handleOpen);
  }, [openCart]);

  useEffect(() => {
    if (totalPrice > 0 || isCartVisible) {
      hideFooter();
    } else {
      showFooter();
    }
  }, [hideFooter, isCartVisible, showFooter, totalPrice]);
}

export function useHomeProductQuerySyncEffects(input: {
  searchParams: SearchParamReader;
  setSelectedPackage: SetString;
  categories: any[];
  showToast: (message: string) => void;
  setSelectedCategories: Dispatch<SetStateAction<number[]>>;
  allProducts: any[];
  setSelectedProduct: SetNullableAny;
  hideLoading: () => void;
  scrollPositionRef: MutableRefObject<number>;
  syncCartItemsFromStorage: () => void;
  setIsCartVisible: SetBoolean;
}) {
  const {
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
  } = input;
  const toastShownRef = useRef(false);

  useEffect(() => {
    const resolvedPackage = resolvePackageFromQueryParam(searchParams.get("package"));
    if (resolvedPackage) {
      setSelectedPackage(resolvedPackage);
    }
  }, [searchParams, setSelectedPackage]);

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
        showToast(
          buildCategoryRecommendationToast({
            categoryIds: ids,
            categories,
          })
        );
        toastShownRef.current = true;
      }
    } else if (singleCat) {
      const id = parseInt(singleCat, 10);
      if (!isNaN(id)) setSelectedCategories([id]);
    }
  }, [categories, searchParams, setSelectedCategories, showToast]);

  useEffect(() => {
    const productQuery = searchParams.get("product");
    if (productQuery && allProducts.length > 0) {
      const id = parseInt(productQuery, 10);
      const target = allProducts.find((product) => product.id === id);
      if (target) {
        const stored = sessionStorage.getItem("scrollPos");
        if (stored) scrollPositionRef.current = parseInt(stored, 10);
        setSelectedProduct(target);
      }
    }
  }, [allProducts, scrollPositionRef, searchParams, setSelectedProduct]);

  useEffect(() => {
    const cart = searchParams.get("cart");
    if (cart === "open") {
      hideLoading();
      const stored = sessionStorage.getItem("scrollPos");
      if (stored) scrollPositionRef.current = parseInt(stored, 10);
      localStorage.setItem("openCart", "true");
      syncCartItemsFromStorage();
      setIsCartVisible(true);
      const url = new URL(window.location.toString());
      url.searchParams.delete("cart");
      window.history.replaceState({}, "", url.toString());
    }
  }, [
    hideLoading,
    scrollPositionRef,
    searchParams,
    setIsCartVisible,
    syncCartItemsFromStorage,
  ]);
}

export function useHomeProductLifecycleEffects(input: {
  initialCategories: any[];
  initialProducts: any[];
  setRoadAddress: SetString;
  setCategories: SetAnyArray;
  setAllProducts: SetAnyArray;
  setProducts: SetAnyArray;
  setIsLoading: SetBoolean;
  setIsRecovering: SetBoolean;
  fetchData: FetchHomeData;
  resetPharmacyState: () => void;
  setCartItems: SetAnyArray;
  setIsCartVisible: SetBoolean;
  setTotalPrice: Dispatch<SetStateAction<number>>;
  roadAddress: string;
  cartItemsLength: number;
  isCartVisible: boolean;
  setIsAddressModalOpen: SetBoolean;
  isLoading: boolean;
  allProductsLength: number;
  isRecovering: boolean;
}) {
  const {
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
    cartItemsLength,
    isCartVisible,
    setIsAddressModalOpen,
    isLoading,
    allProductsLength,
    isRecovering,
  } = input;
  const missingAddressPromptedRef = useRef(false);

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

    const staleMs = 7 * 24 * 60 * 60 * 1000;
    if (!storedTimestamp || now - parseInt(storedTimestamp, 10) > staleMs) {
      ["categories", "products", "cacheTimestamp"].forEach((key) =>
        localStorage.removeItem(key)
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
  }, [setCartItems]);

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
  }, [
    fetchData,
    initialCategories,
    initialProducts,
    setAllProducts,
    setCategories,
    setIsLoading,
    setIsRecovering,
    setProducts,
    setRoadAddress,
  ]);

  useEffect(() => {
    const handleCleared = () => {
      setRoadAddress("");
      resetPharmacyState();
      setCartItems([]);
      setIsCartVisible(false);
      setTotalPrice(0);
      localStorage.removeItem("cartItems");
      localStorage.removeItem("openCart");
      window.dispatchEvent(new Event("cartUpdated"));
    };
    window.addEventListener("addressCleared", handleCleared);
    return () => window.removeEventListener("addressCleared", handleCleared);
  }, [
    resetPharmacyState,
    setCartItems,
    setIsCartVisible,
    setRoadAddress,
    setTotalPrice,
  ]);

  useEffect(() => {
    if (roadAddress.trim() || cartItemsLength === 0) {
      missingAddressPromptedRef.current = false;
      return;
    }
    if (!isCartVisible) return;
    if (missingAddressPromptedRef.current) return;

    missingAddressPromptedRef.current = true;
    setIsAddressModalOpen(true);
  }, [cartItemsLength, isCartVisible, roadAddress, setIsAddressModalOpen]);

  useEffect(() => {
    if (roadAddress) {
      localStorage.setItem("roadAddress", roadAddress);
    }
  }, [roadAddress]);

  useEffect(() => {
    if (isLoading) return;
    if (allProductsLength > 0 && !isRecovering) return;

    const timer = setTimeout(() => {
      void fetchData("recovery");
    }, 3500);
    return () => clearTimeout(timer);
  }, [allProductsLength, fetchData, isLoading, isRecovering]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      if (isLoading) return;
      if (allProductsLength > 0 && !isRecovering) return;
      void fetchData("recovery");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [allProductsLength, fetchData, isLoading, isRecovering]);
}

export function useHomeProductComputationEffects(input: {
  selectedPharmacy: any;
  cartItems: any[];
  allProducts: any[];
  setTotalPrice: Dispatch<SetStateAction<number>>;
  setIsCartBarLoading: SetBoolean;
  selectedSymptoms: string[];
  categories: any[];
  setSelectedCategories: Dispatch<SetStateAction<number[]>>;
  isLoading: boolean;
  setCartItems: SetAnyArray;
  deferredSelectedPackage: string;
  deferredSelectedCategories: number[];
  setProducts: SetAnyArray;
}) {
  const {
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
  } = input;

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
  }, [allProducts, cartItems, selectedPharmacy, setIsCartBarLoading, setTotalPrice]);

  useEffect(() => {
    const resolvedCategoryIds = resolveCategoryIdsFromSymptoms({
      selectedSymptoms,
      categories,
      symptomCategoryPairs: HOME_SYMPTOM_CATEGORY_PAIRS,
    });
    if (resolvedCategoryIds.length === 0) return;
    setSelectedCategories(resolvedCategoryIds);
  }, [categories, selectedSymptoms, setSelectedCategories]);

  useEffect(() => {
    if (!selectedPharmacy) return;
    if (isLoading || allProducts.length === 0) return;

    const filteredCartItems = filterCartItemsByPharmacyStock({
      cartItems,
      allProducts,
      selectedPharmacy,
    });

    if (filteredCartItems.length !== cartItems.length) {
      const normalized = writeClientCartItems(filteredCartItems);
      setCartItems(normalized);
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [
    allProducts,
    cartItems,
    isLoading,
    selectedPharmacy,
    setCartItems,
  ]);

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
    setProducts,
  ]);
}
