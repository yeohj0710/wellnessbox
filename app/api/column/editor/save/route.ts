import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/route-auth";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function jsonError(status: number, message: string) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  if (process.env.NODE_ENV === "production") {
    return jsonError(403, "이 API는 개발 환경에서만 사용할 수 있습니다.");
  }

  let body: { slug?: string; markdown?: string } | null = null;
  try {
    body = (await req.json()) as { slug?: string; markdown?: string };
  } catch {
    body = null;
  }

  const slug = String(body?.slug ?? "").trim().toLowerCase();
  const markdown = String(body?.markdown ?? "");
  if (!SLUG_PATTERN.test(slug)) {
    return jsonError(400, "slug는 영문 소문자, 숫자, -, _만 사용할 수 있습니다.");
  }
  if (!markdown.trim()) {
    return jsonError(400, "저장할 마크다운 본문이 비어 있습니다.");
  }

  const contentDir = path.join(process.cwd(), "app", "column", "_content");
  const targetPath = path.join(contentDir, `${slug}.md`);
  await fs.mkdir(contentDir, { recursive: true });
  await fs.writeFile(targetPath, markdown, "utf8");

  return NextResponse.json(
    {
      ok: true,
      path: `app/column/_content/${slug}.md`,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
