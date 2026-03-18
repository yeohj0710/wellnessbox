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
  compact?: boolean;
};

function markAppContext() {
  const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString();
  document.cookie = `${KAKAO_CONTEXT_COOKIE}=app; Path=/; SameSite=Lax; Expires=${expires}`;
}

export default function KakaoLoginButton({
  className = "",
  fullWidth,
  compact = false,
}: Props) {
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
      className={`inline-flex min-h-12 items-center gap-2.5 rounded-2xl bg-[#FEE500] px-4 text-black shadow-sm transition hover:brightness-95 active:brightness-90 ${
        compact ? "py-3 text-[15px] font-bold" : "py-3 text-sm font-semibold"
      } ${
        fullWidth ? "w-full justify-center" : ""
      } ${className}`}
      aria-label="카카오로 로그인"
    >
      <Image src="/kakao.svg" width={18} height={18} alt="Kakao" />
      <span className="leading-none">카카오로 로그인</span>
    </button>
  );
}
