"use client";

import { useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
};

type Option = {
  id: number;
  name: string;
  price: number;
};

type ProductDetailProps = {
  product: Product;
  onClose: () => void;
  onAddToCart: (price: number, quantity: number, options: string[]) => void;
};

export default function ProductDetail({
  product,
  onClose,
  onAddToCart,
}: ProductDetailProps) {
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(product.price);

  const options: Option[] = [
    { id: 1, name: "순살 선택", price: 0 },
    { id: 2, name: "뼈 선택", price: 0 },
    { id: 3, name: "콤보 선택", price: 2000 },
  ];

  const handleOptionChange = (option: Option) => {
    if (selectedOptions.includes(option.id)) {
      setSelectedOptions((prev) => prev.filter((id) => id !== option.id));
      setTotalPrice((prev) => prev - option.price);
    } else {
      setSelectedOptions((prev) => [...prev, option.id]);
      setTotalPrice((prev) => prev + option.price);
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
    setTotalPrice(
      (prev) =>
        product.price * (quantity + delta) +
        selectedOptions.reduce((sum, id) => {
          const option = options.find((o) => o.id === id);
          return sum + (option ? option.price : 0);
        }, 0)
    );
  };

  return (
    <div className="fixed inset-0 bg-white overflow-auto z-50">
      <div className="relative">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-60 object-cover"
          />
        ) : (
          <div className="w-full h-60 bg-gray-300 flex items-center justify-center text-gray-500">
            이미지 없음
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 bg-white p-2 rounded-full shadow-md"
        >
          ✕
        </button>
      </div>
      <div className="p-6">
        <h1 className="text-xl font-bold">{product.name}</h1>
        <p className="text-gray-500 text-sm mt-2">{product.description}</p>
        <p className="text-lg font-bold mt-4">₩{totalPrice.toLocaleString()}</p>
        <div className="mt-6">
          <h2 className="font-bold text-lg mb-3">부위 선택</h2>
          {options.map((option) => (
            <label
              key={option.id}
              className="flex items-center justify-between border-b pb-2 mb-2"
            >
              <div>
                <input
                  type="checkbox"
                  value={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onChange={() => handleOptionChange(option)}
                  className="mr-2"
                />
                {option.name}
              </div>
              <span className="text-sm text-gray-500">
                +₩{option.price.toLocaleString()}
              </span>
            </label>
          ))}
        </div>
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
        <div className="fixed bottom-0 left-0 w-full bg-teal-500 text-white p-4 flex justify-between items-center text-lg font-bold">
          <span>₩{totalPrice.toLocaleString()}</span>
          <button
            onClick={() => {
              const selectedOptionNames = selectedOptions.map(
                (id) => options.find((o) => o.id === id)?.name || ""
              );
              onAddToCart(totalPrice, quantity, selectedOptionNames);
              onClose();
            }}
            className="bg-white text-teal-500 px-6 py-2 rounded-md shadow-md hover:bg-teal-100 transition"
          >
            담기
          </button>
        </div>
      </div>
    </div>
  );
}
