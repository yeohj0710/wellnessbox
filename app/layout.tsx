import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import TopBar from "@/components/topBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "웰니스박스 | 맞춤형 건강기능식품 소분 판매 중개 플랫폼",
  description: "맞춤형 건강기능식품 소분 판매 중개 플랫폼",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "웰니스박스",
    description: "맞춤형 건강기능식품 소분 판매 중개 플랫폼",
    url: SITE_URL,
    images: [
      {
        url: "/icon.png",
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
      <body className={inter.className}>
        <TopBar />
        <main className="pt-14 flex flex-col items-center gap-8 my-1 sm:my-8">
          {children}
        </main>
      </body>
    </html>
  );
}
