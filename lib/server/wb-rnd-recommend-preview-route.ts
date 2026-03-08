import "server-only";

import { NextResponse } from "next/server";
import {
  WB_RND_RECOMMEND_PREVIEW_SAMPLE,
  callWbRndRecommendPreview,
  getWbRndRecommendPreviewBootstrap,
  isWbRndRecommendPreviewEnabled,
  type WbRndRecommendRequest,
} from "@/lib/server/wb-rnd-client";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolvePayload(value: unknown): WbRndRecommendRequest {
  if (!isObject(value)) return WB_RND_RECOMMEND_PREVIEW_SAMPLE;
  if (isObject(value.payload)) return value.payload as WbRndRecommendRequest;
  return value as WbRndRecommendRequest;
}

export async function runWbRndRecommendPreviewGetRoute() {
  const bootstrap = getWbRndRecommendPreviewBootstrap();
  if (!bootstrap.enabled) {
    return jsonNoStore(bootstrap, 404);
  }
  return jsonNoStore(bootstrap);
}

export async function runWbRndRecommendPreviewPostRoute(req: Request) {
  if (!isWbRndRecommendPreviewEnabled()) {
    return jsonNoStore(getWbRndRecommendPreviewBootstrap(), 404);
  }

  try {
    const body = await req.json().catch(() => WB_RND_RECOMMEND_PREVIEW_SAMPLE);
    const payload = resolvePayload(body);
    const result = await callWbRndRecommendPreview(payload);
    return jsonNoStore(result, result.source === "rnd" ? 200 : 200);
  } catch (error) {
    return jsonNoStore(
      {
        ok: false,
        enabled: true,
        error:
          error instanceof Error && error.message
            ? error.message
            : "unknown_error",
      },
      500
    );
  }
}
