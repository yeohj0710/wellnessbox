"use server";

import { redirect } from "next/navigation";
import getSession from "./session";
import db from "@/lib/db";

export async function pharmacyLogin(userId: string, password: string) {
  const pharmacy = await db.pharmacy_.findUnique({
    where: { userId },
  });
  if (!pharmacy || pharmacy.password !== password) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }
  const session = await getSession();
  session.idx = pharmacy.idx;
  session.role = "pharm";
  await session.save();
  redirect("/pharm");
}

export async function getPharmacy() {
  const session = await getSession();
  if (!session.idx) return null;
  return db.pharmacy_.findUnique({
    where: {
      idx: session.idx,
    },
  });
}
