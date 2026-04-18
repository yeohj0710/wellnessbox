"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import SmoothAccordion from "@/components/common/SmoothAccordion.client";
import { navigateWithFallback } from "@/lib/client/navigation-fallback";
import {
  BUSINESS_ADDRESS,
  BUSINESS_CORPORATE_REGISTRATION_NUMBER,
  BUSINESS_LEGAL_NAME,
  BUSINESS_MAIL_ORDER_REPORT_NUMBER,
  BUSINESS_REGISTRATION_NUMBER,
  BUSINESS_REPRESENTATIVE_NAME,
  BUSINESS_SUPPORT_EMAIL,
  BUSINESS_SUPPORT_PHONE,
} from "@/lib/site-identity";

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
  { label: "운영 사업자", value: BUSINESS_LEGAL_NAME },
  { label: "대표자", value: BUSINESS_REPRESENTATIVE_NAME },
  { label: "사업자등록번호", value: BUSINESS_REGISTRATION_NUMBER },
  { label: "법인등록번호", value: BUSINESS_CORPORATE_REGISTRATION_NUMBER },
  { label: "통신판매업신고", value: BUSINESS_MAIL_ORDER_REPORT_NUMBER },
  { label: "대표 전화", value: BUSINESS_SUPPORT_PHONE },
  { label: "대표 이메일", value: BUSINESS_SUPPORT_EMAIL },
  { label: "주소", value: BUSINESS_ADDRESS },
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
  const pathname = usePathname();
  const router = useRouter();

  const quietLinkClass =
    "text-sm text-slate-300 transition-colors duration-200 hover:text-white";

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
    <footer className="relative w-full overflow-hidden border-t border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.06),transparent_24%),linear-gradient(180deg,#101728_0%,#0b1220_100%)] text-sm text-slate-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/30 to-transparent" />

      <div className="mx-auto w-full max-w-[640px] px-4 py-8 pb-28 sm:py-10 sm:pb-10">
        <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-10">
          <div className="min-w-0">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="relative h-11 w-11 overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/6">
                <Image
                  src="/logo.png"
                  alt="웰니스박스 로고"
                  fill
                  sizes="44px"
                  className="object-contain p-2"
                />
              </span>
              <span className="text-base font-semibold text-white">웰니스박스</span>
            </Link>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
              {footerLinks.map((link) => (
                <Link key={link.href} href={link.href} className={quietLinkClass}>
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
              <button
                type="button"
                onClick={handleLanguageToggle}
                className={quietLinkClass}
              >
                {languageToggleLabel}
              </button>
              <button
                type="button"
                onClick={handleForceRefresh}
                className={quietLinkClass}
              >
                강제 새로고침
              </button>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              © 2025 웰니스박스. All rights reserved.
            </p>
          </div>

          <div className="grid gap-8 sm:min-w-[10.5rem] sm:justify-items-start">
            <FooterLinkBlock title="Operator" links={operatorLinks} />
          </div>
        </div>

        <section className="mt-8 border-t border-white/8 pt-6">
          <SmoothAccordion
            open={showBusinessInfo}
            onToggle={() => setShowBusinessInfo((prev) => !prev)}
            className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.02] shadow-[0_18px_40px_-30px_rgba(15,23,42,0.6)] backdrop-blur-sm"
            buttonClassName="group items-center px-4 py-4 sm:px-5"
            panelClassName="border-t border-white/8"
            panelInnerClassName="px-4 pb-4 pt-4 sm:px-5 sm:pb-5"
            summary={
              <>
                <p className="text-base font-semibold leading-none text-white sm:leading-none">
                  사업자 정보
                </p>
              </>
            }
            indicator={
              <span className="inline-flex min-w-[5.5rem] items-center justify-center gap-2 self-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-200 transition-[border-color,background-color,color] duration-300 group-hover:border-sky-300/30 group-hover:bg-sky-300/10 group-hover:text-white">
                <span>{showBusinessInfo ? "접기" : "열기"}</span>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform duration-300 ${
                    showBusinessInfo ? "rotate-180" : ""
                  }`}
                />
              </span>
            }
          >
            <div className="grid gap-x-8 gap-y-4 pb-1 sm:grid-cols-2 lg:grid-cols-3">
              {businessInfoRows.map((row, index) => (
                <div
                  key={row.label}
                  className={index === businessInfoRows.length - 1 ? "sm:col-span-2 lg:col-span-3" : ""}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {row.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </SmoothAccordion>
        </section>
      </div>
    </footer>
  );
}

function FooterLinkBlock({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {title}
      </p>
      <ul className="mt-3 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex items-center gap-2 text-sm text-slate-300 transition-colors duration-200 hover:text-white"
            >
              <span className="h-1 w-1 rounded-full bg-sky-300/55" aria-hidden />
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
