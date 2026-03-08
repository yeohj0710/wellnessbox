import type {
  MyDataAppUser,
  SessionUser,
} from "./myDataPageData";
import {
  AccordionCard,
  formatDate,
  InfoGrid,
  InfoRow,
  JsonBox,
  MetricCard,
  Pill,
} from "./myDataPagePrimitives";
import {
  formatActorSourceBadge,
  formatAppUserBadge,
  formatPhoneLinkedBadge,
  formatProfileDataBadge,
  formatTechnicalIdBadge,
} from "./myDataPageLabels";

export function MyDataLockedNotice() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">내 정보 전체 조회</h1>
        <p className="mt-2 text-sm text-gray-600">
          현재 세션을 확인할 수 없어요. 카카오 로그인을 하거나 다시 접속해
          주세요.
        </p>
      </div>
    </div>
  );
}

export function MyDataHeader({
  isKakaoLoggedIn,
  appUserId,
  appUser,
  phoneLinked,
  deviceClientId,
}: {
  isKakaoLoggedIn: boolean;
  appUserId: string | null;
  appUser: MyDataAppUser | null;
  phoneLinked: boolean;
  deviceClientId: string | null;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-gray-900">내 정보 전체 조회</h1>
        <p className="mt-1 text-sm text-gray-600">
          {isKakaoLoggedIn
            ? "카카오 계정 정보를 우선으로 표시합니다."
            : "세션 기준으로 정보를 표시합니다."}
        </p>

        {isKakaoLoggedIn && !appUserId ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            카카오 계정에 연결된 데이터가 아직 없습니다. 이전 세션 데이터는
            카카오 계정과 자동으로 합쳐지지 않습니다.
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Pill tone={isKakaoLoggedIn ? "good" : "neutral"}>
          {formatActorSourceBadge(isKakaoLoggedIn)}
        </Pill>
        <Pill tone={phoneLinked ? "good" : "warn"}>
          {formatPhoneLinkedBadge(phoneLinked)}
        </Pill>
        <Pill>
          {formatTechnicalIdBadge({
            deviceClientId,
            appUserId,
          })}
        </Pill>
        <Pill tone={appUser ? "good" : "neutral"}>
          {formatAppUserBadge(Boolean(appUser))}
        </Pill>
      </div>
    </div>
  );
}

export function MyDataMetrics({
  ordersCount,
  assessCount,
  checkCount,
  chatCount,
  lastOrderAt,
  lastAssessAt,
  lastCheckAt,
  lastChatAt,
}: {
  ordersCount: number;
  assessCount: number;
  checkCount: number;
  chatCount: number;
  lastOrderAt?: Date | null;
  lastAssessAt?: Date | null;
  lastCheckAt?: Date | null;
  lastChatAt?: Date | null;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="주문"
        value={ordersCount}
        sub={`최근: ${formatDate(lastOrderAt)}`}
      />
      <MetricCard
        label="정밀 검사"
        value={assessCount}
        sub={`최근: ${formatDate(lastAssessAt)}`}
      />
      <MetricCard
        label="빠른 검사"
        value={checkCount}
        sub={`최근: ${formatDate(lastCheckAt)}`}
      />
      <MetricCard
        label="AI 맞춤 상담"
        value={chatCount}
        sub={`최근: ${formatDate(lastChatAt)}`}
      />
    </div>
  );
}

export function MyDataAccountSection({
  isKakaoLoggedIn,
  user,
  appUser,
  phoneCandidates,
}: {
  isKakaoLoggedIn: boolean;
  user: Partial<SessionUser> | undefined;
  appUser: MyDataAppUser | null;
  phoneCandidates: string[];
}) {
  return (
    <div id="my-data-account">
      <AccordionCard
        title="계정 정보"
        subtitle="기본 정보 및 연결 상태를 요약합니다."
        defaultOpen
      >
        <InfoGrid>
          <InfoRow
            label="로그인 상태"
            value={isKakaoLoggedIn ? "카카오 로그인" : "세션"}
          />
          <InfoRow label="닉네임" value={appUser?.nickname ?? user?.nickname ?? "-"} />
          <InfoRow label="이메일" value={appUser?.email ?? user?.email ?? "-"} />
          <InfoRow
            label="카카오 이메일"
            value={appUser?.kakaoEmail ?? user?.kakaoEmail ?? "-"}
          />
          <InfoRow
            label="전화번호"
            value={
              phoneCandidates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {phoneCandidates.map((phone) => (
                    <Pill key={phone}>{phone}</Pill>
                  ))}
                </div>
              ) : (
                "-"
              )
            }
          />
          <InfoRow
            label="전화번호 인증일"
            value={formatDate(appUser?.phoneLinkedAt ?? user?.phoneLinkedAt)}
          />
          <InfoRow
            label="프로필 이미지"
            value={
              <span className="break-all">
                {appUser?.profileImageUrl ?? user?.profileImageUrl ?? "-"}
              </span>
            }
          />
          {appUser ? (
            <>
              <InfoRow label="가입일" value={formatDate(appUser.createdAt)} />
              <InfoRow label="최근 업데이트" value={formatDate(appUser.updatedAt)} />
            </>
          ) : null}
        </InfoGrid>
      </AccordionCard>
    </div>
  );
}

export function MyDataSessionProfileSection({
  profileData,
}: {
  profileData: unknown;
}) {
  return (
    <AccordionCard
      title="세션 프로필"
      subtitle="세션/프로필에 저장된 추가 정보(JSON)를 확인합니다."
      right={<Pill>{formatProfileDataBadge(Boolean(profileData))}</Pill>}
    >
      <JsonBox data={profileData} maxHeightClass="max-h-96" />
    </AccordionCard>
  );
}
