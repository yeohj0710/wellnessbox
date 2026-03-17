import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";
import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";

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
