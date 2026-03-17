import type { Dispatch, RefObject, SetStateAction } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type { OrderAccordionOrder, OrderMessage } from "@/components/order/orderAccordion.types";

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
