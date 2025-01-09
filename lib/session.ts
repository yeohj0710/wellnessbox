"use server";

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

interface SessionContent {
  idx?: number;
  role?: "pharm" | "rider";
}

export default async function getSession() {
  const sessionCookies = await cookies();
  if (!process.env.COOKIE_PASSWORD) {
    throw new Error("COOKIE_PASSWORD 환경 변수가 설정되지 않았습니다.");
  }
  const session = await getIronSession<SessionContent>(sessionCookies, {
    cookieName: "cookie",
    password: process.env.COOKIE_PASSWORD,
  });
  return session;
}
