"use client";

import Image from "next/image";
import { useState } from "react";
import { TrashIcon } from "@heroicons/react/16/solid";

export default function CartItemsSection({
  cartItems,
  allProducts,
  selectedPharmacy,
  onUpdateCart,
  onProductClick,
  handleBulkChange,
}: any) {
  const [confirmType, setConfirmType] = useState<string | null>(null);
  return (
    <>
      <div className="px-4 sm:mt-2">
        <h2 className="text-lg font-bold pb-4 border-b mb-4">선택한 상품</h2>
      </div>
      <div className="space-y-4 px-4 mb-2">
        {cartItems.length > 0 ? (
          cartItems.map((item: any) => {
            const product = allProducts.find(
              (p: any) => p.id === item.productId
            );
            const pharmacyProduct = product?.pharmacyProducts.find(
              (pp: any) =>
                pp.optionType === item.optionType &&
                pp.pharmacy.id === selectedPharmacy?.id
            );
            if (!pharmacyProduct) return null;
            return (
              <div
                key={pharmacyProduct.id}
                className="flex items-center gap-4 border-b pb-4"
              >
                {product.images && product.images.length > 0 ? (
                  <div
                    className="relative w-16 h-16 cursor-pointer"
                    onClick={() =>
                      onProductClick(product, pharmacyProduct.optionType)
                    }
                  >
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="128px"
                      className="rounded-md object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-md bg-gray-300 flex items-center justify-center text-xs text-gray-500">
                    이미지 없음
                  </div>
                )}
                <div className="flex-1">
                  <h2
                    className="font-bold cursor-pointer"
                    onClick={() =>
                      onProductClick(product, pharmacyProduct.optionType)
                    }
                  >
                    {product.name} ({pharmacyProduct?.optionType || ""})
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {product.categories
                      ?.map((category: any) => category.name)
                      .join(", ") || "카테고리 없음"}
                  </p>
                  <p className="mt-1 font-bold text-sky-500">
                    {pharmacyProduct?.price?.toLocaleString()}원
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedItems = cartItems.map((i: any) =>
                        i.productId === item.productId &&
                        i.optionType === item.optionType &&
                        i.quantity > 1
                          ? { ...i, quantity: i.quantity - 1 }
                          : i
                      );
                      onUpdateCart(updatedItems);
                      localStorage.setItem(
                        "cartItems",
                        JSON.stringify(updatedItems)
                      );
                      window.dispatchEvent(new Event("cartUpdated"));
                    }}
                    className="leading-none w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg"
                  >
                    -
                  </button>
                  <span className="font-bold">{item.quantity}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        pharmacyProduct &&
                        item.quantity < pharmacyProduct.stock
                      ) {
                        const updatedItems = cartItems.map((i: any) =>
                          i.productId === item.productId &&
                          i.optionType === item.optionType
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                        );
                        onUpdateCart(updatedItems);
                        localStorage.setItem(
                          "cartItems",
                          JSON.stringify(updatedItems)
                        );
                        window.dispatchEvent(new Event("cartUpdated"));
                      } else {
                        alert(
                          `${selectedPharmacy.name}에서 담을 수 있는 ${product.name} (${pharmacyProduct.optionType})의 최대 개수예요.`
                        );
                      }
                    }}
                    className="leading-none w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg"
                  >
                    +
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedItems = cartItems.filter(
                        (i: any) =>
                          !(
                            i.productId === item.productId &&
                            i.optionType === item.optionType
                          )
                      );
                      onUpdateCart(updatedItems);
                      localStorage.setItem(
                        "cartItems",
                        JSON.stringify(updatedItems)
                      );
                      window.dispatchEvent(new Event("cartUpdated"));
                    }}
                    className="leading-none w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center"
                  >
                    <TrashIcon className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex justify-center items-center h-28">
            <p className="text-gray-500 font-medium">장바구니가 텅 비었어요.</p>
          </div>
        )}
      </div>
      <div className="justify-end px-4 mt-3 mb-2 flex gap-2">
        <button
          onClick={() => setConfirmType("7일")}
          className="px-3 py-1 text-sm bg-sky-400 text-white rounded hover:bg-sky-500"
        >
          전체 7일치
        </button>
        <button
          onClick={() => setConfirmType("30일")}
          className="px-3 py-1 text-sm bg-sky-400 text-white rounded hover:bg-sky-500"
        >
          전체 30일치
        </button>
        <button
          onClick={() => setConfirmType("일반")}
          className="px-3 py-1 text-sm bg-sky-400 text-white rounded hover:bg-sky-500"
        >
          전체 통상품
        </button>
      </div>
      {confirmType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmType(null)}
        >
          <div
            className="relative bg-gradient-to-br from-sky-400/90 via-indigo-500/90 to-fuchsia-500/90 rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-white/90 rounded-2xl text-center">
              <h2 className="text-lg font-bold text-gray-800 mb-3">
                변경 확인
              </h2>
              <p className="mb-6 text-sm text-gray-600">
                장바구니에 담긴 모든 영양제가{" "}
                <span className="font-semibold text-sky-500">
                  {confirmType}
                </span>{" "}
                상품으로 변경됩니다.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setConfirmType(null)}
                  className="px-5 py-2 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    handleBulkChange(confirmType);
                    setConfirmType(null);
                  }}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 text-white font-semibold shadow-md hover:scale-105 transition-transform"
                >
                  변경
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
