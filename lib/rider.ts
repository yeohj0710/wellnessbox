"use server";

import { redirect } from "next/navigation";
import getSession from "./session";
import db from "@/lib/db";

export async function riderLogin(userId: string, password: string) {
  const rider = await db.rider_.findUnique({
    where: { userId },
  });
  if (!rider || rider.password !== password) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }
  const session = await getSession();
  session.idx = rider.idx;
  session.role = "rider";
  await session.save();
  redirect("/rider");
}

export async function getRider() {
  const session = await getSession();
  if (!session.idx) return null;
  return db.rider_.findUnique({
    where: {
      idx: session.idx,
    },
  });
}
