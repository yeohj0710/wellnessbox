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

function isColumnPostTableMissing(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021";
  }
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("columnpost") && message.includes("does not exist");
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
    return await db.columnPost.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      select: COLUMN_POST_SELECT,
    });
  } catch (error) {
    if (isColumnPostTableMissing(error)) {
      return [];
    }
    throw error;
  }
}

export async function fetchPublishedDbRowBySlug(
  slug: string
): Promise<ColumnPostRow | null> {
  try {
    return await db.columnPost.findFirst({
      where: {
        slug,
        status: "published",
      },
      select: COLUMN_POST_SELECT,
    });
  } catch (error) {
    if (isColumnPostTableMissing(error)) {
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
    return row.post;
  } catch (error) {
    if (isColumnPostSlugAliasTableMissing(error) || isColumnPostTableMissing(error)) {
      return null;
    }
    throw error;
  }
}
