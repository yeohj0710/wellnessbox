import "server-only";

import getSession from "@/lib/session";

export async function isColumnAdminSession() {
  const session = await getSession();
  return session.admin?.loggedIn === true;
}
