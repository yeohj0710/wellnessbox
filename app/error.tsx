"use client";

import Image from "next/image";
import React from "react";

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen flex flex-col mt-[15vh] items-center px-12 text-center">
      <Image
        src="/logo.png"
        alt="웰니스박스"
        width={96}
        height={96}
        className="object-contain"
      />
      <h1 className="mt-8 text-xl sm:text-3xl font-bold text-gray-800">
        에러가 발생했어요.
      </h1>
      <p className="text-sm sm:text-base text-gray-600 mt-4 sm:mt-6">
        요청하신 페이지가 존재하지 않거나 삭제되었을 수 있어요.
      </p>
    </div>
  );
}
