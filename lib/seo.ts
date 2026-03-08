import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const SITE_NAME = "웰니스박스";
export const SITE_NAME_EN = "Wellnessbox";
export const SITE_TITLE = `${SITE_NAME} | 내 몸에 맞는 프리미엄 건강 솔루션`;
export const SITE_DESCRIPTION =
  "AI 건강 분석과 약사 검토를 바탕으로 내 몸에 맞는 영양제 추천, 맞춤 소분, 복용 관리까지 한 번에 제공하는 웰니스박스.";

type SeoPath = `/${string}` | "/";

type SeoImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

type CreatePageMetadataOptions = {
  title: string;
  description: string;
  path?: SeoPath;
  locale?: string;
  siteName?: string;
  type?: "website" | "article";
  keywords?: string[];
  noIndex?: boolean;
  images?: SeoImage[];
};

function createRobots(noIndex: boolean): Metadata["robots"] | undefined {
  if (!noIndex) return undefined;

  return {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      "max-image-preview": "none",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

export function absoluteUrl(path: SeoPath | string = "/") {
  return new URL(path, SITE_URL).toString();
}

export function getDefaultOpenGraphImages(siteName = SITE_NAME): SeoImage[] {
  return [
    {
      url: absoluteUrl("/kakao-logo.png"),
      width: 800,
      height: 400,
      alt: siteName,
    },
  ];
}

export function createPageMetadata({
  title,
  description,
  path,
  locale = "ko_KR",
  siteName = SITE_NAME,
  type = "website",
  keywords,
  noIndex = false,
  images,
}: CreatePageMetadataOptions): Metadata {
  const ogImages = images ?? getDefaultOpenGraphImages(siteName);

  return {
    title,
    description,
    keywords,
    alternates: path
      ? {
          canonical: path,
        }
      : undefined,
    openGraph: {
      title,
      description,
      url: path ? absoluteUrl(path) : SITE_URL,
      type,
      locale,
      siteName,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.map((image) => image.url),
    },
    robots: createRobots(noIndex),
  };
}

export function createNoIndexMetadata(title: string, description: string) {
  return createPageMetadata({
    title,
    description,
    noIndex: true,
  });
}
