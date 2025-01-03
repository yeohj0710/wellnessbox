"use client";

import { useEffect, useState } from "react";
import AddressModal from "./adressModal";

export default function ProductDetail({ product, onClose, onAddToCart }: any) {
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(product.price);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handlePopState = (event: PopStateEvent) => {
      onClose();
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [onClose]);
  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const newQuantity = Math.max(1, prev + delta);
      setTotalPrice(product.price * newQuantity);
      return newQuantity;
    });
  };
  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center">
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
                  className="text-gray-600 absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 w-10 h-10 p-2 rounded-full shadow-md"
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
                  className="text-gray-600 absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 w-10 h-10 p-2 rounded-full shadow-md"
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
            className="text-gray-600 font-bold absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 p-2 rounded-full shadow-md w-10 h-10 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="p-6 pb-[calc(12rem)]">
          <h1 className="text-xl font-bold">{product.name}</h1>
          <p className="text-gray-500 text-sm mt-2">{product.description}</p>
          <p className="text-lg font-bold mt-4">
            ₩{totalPrice.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => handleQuantityChange(-1)}
              className="font-bold px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md"
            >
              -
            </button>
            <span className="font-bold text-lg">{quantity}</span>
            <button
              onClick={() => handleQuantityChange(1)}
              className="font-bold px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md"
            >
              +
            </button>
          </div>
          <div className="fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
            <span>₩{totalPrice.toLocaleString()}</span>
            <button
              onClick={() => {
                onAddToCart(totalPrice, quantity, []);
                const storedCart = localStorage.getItem("cartItems");
                const cart = storedCart ? JSON.parse(storedCart) : [];
                cart.push({
                  idx: product.idx,
                  name: product.name,
                  price: product.price,
                  quantity,
                  images: product.images,
                });
                localStorage.setItem("cartItems", JSON.stringify(cart));
                onClose();
              }}
              className="bg-white text-sky-400 px-6 py-2 rounded-md shadow-md hover:bg-sky-100 transition"
            >
              담기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FirstModal({ onClose }: any) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  return (
    <>
      {!isAddressModalOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">알림</h2>
            <p className="text-sm text-gray-700 mb-4">
              주소를 입력하면 해당 건강기능식품을 주문할 수 있는 약국들을 연결해
              드릴게요.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-300 text-white rounded hover:bg-gray-400"
              >
                더 둘러보기
              </button>
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
              >
                주소 입력하기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AddressModal
          onClose={() => {
            setIsAddressModalOpen(false);
            onClose();
          }}
          onSave={(fullAddress: string) => {
            console.log("저장된 주소:", fullAddress);
          }}
        />
      )}
    </>
  );
}
