"use server";

import { cookies } from "next/headers";
import getSession from "./session";
import db from "@/lib/db";

export async function riderLogin(userId: string, password: string) {
  const rider = await db.rider.findFirst({
    where: { userId },
  });
  if (!rider || rider.password !== password) {
    return { success: false };
  }
  const session = await getSession();
  session.rider = {
    id: rider.id,
    loggedIn: true,
  };
  await session.save();
  const cookieStore = await cookies();
  cookieStore.set("rider", "true", {
    path: "/",
    httpOnly: false,
  });
  return { success: true };
}

export async function getRider() {
  const session = await getSession();
  if (!session.rider?.id) return null;
  return await db.rider.findUnique({
    where: {
      id: session.rider.id,
    },
  });
}
