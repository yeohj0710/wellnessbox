"use client";

import { useState } from "react";
import ProductDetail from "@/components/productDetail";
import Cart from "@/components/cart";

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
};

type CartItem = {
  id: number;
  name: string;
  price: number;
  options: string[];
  quantity: number;
  imageUrl?: string;
};

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const handleAddToCart = (
    product: Product,
    quantity: number,
    options: string[]
  ) => {
    setCartItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (item) => item.id === product.id
      );
      if (existingItemIndex !== -1) {
        const updatedItems = [...prev];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          options: Array.from(
            new Set([...updatedItems[existingItemIndex].options, ...options])
          ),
        };
        return updatedItems;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          options,
          quantity,
          imageUrl: product.imageUrl,
        },
      ];
    });
    setTotalPrice((prev) => prev + product.price * quantity);
  };
  const products: Product[] = [
    {
      id: 1,
      name: "엄청 큰 후라이드 치킨",
      price: 19000,
      description: "가마솥에 튀겨 바삭바삭한 노랑통닭 대표 후라이드 치킨",
    },
    {
      id: 2,
      name: "엄청 큰 반반 치킨",
      price: 10,
      description: "두 가지 맛을 동시에 즐길 수 있는 반반 치킨",
    },
  ];
  return isCartVisible ? (
    <Cart
      cartItems={cartItems}
      onBack={() => setIsCartVisible(false)}
      onUpdateCart={(updatedItems) => setCartItems(updatedItems)}
    />
  ) : (
    <div
      className={`w-full max-w-[640px] mx-auto ${
        totalPrice > 0 ? "pb-20" : ""
      }`}
    >
      <section className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gray-300"></div>
          <span className="text-sm mt-1">카테고리1</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gray-300"></div>
          <span className="text-sm mt-1">카테고리2</span>
        </div>
      </section>
      <section className="flex gap-2 px-4 py-3 bg-gray-100">
        <button className="px-4 py-2 bg-white border rounded-full text-sm">
          기본순
        </button>
        <button className="px-4 py-2 bg-white border rounded-full text-sm">
          쿠폰
        </button>
        <button className="px-4 py-2 bg-white border rounded-full text-sm">
          배달방식
        </button>
      </section>
      <section className="grid grid-cols-2 gap-4 px-4 py-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex flex-col border rounded-lg overflow-hidden shadow-sm cursor-pointer"
            onClick={() => setSelectedProduct(product)}
          >
            <div className="h-32 bg-gray-300"></div>
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
        <div className="fixed bottom-0 left-0 w-full bg-teal-500 text-white p-4 flex justify-between items-center text-lg font-bold">
          <span>₩{totalPrice.toLocaleString()}</span>
          <button
            className="bg-white text-teal-500 px-6 py-2 rounded-full font-semibold"
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
          onAddToCart={(price, quantity, options) => {
            if (selectedProduct) {
              handleAddToCart(selectedProduct, quantity, options);
            }
          }}
        />
      )}
    </div>
  );
}
