"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

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

type PaymentProps = {
  totalAmount: number;
};

export default function Payment({ totalAmount }: PaymentProps) {
  const [loading, setLoading] = useState(false);
  const [merchantUid] = useState(`mid_${new Date().getTime()}`);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  useEffect(() => {
    if (window.IMP) {
      setSdkLoaded(true);
    }
  }, []);
  const handlePayment = () => {
    if (!sdkLoaded || !window.IMP) {
      alert("포트원 SDK 로드 실패");
      return;
    }
    setLoading(true);
    try {
      const IMP = window.IMP;
      IMP.init(process.env.NEXT_PUBLIC_MERCHANT_ID!);
      IMP.request_pay(
        {
          pg: "uplus",
          pay_method: "card",
          merchant_uid: merchantUid,
          name: "건강기능식품 결제",
          amount: totalAmount,
          buyer_email: "buyer@example.com",
          buyer_name: "user",
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
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Script
        src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"
        onLoad={() => setSdkLoaded(true)}
        strategy="beforeInteractive"
      />
      <div className="flex flex-col items-center justify-center py-4 px-4">
        <h1 className="text-lg font-bold text-gray-800 mb-4">
          결제 금액: ₩{totalAmount.toLocaleString()}
        </h1>
        <button
          onClick={handlePayment}
          disabled={loading || !sdkLoaded}
          className={`w-full max-w-md bg-blue-500 text-white py-3 rounded-md shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition duration-300 ${
            loading || !sdkLoaded ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {loading ? "결제 처리 중..." : "결제하기"}
        </button>
      </div>
    </>
  );
}
