"use server";
import { cookies } from "next/headers";
import getSession from "./session";
import db from "@/lib/db";

export type PharmacyProductLookupInput = {
  productId: number;
  optionType: string;
  quantity: number;
};

export type PharmacySummary = {
  id: number;
  name: string | null;
  address: string | null;
  phone: string | null;
  representativeName: string | null;
  registrationNumber: string | null;
};

export async function pharmacyLogin(userId: string, password: string) {
  const pharmacy = await db.pharmacy.findFirst({
    where: { userId },
  });
  if (!pharmacy || pharmacy.password !== password) {
    return { success: false };
  }
  const session = await getSession();
  session.pharm = {
    id: pharmacy.id,
    loggedIn: true,
  };
  await session.save();
  const cookieStore = await cookies();
  cookieStore.set("pharm", "true", {
    path: "/",
    httpOnly: false,
  });
  return { success: true };
}

export async function getPharmacy() {
  const session = await getSession();
  if (!session.pharm?.id) return null;
  return await db.pharmacy.findUnique({
    where: {
      id: session.pharm.id,
    },
  });
}

export async function getPharmaciesIdName() {
  return await db.pharmacy.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPharmaciesByProduct(
  cartItem: PharmacyProductLookupInput
): Promise<PharmacySummary[]> {
  const pharmacies = await db.pharmacy.findMany({
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
      phone: true,
      representativeName: true,
      registrationNumber: true,
    },
  });
  return pharmacies;
}
