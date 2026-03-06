"use client";

import Image from "next/image";
import { TrashIcon } from "@heroicons/react/16/solid";
import {
  buildDecrementedCartItems,
  buildIncrementedCartItems,
  buildRemovedCartItems,
  updateCartAndPersist,
} from "./cartItemsSection.actions";
import { CART_ITEMS_SECTION_COPY } from "./cartItemsSection.copy";
import {
  buildStockLimitAlertMessage,
  type ResolvedCartItemRow,
} from "./cartItemsSection.view-model";
import type { CartLineItem, CartProduct } from "./cart.types";

type CartItemRowProps = {
  row: ResolvedCartItemRow;
  cartItems: CartLineItem[];
  selectedPharmacyName?: string | null;
  onUpdateCart: (items: CartLineItem[]) => void;
  onProductClick: (product: CartProduct, optionType: string) => void;
};

export default function CartItemRow({
  row,
  cartItems,
  selectedPharmacyName,
  onUpdateCart,
  onProductClick,
}: CartItemRowProps) {
  const { item, product, pharmacyProduct } = row;

  return (
    <div className="flex items-center gap-4 border-b pb-4">
      {product.images && product.images.length > 0 ? (
        <div
          className="relative w-16 h-16 cursor-pointer"
          onClick={() => onProductClick(product, pharmacyProduct.optionType)}
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
          {CART_ITEMS_SECTION_COPY.noImageLabel}
        </div>
      )}
      <div className="flex-1">
        <h2
          className="font-bold cursor-pointer"
          onClick={() => onProductClick(product, pharmacyProduct.optionType)}
        >
          {product.name} ({pharmacyProduct.optionType || ""})
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {product.categories?.map((category) => category.name).join(", ") ||
            CART_ITEMS_SECTION_COPY.noCategoryLabel}
        </p>
        <p className="mt-1 font-bold text-sky-500">
          {pharmacyProduct.price?.toLocaleString()}
          {CART_ITEMS_SECTION_COPY.currencyUnit}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(event) => {
            event.stopPropagation();
            const updated = buildDecrementedCartItems(cartItems, item);
            updateCartAndPersist(updated, onUpdateCart);
          }}
          className="leading-none w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg"
        >
          -
        </button>
        <span className="font-bold">{item.quantity}</span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            if (item.quantity < pharmacyProduct.stock) {
              const updated = buildIncrementedCartItems(cartItems, item);
              updateCartAndPersist(updated, onUpdateCart);
              return;
            }
            alert(
              buildStockLimitAlertMessage({
                pharmacyName: selectedPharmacyName,
                productName: product.name,
                optionType: pharmacyProduct.optionType,
              })
            );
          }}
          className="leading-none w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg"
        >
          +
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            const updated = buildRemovedCartItems(cartItems, item);
            updateCartAndPersist(updated, onUpdateCart);
          }}
          className="leading-none w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center"
        >
          <TrashIcon className="w-5 h-5 text-red-500" />
        </button>
      </div>
    </div>
  );
}
