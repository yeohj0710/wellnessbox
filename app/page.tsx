"use client";

import { useEffect, useState } from "react";
import ProductDetail from "@/components/productDetail";
import Cart from "@/components/cart";
import {
  getCategories,
  getProducts,
  getProductsByPharmacy,
} from "@/lib/product";
import { useFooter } from "@/components/footerContext";
import axios from "axios";
import AddressModal from "@/components/addressModal";

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [totalPrice, setTotalPrice] = useState(0);
  const { hideFooter, showFooter } = useFooter();
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
      now - parseInt(storedTimestamp, 10) > 3 * 60 * 60 * 1000
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
      try {
        setIsLoading(true);
        const [fetchedCategories, fetchedProducts] = await Promise.all([
          getCategories(),
          getProducts(),
        ]);
        setCategories(fetchedCategories);
        setAllProducts(fetchedProducts);
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("데이터를 가져오는 데 실패하였습니다:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
    const updatedTotalPrice = cartItems.reduce(
      (acc: number, item: any) => acc + item.price * item.quantity,
      0
    );
    setTotalPrice(updatedTotalPrice);
    if (cartItems.length === 0) {
      setProducts(allProducts);
      setPharmacies([]);
      setSelectedPharmacy(null);
      return;
    }
    const fetchPharmacies = async () => {
      if (cartItems.length === 0) {
        setPharmacies([]);
        setSelectedPharmacy(null);
        return;
      }
      setIsLoading(true);
      try {
        const response = await axios.post("/api/get-sorted-pharmacies", {
          productIdx: cartItems[0].idx,
          roadAddress,
        });
        setPharmacies(response.data.pharmacies);
        if (
          !selectedPharmacy ||
          !response.data.pharmacies.some(
            (pharmacy: any) => pharmacy.idx === selectedPharmacy.idx
          )
        ) {
          setSelectedPharmacy(response.data.pharmacies[0]);
        }
      } catch (error) {
        console.error("약국 정보를 가져오는 데 실패했습니다:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (roadAddress && cartItems.length > 0) {
      fetchPharmacies();
    }
  }, [roadAddress, cartItems[0]?.idx]);
  useEffect(() => {
    const filterCartItems = async () => {
      if (selectedPharmacy && cartItems.length > 0) {
        try {
          const products = await getProductsByPharmacy(selectedPharmacy.idx);
          const productIdxs = products.map((product) => product.idx);
          const filteredCartItems = cartItems.filter((item) =>
            productIdxs.includes(item.idx)
          );
          if (JSON.stringify(filteredCartItems) !== JSON.stringify(cartItems)) {
            setCartItems(filteredCartItems);
            localStorage.setItem(
              "cartItems",
              JSON.stringify(filteredCartItems)
            );
          }
        } catch (error) {
          console.error("약국 상품 데이터를 가져오는 데 실패했습니다:", error);
        }
      }
    };
    filterCartItems();
  }, [selectedPharmacy]);
  useEffect(() => {
    const storedCart = localStorage.getItem("cartItems");
    if (storedCart) {
      const parsedCart = JSON.parse(storedCart);
      const updatedTotalPrice = parsedCart.reduce(
        (acc: number, item: any) => acc + item.price * item.quantity,
        0
      );
      setTotalPrice(updatedTotalPrice);
    } else {
      setTotalPrice(0);
    }
  }, [cartItems]);
  useEffect(() => {
    if (totalPrice > 0 || isCartVisible) {
      hideFooter();
    } else {
      showFooter();
    }
  }, [totalPrice, isCartVisible, hideFooter, showFooter]);
  useEffect(() => {
    let filtered = [...allProducts];
    if (selectedPharmacy) {
      filtered = filtered.filter((product: any) =>
        product.pharmacies.some((p: any) => p.idx === selectedPharmacy.idx)
      );
    }
    if (selectedCategory !== null) {
      filtered = filtered.filter((product) =>
        product.categories.some(
          (category: any) => category.idx === selectedCategory
        )
      );
    }
    if (selectedPackage === "7일") {
      filtered = filtered.filter((product: any) =>
        product.description?.includes("7일")
      );
    } else if (selectedPackage === "30일") {
      filtered = filtered.filter((product: any) =>
        product.description?.includes("30일")
      );
    } else if (selectedPackage === "단품형") {
      filtered = filtered.filter(
        (product: any) =>
          !product.description?.includes("7일") &&
          !product.description?.includes("30일")
      );
    }
    setProducts(filtered);
  }, [allProducts, selectedPharmacy, selectedCategory, selectedPackage]);
  const handleAddToCart = (product: any, quantity: number) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.idx === product.idx);
      if (existingItem) {
        return prev.map((item) =>
          item.idx === product.idx
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          quantity,
        },
      ];
    });
    setTotalPrice((prev) => prev + product.price * quantity);
  };
  return isCartVisible ? (
    <Cart
      cartItems={cartItems}
      selectedPharmacy={selectedPharmacy}
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
  ) : (
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
        <div>
          <div className="flex gap-2 px-2 mx-1 sm:mx-0 mb-3 -mt-1 overflow-x-auto scrollbar-hide">
            {pharmacies.map((pharmacy: any) => (
              <div
                key={pharmacy.idx}
                className={`min-w-[120px] p-2 mb-2 border rounded-lg shadow-sm cursor-pointer 
          hover:bg-gray-100 transition 
          ${selectedPharmacy?.idx === pharmacy.idx ? "bg-gray-100" : ""}`}
                onClick={() => {
                  setSelectedPharmacy(pharmacy);
                }}
              >
                <h4 className="text-sm font-medium text-gray-700 text-center">
                  {pharmacy.name}
                </h4>
                <p className="text-xs text-gray-500 text-center">
                  {pharmacy.distance?.toFixed(1)} km
                </p>
              </div>
            ))}
          </div>
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
                setSelectedPackage("");
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
                key={category.idx}
                className={`flex flex-col items-center w-12 shrink-0 cursor-pointer hover:text-gray-700 ${
                  selectedCategory === category.idx ? "font-bold" : ""
                }`}
                onClick={() => {
                  setIsLoading(true);
                  setSelectedCategory(category.idx);
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
          {["", "7일", "30일", "단품형"].map((pkg) => (
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
              {pkg === "" ? "전체" : `${pkg} 패키지`}
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
                  <h3 className="text-sm font-bold text-gray-800 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="mt-auto">
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {product.description}
                    </p>
                    <p className="text-sm font-bold text-sky-500 mt-1">
                      ₩{product.price.toLocaleString()}
                    </p>
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
      {totalPrice > 0 && (
        <div className="px-5 fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
          <span>₩{totalPrice.toLocaleString()}</span>
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
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(quantity: number) => {
            handleAddToCart(selectedProduct, quantity);
          }}
        />
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
