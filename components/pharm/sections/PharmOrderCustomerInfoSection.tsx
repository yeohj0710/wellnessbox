import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";

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
