export default function RefundPolicy() {
  return (
    <div className="mt-8 w-full max-w-[640px] mx-auto px-6 py-10 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-10 text-center">
        취소 및 환불 규정
      </h1>
      <ul className="list-disc pl-5 text-gray-700 leading-relaxed">
        <li>상품 주문 후 7일 이내에는 전액 환불이 가능합니다.</li>
        <li>포장이 훼손된 상품은 환불이 불가능합니다.</li>
        <li>환불 요청은 하단의 문의 연락처를 통해 접수하실 수 있습니다.</li>
      </ul>
    </div>
  );
}
