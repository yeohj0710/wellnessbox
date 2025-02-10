"use server";

import { cookies } from "next/headers";
import getSession from "./session";
import db from "@/lib/db";

export async function riderLogin(userId: string, password: string) {
  const rider = await db.rider.findFirst({
    where: { userId },
  });
  if (!rider || rider.password !== password) {
    return {
      success: false,
      error: "아이디 또는 비밀번호가 올바르지 않습니다.",
    };
  }
  const session = await getSession();
  session.id = rider.id;
  session.role = "rider";
  await session.save();
  const cookieStore = await cookies();
  cookieStore.set("rider_logged_in", "true", { path: "/", httpOnly: false });
  return { success: true };
}

export async function getRider() {
  const session = await getSession();
  if (!session.id) return null;
  return db.rider.findUnique({
    where: {
      id: session.id,
    },
  });
}
