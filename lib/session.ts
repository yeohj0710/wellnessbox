"use server";

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

interface SessionContent {
  user?: {
    kakaoId: number;
    nickname?: string;
    profileImageUrl?: string;
    email?: string;
    kakaoEmail?: string;
    loggedIn: boolean;
    phone?: string;
    phoneLinkedAt?: string;
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

function normalizeSessionContent(session: SessionContent) {
  const user = session.user as Record<string, unknown> | undefined;
  if (!user) return;

  const kakaoIdRaw = user.kakaoId;
  if (typeof kakaoIdRaw === "string" && /^\d+$/.test(kakaoIdRaw.trim())) {
    const parsed = Number(kakaoIdRaw.trim());
    if (Number.isFinite(parsed)) {
      user.kakaoId = parsed as unknown;
    }
  }

  const loggedInRaw = user.loggedIn;
  if (typeof loggedInRaw === "string") {
    user.loggedIn = loggedInRaw === "true";
  }
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
  normalizeSessionContent(session);
  return session;
}
