import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import TopBar from "@/components/topBar";
import { FooterProvider } from "@/components/footerContext";
import { LocalStorageProvider } from "@/components/localStorage";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "웰니스박스 | 약국 전용 영양제, 7일치씩 주문해요",
  description: "약국 전용 영양제, 7일치씩 주문해요",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "웰니스박스",
    description: "약국 전용 영양제, 7일치씩 주문해요",
    url: SITE_URL,
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 800,
        alt: "웰니스박스",
      },
    ],
    siteName: "웰니스박스",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col bg-gray-50`}>
        <FooterProvider>
          <LocalStorageProvider>
            <TopBar />
            <main className="pt-14 min-h-[105vh] flex flex-col items-center">
              {children}
            </main>
          </LocalStorageProvider>
        </FooterProvider>
      </body>
    </html>
  );
}
