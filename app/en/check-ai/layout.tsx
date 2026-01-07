import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Quick AI Check | Wellnessbox",
  description:
    "Complete a quick AI check to get supplement category recommendations tailored to you.",
  openGraph: {
    title: "Quick AI Check | Wellnessbox",
    description:
      "Complete a quick AI check to get supplement category recommendations tailored to you.",
    url: `${SITE_URL}/en/check-ai`,
    images: [
      { url: "/kakao-logo.png", width: 800, height: 400, alt: "Wellnessbox" },
      { url: "/logo.png", width: 800, height: 800, alt: "Wellnessbox" },
    ],
    siteName: "Wellnessbox",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quick AI Check | Wellnessbox",
    description:
      "Complete a quick AI check to get supplement category recommendations tailored to you.",
    images: ["/logo.png"],
  },
};

export default function EnglishCheckAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
