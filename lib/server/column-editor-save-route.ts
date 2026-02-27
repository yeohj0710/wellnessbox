import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

type ColumnEditorSaveBody = {
  slug?: string;
  markdown?: string;
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

function parseBody(raw: unknown): ColumnEditorSaveBody | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ColumnEditorSaveBody;
}

export async function runColumnEditorSaveRoute(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return jsonError(
      403,
      "\uC774 API\uB294 \uAC1C\uBC1C \uD658\uACBD\uC5D0\uC11C\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
    );
  }

  const raw = await req.json().catch(() => null);
  const body = parseBody(raw);
  const slug = String(body?.slug ?? "").trim().toLowerCase();
  const markdown = String(body?.markdown ?? "");

  if (!SLUG_PATTERN.test(slug)) {
    return jsonError(
      400,
      "slug\uB294 \uC601\uBB38 \uC18C\uBB38\uC790, \uC22B\uC790, -, _\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
    );
  }
  if (!markdown.trim()) {
    return jsonError(
      400,
      "\uC800\uC7A5\uD560 \uB9C8\uD06C\uB2E4\uC6B4 \uBCF8\uBB38\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."
    );
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
