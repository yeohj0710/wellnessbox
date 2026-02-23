import type { Dispatch, RefObject, SetStateAction } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";
import type {
  OrderAccordionOrder,
  OrderLineItem,
  OrderMessage,
} from "@/components/order/orderAccordion.types";

type PharmOrderStatusActionsSectionProps = {
  order: OrderAccordionOrder;
  loadingStatus: number | null;
  onUpdateOrderStatus: (orderId: number, newStatus: OrderStatus) => Promise<void>;
  onCancelOrder: () => void;
};

export function PharmOrderStatusActionsSection({
  order,
  loadingStatus,
  onUpdateOrderStatus,
  onCancelOrder,
}: PharmOrderStatusActionsSectionProps) {
  if (
    order.status === ORDER_STATUS.PICKUP_COMPLETE ||
    order.status === ORDER_STATUS.DELIVERY_COMPLETE
  ) {
    return null;
  }

  const isStatusUpdating = loadingStatus === order.id;

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:gap-8 mt-12 -mb-6">
      <span className="text-lg font-bold text-gray-700">주문 상태 변경</span>
      <div className="flex gap-2 mt-4 sm:mt-0">
        <button
          onClick={() => void onUpdateOrderStatus(order.id, ORDER_STATUS.PAYMENT_COMPLETE)}
          className="text-sm flex justify-center items-center w-20 h-8 bg-sky-400 hover:bg-sky-500 text-white rounded"
          disabled={isStatusUpdating}
        >
          {isStatusUpdating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "상담 대기"
          )}
        </button>

        <button
          onClick={() => void onUpdateOrderStatus(order.id, ORDER_STATUS.COUNSEL_COMPLETE)}
          className="text-sm flex justify-center items-center w-20 h-8 bg-sky-500 hover:bg-sky-600 text-white rounded"
          disabled={isStatusUpdating}
        >
          {isStatusUpdating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "상담 완료"
          )}
        </button>

        <button
          onClick={() => void onUpdateOrderStatus(order.id, ORDER_STATUS.DISPENSE_COMPLETE)}
          className="text-sm flex justify-center items-center w-20 h-8 bg-sky-600 hover:bg-sky-700 text-white rounded"
          disabled={isStatusUpdating}
        >
          {isStatusUpdating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "조제 완료"
          )}
        </button>

        <button
          onClick={onCancelOrder}
          className="text-sm flex justify-center items-center w-20 h-8 bg-rose-400 hover:bg-rose-500 text-white rounded"
          disabled={isStatusUpdating}
        >
          {isStatusUpdating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "주문 취소"
          )}
        </button>
      </div>
    </div>
  );
}

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

type PharmOrderMessagesSectionProps = {
  order: OrderAccordionOrder;
  messages: OrderMessage[];
  newMessage: string;
  isSending: boolean;
  isMessagesRefreshing: boolean;
  messagesContainerRef: RefObject<HTMLDivElement>;
  refreshMessages: (manual?: boolean) => Promise<void>;
  handleScroll: () => void;
  handleDeleteMessage: (messageId: number) => Promise<void>;
  setNewMessage: Dispatch<SetStateAction<string>>;
  sendMessage: () => Promise<void>;
  sendCounselMessage: () => Promise<void>;
};

export function PharmOrderMessagesSection({
  order,
  messages,
  newMessage,
  isSending,
  isMessagesRefreshing,
  messagesContainerRef,
  refreshMessages,
  handleScroll,
  handleDeleteMessage,
  setNewMessage,
  sendMessage,
  sendCounselMessage,
}: PharmOrderMessagesSectionProps) {
  return (
    <div className="mt-8">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-700">상담 메시지</h2>
        <div className="flex flex-row gap-2">
          <button
            onClick={() => {
              if (window.confirm("복약지도 안내 메시지를 전송할까요?")) {
                void sendCounselMessage();
              }
            }}
            className="bg-orange-400 text-white text-sm px-2 py-0.5 rounded-full hover:bg-orange-500"
          >
            복약지도 안내 전송
          </button>
          <button
            onClick={() => void refreshMessages(true)}
            className="text-sm flex items-center gap-1 text-sky-400 hover:underline"
          >
            새로고침
            <ArrowPathIcon
              className={`w-5 h-5 ${isMessagesRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div
        className="mt-3 space-y-3 max-h-96 overflow-y-auto scrollbar-hide py-2"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${!message.pharmacyId ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`relative w-2/3 p-4 rounded-lg shadow-md ${
                  message.pharmacyId
                    ? "bg-sky-100 text-sky-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {message.pharmacyId ? (
                  <button
                    className="absolute top-1.5 right-2 text-gray-400 hover:text-gray-600 text-xs"
                    onClick={() => void handleDeleteMessage(message.id)}
                  >
                    삭제
                  </button>
                ) : null}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {message.pharmacyId ? order.pharmacy?.name : order.phone}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleString("ko-KR", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 text-sm my-10">
            아직 주고받은 메시지가 없어요.
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <textarea
          rows={1}
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          className="text-gray-600 flex-1 px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none overflow-hidden leading-normal"
          placeholder="메시지를 입력해 주세요..."
        />
        <button
          onClick={sendMessage}
          disabled={isSending}
          className={`px-2 w-14 bg-sky-400 hover:bg-sky-500 text-white rounded-lg flex items-center justify-center ${
            isSending ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "전송"
          )}
        </button>
      </div>
    </div>
  );
}

type PharmOrderCustomerInfoSectionProps = {
  order: OrderAccordionOrder;
};

export function PharmOrderCustomerInfoSection({
  order,
}: PharmOrderCustomerInfoSectionProps) {
  const createdAt =
    order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);

  return (
    <>
      <h3 className="mb-2 font-bold mt-8 border-t pt-6">주문자 정보</h3>
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
