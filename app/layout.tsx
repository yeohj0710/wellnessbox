import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import TopBar from "@/components/common/topBar";
import { FooterProvider } from "@/components/common/footerContext";
import { LocalStorageProvider } from "@/components/common/localStorage";
import { pretendard } from "./fonts";

export const metadata: Metadata = {
  title: "웰니스박스 | 내 몸에 맞는 프리미엄 건강 솔루션",
  description: "내 몸에 맞는 프리미엄 건강 솔루션",
  metadataBase: new URL(SITE_URL),
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "웰니스박스",
    description: "내 몸에 맞는 프리미엄 건강 솔루션",
    url: SITE_URL,
    images: [
      { url: "/kakao-logo.png", width: 800, height: 400, alt: "웰니스박스" },
      { url: "/logo.png", width: 800, height: 800, alt: "웰니스박스" },
    ],
    siteName: "웰니스박스",
  },
  twitter: {
    card: "summary_large_image",
    title: "웰니스박스",
    description: "내 몸에 맞는 프리미엄 건강 솔루션",
    images: ["/logo.png"],
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
      <body className={`${pretendard.className} overflow-x-hidden flex flex-col bg-white`}>
        <LocalStorageProvider>
          <FooterProvider>
            <TopBar />
            <main className="pt-10 min-h-[105vh] flex flex-col items-center">
              {children}
            </main>
          </FooterProvider>
        </LocalStorageProvider>
      </body>
    </html>
  );
}
