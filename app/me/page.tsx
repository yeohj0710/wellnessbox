import getSession from "@/lib/session";
import db from "@/lib/db";
import MeClient from "./meClient";

export const dynamic = "force-dynamic";

type SessionUser = {
  kakaoId: number;
  loggedIn: boolean;
  nickname?: string;
  profileImageUrl?: string;
  email?: string;
  kakaoEmail?: string;
  phone?: string;
  phoneLinkedAt?: string;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export default async function MePage() {
  const session = await getSession();
  const user = session.user as Partial<SessionUser> | undefined;

  const isKakaoLoggedIn =
    user?.loggedIn === true && typeof user.kakaoId === "number";

  if (!isKakaoLoggedIn) {
    return (
      <div className="w-full mt-8 mb-12 flex justify-center px-2 sm:px-4">
        <div className="w-full sm:w-[640px] bg-white sm:border sm:border-gray-200 sm:rounded-2xl sm:shadow-lg px-4 sm:px-8 py-7 sm:py-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">내 정보</h1>
              <p className="mt-2 text-sm text-gray-600">
                내 정보와 주문 내역을 보려면 카카오 로그인이 필요해요.
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              로그인 필요
            </span>
          </div>

          <div className="mt-7 rounded-2xl bg-gray-50 p-5">
            <div className="text-sm text-gray-800">
              상단 메뉴에서 카카오 로그인을 진행해 주세요.
            </div>
            <div className="mt-2 text-xs text-gray-500">
              로그인 후 결제에 사용한 전화번호를 인증하면 주문 조회가 가능해요.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const clientId = String(user.kakaoId);

  let initialPhone = user.phone ?? "";
  let initialLinkedAt = user.phoneLinkedAt;
  let nickname = user.nickname ?? "";
  let profileImageUrl = user.profileImageUrl ?? "";
  let email = user.email ?? "";
  let kakaoEmail = user.kakaoEmail ?? user.email ?? "";

  const profile = await db.userProfile.findUnique({
    where: { clientId },
    select: { data: true },
  });

  if (profile) {
    const data = isPlainObject(profile.data) ? profile.data : {};
    initialPhone = typeof data.phone === "string" ? data.phone : "";
    initialLinkedAt =
      typeof data.phoneLinkedAt === "string" ? data.phoneLinkedAt : undefined;
    nickname = typeof data.nickname === "string" && data.nickname
      ? data.nickname
      : nickname;
    profileImageUrl =
      typeof data.profileImageUrl === "string" && data.profileImageUrl
        ? data.profileImageUrl
        : profileImageUrl;
    email = typeof data.email === "string" && data.email ? data.email : email;
    kakaoEmail =
      typeof data.kakaoEmail === "string" && data.kakaoEmail
        ? data.kakaoEmail
        : kakaoEmail;
  }

  return (
    <MeClient
      nickname={nickname}
      profileImageUrl={profileImageUrl}
      email={email}
      kakaoEmail={kakaoEmail}
      initialPhone={initialPhone}
      initialLinkedAt={initialLinkedAt}
    />
  );
}
