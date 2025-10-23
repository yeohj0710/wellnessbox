"use client";

import Image from "next/image";
import React from "react";

type Props = {
  className?: string;
  fullWidth?: boolean;
};

export default function KakaoLoginButton({ className = "", fullWidth }: Props) {
  const onClick = () => {
    window.location.href = "/api/auth/kakao/login";
  };

  // return (
  //   <button
  //     type="button"
  //     onClick={onClick}
  //     className={`inline-flex items-center gap-2 rounded-full bg-[#FEE500] text-black font-semibold px-4 py-2 shadow-sm hover:brightness-95 active:brightness-90 transition ${
  //       fullWidth ? "w-full justify-center" : ""
  //     } ${className}`}
  //     aria-label="카카오로 로그인"
  //   >
  //     <Image src="/kakao.svg" width={18} height={18} alt="Kakao" />
  //     <span>카카오로 로그인</span>
  //   </button>
  // );
}
