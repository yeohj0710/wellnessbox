"use client";

import { useEffect, useRef, useState } from "react";
import ProductDetail from "@/components/productDetail";
import Cart from "@/components/cart";
import { getProducts } from "@/lib/product";
import { useFooter } from "@/components/footerContext";
import axios from "axios";
import { getCategories } from "@/lib/category";
import { getLowestAverageOptionType } from "@/lib/utils";

import AddressSection from "./(components)/addressSection";
import PharmacySelector from "./(components)/pharmacySelector";
import CategoryFilter from "./(components)/categoryFilter";
import PackageFilter from "./(components)/packageFilter";
import ProductGrid from "./(components)/productGrid";
import FooterCartBar from "./(components)/footerCartBar";
import SymptomModal from "./(components)/symptomModal";
import SymptomFilter from "./(components)/symptomFilter";

export default function Home() {
  const { hideFooter, showFooter } = useFooter();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>("전체");
  const [totalPrice, setTotalPrice] = useState(0);
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
  const [isSymptomModalVisible, setIsSymptomModalVisible] = useState(() => {
    if (typeof window !== "undefined") {
      // return localStorage.getItem("visited") ? false : true;
    }
    return true;
  });
  useEffect(() => {
    const timestampKey = "cartTimestamp";
    const now = Date.now();
    const storedTimestamp = localStorage.getItem(timestampKey);
    if (
      !storedTimestamp ||
      now - parseInt(storedTimestamp, 10) > 7 * 24 * 60 * 60 * 1000
    ) {
      localStorage.clear();
      localStorage.setItem(timestampKey, now.toString());
      setCartItems([]);
    } else {
      localStorage.setItem(timestampKey, now.toString());
    }
  }, []);
  useEffect(() => {
    const storedRoadAddress = localStorage.getItem("roadAddress") || "";
    setRoadAddress(storedRoadAddress.trim());
    const fetchData = async () => {
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
        setCategories(JSON.parse(cachedCategories));
        setAllProducts(JSON.parse(cachedProducts));
        setProducts(JSON.parse(cachedProducts));
        setIsLoading(false);
        return;
      }
      try {
        const [fetchedCategories, fetchedProducts] = await Promise.all([
          getCategories(),
          getProducts(),
        ]);
        setCategories(fetchedCategories);
        setAllProducts(fetchedProducts);
        setProducts(fetchedProducts);
        localStorage.setItem("categories", JSON.stringify(fetchedCategories));
        localStorage.setItem("products", JSON.stringify(fetchedProducts));
        localStorage.setItem("cacheTimestamp", now.toString());
      } catch (error) {
        console.error("데이터를 가져오는 데 실패하였습니다:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
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
  }, [cartItems, selectedPharmacy, allProducts]);
  useEffect(() => {
    if (!selectedPharmacy) return;
    const filteredCartItems = cartItems.filter((item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      return product?.pharmacyProducts.some(
        (pp: any) =>
          pp.pharmacy?.id === selectedPharmacy.id &&
          pp.optionType === item.optionType
      );
    });
    if (filteredCartItems.length !== cartItems.length) {
      setCartItems(filteredCartItems);
      localStorage.setItem("cartItems", JSON.stringify(filteredCartItems));
    }
  }, [selectedPharmacy, allProducts]);
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
        if (!sortedPharmacies || sortedPharmacies.length === 0) {
          alert(
            "선택하신 상품의 해당량만큼의 재고를 보유한 약국이 존재하지 않아요. 해당 상품을 장바구니에서 제외할게요."
          );
          const updatedCartItems = cartItems.slice(1);
          setCartItems(updatedCartItems);
          localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
          return;
        }
        setPharmacies(sortedPharmacies);
        if (
          !selectedPharmacy ||
          !response.data.pharmacies.some(
            (pharmacy: any) => pharmacy.id === selectedPharmacy.id
          )
        ) {
          setSelectedPharmacy(sortedPharmacies[0]);
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
    setCartItems((prev) => {
      const existingItem = prev.find(
        (item) =>
          item.productId === cartItem.productId &&
          item.optionType === cartItem.optionType
      );
      if (existingItem) {
        return prev.map((item) =>
          item.productId === cartItem.productId
            ? { ...item, quantity: item.quantity + cartItem.quantity }
            : item
        );
      }
      return [...prev, cartItem];
    });
  };
  const searchCategoryMapping: { [key: string]: string[] } = {
    피로감: ["비타민C", "비타민D"],
    "눈 건강": ["루테인"],
    "피부 건강": ["비타민A"],
    체지방: ["오메가3"],
    "혈관 & 혈액순환": ["칼슘", "마그네슘"],
    "간 건강": ["밀크씨슬"],
    "장 건강": ["프로바이오틱스(유산균)"],
    "스트레스 & 수면": ["비타민D"],
    "면역 기능": ["비타민C"],
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
      className={`w-full max-w-[640px] mx-auto mt-4 ${
        totalPrice > 0 ? "pb-20" : ""
      }`}
    >
      {mounted &&
        isSymptomModalVisible &&
        cartItems.length === 0 &&
        !isCartVisible && (
          <SymptomModal
            onSelect={handleSearchSelect}
            onClose={() => setIsSymptomModalVisible(false)}
          />
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
        setSelectedProduct={setSelectedProduct}
      />
      {products.length === 0 && !isLoading && (
        <div className="min-h-[30vh] mb-12 flex flex-col items-center justify-center py-10">
          <p className="text-gray-500 text-sm mb-3">
            조건에 맞는 상품이 없어요.
          </p>
          <p className="text-gray-400 text-xs">
            필터를 변경하거나 다시 확인해 주세요.
          </p>
        </div>
      )}
      {totalPrice > 0 && selectedPharmacy && (
        <FooterCartBar
          totalPrice={totalPrice}
          setIsCartVisible={setIsCartVisible}
        />
      )}
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
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(cartItem: any) => {
            handleAddToCart(cartItem);
          }}
        />
      )}
      {isCartVisible && (
        <div className="fixed inset-0 flex">
          <div className="bg-white w-full h-full overflow-y-auto">
            <Cart
              cartItems={cartItems}
              totalPrice={totalPrice}
              selectedPharmacy={selectedPharmacy}
              allProducts={allProducts}
              onBack={() => setIsCartVisible(false)}
              onUpdateCart={(updatedItems: any) => {
                setCartItems(updatedItems);
                const updatedTotalPrice = updatedItems.reduce(
                  (acc: number, item: any) => acc + item.price * item.quantity,
                  0
                );
                setTotalPrice(updatedTotalPrice);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
