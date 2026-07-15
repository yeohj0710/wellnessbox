import "server-only";

import { NextResponse } from "next/server";
import {
  callWbRndRecommendPreview,
  getWbRndRecommendPreviewBootstrap,
  isWbRndRecommendPreviewEnabled,
} from "@/lib/server/wb-rnd-client";
import { WbRndProfileAdapterError } from "@/lib/server/wb-rnd-profile-adapter";
import {
  readWbRndRecommendPreviewRequestBody,
  resolveWbRndRecommendPreviewPayload,
} from "@/lib/server/wb-rnd-recommend-preview-payload";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
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
    const body = await readWbRndRecommendPreviewRequestBody(req);
    const payload = resolveWbRndRecommendPreviewPayload(body);
    const result = await callWbRndRecommendPreview(payload);
    return jsonNoStore(result, result.source === "rnd" ? 200 : 200);
  } catch (error) {
    if (error instanceof WbRndProfileAdapterError) {
      return jsonNoStore(
        {
          ok: false,
          enabled: true,
          error: error.code,
          issues: error.issues,
        },
        error.code === "invalid_json_body" ? 400 : 422
      );
    }
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
