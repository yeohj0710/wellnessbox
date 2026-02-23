import Image from "next/image";
import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";
import type {
  OrderAccordionOrder,
  OrderLineItem,
} from "@/components/order/orderAccordion.types";

type RiderOrderStatusActionsSectionProps = {
  order: OrderAccordionOrder;
  loadingStatus: number | null;
  onUpdateOrderStatus: (orderId: number, newStatus: OrderStatus) => Promise<void>;
  onCancelPickup: () => void;
};

export function RiderOrderStatusActionsSection({
  order,
  loadingStatus,
  onUpdateOrderStatus,
  onCancelPickup,
}: RiderOrderStatusActionsSectionProps) {
  const isLoading = loadingStatus === order.id;

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:gap-8 mt-12 mb-6">
      <span className="text-lg font-bold text-gray-700">주문 상태 변경</span>
      <div className="flex gap-2 mt-4 sm:mt-0">
        <button
          onClick={() => void onUpdateOrderStatus(order.id, ORDER_STATUS.PICKUP_COMPLETE)}
          className="text-sm flex justify-center items-center w-20 h-8 bg-orange-400 hover:bg-orange-500 text-white rounded"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "픽업 완료"
          )}
        </button>
        <button
          onClick={() => void onUpdateOrderStatus(order.id, ORDER_STATUS.DELIVERY_COMPLETE)}
          className="text-sm flex justify-center items-center w-20 h-8 bg-gray-400 hover:bg-gray-500 text-white rounded"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "배송 완료"
          )}
        </button>
        <button
          onClick={onCancelPickup}
          className="text-sm flex justify-center items-center w-20 h-8 bg-red-400 hover:bg-red-500 text-white rounded"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "픽업 취소"
          )}
        </button>
      </div>
    </div>
  );
}

type RiderOrderItemsSectionProps = {
  order: OrderAccordionOrder;
};

export function RiderOrderItemsSection({ order }: RiderOrderItemsSectionProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-700 mb-4 mt-4">주문 상세 내역</h2>
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
        const productPrice =
          typeof pharmacyProduct?.price === "number" ? pharmacyProduct.price : 0;
        const quantity = typeof orderItem.quantity === "number" ? orderItem.quantity : 0;
        const totalPrice = (productPrice * quantity).toLocaleString();

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
                  {productPrice.toLocaleString()}원 x{" "}
                  <span className="text-rose-500">{quantity}</span>
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-sky-400">{totalPrice}원</p>
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

type RiderOrderPharmacyInfoSectionProps = {
  order: OrderAccordionOrder;
};

export function RiderOrderPharmacyInfoSection({
  order,
}: RiderOrderPharmacyInfoSectionProps) {
  return (
    <>
      <h3 className="mb-2 font-bold mt-4 border-t pt-4">약국 정보</h3>
      <div className="flex flex-col text-sm gap-1 mt-4 mb-6">
        <div className="flex items-center">
          <span className="w-20 font-bold text-gray-500">약국명</span>
          <span className="flex-1 text-gray-800">{order.pharmacy?.name}</span>
        </div>
        <div className="flex items-center">
          <span className="w-20 font-bold text-gray-500">약국 주소</span>
          <span className="flex-1 text-gray-800">{order.pharmacy?.address}</span>
        </div>
        <div className="flex items-center">
          <span className="w-20 font-bold text-gray-500">전화번호</span>
          <span className="flex-1 text-gray-800">{order.pharmacy?.phone}</span>
        </div>
      </div>
    </>
  );
}

type RiderOrderCustomerInfoSectionProps = {
  order: OrderAccordionOrder;
};

export function RiderOrderCustomerInfoSection({
  order,
}: RiderOrderCustomerInfoSectionProps) {
  const createdAt =
    order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);

  return (
    <>
      <h3 className="mb-2 font-bold mt-4 border-t pt-4">주문자 정보</h3>
      <div className="flex flex-col text-sm gap-1 mt-4">
        <div className="flex items-center">
          <span className="w-32 font-bold text-gray-500">주소</span>
          <span className="flex-1 text-gray-800">
            {order.roadAddress} {order.detailAddress}
          </span>
        </div>
        <div className="flex items-center">
          <span className="w-32 font-bold text-gray-500">연락처</span>
          <span className="flex-1 text-gray-800">{order.phone}</span>
        </div>
        <div className="flex items-center">
          <span className="w-32 font-bold text-gray-500">주문일시</span>
          <span className="flex-1 text-gray-800">
            {Number.isNaN(createdAt.getTime())
              ? "-"
              : createdAt.toLocaleString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
          </span>
        </div>
        <div className="flex items-center">
          <span className="w-32 font-bold text-gray-500">배송 시 요청 사항</span>
          <span className="flex-1 text-gray-800">{order.requestNotes || "없음"}</span>
        </div>
        <div className="flex items-center">
          <span className="w-32 font-bold text-gray-500">공동현관 비밀번호</span>
          <span className="flex-1 text-gray-800">{order.entrancePassword || "없음"}</span>
        </div>
        <div className="flex items-center">
          <span className="w-32 font-bold text-gray-500">찾아오는 길 안내</span>
          <span className="flex-1 text-gray-800">{order.directions || "없음"}</span>
        </div>
      </div>
    </>
  );
}
