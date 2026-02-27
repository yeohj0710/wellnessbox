import "server-only";

import { clearNhisLink } from "@/lib/server/hyphen/link";
import { nhisNoStoreJson } from "@/lib/server/hyphen/nhis-route-responses";
import { clearPendingEasyAuth } from "@/lib/server/hyphen/session";
import { requireNhisSession } from "@/lib/server/route-auth";

export async function runNhisUnlinkPostRoute() {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;

  await Promise.all([
    clearNhisLink(auth.data.appUserId),
    clearPendingEasyAuth(),
  ]);

  return nhisNoStoreJson({ ok: true, linked: false });
}
