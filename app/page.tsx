"use client";

import { useEffect, useState } from "react";
import ProductDetail from "@/components/productDetail";
import Cart from "@/components/cart";
import { getCategories, getProducts } from "@/lib/product";

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      const fetchedCategories = await getCategories();
      const fetchedProducts = await getProducts();
      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
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
        <div
          className="flex flex-col items-center cursor-pointer"
          onClick={async () => {
            const allProducts = await getProducts();
            setProducts(allProducts);
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
              const allProducts = await getProducts();
              setProducts(
                allProducts.filter(
                  (product: any) => product.categoryIdx === category.idx
                )
              );
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
            <span className="text-sm mt-1">{category.name || "카테고리"}</span>
          </div>
        ))}
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
        {products.map((product, index) => (
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
        <div className="fixed bottom-0 left-0 w-full bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
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
