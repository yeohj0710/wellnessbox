"use server";

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

interface SessionContent {
  user?: {
    kakaoId: number;
    nickname?: string;
    profileImageUrl?: string;
    email?: string;
    loggedIn: boolean;
  };
  pharm?: {
    id?: number;
    loggedIn: boolean;
  };
  rider?: {
    id?: number;
    loggedIn: boolean;
  };
  admin?: {
    id?: number;
    loggedIn: boolean;
  };
  test?: {
    id?: number;
    loggedIn: boolean;
  };
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
