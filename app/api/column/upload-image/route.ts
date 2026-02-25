import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/route-auth";
import { isColumnEditorEnabled, isColumnEditorProdGateEnabled } from "@/app/column/_lib/editor-access";

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

export async function POST() {
  const isProdGate = isColumnEditorProdGateEnabled();
  if (isProdGate) {
    const guard = await requireAdminSession();
    if (!guard.ok) {
      return guard.response;
    }
  }

  if (!isColumnEditorEnabled()) {
    return jsonError(403, "칼럼 편집기는 현재 비활성화 상태입니다.");
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiKey =
    process.env.CLOUDFLARE_API_KEY ??
    process.env.CLOUDFLARE_API_TOKEN ??
    process.env.CLOUDFLARE_IMAGES_API_TOKEN;
  if (!accountId || !apiKey) {
    return jsonError(500, "Cloudflare 이미지 설정이 누락되었습니다.");
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
      "Cloudflare 업로드 URL 발급에 실패했습니다.";
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
