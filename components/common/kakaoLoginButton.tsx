"use client";

import Image from "next/image";
import React, { useCallback } from "react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import {
  KAKAO_APP_LOGIN_PATH,
  KAKAO_CONTEXT_COOKIE,
  KAKAO_WEB_LOGIN_PATH,
} from "@/lib/auth/kakao/constants";
import { buildAbsoluteUrl, resolvePublicBaseUrl } from "@/lib/shared/url";

type Props = {
  className?: string;
  fullWidth?: boolean;
};

function markAppContext() {
  const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString();
  document.cookie = `${KAKAO_CONTEXT_COOKIE}=app; Path=/; SameSite=Lax; Expires=${expires}`;
}

export default function KakaoLoginButton({ className = "", fullWidth }: Props) {
  const onClick = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      markAppContext();

      const url = buildAbsoluteUrl(
        KAKAO_APP_LOGIN_PATH,
        resolvePublicBaseUrl()
      );
      try {
        await Browser.open({ url });
        return;
      } catch {
        window.location.href = url;
        return;
      }
    }

    window.location.href = KAKAO_WEB_LOGIN_PATH;
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full bg-[#FEE500] text-black font-semibold px-4 py-2 shadow-sm hover:brightness-95 active:brightness-90 transition ${
        fullWidth ? "w-full justify-center" : ""
      } ${className}`}
      aria-label="카카오로 로그인"
    >
      <Image src="/kakao.svg" width={18} height={18} alt="Kakao" />
      <span>카카오로 로그인</span>
    </button>
  );
}
