"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ProductDetail from "@/components/product/productDetail";
import Cart from "@/components/order/cart";
import { getProducts } from "@/lib/product";
import { sortByImportanceDesc } from "@/lib/utils";
import { useFooter } from "@/components/common/footerContext";
import axios from "axios";
import { getCategories } from "@/lib/product";
import { getLowestAverageOptionType } from "@/lib/utils";

import AddressSection from "@/app/(components)/addressSection";
import PharmacySelector from "@/app/(components)/pharmacySelector";
import CategoryFilter from "@/app/(components)/categoryFilter";
import PackageFilter from "@/app/(components)/packageFilter";
import ProductGrid from "@/app/(components)/productGrid";
import FooterCartBar from "@/app/(components)/footerCartBar";
import FooterCartBarLoading from "@/app/(components)/footerCartBarLoading";
import SymptomFilter from "@/app/(components)/symptomFilter";

export default function HomeProductSection() {
  const searchParams = useSearchParams();
  const { hideFooter, showFooter } = useFooter();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>("전체");
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
  useEffect(() => {
    setMounted(true);
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
  // const [isSymptomModalVisible, setIsSymptomModalVisible] = useState(() => {
  //   if (typeof window !== "undefined") {
  //     return localStorage.getItem("visited") ? false : true;
  //   }
  //   return true;
  // });
  const [isSymptomModalVisible, setIsSymptomModalVisible] = useState(false);
  const scrollPositionRef = useRef(0);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReloadedRef = useRef(false);
  const cartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [isLoading, allProducts.length]);

  const openProductDetail = (product: any) => {
    if (typeof window !== "undefined") {
      scrollPositionRef.current = window.scrollY;
    }
    setSelectedProduct(product);
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
    if (typeof window !== "undefined") {
      window.scrollTo(0, scrollPositionRef.current);
      const url = new URL(window.location.href);
      url.searchParams.delete("product");
      window.history.replaceState({}, "", url.toString());
      sessionStorage.removeItem("scrollPos");
    }
  };

  const openCart = () => {
    if (typeof window !== "undefined") {
      scrollPositionRef.current = window.scrollY;
    }
    setIsCartVisible(true);
  };

  const closeCart = () => {
    setIsCartVisible(false);
    if (typeof window !== "undefined") {
      window.scrollTo(0, scrollPositionRef.current);
      const url = new URL(window.location.href);
      url.searchParams.delete("cart");
      window.history.replaceState({}, "", url.toString());
      sessionStorage.removeItem("scrollPos");
    }
  };

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

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      const id = parseInt(cat, 10);
      if (!isNaN(id)) setSelectedCategories([id]);
    }
  }, [searchParams, categories]);

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
      const stored = sessionStorage.getItem("scrollPos");
      if (stored) scrollPositionRef.current = parseInt(stored, 10);
      setIsCartVisible(true);
      const url = new URL(window.location.toString());
      url.searchParams.delete("cart");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

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
    fetchData();
  }, [fetchData]);
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

  const isRoadAddressChanged: any = useRef(false);
  useEffect(() => {
    if (cartItems.length === 0) {
      setProducts(allProducts);
      setPharmacies([]);
      setSelectedPharmacy(null);
      return;
    }
    if (!roadAddress) return;
    const fetchPharmacies = async () => {
      setIsLoading(true);
      try {
        const response = await axios.post("/api/get-sorted-pharmacies", {
          cartItem: cartItems[0],
          roadAddress,
        });
        const sortedPharmacies = response.data.pharmacies;
        const filteredPharmacies = sortedPharmacies.filter(
          (pharmacy: any) => pharmacy.registrationNumber !== null
        );
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
          !filteredPharmacies.some(
            (pharmacy: any) => pharmacy.id === selectedPharmacy.id
          )
        ) {
          setSelectedPharmacy(filteredPharmacies[0]);
        }
      } catch (error) {
        console.error("약국 정보를 가져오는 데 실패했습니다:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isRoadAddressChanged.current !== roadAddress) {
      isRoadAddressChanged.current = roadAddress;
      fetchPharmacies();
      return;
    }
    if (selectedPharmacy) {
      const isValid = selectedPharmacy?.pharmacyProducts?.some(
        (pharmacyProduct: any) =>
          pharmacyProduct.productId === cartItems[0]?.productId &&
          pharmacyProduct.optionType === cartItems[0]?.optionType &&
          pharmacyProduct.stock >= cartItems[0]?.quantity
      );
      if (isValid) return;
    }
    fetchPharmacies();
  }, [roadAddress, cartItems[0]]);
  useEffect(() => {
    const filterProducts = async () => {
      let filtered = [...allProducts];
      if (selectedPharmacy && selectedPackage !== "전체") {
        filtered = filtered.filter((product) =>
          product.pharmacyProducts.some(
            (pharmacyProduct: any) =>
              pharmacyProduct.pharmacy.id === selectedPharmacy.id &&
              pharmacyProduct.optionType === selectedPackage
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
      if (selectedCategories.length > 0) {
        filtered = filtered.filter((product) =>
          product.categories.some((category: any) =>
            selectedCategories.includes(category.id)
          )
        );
      }
      if (selectedPackage === "7일 패키지") {
        filtered = filtered.filter((product: any) =>
          product.pharmacyProducts.some((pharmacyProduct: any) =>
            pharmacyProduct.optionType?.includes("7일")
          )
        );
      } else if (selectedPackage === "30일 패키지") {
        filtered = filtered.filter((product: any) =>
          product.pharmacyProducts.some((pharmacyProduct: any) =>
            pharmacyProduct.optionType?.includes("30일")
          )
        );
      } else if (selectedPackage === "일반 상품") {
        filtered = filtered.filter((product: any) =>
          product.pharmacyProducts.some(
            (pharmacyProduct: any) => pharmacyProduct.optionType === "일반 상품"
          )
        );
      }
      setProducts(filtered);
    };
    filterProducts();
  }, [allProducts, selectedPharmacy, selectedCategories, selectedPackage]);
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
    피로감: ["비타민B", "코엔자임Q10", "철분"],
    "눈 건강": ["루테인", "비타민A"],
    "피부 건강": ["콜라겐", "비타민C", "아연"],
    체지방: ["가르시니아", "차전자피 식이섬유"],
    "혈관 & 혈액순환": ["오메가3", "코엔자임Q10"],
    "간 건강": ["밀크씨슬(실리마린)"],
    "장 건강": ["프로바이오틱스(유산균)", "차전자피 식이섬유"],
    "스트레스 & 수면": ["마그네슘", "포스파티딜세린"],
    "면역 기능": ["비타민D", "아연", "비타민C"],
    "혈중 콜레스테롤": ["오메가3"],
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
      className={`w-full max-w-[640px] mx-auto mt-2 bg-white ${
        totalPrice > 0 ? "pb-20" : ""
      }`}
    >
      {/*
      {mounted &&
        isSymptomModalVisible &&
        cartItems.length === 0 &&
        !isCartVisible && (
          <SymptomModal
            onSelect={handleSearchSelect}
            onClose={() => setIsSymptomModalVisible(false)}
          />
        )}
      */}
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
        setIsLoading={setIsLoading}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
      />
      <PackageFilter
        selectedPackage={selectedPackage}
        setSelectedPackage={setSelectedPackage}
        setIsLoading={setIsLoading}
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
        isLoading={isLoading}
        products={products}
        selectedPackage={selectedPackage}
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
