"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useDeferredValue,
  useMemo,
} from "react";
import { useSearchParams } from "next/navigation";
import ProductDetail from "@/components/product/productDetail";
import Cart from "@/components/order/cart";
import { getProducts } from "@/lib/product";
import { sortByImportanceDesc } from "@/lib/utils";
import { useFooter } from "@/components/common/footerContext";
import axios from "axios";
import { getCategories } from "@/lib/product";
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

interface HomeProductSectionProps {
  initialCategories?: any[];
  initialProducts?: any[];
}

export default function HomeProductSection({
  initialCategories = [],
  initialProducts = [],
}: HomeProductSectionProps) {
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
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const storedCart = localStorage.getItem("cartItems");
      return storedCart ? JSON.parse(storedCart) : [];
    }
    return [];
  });

  const [mounted, setMounted] = useState(false);
  const filterInteractionStartedRef = useRef<number | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { hideLoading } = useLoading();
  const { showToast } = useToast();

  const scrollPositionRef = useRef(0);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReloadedRef = useRef(false);
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

  useEffect(() => {
    if (isCartVisible) return;
    if (isLoading && allProducts.length === 0) {
      reloadTimeoutRef.current = setTimeout(() => {
        if (!hasReloadedRef.current && typeof window !== "undefined") {
          hasReloadedRef.current = true;
          window.location.reload();
        }
      }, 10000);
    } else if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }
    return () => {
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    };
  }, [isLoading, allProducts.length, isCartVisible]);

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
      const y = window.scrollY;
      scrollPositionRef.current = y;
      sessionStorage.setItem("scrollPos", String(y));
      localStorage.setItem("openCart", "true");
    }
    hideLoading();
    setIsCartVisible(true);
  }, [hideLoading]);

  const closeCart = () => {
    const y = scrollPositionRef.current;

    setIsCartVisible(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("openCart");

      const url = new URL(window.location.href);
      url.searchParams.delete("cart");
      window.history.replaceState({}, "", url.toString());
      sessionStorage.removeItem("scrollPos");

      requestAnimationFrame(() => restoreScroll(y));
    }
  };

  useEffect(() => {
    const handleOpen = () => openCart();
    window.addEventListener("openCart", handleOpen);
    return () => window.removeEventListener("openCart", handleOpen);
  }, [openCart]);

  const MAX_RETRIES = 5;

  const fetchData = useCallback(async (attempt = 0): Promise<void> => {
    if (attempt === 0) setError(null);
    setIsLoading(true);

    const cachedCategories = localStorage.getItem("categories");
    const cachedProducts = localStorage.getItem("products");
    const cacheTimestamp = localStorage.getItem("cacheTimestamp");
    const now = Date.now();

    if (
      cachedCategories &&
      cachedProducts &&
      cacheTimestamp &&
      now - parseInt(cacheTimestamp, 10) < 60 * 1000
    ) {
      setCategories(sortByImportanceDesc(JSON.parse(cachedCategories)));
      const sortedProducts = sortByImportanceDesc(JSON.parse(cachedProducts));
      setAllProducts(sortedProducts);
      setProducts(sortedProducts);
      setIsLoading(false);
      return;
    }

    try {
      const [fetchedCategories, fetchedProducts] = await Promise.all([
        getCategories(),
        getProducts(),
      ]);

      if (!fetchedProducts.length) {
        throw new Error("no products");
      }

      const sortedCategories = sortByImportanceDesc(fetchedCategories);
      const sortedProducts = sortByImportanceDesc(fetchedProducts);

      setCategories(sortedCategories);
      setAllProducts(sortedProducts);
      setProducts(sortedProducts);

      localStorage.setItem("categories", JSON.stringify(sortedCategories));
      localStorage.setItem("products", JSON.stringify(sortedProducts));
      localStorage.setItem("cacheTimestamp", now.toString());

      setIsLoading(false);
    } catch (error) {
      console.error("데이터를 가져오는 데 실패하였습니다:", error);
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        setTimeout(() => fetchData(attempt + 1), delay);
      } else {
        setError(
          "상품을 불러오는 데 실패했습니다. 새로고침 후 다시 시도해 주세요."
        );
        setIsLoading(false);
      }
    }
  }, []);

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
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCartItems(parsed);
          localStorage.setItem("cartItems", backup);
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
      localStorage.setItem("categories", JSON.stringify(sortedCategories));
      localStorage.setItem("products", JSON.stringify(sortedProducts));
      localStorage.setItem("cacheTimestamp", now);
      return;
    }
    fetchData();
  }, [fetchData, initialCategories, initialProducts]);

  useEffect(() => {
    const handleCleared = () => {
      setRoadAddress("");
      setPharmacies([]);
      setSelectedPharmacy(null);
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
    if (roadAddress) {
      localStorage.setItem("roadAddress", roadAddress);
    }
  }, [roadAddress]);

  useEffect(() => {
    if (!isLoading && !error && allProducts.length === 0) {
      const timer = setTimeout(() => fetchData(), 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, error, allProducts.length, fetchData]);

  useEffect(() => {
    if (!selectedPharmacy) {
      setTotalPrice(0);
      return;
    }
    const total = cartItems.reduce((acc, item) => {
      const matchingProduct = allProducts.find(
        (product) => product.id === item.productId
      );
      const matchingPharmacyProduct = matchingProduct?.pharmacyProducts.find(
        (pharmacyProduct: any) =>
          pharmacyProduct.pharmacy.id === selectedPharmacy.id &&
          pharmacyProduct.optionType === item.optionType
      );
      if (matchingPharmacyProduct) {
        return acc + matchingPharmacyProduct.price * item.quantity;
      }
      return acc;
    }, 0);
    setTotalPrice(total);
    setIsCartBarLoading(false);
  }, [cartItems, selectedPharmacy, allProducts]);

  useEffect(() => {
    if (selectedSymptoms.length === 0) return;
    const mappedCategoryNames = selectedSymptoms.reduce<string[]>(
      (acc, item) => {
        const cats = searchCategoryMapping[item] || [];
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
      if (!product) return true;
      const hasMatch = product.pharmacyProducts?.some(
        (pp: any) =>
          (pp.pharmacyId ?? pp.pharmacy?.id) === selectedPharmacy.id &&
          pp.optionType === item.optionType
      );
      return !!hasMatch;
    });

    if (filteredCartItems.length !== cartItems.length) {
      setCartItems(filteredCartItems);
      localStorage.setItem("cartItems", JSON.stringify(filteredCartItems));
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [selectedPharmacy, isLoading, allProducts.length, cartItems]);

  const [isPharmacyLoading, setIsPharmacyLoading] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0) {
      setPharmacies([]);
      setSelectedPharmacy(null);
      return;
    }
    if (!roadAddress) return;

    const controller = new AbortController();
    let alive = true;

    setIsPharmacyLoading(true);
    (async () => {
      try {
        const response = await axios.post(
          "/api/get-sorted-pharmacies",
          { cartItem: cartItems[0], roadAddress },
          { signal: controller.signal }
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
          const updatedCartItems = cartItems.slice(1);
          setCartItems(updatedCartItems);
          localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
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
        console.error("약국 정보를 가져오는 데 실패했습니다:", e);
      } finally {
        if (alive) setIsPharmacyLoading(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [roadAddress, cartItems, selectedPharmacy?.id, allProducts]);

  useEffect(() => {
    let filtered = [...allProducts];
    if (selectedPharmacy && deferredSelectedPackage !== "전체") {
      filtered = filtered.filter((product) =>
        product.pharmacyProducts.some(
          (pharmacyProduct: any) =>
            pharmacyProduct.pharmacy.id === selectedPharmacy.id &&
            pharmacyProduct.optionType === deferredSelectedPackage
        )
      );
    }
    if (selectedPharmacy) {
      filtered = filtered.filter((product) =>
        product.pharmacyProducts.some(
          (pharmacyProduct: any) =>
            pharmacyProduct.pharmacy.id === selectedPharmacy.id
        )
      );
    }
    if (deferredSelectedCategories.length > 0) {
      filtered = filtered.filter((product) =>
        product.categories.some((category: any) =>
          deferredSelectedCategories.includes(category.id)
        )
      );
    }
    if (deferredSelectedPackage === "7일 패키지") {
      filtered = filtered.filter((product: any) =>
        product.pharmacyProducts.some((pharmacyProduct: any) =>
          pharmacyProduct.optionType?.includes("7일")
        )
      );
    } else if (deferredSelectedPackage === "30일 패키지") {
      filtered = filtered.filter((product: any) =>
        product.pharmacyProducts.some((pharmacyProduct: any) =>
          pharmacyProduct.optionType?.includes("30일")
        )
      );
    } else if (deferredSelectedPackage === "일반 상품") {
      filtered = filtered.filter((product: any) =>
        product.pharmacyProducts.some(
          (pharmacyProduct: any) => pharmacyProduct.optionType === "일반 상품"
        )
      );
    }
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
      const existingItem = prev.find(
        (item) =>
          item.productId === cartItem.productId &&
          item.optionType === cartItem.optionType
      );
      let updated;
      if (existingItem) {
        updated = prev.map((item) =>
          item.productId === cartItem.productId
            ? { ...item, quantity: item.quantity + cartItem.quantity }
            : item
        );
      } else {
        updated = [...prev, cartItem];
      }
      localStorage.setItem("cartItems", JSON.stringify(updated));
      window.dispatchEvent(new Event("cartUpdated"));
      return updated;
    });
  };

  const searchCategoryMapping: { [key: string]: string[] } = {
    피로감: [
      CATEGORY_LABELS.vitaminB,
      CATEGORY_LABELS.coenzymeQ10,
      CATEGORY_LABELS.iron,
    ],
    "눈 건강": [CATEGORY_LABELS.lutein, CATEGORY_LABELS.vitaminA],
    "피부 건강": [
      CATEGORY_LABELS.collagen,
      CATEGORY_LABELS.vitaminC,
      CATEGORY_LABELS.zinc,
    ],
    체지방: [CATEGORY_LABELS.garcinia, CATEGORY_LABELS.psyllium],
    "혈관 & 혈액순환": [CATEGORY_LABELS.omega3, CATEGORY_LABELS.coenzymeQ10],
    "간 건강": [CATEGORY_LABELS.milkThistle],
    "장 건강": [CATEGORY_LABELS.probiotics, CATEGORY_LABELS.psyllium],
    "스트레스 & 수면": [
      CATEGORY_LABELS.magnesium,
      CATEGORY_LABELS.phosphatidylserine,
    ],
    "면역 기능": [
      CATEGORY_LABELS.vitaminD,
      CATEGORY_LABELS.zinc,
      CATEGORY_LABELS.vitaminC,
    ],
    "혈중 콜레스테롤": [CATEGORY_LABELS.omega3],
  };

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
          선택하신 상품을 보유한 약국 중 주소로부터{" "}
          <strong className="text-sky-500">
            {selectedPharmacy.distance?.toFixed(1)}km
          </strong>{" "}
          거리에 위치한{" "}
          <strong className="text-sky-500">{selectedPharmacy.name}</strong>의
          상품들이에요.
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
          <p className="text-gray-500 text-sm mb-3">{error}</p>
          <button className="text-sky-500 text-sm" onClick={() => fetchData()}>
            다시 시도
          </button>
        </div>
      )}

      {!error && allProducts.length === 0 && !isLoading && (
        <div className="min-h-[30vh] mb-12 flex flex-col items-center justify-center gap-6 py-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
              roadAddress={roadAddress}
              setRoadAddress={setRoadAddress}
              setSelectedPharmacy={setSelectedPharmacy}
              containerRef={cartContainerRef}
              onBack={closeCart}
              onUpdateCart={(updatedItems: any) => {
                setCartItems(updatedItems);
                const updatedTotalPrice = updatedItems.reduce(
                  (acc: number, item: any) => acc + item.price * item.quantity,
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
