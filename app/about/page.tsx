"use client";

export default function About() {
  return (
    <div className="w-full max-w-[640px] mx-auto px-6 py-10 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-10 text-center">
        맞춤형 건강기능식품 소분 판매 중개 플랫폼, 웰니스박스
      </h1>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">소개</h2>
      <p className="text-gray-700 leading-relaxed mb-6">
        웰니스박스는 고객님의 건강을 최우선으로 생각하는 맞춤형 건강기능식품
        소분 판매 중개 플랫폼입니다. 최신 기술과 전문 상담을 통해 개인별 건강
        상태에 적합한 건강기능식품을 추천하며, 신뢰할 수 있는 품질을 보장합니다.
        고객의 건강과 행복을 위해 항상 노력하며, 지속 가능한 미래를 만들어
        나가겠습니다.
      </p>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        취소 및 환불 규정
      </h2>
      <ul className="list-disc pl-5 text-gray-700 leading-relaxed mb-6">
        <li>상품 주문 후 7일 이내에는 전액 환불이 가능합니다.</li>
        <li>포장이 훼손된 상품은 환불이 불가능합니다.</li>
        <li>환불 요청은 고객센터를 통해 접수하셔야 합니다.</li>
      </ul>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">문의하기</h2>
      <p className="text-gray-700 leading-relaxed">
        이메일:{" "}
        <a
          href="mailto:smilerobert@naver.com"
          className="text-sky-500 hover:underline"
        >
          smilerobert@naver.com
        </a>
        <br />
        전화: 010-7603-8164
        <br />
        주소: 서울특별시 서초구 반포대로19길 10
      </p>
    </div>
  );
}
