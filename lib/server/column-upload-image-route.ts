import "server-only";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/route-auth";

type CloudflareDirectUploadResponse = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: {
    id?: string;
    uploadURL?: string;
  };
};

function jsonError(status: number, message: string) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function runColumnUploadImagePostRoute() {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiKey =
    process.env.CLOUDFLARE_API_KEY ??
    process.env.CLOUDFLARE_API_TOKEN ??
    process.env.CLOUDFLARE_IMAGES_API_TOKEN;
  if (!accountId || !apiKey) {
    return jsonError(
      500,
      "\uD074\uB77C\uC6B0\uB4DC\uD50C\uB808\uC5B4 \uC774\uBBF8\uC9C0 \uC124\uC815\uC774 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
    );
  }

  const directUploadUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`;
  const cfResponse = await fetch(directUploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  let payload: CloudflareDirectUploadResponse | null = null;
  try {
    payload = (await cfResponse.json()) as CloudflareDirectUploadResponse;
  } catch {
    payload = null;
  }

  if (!cfResponse.ok || !payload?.success || !payload.result?.uploadURL) {
    const message =
      payload?.errors?.[0]?.message ||
      "\uD074\uB77C\uC6B0\uB4DC\uD50C\uB808\uC5B4 \uC5C5\uB85C\uB4DC URL \uBC1C\uAE09\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
    return jsonError(502, message);
  }

  return NextResponse.json(
    {
      ok: true,
      imageId: payload.result.id ?? null,
      uploadURL: payload.result.uploadURL,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
