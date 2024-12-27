"use client";

import { useEffect, useState } from "react";
import ProductDetail from "@/components/productDetail";
import Cart from "@/components/cart";
import { getCategories, getProducts } from "@/lib/product";

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
  const [totalPrice, setTotalPrice] = useState(0);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const fetchedCategories = await getCategories();
      const fetchedProducts = await getProducts();
      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
      setIsLoading(false);
    };
    fetchData();
  }, []);
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
    setTotalPrice((prev) => prev + product.price * quantity);
  };

  return isCartVisible ? (
    <Cart
      cartItems={cartItems}
      onBack={() => setIsCartVisible(false)}
      onUpdateCart={(updatedItems: any) => setCartItems(updatedItems)}
    />
  ) : (
    <div
      className={`w-full max-w-[640px] mx-auto ${
        totalPrice > 0 ? "pb-20" : ""
      }`}
    >
      <section className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
        {isLoading ? (
          Array(3)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gray-300 animate-pulse"></div>
                <div className="w-10 h-4 bg-gray-300 mt-2 rounded-md animate-pulse"></div>
              </div>
            ))
        ) : (
          <>
            <div
              className="flex flex-col items-center cursor-pointer"
              onClick={async () => {
                setIsLoading(true);
                const allProducts = await getProducts();
                setProducts(allProducts);
                setIsLoading(false);
              }}
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-bold">전체</span>
              </div>
              <span className="text-sm mt-1">전체</span>
            </div>
            {categories.map((category) => (
              <div
                key={category.idx}
                className="flex flex-col items-center cursor-pointer"
                onClick={async () => {
                  setIsLoading(true);
                  const allProducts = await getProducts();
                  setProducts(
                    allProducts.filter(
                      (product: any) => product.categoryIdx === category.idx
                    )
                  );
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
                <span className="text-sm mt-1">
                  {category.name || "카테고리"}
                </span>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="flex gap-2 px-4 py-3 bg-gray-100">
        <button className="px-4 py-2 bg-white border rounded-full text-sm">
          기본순
        </button>
        {/*
        <button className="px-4 py-2 bg-white border rounded-full text-sm">
          쿠폰
        </button>
        <button className="px-4 py-2 bg-white border rounded-full text-sm">
          배달방식
        </button>
        */}
      </section>
      <section className="grid grid-cols-2 gap-4 px-4 py-4">
        {isLoading
          ? Array(4)
              .fill(0)
              .map((_, index) => <Skeleton key={index} />)
          : products.map((product, index) => (
              <div
                key={`${product.id}-${index}`}
                className="flex flex-col border rounded-lg overflow-hidden shadow-sm cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                {product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="h-32 bg-gray-300"></div>
                )}
                <div className="p-2">
                  <h3 className="text-sm font-bold">{product.name}</h3>
                  <p className="text-xs text-gray-600">{product.description}</p>
                  <p className="text-sm font-bold mt-2">
                    ₩{product.price.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
      </section>
      {totalPrice > 0 && (
        <div className="fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
          <span>₩{totalPrice.toLocaleString()}</span>
          <button
            className="bg-white text-sky-400 px-6 py-2 rounded-full font-semibold"
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
