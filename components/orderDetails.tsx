import Image from "next/image";

export default function OrderDetails({
  orders,
  onBack,
}: {
  orders: any[];
  onBack: () => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">주문 내역</h1>
      <button
        onClick={onBack}
        className="mb-4 text-sky-400 font-bold hover:underline"
      >
        ← 돌아가기
      </button>
      {orders.map((order, index) => (
        <div key={index} className="border-b py-4">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            주문 번호: {order.idx}
          </h2>
          <p className="text-sm text-gray-500">상태: {order.status}</p>
          <p className="text-sm text-gray-500 mt-1">
            총 결제 금액: ₩{order.totalPrice.toLocaleString()}
          </p>
          <h3 className="text-sm font-bold mt-4">주문 상품:</h3>
          {order.orderItems.map((item: any, idx: number) => (
            <div key={idx} className="mt-2 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img
                  src={item.product.images?.[0] || "/placeholder.png"}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <p className="text-sm text-gray-700">{item.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.product.categories
                      .map((category: any) => category.name)
                      .join(", ")}
                  </p>
                  <p className="text-sm font-bold text-sky-400">
                    ₩{item.product.price.toLocaleString()} x {item.quantity}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-800">
                ₩{(item.product.price * item.quantity).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
