import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "AI 맞춤 상담 | 웰니스박스",
  description: "AI 맞춤 상담을 통해 나만을 위한 건강 상담을 받아요.",
  openGraph: {
    title: "AI 맞춤 상담 | 웰니스박스",
    description: "AI 맞춤 상담을 통해 나만을 위한 건강 상담을 받아요.",
    url: `${SITE_URL}/chat`,
    images: [
      { url: "/kakao-logo.png", width: 800, height: 400, alt: "웰니스박스" },
      { url: "/logo.png", width: 800, height: 800, alt: "웰니스박스" },
    ],
    siteName: "웰니스박스",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 맞춤 상담 | 웰니스박스",
    description: "AI 맞춤 상담을 통해 나만을 위한 건강 상담을 받아요.",
    images: ["/logo.png"],
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
