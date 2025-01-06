"use server";

import db from "@/lib/db";

export async function validatePharmacyLogin(userId: string, password: string) {
  const pharmacy = await db.pharmacy_.findUnique({
    where: { userId },
  });
  if (!pharmacy || pharmacy.password !== password) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }
  return { success: true, pharmacy };
}
