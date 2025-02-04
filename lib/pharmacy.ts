"use server";
import { cookies } from "next/headers";
import getSession from "./session";
import db from "@/lib/db";

export async function pharmacyLogin(userId: string, password: string) {
  const pharmacy = await db.pharmacy_.findFirst({
    where: { userId },
  });
  if (!pharmacy || pharmacy.password !== password) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }
  const session = await getSession();
  session.id = pharmacy.id;
  session.role = "pharm";
  await session.save();
  const cookieStore = await cookies();
  cookieStore.set("pharm_logged_in", "true", {
    path: "/",
    httpOnly: false,
  });
  return { success: true };
}

export async function getPharmacy() {
  const session = await getSession();
  if (!session.id) return null;
  return await db.pharmacy_.findUnique({
    where: {
      id: session.id,
    },
  });
}

export async function getPharmaciesIdName() {
  return await db.pharmacy_.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPharmaciesByProduct(cartItem: any) {
  const pharmacies = await db.pharmacy_.findMany({
    where: {
      pharmacyProducts: {
        some: {
          productId: cartItem.productId,
          optionType: cartItem.optionType,
          stock: {
            gte: cartItem.quantity,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      address: true,
    },
  });
  return pharmacies;
}
