"use client";

import Image from "next/image";

type ErrorProps = {
  error: Error;
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="mt-[15vh] flex min-h-screen flex-col items-center px-6 text-center">
      <Image
        src="/logo.png"
        alt="웰니스박스 로고"
        width={96}
        height={96}
        className="object-contain"
      />
      <h1 className="mt-8 text-xl font-bold text-gray-800 sm:text-3xl">
        오류가 발생했어요
      </h1>
      <p className="mt-4 text-sm text-gray-600 sm:mt-6 sm:text-base">
        페이지를 불러오는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.
      </p>
      <p className="mt-3 max-w-xl break-words rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
        {error.message || "알 수 없는 오류"}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-600"
      >
        다시 시도
      </button>
    </div>
  );
}
