import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import { FooterProvider } from "@/components/common/footerContext";
import { LocalStorageProvider } from "@/components/common/localStorage";
import { LoadingProvider } from "@/components/common/loadingContext.client";
import { ToastProvider } from "@/components/common/toastContext.client";
import { pretendard } from "./fonts";
import RootLayoutBoot from "@/components/common/rootLayoutBoot.client";
import RootLayoutEnhancers from "@/components/common/rootLayoutEnhancers.client";
import RootLayoutGate from "@/components/common/rootLayoutGate.client";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, absoluteUrl } from "@/lib/seo";

export const viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    images: [
      {
        url: absoluteUrl("/kakao-logo.png"),
        width: 800,
        height: 400,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/kakao-logo.png")],
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
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "wellnessbox.me@gmail.com",
        telephone: "+82-2-6241-5530",
        areaServed: "KR",
        availableLanguage: ["Korean"],
      },
    ],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "Wellnessbox",
    url: SITE_URL,
    inLanguage: "ko-KR",
  };

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

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
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
