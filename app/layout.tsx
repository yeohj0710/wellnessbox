import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import { FooterProvider } from "@/components/common/footerContext";
import { LocalStorageProvider } from "@/components/common/localStorage";
import { LoadingProvider } from "@/components/common/loadingContext.client";
import { ToastProvider } from "@/components/common/toastContext.client";
import { pretendard } from "./fonts";
import Script from "next/script";
import RootLayoutBoot from "@/components/common/rootLayoutBoot.client";
import RootLayoutEnhancers from "@/components/common/rootLayoutEnhancers.client";
import RootLayoutGate from "@/components/common/rootLayoutGate.client";

export const viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "웰니스박스 | 내 몸에 맞는 프리미엄 건강 솔루션",
  description: "내 몸에 맞는 프리미엄 건강 솔루션",
  metadataBase: new URL(SITE_URL),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "웰니스박스 | 내 몸에 맞는 프리미엄 건강 솔루션",
    description: "내 몸에 맞는 프리미엄 건강 솔루션",
    url: "/",
    type: "website",
    locale: "ko_KR",
    siteName: "웰니스박스",
    images: [
      {
        url: new URL("/kakao-logo.png", SITE_URL).toString(),
        width: 800,
        height: 400,
        alt: "웰니스박스",
      },
      {
        url: new URL("/logo.png", SITE_URL).toString(),
        width: 800,
        height: 800,
        alt: "웰니스박스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "웰니스박스 | 내 몸에 맞는 프리미엄 건강 솔루션",
    description: "내 몸에 맞는 프리미엄 건강 솔루션",
    images: [new URL("/logo.png", SITE_URL).toString()],
  },
  verification: {
    google: "rxIVuaujGlI5Tc8FtIqiIFwfntmlTl1MSA5EG9E67Rw",
    other: {
      google: ["EiOmKkr5y00llK20sdFBlYhBH_QYN7vLobIvNoNiAC4"],
      naver: ["536a76956d9646a965851d58cf29ab28600a2577"],
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        className={`${pretendard.className} overflow-x-hidden flex flex-col bg-white`}
      >
        <a
          href="#wb-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <RootLayoutBoot />
        <LocalStorageProvider>
          <FooterProvider>
            <LoadingProvider>
              <ToastProvider>
                <Suspense fallback={null}>
                  <RootLayoutEnhancers />
                </Suspense>
                <main
                  id="wb-main-content"
                  className="min-h-[105vh] flex flex-col items-center"
                  style={{
                    paddingTop: "3.5rem",
                  }}
                >
                  {children}
                </main>
              </ToastProvider>
            </LoadingProvider>
          </FooterProvider>
        </LocalStorageProvider>
        <div id="toast-portal" />

        <Script
          id="ld-json-org"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "웰니스박스",
            url: SITE_URL,
            logo: new URL("/logo.png", SITE_URL).toString(),
          })}
        </Script>

        <Script
          id="ld-json-website"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "웰니스박스",
            url: SITE_URL,
          })}
        </Script>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body { top: 0 !important; position: relative !important; }
              body > .skiptranslate,
              .goog-te-banner-frame,
              .goog-te-menu-frame,
              .goog-tooltip,
              .goog-te-balloon-frame,
              #google_translate_element { display: none !important; }
              html[data-wb-translate-state="loading"] body {
                opacity: 0;
              }
              html[data-wb-translate-state] body {
                transition: opacity 0.2s ease;
              }
              html[data-wb-translate-state="ready"] body {
                opacity: 1;
              }
            `,
          }}
        />
        <RootLayoutGate />
      </body>
    </html>
  );
}
