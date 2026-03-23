"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { navigateWithFallback } from "@/lib/client/navigation-fallback";

const footerLinks = [
  { href: "/about/terms", label: "이용약관" },
  { href: "/about/privacy", label: "개인정보처리방침" },
  { href: "/about/contact", label: "문의하기" },
];

const operatorLinks = [
  { href: "/pharm-login", label: "약국 로그인" },
  { href: "/rider-login", label: "라이더 로그인" },
  { href: "/admin-login", label: "관리자 로그인" },
];

const businessInfoRows = [
  "상호명: 주식회사 웰니스박스 | 대표자: 권혁찬",
  "사업자등록번호: 728-88-03267",
  "법인등록번호: 110111-0932570",
  "통신판매업신고: 제2025-서울동대문-1562호",
  "대표 전화번호: 02-6241-5530",
  "대표 이메일: wellnessbox.me@gmail.com",
  "주소: 서울특별시 동대문구 경희대로 26, 2층 211호(회기동, 삼익아침상센타)",
];

export default function Footer() {
  return (
    <Suspense fallback={null}>
      <FooterInner />
    </Suspense>
  );
}

function FooterInner() {
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  const businessInfoRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!showBusinessInfo) return;
    const timer = window.setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [showBusinessInfo]);

  const hoverUnderline =
    "relative text-slate-400 transition-colors duration-200 after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-slate-400 after:transition-transform after:duration-200 after:content-[''] hover:text-slate-200 hover:after:scale-x-100";

  const {
    href: languageToggleHref,
    label: languageToggleLabel,
    isEnglish,
  } = useMemo(() => {
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : pathname || "/";

    const englishMode = currentPath === "/en" || currentPath.startsWith("/en/");
    const basePath = englishMode
      ? currentPath.replace(/^\/en(\/)?/, "/") || "/"
      : currentPath === "/"
      ? "/en"
      : `/en${currentPath}`;

    return {
      href: basePath,
      label: englishMode ? "한국어로 보기" : "View in English",
      isEnglish: englishMode,
    };
  }, [pathname]);

  const handleLanguageToggle = useCallback(() => {
    if (isEnglish) {
      document.cookie = "wb-locale=; path=/; max-age=0";
    } else {
      const maxAge = 60 * 60 * 24 * 30;
      document.cookie = `wb-locale=en; path=/; max-age=${maxAge}`;
    }

    try {
      window.dispatchEvent(new Event("wb-locale-change"));
    } catch {}

    if (isEnglish) {
      window.location.assign(languageToggleHref);
      return;
    }

    navigateWithFallback(router, languageToggleHref);
  }, [isEnglish, languageToggleHref, router]);

  const handleForceRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <footer className="w-full bg-slate-900 text-sm text-slate-300">
      <div
        className={[
          "mx-auto w-full max-w-[1120px] px-5 py-6 sm:px-6 sm:py-7 lg:pr-56",
          showBusinessInfo
            ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-7"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:gap-10">
            <div className="flex w-full flex-col items-center text-center sm:items-start sm:text-left">
              <Link href="/" className="inline-block">
                <div className="relative mb-2 inline-block h-10 w-10">
                  <Image
                    src="/logo.png"
                    alt="웰니스박스 로고"
                    fill
                    sizes="128px"
                    className="object-contain hover:animate-bounce-custom"
                  />
                </div>
              </Link>

              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:justify-start">
                {footerLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${hoverUnderline} text-sm`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="mt-1.5 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:justify-start">
                {operatorLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${hoverUnderline} text-sm`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="mt-1.5 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:justify-start">
                <button
                  type="button"
                  onClick={handleLanguageToggle}
                  className={`${hoverUnderline} text-sm`}
                >
                  {languageToggleLabel}
                </button>
                <button
                  type="button"
                  onClick={handleForceRefresh}
                  className={`${hoverUnderline} text-sm`}
                >
                  강제 새로고침
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-slate-400 sm:text-left">
                © 2025 웰니스박스. All rights reserved.
              </p>
            </div>
          </div>

          <section className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowBusinessInfo((prev) => !prev)}
              className="group flex w-full max-w-[29rem] items-start justify-between gap-4 text-left transition"
              aria-expanded={showBusinessInfo}
              aria-controls="footer-business-info"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Business
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-100">사업자 정보</p>
                  <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden />
                  <span className="text-xs text-slate-400">
                    {showBusinessInfo ? "닫기" : "자세히 보기"}
                  </span>
                </div>
              </div>

              <div className="mt-1 flex shrink-0 items-center gap-2 text-slate-300 transition group-hover:text-slate-100">
                <span className="text-xs font-medium">
                  {showBusinessInfo ? "닫기" : "Open"}
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                    showBusinessInfo ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            <div
              id="footer-business-info"
              ref={businessInfoRef}
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: showBusinessInfo ? "420px" : "0px" }}
            >
              <div className="mt-4 rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-[1px]">
                <div className="rounded-[calc(1.6rem-1px)] bg-slate-800/90 p-4 shadow-[0_18px_40px_rgba(2,6,23,0.18)] backdrop-blur sm:p-5">
                  <div className="mb-3 flex flex-col gap-1 border-b border-white/8 pb-3 sm:flex-row sm:items-end sm:justify-between">
                    <p className="text-sm font-semibold text-slate-100">
                      웰니스박스 사업자 정보
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      WellnessBox Operator Snapshot
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2">
                    {businessInfoRows.map((row, index) => (
                      <p
                        key={row}
                        className={[
                          "text-xs leading-5 text-slate-300",
                          index === businessInfoRows.length - 1
                            ? "sm:col-span-2"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {row}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </footer>
  );
}
