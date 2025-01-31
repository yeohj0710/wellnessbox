"use client";

import { useEffect, useRef, useState } from "react";
import ProductDetail from "@/components/productDetail";
import Cart from "@/components/cart";
import { getProducts } from "@/lib/product";
import { useFooter } from "@/components/footerContext";
import axios from "axios";
import AddressModal from "@/components/addressModal";
import { getCategories } from "@/lib/category";
import { formatPriceRange, getLowestAverageOptionType } from "@/lib/utils";
import StarRating from "@/components/starRating";

export default function Home() {
  const { hideFooter, showFooter } = useFooter();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
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
  useEffect(() => {
    const timestampKey = "cartTimestamp";
    const now = Date.now();
    const storedTimestamp = localStorage.getItem(timestampKey);
    if (
      !storedTimestamp ||
      now - parseInt(storedTimestamp, 10) > 60 * 60 * 1000
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
        now - parseInt(cacheTimestamp, 10) < 60 * 60 * 1000
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
      if (selectedCategory) {
        filtered = filtered.filter((product) =>
          product.categories.some(
            (category: any) => category.id === selectedCategory
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
          product.pharmacyProducts.every(
            (pharmacyProduct: any) =>
              !pharmacyProduct.optionType?.includes("7일") &&
              !pharmacyProduct.optionType?.includes("30일")
          )
        );
      }
      setProducts(filtered);
    };
    filterProducts();
  }, [allProducts, selectedPharmacy, selectedCategory, selectedPackage]);
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
  return (
    <div
      className={`w-full max-w-[640px] mx-auto mt-4 ${
        totalPrice > 0 ? "pb-20" : ""
      }`}
    >
      {roadAddress && (
        <div className="bg-gray-100 px-4 gap-3 py-4 mx-3 sm:mx-2 mb-4 rounded-md flex items-center justify-between text-sm text-gray-700 shadow-sm">
          <div>
            <p className="font-semibold text-gray-800">현재 주소</p>
            <p className="text-gray-600 mt-1">{roadAddress}</p>
          </div>
          <button
            onClick={() => setIsAddressModalOpen(true)}
            className="text-sm min-w-12 font-normal px-1.5 sm:px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500 transition duration-200"
          >
            수정
          </button>
        </div>
      )}
      {isAddressModalOpen && (
        <AddressModal
          onClose={() => setIsAddressModalOpen(false)}
          onSave={(roadAddress: string, detailAddress: string) => {
            setRoadAddress(roadAddress);
            localStorage.setItem("roadAddress", roadAddress);
            localStorage.setItem("detailAddress", detailAddress);
          }}
        />
      )}
      {cartItems.length > 0 && pharmacies.length > 0 && (
        <div className="flex gap-2 px-2 mx-1 sm:mx-0 mb-3 -mt-1 overflow-x-auto scrollbar-hide">
          {pharmacies.map((pharmacy: any) => (
            <div
              key={pharmacy.id}
              className={`flex flex-col items-center justify-center min-w-[120px] max-w-none flex-grow p-2 mb-2 border rounded-lg shadow-sm cursor-pointer 
            hover:bg-gray-100 transition 
            ${selectedPharmacy?.id === pharmacy.id ? "bg-gray-100" : ""}`}
              onClick={() => {
                setSelectedPharmacy(pharmacy);
              }}
            >
              <h4 className="text-sm font-medium text-gray-700 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                {pharmacy.name}
              </h4>
              <p className="text-xs text-gray-500 text-center">
                {pharmacy.distance?.toFixed(1)} km
              </p>
            </div>
          ))}
        </div>
      )}
      <section
        className="flex gap-4 px-4 mt-1 pb-3 overflow-x-auto"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        <style jsx>{`
          ::-webkit-scrollbar {
            height: 8px;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
        `}</style>
        {isLoading ? (
          Array(12)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gray-300 animate-pulse"></div>
                <div className="w-10 h-4 bg-gray-300 mt-2 rounded-md animate-pulse"></div>
              </div>
            ))
        ) : (
          <div className="flex flex-nowrap items-start gap-5 w-full max-w-[640px]">
            <div
              className={`flex flex-col items-center w-12 shrink-0 cursor-pointer hover:text-gray-700 ${
                selectedCategory === null ? "font-bold" : ""
              }`}
              onClick={() => {
                setIsLoading(true);
                setSelectedCategory(null);
                setSelectedPackage("전체");
                setIsLoading(false);
              }}
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-bold">전체</span>
              </div>
              <span className="text-xs mt-1 text-center break-words">전체</span>
            </div>
            {categories.map((category) => (
              <div
                key={category.id}
                className={`flex flex-col items-center w-12 shrink-0 cursor-pointer hover:text-gray-700 ${
                  selectedCategory === category.id ? "font-bold" : ""
                }`}
                onClick={() => {
                  setIsLoading(true);
                  setSelectedCategory(category.id);
                  setIsLoading(false);
                }}
              >
                {category.image ? (
                  <img
                    src={category.image?.replace("/public", "/avatar")}
                    alt={category.name || "Category"}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300"></div>
                )}
                <span className="text-xs mt-1 text-center break-words">
                  {category.name || "카테고리"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="px-4 py-3 bg-gray-100 overflow-x-auto scrollbar-hide">
        <div className="flex flex-nowrap items-center gap-2 w-max">
          {["전체", "7일 패키지", "30일 패키지", "일반 상품"].map((pkg) => (
            <button
              key={pkg}
              className={`px-4 py-2 border rounded-full text-sm transition-transform duration-300 ${
                selectedPackage === pkg
                  ? "bg-gray-200 font-bold shadow-sm"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={() => {
                setIsLoading(true);
                setSelectedPackage(pkg);
                setIsLoading(false);
              }}
            >
              {pkg}
            </button>
          ))}
        </div>
      </section>
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
      <section className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
        {isLoading
          ? Array(12)
              .fill(0)
              .map((_, index) => <Skeleton key={index} />)
          : products.map((product, index) => (
              <div
                key={`${product.id}-${index}`}
                className="px-[0.5px] sm:px-1 sm:pb-1 flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
                onClick={() => setSelectedProduct(product)}
              >
                {product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-32 w-full object-contain bg-white"
                  />
                ) : (
                  <div className="h-28 bg-gray-200 flex items-center justify-center text-gray-500">
                    이미지 없음
                  </div>
                )}
                <div className="p-2 flex flex-col gap-1 flex-grow">
                  <span className="text-xs text-gray-500">
                    {product.categories
                      .map((category: any) => category.name)
                      .join(", ")}
                  </span>
                  <span className="text-sm font-bold text-gray-800 line-clamp-2">
                    {product.name}
                  </span>
                  <span className="">
                    <span className="text-xs text-sky-500">
                      {selectedPackage === "전체"
                        ? getLowestAverageOptionType(product)
                        : selectedPackage}{" "}
                      기준
                    </span>{" "}
                    {selectedPackage && selectedPharmacy && (
                      <span className="text-xs text-gray-400">
                        {product.pharmacyProducts.find(
                          (pharmacyProduct: any) =>
                            pharmacyProduct.optionType === selectedPackage &&
                            pharmacyProduct.pharmacyId === selectedPharmacy.id
                        )?.capacity
                          ? `(${
                              product.pharmacyProducts.find(
                                (pharmacyProduct: any) =>
                                  pharmacyProduct.optionType ===
                                    selectedPackage &&
                                  pharmacyProduct.pharmacyId ===
                                    selectedPharmacy.id
                              )?.capacity
                            })`
                          : ""}
                      </span>
                    )}
                  </span>
                  <span className="-mt-1 backdrop:file:text-sm font-bold text-sky-500">
                    {formatPriceRange({
                      product,
                      optionType: selectedPackage,
                      pharmacy: selectedPharmacy,
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    <StarRating rating={product.rating} size={18} />
                    <span className="text-xs text-gray-500 mt-1">
                      ({product.reviewCount})
                    </span>
                  </div>
                </div>
              </div>
            ))}
      </section>
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
        <div className="px-5 fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
          <span>{totalPrice.toLocaleString()}원</span>
          <button
            className="bg-white text-sky-400 hover:bg-sky-100 transition px-6 py-2 rounded-full font-semibold"
            onClick={() => setIsCartVisible(true)}
          >
            장바구니 보기
          </button>
        </div>
      )}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          optionType={
            selectedPackage === "전체"
              ? getLowestAverageOptionType(selectedProduct)
              : selectedPackage
          }
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

const Skeleton = () => (
  <div className="flex flex-col border rounded-lg overflow-hidden shadow-sm cursor-pointer">
    <div className="h-32 bg-gray-300 animate-pulse"></div>
    <div className="p-2">
      <div className="w-2/3 h-4 bg-gray-300 rounded-md animate-pulse mb-2"></div>
      <div className="w-1/2 h-4 bg-gray-300 rounded-md animate-pulse"></div>
    </div>
  </div>
);
