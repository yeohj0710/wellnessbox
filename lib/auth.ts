"use server";

import getSession from "./session";

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  const userId = session.user?.kakaoId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return String(userId);
}
