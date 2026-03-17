import Image from "next/image";
import type { OrderAccordionOrder, OrderLineItem } from "@/components/order/orderAccordion.types";

type PharmOrderItemsSectionProps = {
  order: OrderAccordionOrder;
};

export function PharmOrderItemsSection({ order }: PharmOrderItemsSectionProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-700 mb-4 mt-12">주문 상세 내역</h2>
      {order.orderItems.map((orderItem: OrderLineItem, orderIndex: number) => {
        const pharmacyProduct = orderItem.pharmacyProduct;
        const product = pharmacyProduct?.product;
        const productImage = product?.images?.[0] || "/placeholder.png";
        const productName = product?.name || "상품";
        const optionType = pharmacyProduct?.optionType || "-";
        const productCategories = product?.categories?.length
          ? product.categories
              .map((category) => category.name || "")
              .filter(Boolean)
              .join(", ")
          : "옵션 없음";

        const price = typeof pharmacyProduct?.price === "number" ? pharmacyProduct.price : 0;
        const quantity = typeof orderItem.quantity === "number" ? orderItem.quantity : 0;
        const totalPrice = price * quantity;

        return (
          <div
            key={orderIndex}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <Image
                  src={productImage}
                  alt={productName}
                  fill
                  sizes="128px"
                  className="object-cover rounded-lg"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  {productName} ({optionType})
                </h3>
                <p className="text-xs text-gray-500">{productCategories}</p>
                <p className="text-sm font-bold text-sky-400 mt-1">
                  {price.toLocaleString()}원 x{" "}
                  <span className="text-rose-500">{quantity}</span>
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-sky-400">{totalPrice.toLocaleString()}원</p>
          </div>
        );
      })}
      <div className="flex justify-end text-sm text-gray-600">
        <span>배송비</span>
        <span className="font-bold ml-2">3,000원</span>
      </div>
      <div className="flex justify-end gap-2 text-base font-bold mt-2">
        <span className="text-gray-700">총 결제 금액</span>
        <span className="text-sky-400">
          {(typeof order.totalPrice === "number" ? order.totalPrice : 0).toLocaleString()}원
        </span>
      </div>
    </div>
  );
}
