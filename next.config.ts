import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  serverExternalPackages: ["playwright", "playwright-core"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "imagedelivery.net" }],
  },
  outputFileTracingIncludes: {
    "/api/rag/**": ["data/**/*"],
    "/api/admin/b2b/reports/[reportId]/export/pdf": [
      "node_modules/playwright/**/*",
      "node_modules/playwright-core/**/*",
      "node_modules/playwright-core/.local-browsers/**/*",
    ],
    "/api/b2b/employee/report/export/pdf": [
      "node_modules/playwright/**/*",
      "node_modules/playwright-core/**/*",
      "node_modules/playwright-core/.local-browsers/**/*",
    ],
  },
  outputFileTracingExcludes: {
    "/*": [".next/cache/**"],
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "wellnessbox.me",
          },
        ],
        destination: "https://wellnessbox.kr/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.wellnessbox.me",
          },
        ],
        destination: "https://wellnessbox.kr/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.wellnessbox.kr",
          },
        ],
        destination: "https://wellnessbox.kr/:path*",
        permanent: true,
      },

      {
        source: "/index.html",
        destination: "/",
        permanent: true,
      },
      {
        source: "/sitemap.xml/",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/robots.txt/",
        destination: "/robots.txt",
        permanent: true,
      },
    ];
  },

  webpack(config) {
    return config;
  },
};

export default nextConfig;
