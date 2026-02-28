"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { TrashIcon } from "@heroicons/react/16/solid";
import { useDraggableModal } from "@/components/common/useDraggableModal";
import {
  buildDecrementedCartItems,
  buildIncrementedCartItems,
  buildRemovedCartItems,
  updateCartAndPersist,
} from "./cartItemsSection.actions";
import { useCartProductsResolver } from "./useCartProductsResolver";
import type {
  CartLineItem,
  CartPharmacy,
  CartPharmacyProduct,
  CartProduct,
} from "./cart.types";

type ResolvedCartItemRow = {
  key: number;
  item: CartLineItem;
  product: CartProduct;
  pharmacyProduct: CartPharmacyProduct;
};

type CartItemsSectionProps = {
  cartItems: CartLineItem[];
  allProducts?: CartProduct[];
  selectedPharmacy: CartPharmacy | null;
  onUpdateCart: (items: CartLineItem[]) => void;
  onProductClick: (product: CartProduct, optionType: string) => void;
  handleBulkChange: (target: string) => void;
  isLoading?: boolean;
  isPharmacyLoading?: boolean;
  pharmacyError?: string | null;
  onRetryResolve?: () => void;
  isAddressMissing?: boolean;
  onOpenAddressModal?: () => void;
};

export default function CartItemsSection({
  cartItems,
  allProducts = [],
  selectedPharmacy,
  onUpdateCart,
  onProductClick,
  handleBulkChange,
  isLoading = false,
  isPharmacyLoading = false,
  pharmacyError = null,
  onRetryResolve,
  isAddressMissing = false,
  onOpenAddressModal,
}: CartItemsSectionProps) {
  const [confirmType, setConfirmType] = useState<string | null>(null);
  const {
    products,
    cartProductsError,
    isResolvingProducts,
    retryResolveProducts,
  } = useCartProductsResolver({
    cartItems,
    allProducts,
    onUpdateCart,
  });
  const confirmModalDrag = useDraggableModal(Boolean(confirmType), {
    resetOnOpen: true,
  });


  const items = useMemo(() => {
    if (!Array.isArray(cartItems) || !Array.isArray(products)) return [];
    return cartItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const pharmacyProduct = product?.pharmacyProducts?.find(
          (pp) =>
            pp.optionType === item.optionType &&
            pp.pharmacy?.id === selectedPharmacy?.id
        );
        return pharmacyProduct && product
          ? { key: pharmacyProduct.id, item, product, pharmacyProduct }
          : null;
      })
      .filter((row): row is ResolvedCartItemRow => row !== null);
  }, [cartItems, products, selectedPharmacy]);

  const hasCartItems = Array.isArray(cartItems) && cartItems.length > 0;
  const waitingForProducts = hasCartItems && isResolvingProducts;
  const waitingForPharmacy =
    hasCartItems && !selectedPharmacy?.id && isPharmacyLoading;
  const resolving = isLoading || waitingForProducts || waitingForPharmacy;
  const missingPharmacy =
    hasCartItems && !selectedPharmacy?.id && !isPharmacyLoading;
  const unresolvedItems =
    hasCartItems && !!selectedPharmacy?.id && !resolving && items.length === 0;

  return (
    <>
      <div className="px-4 sm:mt-2">
        <h2 className="text-lg font-bold pb-4 border-b mb-4 mt-4">
          선택한 상품
        </h2>
      </div>

      <div className="space-y-4 px-4 mb-2 min-h-28">
        {resolving ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b pb-4 animate-pulse"
            >
              <div className="w-16 h-16 rounded-md bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="w-6 h-4 bg-gray-200 rounded" />
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="w-8 h-8 rounded-full bg-gray-200" />
              </div>
            </div>
          ))
        ) : cartProductsError ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-gray-600">{cartProductsError}</p>
            <button
              type="button"
              onClick={retryResolveProducts}
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
            >
              다시 시도
            </button>
          </div>
        ) : missingPharmacy ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-gray-600">
              {typeof pharmacyError === "string" && pharmacyError
                ? pharmacyError
                : "약국 정보를 불러오지 못했습니다."}
            </p>
            <button
              type="button"
              onClick={() => {
                if (isAddressMissing) {
                  if (typeof onOpenAddressModal === "function") {
                    onOpenAddressModal();
                    return;
                  }
                }
                onRetryResolve?.();
              }}
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
            >
              {isAddressMissing ? "주소 설정" : "다시 시도"}
            </button>
          </div>
        ) : unresolvedItems ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-gray-600">
              장바구니 품목과 약국 재고를 다시 확인해 주세요.
            </p>
            <button
              type="button"
              onClick={() => onRetryResolve?.()}
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
            >
              새로 확인
            </button>
          </div>
        ) : items.length > 0 ? (
          items.map(({ key, item, product, pharmacyProduct }) => (
            <div key={key} className="flex items-center gap-4 border-b pb-4">
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
                  {product.categories?.map((c) => c.name).join(", ") ||
                    "카테고리 없음"}
                </p>
                <p className="mt-1 font-bold text-sky-500">
                  {pharmacyProduct?.price?.toLocaleString()}원
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = buildDecrementedCartItems(cartItems, item);
                    updateCartAndPersist(updated, onUpdateCart);
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
                      const updated = buildIncrementedCartItems(
                        cartItems,
                        item
                      );
                      updateCartAndPersist(updated, onUpdateCart);
                    } else {
                      alert(
                        `${
                          selectedPharmacy?.name || "선택 약국"
                        }에서 담을 수 있는 ${product.name} (${
                          pharmacyProduct.optionType
                        })의 최대 개수예요.`
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
                    const updated = buildRemovedCartItems(cartItems, item);
                    updateCartAndPersist(updated, onUpdateCart);
                  }}
                  className="leading-none w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center"
                >
                  <TrashIcon className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex justify-center items-center h-28">
            <p className="text-gray-500 font-medium">장바구니가 텅 비었어요.</p>
          </div>
        )}
      </div>

      {!resolving && items.length > 0 && (
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
      )}

      {confirmType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmType(null)}
        >
          <div
            className="relative bg-gradient-to-br from-sky-400/90 via-indigo-500/90 to-fuchsia-500/90 rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-scaleIn"
            ref={confirmModalDrag.panelRef}
            style={confirmModalDrag.panelStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onPointerDown={confirmModalDrag.handleDragPointerDown}
              className={`absolute left-0 right-0 top-0 h-10 touch-none ${
                confirmModalDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              aria-hidden
            />
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
