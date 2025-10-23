import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import TopBar from "@/components/common/topBar";
import { FooterProvider } from "@/components/common/footerContext";
import { LocalStorageProvider } from "@/components/common/localStorage";
import { LoadingProvider } from "@/components/common/loadingContext.client";
import { ToastProvider } from "@/components/common/toastContext.client";
import { pretendard } from "./fonts";
import RouteTransition from "@/components/common/routeTransition";
import KakaoExternalBridge from "@/components/common/kakaoExternalBridge";
import Script from "next/script";

export const metadata: Metadata = {
  title: "웰니스박스 | 내 몸에 맞는 프리미엄 건강 솔루션",
  description: "내 몸에 맞는 프리미엄 건강 솔루션",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
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
    // apple: "/apple-touch-icon.png",
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
  other: {
    "google-site-verification": [
      "rxIVuaujGlI5Tc8FtIqiIFwfntmlTl1MSA5EG9E67Rw",
      "EiOmKkr5y00llK20sdFBlYhBH_QYN7vLobIvNoNiAC4",
    ],
    "naver-site-verification": "536a76956d9646a965851d58cf29ab28600a2577",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        className={`${pretendard.className} overflow-x-hidden flex flex-col bg-white`}
      >
        <KakaoExternalBridge />
        <LocalStorageProvider>
          <FooterProvider>
            <LoadingProvider>
              <ToastProvider>
                <TopBar />
                <main className="pt-14 min-h-[105vh] flex flex-col items-center">
                  {children}
                </main>
                <RouteTransition />
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
            sameAs: [
              // 공식 채널 URL
              // "https://www.instagram.com/~",
              // "https://www.youtube.com/@~"
            ],
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
      </body>
    </html>
  );
}
