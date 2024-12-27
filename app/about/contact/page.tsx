"use client";

export default function Contact() {
  return (
    <div className="w-full max-w-[640px] mx-auto px-6 py-10 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-10 text-center">
        문의하기
      </h1>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">이메일</h2>
      <p className="text-gray-700 leading-relaxed mb-8">
        <a
          href="mailto:smilerobert@naver.com"
          className="text-sky-500 hover:underline"
        >
          smilerobert@naver.com
        </a>
      </p>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">전화</h2>
      <p className="text-gray-700 leading-relaxed mb-8">010-7603-8164</p>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">주소</h2>
      <p className="text-gray-700 leading-relaxed">
        서울특별시 서초구 반포대로19길 10
      </p>
    </div>
  );
}
