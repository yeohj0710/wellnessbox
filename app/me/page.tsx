import Image from "next/image";
import getSession from "@/lib/session";
import LogoutButton from "./logoutButton";

type SessionUser = {
  kakaoId: number;
  loggedIn: boolean;
  nickname?: string;
  profileImageUrl?: string;

  // 아직 세션에 없을 수 있어서 옵션으로만 처리
  email?: string;
};

export default async function MePage() {
  const session = await getSession();
  const user = session.user as SessionUser | undefined;

  if (!user?.loggedIn) {
    return (
      <div className="mx-auto max-w-lg px-5 py-12">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-lg font-bold">로그인이 필요합니다</div>
          <p className="mt-2 text-sm text-slate-500">
            카카오 로그인을 진행해 주세요.
          </p>
        </div>
      </div>
    );
  }

  const kakaoId = user.kakaoId;
  const nickname = user.nickname ?? "";
  const profileImageUrl = user.profileImageUrl ?? "";
  const email = user.email ?? "";

  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-6">
        <div className="text-xl font-bold">내 정보</div>

        <div className="flex items-center gap-4">
          {profileImageUrl ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-200">
              <Image
                src={profileImageUrl}
                alt="프로필 이미지"
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
              없음
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-base font-semibold">
              {nickname || "닉네임 없음"}
            </span>
            <span className="text-sm text-slate-500">
              {email || "이메일(세션에 미저장)"}
            </span>
          </div>
        </div>

        <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
          <div>
            <span className="font-medium">kakaoId</span>: {String(kakaoId)}
          </div>
          <div>
            <span className="font-medium">로그인 상태</span>: 로그인됨
          </div>
        </div>

        <div className="pt-2">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
