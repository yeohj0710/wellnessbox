import Image from "next/image";
import getSession from "@/lib/session";
import LogoutButton from "./logoutButton";

export const dynamic = "force-dynamic";

type SessionUser = {
  kakaoId: number;
  loggedIn: boolean;
  nickname?: string;
  profileImageUrl?: string;
  email?: string;
};

export default async function MePage() {
  const session = await getSession();
  const user = session.user as Partial<SessionUser> | undefined;

  const isKakaoLoggedIn =
    user?.loggedIn === true && typeof user.kakaoId === "number";

  if (!isKakaoLoggedIn) {
    return (
      <div className="w-full max-w-[640px] mt-8 mb-12">
        <div className="w-full max-w-[640px] px-10 pt-10 pb-14 bg-white sm:shadow-md sm:rounded-lg">
          <h1 className="text-2xl font-bold text-gray-800">내 정보</h1>
          <p className="text-sm text-gray-600 mt-6">
            내 정보를 보려면
            <span className="text-sky-400 font-bold"> 카카오 로그인</span>이
            필요해요.
          </p>

          <div className="mt-8 rounded-md bg-gray-50 border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-800">
              로그인 상태: 미로그인
            </div>
            <div className="text-xs text-gray-500 mt-1">
              상단 메뉴에서 카카오 로그인을 진행해 주세요.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const kakaoId = user.kakaoId;
  const nickname = user.nickname ?? "";
  const profileImageUrl = user.profileImageUrl ?? "";
  const email = user.email ?? "";

  return (
    <div className="w-full max-w-[640px] mt-8 mb-12">
      <div className="w-full max-w-[640px] px-10 pt-10 pb-14 bg-white sm:shadow-md sm:rounded-lg">
        <h1 className="text-2xl font-bold text-gray-800">내 정보</h1>
        <p className="text-sm text-gray-600 mt-6">
          카카오 로그인으로 연결된 내 정보를 확인할 수 있어요.
        </p>

        <div className="mt-8">
          <h2 className="text-lg font-bold pb-2 mt-3">프로필</h2>

          <div className="flex items-center gap-4">
            {profileImageUrl ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
                <Image
                  src={profileImageUrl}
                  alt="프로필 이미지"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                없음
              </div>
            )}

            <div className="flex flex-col">
              <span className="text-base font-semibold text-gray-800">
                {nickname || "닉네임 없음"}
              </span>
              <span className="text-sm text-gray-500">
                {email || "이메일(세션에 미저장)"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold pb-2 mt-3">계정 정보</h2>

          <div className="rounded-md bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700 space-y-1">
            <div>
              <span className="font-semibold text-gray-800">kakaoId</span>:{" "}
              {String(kakaoId)}
            </div>
            <div>
              <span className="font-semibold text-gray-800">로그인 상태</span>:
              로그인됨
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            type="button"
            className="w-full h-10 bg-gray-100 text-gray-800 font-bold rounded-lg cursor-default"
            disabled
          >
            카카오 로그인 연결됨
          </button>

          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
