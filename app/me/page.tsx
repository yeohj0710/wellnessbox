import getSession from "@/lib/session";
import MeClient from "./meClient";

export const dynamic = "force-dynamic";

type SessionUser = {
  kakaoId: number;
  loggedIn: boolean;
  nickname?: string;
  profileImageUrl?: string;
  email?: string;
  phone?: string;
  phoneLinkedAt?: string;
};

export default async function MePage() {
  const session = await getSession();
  const user = session.user as Partial<SessionUser> | undefined;

  const isKakaoLoggedIn =
    user?.loggedIn === true && typeof user.kakaoId === "number";

  if (!isKakaoLoggedIn) {
    return (
      <div className="w-full mt-8 mb-12 flex justify-center px-4">
        <div className="w-full sm:w-[640px] bg-white sm:border sm:border-gray-200 sm:rounded-2xl sm:shadow-lg px-5 sm:px-8 py-7 sm:py-8">
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

  return (
    <MeClient
      nickname={user.nickname ?? ""}
      profileImageUrl={user.profileImageUrl ?? ""}
      email={user.email ?? ""}
      initialPhone={user.phone ?? ""}
      initialLinkedAt={user.phoneLinkedAt}
    />
  );
}
