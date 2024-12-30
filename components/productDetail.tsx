"use client";

import { useEffect, useState } from "react";

export default function ProductDetail({ product, onClose, onAddToCart }: any) {
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(product.price);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const newQuantity = Math.max(1, prev + delta);
      setTotalPrice(product.price * newQuantity);
      return newQuantity;
    });
  };
  return (
    <div className="overflow-y-auto h-screen fixed inset-x-0 top-14 bg-white w-full max-w-[640px] mx-auto">
      <div className="relative">
        <div className="relative">
          {product.images && product.images.length > 0 ? (
            <div className="relative w-full h-72 sm:h-80 overflow-hidden">
              {product.images.map((image: any, index: any) => (
                <img
                  key={index}
                  src={image}
                  alt={`${product.name} 이미지 ${index + 1}`}
                  className={`absolute w-full h-72 sm:h-80 object-contain bg-white transition-transform ${
                    index === 0 ? "block" : "hidden"
                  }`}
                  data-image-index={index}
                />
              ))}
              <button
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md"
                onClick={() => {
                  const images = document.querySelectorAll(
                    `[data-image-index]`
                  ) as NodeListOf<HTMLImageElement>;
                  const currentIndex = Array.from(images).findIndex(
                    (img) => img.style.display !== "none"
                  );
                  images[currentIndex].style.display = "none";
                  images[
                    (currentIndex - 1 + images.length) % images.length
                  ].style.display = "block";
                }}
              >
                ◀
              </button>
              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md"
                onClick={() => {
                  const images = document.querySelectorAll(
                    `[data-image-index]`
                  ) as NodeListOf<HTMLImageElement>;
                  const currentIndex = Array.from(images).findIndex(
                    (img) => img.style.display !== "none"
                  );
                  images[currentIndex].style.display = "none";
                  images[(currentIndex + 1) % images.length].style.display =
                    "block";
                }}
              >
                ▶
              </button>
            </div>
          ) : (
            <div className="w-full h-60 bg-gray-300 flex items-center justify-center text-gray-500">
              이미지 없음
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 left-4 bg-white p-2 rounded-full shadow-md"
        >
          ✕
        </button>
      </div>
      <div className="p-6 pb-[calc(12rem)]">
        <h1 className="text-xl font-bold">{product.name}</h1>
        <p className="text-gray-500 text-sm mt-2">{product.description}</p>
        <p className="text-lg font-bold mt-4">₩{totalPrice.toLocaleString()}</p>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => handleQuantityChange(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md"
          >
            -
          </button>
          <span className="font-bold text-lg">{quantity}</span>
          <button
            onClick={() => handleQuantityChange(1)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md"
          >
            +
          </button>
        </div>
        <div className="fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
          <span>₩{totalPrice.toLocaleString()}</span>
          <button
            onClick={() => {
              onAddToCart(totalPrice, quantity, []);
              onClose();
            }}
            className="bg-white text-sky-400 px-6 py-2 rounded-md shadow-md hover:bg-sky-100 transition"
          >
            담기
          </button>
        </div>
      </div>
    </div>
  );
}
