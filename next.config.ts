import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true, // Gzip 압축 활성화 (SEO 및 속도 최적화)
  images: {
    formats: ["image/avif", "image/webp"], // 이미지 최적화 (WebP & AVIF 지원)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 모든 외부 도메인 허용
      },
    ],
  },
};

export default nextConfig;
