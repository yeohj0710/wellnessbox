import { notFound } from "next/navigation";
import { isWbRndRecommendPreviewEnabled } from "@/lib/server/wb-rnd-client";
import RndPreviewClient from "./rnd-preview-client";

export const dynamic = "force-dynamic";

export default function RndPreviewPage() {
  if (!isWbRndRecommendPreviewEnabled()) {
    notFound();
  }

  return <RndPreviewClient />;
}
