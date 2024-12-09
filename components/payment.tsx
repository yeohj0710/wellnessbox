"use client";

import { useState } from "react";

declare global {
  interface Window {
    IMP: {
      init: (merchantId: string) => void;
      request_pay: (
        options: {
          pg: string;
          pay_method: string;
          merchant_uid: string;
          name: string;
          amount: number;
          buyer_email: string;
          buyer_name: string;
          buyer_tel: string;
          buyer_addr: string;
          buyer_postcode: string;
        },
        callback: (response: {
          success: boolean;
          imp_uid?: string;
          error_msg?: string;
        }) => void
      ) => void;
    };
  }
}

export default function Payment() {
  const [amount, setAmount] = useState(1000);
  const [merchantUid] = useState(`mid_${new Date().getTime()}`);
  const handlePayment = () => {
    if (!window.IMP) {
      alert("포트원 SDK 로드 실패");
      return;
    }
    const IMP = window.IMP;
    IMP.init(process.env.NEXT_PUBLIC_MERCHANT_ID!);
    IMP.request_pay(
      {
        pg: "uplus",
        pay_method: "card",
        merchant_uid: merchantUid,
        name: "건강기능식품 결제",
        amount,
        buyer_email: "buyer@example.com",
        buyer_name: "홍길동",
        buyer_tel: "010-1234-5678",
        buyer_addr: "서울 강남구 삼성동",
        buyer_postcode: "123-456",
      },
      (rsp: { success: boolean; imp_uid?: string; error_msg?: string }) => {
        if (rsp.success) {
          alert(`결제가 완료되었습니다! 결제 ID: ${rsp.imp_uid}`);
        } else {
          alert(`결제에 실패하였습니다. 에러 메시지: ${rsp.error_msg}`);
        }
      }
    );
  };
  return (
    <div className="flex flex-col items-center justify-center py-4 px-4 bg-gray-50">
      <h1 className="text-lg font-bold text-gray-800 mb-4">결제 테스트</h1>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        placeholder="결제 금액 입력"
        className="w-full max-w-md p-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
      />
      <button
        onClick={handlePayment}
        className="w-full max-w-md bg-blue-500 text-white py-3 rounded-md shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition duration-300"
      >
        결제하기
      </button>
    </div>
  );
}
