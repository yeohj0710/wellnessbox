import db from "@/lib/db";
import { revalidateColumnPublicPaths } from "@/lib/column/revalidate";
import { preserveOldColumnSlugAlias } from "@/lib/column/slug-alias";
import {
  resolveColumnPostPatchData,
  toColumnPostDto,
  type UpdatePostInput,
} from "../_shared";

export async function getAdminColumnPostById(id: string) {
  const post = await db.columnPost.findUnique({ where: { id } });
  if (!post) return null;
  return toColumnPostDto(post);
}

export async function patchAdminColumnPostById(input: {
  id: string;
  patch: UpdatePostInput;
}) {
  const existing = await db.columnPost.findUnique({ where: { id: input.id } });
  if (!existing) return null;

  const updateData = await resolveColumnPostPatchData({
    id: input.id,
    existing,
    patch: input.patch,
  });
  const updated = await db.columnPost.update({
    where: { id: input.id },
    data: updateData,
  });

  await preserveOldColumnSlugAlias({
    postId: input.id,
    oldSlug: existing.slug,
    currentSlug: updated.slug,
  });

  revalidateColumnPublicPaths();
  return toColumnPostDto(updated);
}

export async function deleteAdminColumnPostById(id: string) {
  const existing = await db.columnPost.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;

  await db.columnPost.delete({ where: { id } });
  revalidateColumnPublicPaths();
  return true;
}

export async function publishAdminColumnPostById(input: {
  id: string;
  publish: boolean;
}) {
  const existing = await db.columnPost.findUnique({ where: { id: input.id } });
  if (!existing) return null;

  const updated = await db.columnPost.update({
    where: { id: input.id },
    data: {
      status: input.publish ? "published" : "draft",
      publishedAt: input.publish ? existing.publishedAt ?? new Date() : null,
    },
  });

  revalidateColumnPublicPaths();
  return toColumnPostDto(updated);
}
