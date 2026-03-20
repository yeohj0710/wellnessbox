"use client";

import Image from "next/image";
import { useCallback } from "react";
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

      const url = buildAbsoluteUrl(KAKAO_APP_LOGIN_PATH, resolvePublicBaseUrl());
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
      className={`inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border border-black/5 bg-[#FEE500] px-5 text-black shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition hover:-translate-y-0.5 hover:brightness-[0.98] hover:shadow-[0_14px_30px_rgba(17,24,39,0.12)] active:translate-y-0 active:brightness-95 ${
        compact
          ? "text-[14px] font-bold tracking-[-0.01em]"
          : "text-sm font-semibold tracking-[-0.01em]"
      } ${fullWidth ? "w-full justify-center" : "shrink-0"} ${className}`}
      aria-label="카카오로 로그인"
    >
      <Image src="/kakao.svg" width={18} height={18} alt="Kakao" />
      <span className="leading-none">카카오로 로그인</span>
    </button>
  );
}
