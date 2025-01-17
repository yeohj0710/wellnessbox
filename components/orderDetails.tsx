import React, { useState, useEffect, useRef } from "react";
import {
  createMessage,
  deleteMessage,
  getMessagesByOrder,
} from "@/lib/message";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  getOrderById,
  getOrderStatusById,
  getOrdersWithItemsAndStatus,
} from "@/lib/order";
import OrderProgressBar from "./orderProgressBar";
import OrderAccordionHeader from "./orderAccordionHeader";
import FullPageLoader from "./fullPageLoader";

export default function OrderDetails({ phone, password, onBack }: any) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any>([]);
  useEffect(() => {
    const fetchBasicOrderInfo = async () => {
      const basickOrderInfo = await getOrdersWithItemsAndStatus(
        phone,
        password
      );
      setOrders(basickOrderInfo);
      setLoading(false);
    };
    fetchBasicOrderInfo();
  }, [phone, password]);
  const OrderAccordionItem = ({
    initialOrder,
    isInitiallyExpanded,
  }: {
    initialOrder: any;
    isInitiallyExpanded: boolean;
  }) => {
    const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
    const [order, setOrder] = useState(initialOrder);
    const [isLoaded, setIsLoaded] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isMessagesRefreshing, setIsMessagesRefreshing] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<number | null>(null);
    const [isStateRefreshing, setIsStateRefreshing] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (!isExpanded || isLoaded) return;
      async function fetchDetailsAndMessages() {
        const [detailedOrder, msgs] = await Promise.all([
          getOrderById(initialOrder.idx),
          getMessagesByOrder(initialOrder.idx),
        ]);
        setOrder(detailedOrder);
        setMessages(msgs);
        setIsLoaded(true);
      }
      fetchDetailsAndMessages();
    }, [isExpanded, isLoaded]);
    useEffect(() => {
      if (!isExpanded || !isLoaded) return;
      const intervalId = setInterval(() => {
        refreshOrderStatus();
      }, 10000);
      return () => clearInterval(intervalId);
    }, [isExpanded, isLoaded]);
    useEffect(() => {
      if (!isExpanded) return;
      const intervalId = setInterval(() => {
        refreshMessages();
      }, 60000);
      return () => clearInterval(intervalId);
    }, [isExpanded, isLoaded]);
    useEffect(() => {
      if (!isExpanded || !isLoaded) return;
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    }, [isExpanded, isLoaded, messages]);
    const toggleExpanded = () => {
      setIsExpanded((prev) => !prev);
    };
    const refreshOrderStatus = async (manual: boolean = false) => {
      try {
        const updatedStatus = await getOrderStatusById(order.idx);
        setOrder((prev: any) => ({
          ...prev,
          status: updatedStatus?.status,
        }));
      } catch (err) {
        console.error(err);
      } finally {
        if (manual) setIsStateRefreshing(false);
      }
    };
    const refreshMessages = async (manual: boolean = false) => {
      if (manual) setIsMessagesRefreshing(true);
      try {
        const msgs = await getMessagesByOrder(order.idx);
        setMessages(msgs);
      } catch (err) {
        console.error(err);
      } finally {
        if (manual) setIsMessagesRefreshing(false);
      }
    };
    const sendMessage = async () => {
      if (!newMessage.trim() || isSending) return;
      setIsSending(true);
      const messageData = {
        orderId: order.idx,
        content: newMessage,
      };
      try {
        const newMsg = await createMessage(messageData);
        setMessages((prev) => [...prev, newMsg]);
        setNewMessage("");
      } catch (error) {
        console.error(error);
        alert("메시지 전송에 실패했습니다.");
      } finally {
        setIsSending(false);
      }
    };
    const handleDeleteMessage = async (messageId: number) => {
      const confirmDelete = window.confirm("정말로 메시지를 삭제하시겠습니까?");
      if (!confirmDelete) return;
      try {
        await deleteMessage(messageId);
        setMessages((prevMessages) =>
          prevMessages.filter((message) => message.idx !== messageId)
        );
      } catch (error) {
        console.error(error);
        alert("메시지 삭제에 실패했습니다.");
      }
    };
    if (isExpanded && !isLoaded) {
      return (
        <div className="w-full max-w-[640px] mx-auto px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
          <OrderAccordionHeader
            order={order}
            isExpanded={isExpanded}
            toggle={toggleExpanded}
          />
          <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
            <div className="flex justify-center items-center mt-2 mb-6">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full max-w-[640px] mx-auto px-6 py-6 bg-white sm:shadow-md sm:rounded-lg">
        <OrderAccordionHeader
          order={order}
          isExpanded={isExpanded}
          toggle={toggleExpanded}
        />
        {isExpanded && (
          <div className="mt-4 border-t sm:px-4 pt-16 sm:pt-12 pb-4">
            <OrderProgressBar currentStatus={order.status} />
            <div>
              <h2 className="text-lg font-bold text-gray-700 mb-4 mt-12">
                주문 상세 내역
              </h2>
              {order.orderItems.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between mb-6"
                >
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
                        {item.product.categories?.length
                          ? item.product.categories
                              .map((category: any) => category.name)
                              .join(", ")
                          : "옵션 없음"}
                      </p>
                      <p className="text-sm font-bold text-sky-400 mt-1">
                        ₩{item.product.price.toLocaleString()}
                        <span className="text-rose-600">
                          {" "}
                          x {item.quantity}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-sky-400">
                    ₩{(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
              <div className="flex justify-end text-sm text-gray-600">
                <span>배송비</span>
                <span className="font-bold ml-2">₩3,000</span>
              </div>
              <div className="flex justify-end gap-2 text-base font-bold mt-2">
                <span className="text-gray-700">총 결제 금액</span>
                <span className="text-sky-400">
                  ₩{order.totalPrice.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-8">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-700">상담 메시지</h2>
                <button
                  onClick={() => refreshMessages(true)}
                  className="text-sm flex items-center gap-1 text-sky-400 hover:underline"
                >
                  새로고침
                  <ArrowPathIcon
                    className={`w-5 h-5 ${
                      isMessagesRefreshing ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
              <div
                className="mt-3 space-y-3 max-h-96 overflow-y-auto scrollbar-hide py-2"
                ref={messagesContainerRef}
              >
                {messages.length > 0 ? (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.pharmacyId ? "justify-start" : "justify-end"
                      }`}
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
                            className="absolute top-1.5 right-2 text-gray-400 hover:text-gray-600 text-xs cursor:pointer"
                            onClick={() => handleDeleteMessage(message.idx)}
                          >
                            ✕
                          </button>
                        )}
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            {message.pharmacyId
                              ? order.pharmacy?.name
                              : order.phone}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(message.timestamp).toLocaleString(
                              "ko-KR",
                              {
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 text-sm my-10">
                    메시지가 없습니다.
                  </p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <textarea
                  rows={1}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none overflow-hidden leading-normal"
                  placeholder="메시지를 입력하세요..."
                />
                <button
                  onClick={sendMessage}
                  disabled={isSending}
                  className={`px-2 w-14 bg-sky-400 hover:bg-sky-500 text-white rounded-lg flex items-center justify-center ${
                    isSending ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "전송"
                  )}
                </button>
              </div>
            </div>
            <div className="mt-6 border-t pt-6">
              <h3 className="font-bold placeholder:after:text-lg mb-2">
                약국 정보
              </h3>
              <div className="space-y-1">
                <p className="text-sm text-gray-800">
                  <span className="text-gray-600">약국명: </span>
                  {order.pharmacy?.name}
                </p>
                <p className="text-sm text-gray-800">
                  <span className="text-gray-600">약국 주소: </span>
                  {order.pharmacy?.address}
                </p>
                <p className="text-sm text-gray-800">
                  <span className="text-gray-600">전화번호: </span>
                  {order.pharmacy?.phone}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  if (loading) return <FullPageLoader />;
  return (
    <div className="w-full flex flex-col gap-4">
      {orders.map((order: any, index: number) => (
        <OrderAccordionItem
          key={order.idx}
          initialOrder={order}
          isInitiallyExpanded={index === 0}
        />
      ))}
    </div>
  );
}
