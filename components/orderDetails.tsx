import React, { useState, useEffect } from "react";
import { createMessage, getMessagesByOrder } from "@/lib/message";

export default function OrderDetails({
  orders,
  onBack,
}: {
  orders: any[];
  onBack: () => void;
}) {
  const steps = [
    { label: "결제 완료" },
    { label: "상담 완료" },
    { label: "조제 완료" },
    { label: "픽업 완료" },
    { label: "배송 완료" },
  ];
  const [currentOrder, setCurrentOrder] = useState(orders[0]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  useEffect(() => {
    setCurrentOrder(orders[0]);
    async function fetchMessages() {
      const msgs = await getMessagesByOrder(orders[0].idx);
      setMessages(msgs);
    }
    fetchMessages();
  }, [orders]);
  const getStatusClass = (step: number, currentStatus: string) => {
    const currentStepIndex =
      steps.findIndex((s) => s.label === currentStatus) + 1;
    return step < currentStepIndex
      ? "bg-sky-400 text-white"
      : step === currentStepIndex
      ? "bg-sky-400 text-white"
      : "bg-gray-200 text-gray-500";
  };
  const getLineClass = (step: number, currentStatus: string) => {
    const currentStepIndex =
      steps.findIndex((s) => s.label === currentStatus) + 1;
    return step < currentStepIndex
      ? "bg-sky-400"
      : step === currentStepIndex
      ? "bg-sky-400 animate-pulse shadow-lg"
      : "bg-gray-200";
  };
  const getLineText = (step: number) => {
    switch (step) {
      case 1:
        return "상담 진행 중";
      case 2:
        return "조제 진행 중";
      case 3:
        return "픽업 대기 중";
      case 4:
        return "배송 중";
      default:
        return "진행 중";
    }
  };
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const messageData = {
      orderId: currentOrder.idx,
      content: newMessage,
      pharmacyId: null,
    };
    const newMsg = await createMessage(messageData);
    setMessages((prev) => [...prev, newMsg]);
    setNewMessage("");
  };
  return (
    <div className="-mb-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">내 주문 조회</h1>
        <button
          onClick={onBack}
          className="text-sky-400 font-bold hover:underline"
        >
          ← 돌아가기
        </button>
      </div>
      <div className="mt-16 sm:mt-12">
        <div className="flex items-center mb-6 -mx-4 sm:mx-0">
          {steps.map((step, stepIndex) => (
            <React.Fragment key={stepIndex}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold ${getStatusClass(
                    stepIndex + 1,
                    currentOrder.status
                  )}`}
                >
                  {stepIndex + 1}
                </div>
                <span className="whitespace-nowrap mt-2 text-xs text-center">
                  {step.label}
                </span>
              </div>
              {stepIndex < steps.length - 1 && (
                <div className="relative flex items-center justify-center flex-1">
                  <div
                    className={`mb-5 h-1 w-full ${getLineClass(
                      stepIndex + 1,
                      currentOrder.status
                    )}`}
                  />
                  <span className="absolute text-center bottom-[28px] text-xs text-gray-500">
                    {getLineText(stepIndex + 1)}
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-700 mb-4 mt-12">
            주문 상세 내역
          </h2>
          {currentOrder.orderItems.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <img
                  src={item.product.images?.[0] || "/placeholder.png"}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    {item.product.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {item.product.categories
                      .map((category: any) => category.name)
                      .join(", ") || "옵션 없음"}
                  </p>
                  <p className="text-sm font-bold text-sky-400 mt-1">
                    ₩{item.product.price.toLocaleString()} x {item.quantity}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-sky-400">
                ₩{(item.product.price * item.quantity).toLocaleString()}
              </p>
            </div>
          ))}
          <div className="flex justify-end mt-4 text-sm text-gray-600">
            <span>배송비</span>
            <span className="font-bold ml-2">₩3,000</span>
          </div>
          <div className="mt-4 text-right">
            <p className="text-base text-gray-600">
              주소: {currentOrder.roadAddress} {currentOrder.detailAddress}
            </p>
            <p className="text-base text-gray-600 mt-1">
              연락처: {currentOrder.phone}
            </p>
            <h3 className="flex justify-end gap-2 text-lg font-bold mt-2">
              <span className="text-gray-700">총 결제 금액</span>
              <span className="text-sky-400">
                ₩{currentOrder.totalPrice.toLocaleString()}
              </span>
            </h3>
          </div>
        </div>

        {/* 메시지 섹션 */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-gray-700 mb-4">상담 메시지</h2>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.pharmacyId
                    ? "bg-sky-100 text-sky-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {message.pharmacyId ? "약국" : "소비자"} -{" "}
                  {new Date(message.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
              placeholder="메시지를 입력하세요..."
            />
            <button
              onClick={sendMessage}
              className="p-2 bg-sky-400 text-white rounded-lg"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
