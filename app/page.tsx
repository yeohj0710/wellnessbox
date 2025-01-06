"use client";

import { useEffect, useState } from "react";
import ProductDetail from "@/components/productDetail";
import Cart from "@/components/cart";
import { getCategories, getProducts } from "@/lib/product";
import { useFooter } from "@/components/footerContext";

const Skeleton = () => (
  <div className="flex flex-col border rounded-lg overflow-hidden shadow-sm cursor-pointer">
    <div className="h-32 bg-gray-300 animate-pulse"></div>
    <div className="p-2">
      <div className="w-2/3 h-4 bg-gray-300 rounded-md animate-pulse mb-2"></div>
      <div className="w-1/2 h-4 bg-gray-300 rounded-md animate-pulse"></div>
    </div>
  </div>
);

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
  const [userAddress, setUserAddress] = useState(
    () => localStorage.getItem("address") || ""
  );
  const [cartItems, setCartItems] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const storedCart = localStorage.getItem("cartItems");
      return storedCart ? JSON.parse(storedCart) : [];
    }
    return [];
  });
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
    const updatedTotalPrice = cartItems.reduce(
      (acc: number, item: any) => acc + item.price * item.quantity,
      0
    );
    setTotalPrice(updatedTotalPrice);
  }, [cartItems]);
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const fetchedCategories = await getCategories();
      const fetchedProducts = await getProducts();
      setCategories(fetchedCategories);
      setAllProducts(fetchedProducts);
      setProducts(fetchedProducts);
      setIsLoading(false);
    };
    fetchData();
  }, []);
  useEffect(() => {
    if (totalPrice > 0 || isCartVisible) {
      hideFooter();
    } else {
      showFooter();
    }
  }, [totalPrice, isCartVisible, hideFooter, showFooter]);
  useEffect(() => {
    let filtered = [...allProducts];
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
  }, [selectedCategory, selectedPackage, allProducts]);
  const handleAddToCart = (
    product: any,
    quantity: number,
    options: string[]
  ) => {
    setCartItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (item) => item.idx === product.idx
      );
      if (existingItemIndex !== -1) {
        const updatedItems = prev.map((item, index) =>
          index === existingItemIndex
            ? {
                ...item,
                quantity: item.quantity + quantity,
                options: Array.from(new Set([...item.options, ...options])),
              }
            : item
        );
        return updatedItems;
      }
      return [
        ...prev,
        {
          idx: product.idx,
          name: product.name,
          price: product.price,
          options,
          quantity,
          images: product.images,
        },
      ];
    });
    setTotalPrice((prev: any) => prev + product.price * quantity);
  };
  return isCartVisible ? (
    <Cart
      cartItems={cartItems}
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
      {userAddress && (
        <div className="bg-gray-100 px-4 py-2 mb-4 rounded-md text-sm text-gray-700">
          현재 주소: {userAddress}
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
      <section className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-4 px-4 py-4">
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
          onAddToCart={(price: any, quantity: any, options: any) => {
            if (selectedProduct) {
              handleAddToCart(selectedProduct, quantity, options);
            }
          }}
        />
      )}
    </div>
  );
}
