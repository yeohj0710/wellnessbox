import type { Dispatch, RefObject, SetStateAction } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import type {
  OrderAccordionOrder,
  OrderLineItem,
  OrderMessage,
} from "./orderAccordion.types";

type CustomerOrderItemsSectionProps = {
  order: OrderAccordionOrder;
};

export function CustomerOrderItemsSection({
  order,
}: CustomerOrderItemsSectionProps) {
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
                  {productPrice.toLocaleString()}원 x {quantity}
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
          {(typeof order.totalPrice === "number" ? order.totalPrice : 0).toLocaleString()}
          원
        </span>
      </div>
    </div>
  );
}

type CustomerOrderMessagesSectionProps = {
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
};

export function CustomerOrderMessagesSection({
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
}: CustomerOrderMessagesSectionProps) {
  return (
    <div className="mt-8">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-700">상담 메시지</h2>
        <button
          onClick={() => refreshMessages(true)}
          className="text-sm flex items-center gap-1 text-sky-400 hover:underline"
        >
          새로고침
          <ArrowPathIcon
            className={`w-5 h-5 ${isMessagesRefreshing ? "animate-spin" : ""}`}
          />
        </button>
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
              className={`flex ${message.pharmacyId ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`relative w-2/3 p-4 rounded-lg shadow-md ${
                  !message.pharmacyId
                    ? "bg-sky-100 text-sky-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {!message.pharmacyId && (
                  <button
                    className="absolute top-1.5 right-2 text-gray-400 hover:text-gray-600 text-xs"
                    onClick={() => handleDeleteMessage(message.id)}
                  >
                    삭제
                  </button>
                )}
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

type CustomerOrderPharmacySectionProps = {
  order: OrderAccordionOrder;
};

export function CustomerOrderPharmacySection({
  order,
}: CustomerOrderPharmacySectionProps) {
  return (
    <>
      <h3 className="mb-2 font-bold mt-8 border-t pt-6">약국 정보</h3>
      <div className="flex flex-col text-sm gap-1 mt-4">
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
