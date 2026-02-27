import { Prisma } from "@prisma/client";
import db from "@/lib/db";

type ColumnPostSlugAliasClient = {
  deleteMany: (args: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
};

function getColumnPostSlugAliasClient(): ColumnPostSlugAliasClient | null {
  return (
    (db as unknown as {
      columnPostSlugAlias?: ColumnPostSlugAliasClient;
    }).columnPostSlugAlias ?? null
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

export async function preserveOldColumnSlugAlias(input: {
  postId: string;
  oldSlug: string;
  currentSlug: string;
}) {
  const oldSlug = input.oldSlug.trim();
  if (!oldSlug || oldSlug === input.currentSlug) return;

  const aliasClient = getColumnPostSlugAliasClient();
  if (!aliasClient?.findUnique || !aliasClient?.create || !aliasClient?.deleteMany) return;

  try {
    // If a slug returns to a previous value, clear redundant alias rows first.
    await aliasClient.deleteMany({
      where: {
        postId: input.postId,
        slug: input.currentSlug,
      },
    });

    const slugInUse = await db.columnPost.findFirst({
      where: {
        slug: oldSlug,
        id: { not: input.postId },
      },
      select: { id: true },
    });
    if (slugInUse) return;

    const existingAlias = (await aliasClient.findUnique({
      where: { slug: oldSlug },
      select: { id: true, postId: true },
    })) as { id: string; postId: string } | null;
    if (existingAlias?.postId === input.postId || existingAlias) return;

    await aliasClient.create({
      data: {
        postId: input.postId,
        slug: oldSlug,
      },
    });
  } catch (error) {
    if (isColumnPostSlugAliasTableMissing(error)) return;
    throw error;
  }
}
