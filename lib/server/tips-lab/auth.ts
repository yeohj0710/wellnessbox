import "server-only";

import getSession from "@/lib/session";
import { canAccessTipsLab } from "@/lib/server/tips-lab/access";

export async function hasTipsLabAccess() {
  return canAccessTipsLab(await getSession());
}

