import { Prisma } from "@prisma/client";
import db from "@/lib/db";

export type ColumnPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentMarkdown: string;
  tags: string[];
  status: string;
  publishedAt: Date | null;
  coverImageUrl: string | null;
  updatedAt: Date;
};

const COLUMN_POST_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  contentMarkdown: true,
  tags: true,
  status: true,
  publishedAt: true,
  coverImageUrl: true,
  updatedAt: true,
};

type ColumnPostAliasLookupClient = {
  findUnique: (args: unknown) => Promise<unknown>;
};

/**
 * QA 자동화가 만들어내는 칼럼 픽스처 제목/슬러그 패턴.
 * - `scripts/qa/lib/cde-regression/column-admin-scenario.cjs` -> `qa-auto-<timestamp>`
 * - `scripts/qa/lib/route-scroll/scenario.cjs` -> `qa-scroll-card-<timestamp>-<index>`
 * 정리에 실패한 픽스처가 남아 있어도 독자에게는 노출되지 않도록 공개 목록에서 제외한다.
 */
const QA_FIXTURE_PATTERNS = [
  /^qa-auto-\d+$/,
  /^qa-scroll-card-\d+-\d+$/,
] as const;

export function isQaFixtureColumn(row: {
  slug?: string | null;
  title?: string | null;
}) {
  const candidates = [row.slug, row.title];
  return candidates.some((value) => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return false;
    return QA_FIXTURE_PATTERNS.some((pattern) => pattern.test(normalized));
  });
}

function isColumnPostTableMissing(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021";
  }
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("columnpost") && message.includes("does not exist");
}

function isDatabaseUnavailable(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("compute time quota") ||
    message.includes("can't reach database server") ||
    message.includes("cant reach database server") ||
    message.includes("please make sure your database server is running") ||
    message.includes("database server is running at") ||
    message.includes("error querying the database") ||
    message.includes("prismaclientinitializationerror")
  );
}

function isColumnPostSlugAliasTableMissing(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021";
  }
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("columnpostslugalias") && message.includes("does not exist");
}

export async function fetchPublishedDbRows(): Promise<ColumnPostRow[]> {
  try {
    const rows = await db.columnPost.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      select: COLUMN_POST_SELECT,
    });
    return rows.filter((row) => !isQaFixtureColumn(row));
  } catch (error) {
    if (isColumnPostTableMissing(error) || isDatabaseUnavailable(error)) {
      return [];
    }
    throw error;
  }
}

export async function fetchPublishedDbRowBySlug(
  slug: string
): Promise<ColumnPostRow | null> {
  try {
    const row = await db.columnPost.findFirst({
      where: {
        slug,
        status: "published",
      },
      select: COLUMN_POST_SELECT,
    });
    return row && isQaFixtureColumn(row) ? null : row;
  } catch (error) {
    if (isColumnPostTableMissing(error) || isDatabaseUnavailable(error)) {
      return null;
    }
    throw error;
  }
}

export async function fetchPublishedDbAliasRowBySlug(
  slug: string
): Promise<ColumnPostRow | null> {
  try {
    const aliasClient = (db as unknown as {
      columnPostSlugAlias?: ColumnPostAliasLookupClient;
    }).columnPostSlugAlias;
    if (!aliasClient?.findUnique) return null;

    const row = (await aliasClient.findUnique({
      where: { slug },
      select: {
        post: {
          select: COLUMN_POST_SELECT,
        },
      },
    })) as
      | {
          post?: ColumnPostRow | null;
        }
      | null;
    if (!row?.post || row.post.status !== "published") return null;
    if (isQaFixtureColumn(row.post)) return null;
    return row.post;
  } catch (error) {
    if (
      isColumnPostSlugAliasTableMissing(error) ||
      isColumnPostTableMissing(error) ||
      isDatabaseUnavailable(error)
    ) {
      return null;
    }
    throw error;
  }
}
