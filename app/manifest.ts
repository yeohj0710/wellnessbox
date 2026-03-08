import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ko-KR",
    icons: [
      {
        src: "/logo.png",
        sizes: "800x800",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
