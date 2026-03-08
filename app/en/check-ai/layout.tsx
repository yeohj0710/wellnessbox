import type { Metadata } from "next";
import { createPageMetadata, SITE_NAME_EN } from "@/lib/seo";

const baseMetadata = createPageMetadata({
  title: "Quick AI Check | Wellnessbox",
  description:
    "Complete a quick AI check to get supplement category recommendations tailored to you.",
  path: "/en/check-ai",
  locale: "en_US",
  siteName: SITE_NAME_EN,
  keywords: ["AI supplement recommendation", "wellness check", "supplement guide"],
});

export const metadata: Metadata = {
  ...baseMetadata,
  alternates: {
    canonical: "/en/check-ai",
    languages: {
      "ko-KR": "/check-ai",
      "en-US": "/en/check-ai",
      "x-default": "/check-ai",
    },
  },
};

export default function EnglishCheckAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
