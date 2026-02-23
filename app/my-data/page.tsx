import getSession from "@/lib/session";
import db from "@/lib/db";
import { resolveActorForServerComponent } from "@/lib/server/actor";
import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";
import MyDataPageActionBridge from "./MyDataPageActionBridge";
import {
  AccordionCard,
  formatDate,
  InfoGrid,
  InfoRow,
  JsonBox,
  MetricCard,
  MiniAccordion,
  Pill,
  uniqueList,
} from "./myDataPagePrimitives";

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

export default async function MyDataPage() {
  const session = await getSession();
  const user = session.user as Partial<SessionUser> | undefined;

  const isKakaoLoggedIn =
    user?.loggedIn === true && typeof user.kakaoId === "number";

  const actor = await resolveActorForServerComponent();
  const deviceClientId = actor.deviceClientId;
  const appUserId = actor.appUserId;
  const phoneLinked = actor.phoneLinked;

  const appUser = isKakaoLoggedIn
    ? await db.appUser.findUnique({
        where: { kakaoId: String(user.kakaoId) },
        select: {
          id: true,
          kakaoId: true,
          clientId: true,
          nickname: true,
          email: true,
          kakaoEmail: true,
          phone: true,
          phoneLinkedAt: true,
          profileImageUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : null;

  if (!deviceClientId && !isKakaoLoggedIn) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-gray-900">
            내 정보 전체 조회
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            현재 세션을 확인할 수 없어요. 카카오 로그인을 하거나 다시 접속해
            주세요.
          </p>
        </div>
      </div>
    );
  }

  const [profile, assessResults, checkAiResults, orders, chatSessions] =
    deviceClientId || appUserId
      ? await Promise.all([
          deviceClientId
            ? db.userProfile.findUnique({
                where: { clientId: deviceClientId },
              })
            : Promise.resolve(null),
          db.assessmentResult.findMany({
            where: isKakaoLoggedIn
              ? appUserId
                ? { appUserId }
                : { id: "missing" }
              : { clientId: deviceClientId ?? "missing" },
            orderBy: { createdAt: "desc" },
          }),
          db.checkAiResult.findMany({
            where: isKakaoLoggedIn
              ? appUserId
                ? { appUserId }
                : { id: "missing" }
              : { clientId: deviceClientId ?? "missing" },
            orderBy: { createdAt: "desc" },
          }),
          db.order.findMany({
            where: isKakaoLoggedIn
              ? phoneLinked && appUserId
                ? { appUserId }
                : { id: -1 }
              : deviceClientId
              ? { endpoint: deviceClientId }
              : { id: -1 },
            orderBy: { createdAt: "desc" },
            include: {
              pharmacy: true,
              orderItems: {
                include: {
                  pharmacyProduct: {
                    include: { product: true },
                  },
                },
              },
            },
          }),
          isKakaoLoggedIn && appUserId
            ? db.chatSession.findMany({
                where: {
                  OR: [
                    { appUserId },
                    deviceClientId
                      ? { clientId: deviceClientId, appUserId: null }
                      : { id: "missing" },
                  ],
                },
                orderBy: { updatedAt: "desc" },
                include: {
                  messages: {
                    orderBy: { createdAt: "asc" },
                  },
                },
              })
            : deviceClientId
            ? db.chatSession.findMany({
                where: { clientId: deviceClientId, appUserId: null },
                orderBy: { updatedAt: "desc" },
                include: {
                  messages: {
                    orderBy: { createdAt: "asc" },
                  },
                },
              })
            : Promise.resolve([]),
        ])
      : [null, [], [], [], []];

  const phoneCandidates = uniqueList([
    appUser?.phone,
    user?.phone,
    profile?.data && typeof profile.data === "object"
      ? ((profile.data as Record<string, any>).phone as string | undefined)
      : undefined,
    ...orders.map((order) => order.phone ?? null),
  ]);

  const lastOrderAt = orders[0]?.createdAt ?? null;
  const lastAssessAt = assessResults[0]?.createdAt ?? null;
  const lastCheckAt = checkAiResults[0]?.createdAt ?? null;
  const lastChatAt = chatSessions[0]?.updatedAt ?? null;

  return (
    <div id="my-data-overview" className="mx-auto w-full max-w-6xl px-4 py-10">
      <MyDataPageActionBridge />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900">
              내 정보 전체 조회
            </h1>
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
              {isKakaoLoggedIn ? "Kakao" : "Session"}
            </Pill>
            <Pill tone={phoneLinked ? "good" : "warn"}>
              phoneLinked: {phoneLinked ? "yes" : "no"}
            </Pill>
            <Pill>
              clientId: {deviceClientId ?? "-"} / appUserId: {appUserId ?? "-"}
            </Pill>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="주문"
            value={orders.length}
            sub={`최근: ${formatDate(lastOrderAt)}`}
          />
          <MetricCard
            label="정밀 검사"
            value={assessResults.length}
            sub={`최근: ${formatDate(lastAssessAt)}`}
          />
          <MetricCard
            label="빠른 검사"
            value={checkAiResults.length}
            sub={`최근: ${formatDate(lastCheckAt)}`}
          />
          <MetricCard
            label="AI 맞춤 상담"
            value={chatSessions.length}
            sub={`최근: ${formatDate(lastChatAt)}`}
          />
        </div>

        <div className="mt-8 space-y-4">
          <div id="my-data-account">
            <AccordionCard
              title="계정 정보"
              subtitle="기본 정보 및 연결 상태를 요약합니다."
              defaultOpen
              right={
                <div className="flex items-center gap-2">
                  {appUser ? (
                    <Pill tone="good">appUser</Pill>
                  ) : (
                    <Pill>no appUser</Pill>
                  )}
                </div>
              }
            >
              <InfoGrid>
                <InfoRow
                  label="로그인 상태"
                  value={isKakaoLoggedIn ? "카카오 로그인" : "세션"}
                />
                <InfoRow
                  label="닉네임"
                  value={appUser?.nickname ?? user?.nickname ?? "-"}
                />
                <InfoRow
                  label="이메일"
                  value={appUser?.email ?? user?.email ?? "-"}
                />
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
                  value={formatDate(
                    appUser?.phoneLinkedAt ?? user?.phoneLinkedAt
                  )}
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
                    <InfoRow
                      label="가입일"
                      value={formatDate(appUser.createdAt)}
                    />
                    <InfoRow
                      label="최근 업데이트"
                      value={formatDate(appUser.updatedAt)}
                    />
                  </>
                ) : null}
              </InfoGrid>
            </AccordionCard>
          </div>

          <AccordionCard
            title="세션 프로필"
            subtitle="세션/프로필에 저장된 추가 정보(JSON)를 확인합니다."
            right={<Pill>{profile?.data ? "has data" : "empty"}</Pill>}
          >
            <JsonBox data={profile?.data} maxHeightClass="max-h-96" />
          </AccordionCard>

          <div id="my-data-orders">
            <AccordionCard
              title="주문 내역"
              subtitle={
                isKakaoLoggedIn && !phoneLinked
                  ? "전화번호 인증을 완료해야 계정에 주문이 연결됩니다."
                  : "주문 1건씩 펼쳐서 상세를 확인하세요."
              }
              right={
                <div className="flex items-center gap-2">
                  <Pill>{orders.length}건</Pill>
                  <Pill
                    tone={isKakaoLoggedIn && !phoneLinked ? "warn" : "neutral"}
                  >
                    최근: {formatDate(lastOrderAt)}
                  </Pill>
                </div>
              }
            >
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500">주문 내역이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const itemCount = order.orderItems?.length ?? 0;
                    return (
                      <MiniAccordion
                        key={order.id}
                        title={`주문 #${order.id}`}
                        subtitle={`${formatDate(order.createdAt)} · ${
                          order.pharmacy?.name ?? "약국 미지정"
                        } · 상품 ${itemCount}개`}
                        right={<Pill>{order.status ?? "상태 미기록"}</Pill>}
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <InfoRow
                            label="약국"
                            value={order.pharmacy?.name ?? "-"}
                          />
                          <InfoRow label="전화번호" value={order.phone ?? "-"} />
                          <InfoRow
                            label="주소"
                            value={
                              order.roadAddress
                                ? `${order.roadAddress} ${
                                    order.detailAddress ?? ""
                                  }`
                                : "-"
                            }
                          />
                          <InfoRow
                            label="요청사항"
                            value={order.requestNotes ?? "-"}
                          />
                        </div>

                        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                          <div className="text-sm font-extrabold text-gray-900">
                            주문 상품
                          </div>
                          {order.orderItems.length === 0 ? (
                            <p className="mt-2 text-xs text-gray-500">
                              주문 상품 정보가 없습니다.
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-2 text-sm text-gray-700">
                              {order.orderItems.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold text-gray-900">
                                      {item.pharmacyProduct?.product?.name ??
                                        "상품"}
                                    </div>
                                    <div className="mt-0.5 text-xs text-gray-500">
                                      {item.pharmacyProduct?.optionType
                                        ? `옵션: ${item.pharmacyProduct.optionType}`
                                        : "옵션 없음"}
                                    </div>
                                  </div>
                                  <Pill>
                                    수량: {item.quantity ? item.quantity : 0}
                                  </Pill>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </MiniAccordion>
                    );
                  })}
                </div>
              )}
            </AccordionCard>
          </div>

          <AccordionCard
            title="정밀 검사 내역"
            subtitle="검사 결과 1건씩 펼쳐서 JSON을 확인하세요."
            right={
              <div className="flex items-center gap-2">
                <Pill>{assessResults.length}건</Pill>
                <Pill>최근: {formatDate(lastAssessAt)}</Pill>
              </div>
            }
          >
            {assessResults.length === 0 ? (
              <p className="text-sm text-gray-500">
                정밀 검사 결과가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {assessResults.map((result) => {
                  const normalized = normalizeAssessmentResult(result);
                  return (
                    <MiniAccordion
                      key={result.id}
                      title={`결과 #${result.id}`}
                      subtitle={formatDate(result.createdAt)}
                      right={<Pill>tz: {result.tzOffsetMinutes ?? "-"}</Pill>}
                    >
                      <JsonBox
                        data={{
                          answers: result.answers,
                          result: result.cResult,
                          normalized,
                          tzOffsetMinutes: result.tzOffsetMinutes,
                        }}
                        maxHeightClass="max-h-[520px]"
                      />
                    </MiniAccordion>
                  );
                })}
              </div>
            )}
          </AccordionCard>

          <AccordionCard
            title="빠른 검사 내역"
            subtitle="검사 결과 1건씩 펼쳐서 JSON을 확인하세요."
            right={
              <div className="flex items-center gap-2">
                <Pill>{checkAiResults.length}건</Pill>
                <Pill>최근: {formatDate(lastCheckAt)}</Pill>
              </div>
            }
          >
            {checkAiResults.length === 0 ? (
              <p className="text-sm text-gray-500">
                빠른 검사 결과가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {checkAiResults.map((result) => {
                  const normalized = normalizeCheckAiResult(result);
                  return (
                    <MiniAccordion
                      key={result.id}
                      title={`결과 #${result.id}`}
                      subtitle={formatDate(result.createdAt)}
                      right={<Pill>tz: {result.tzOffsetMinutes ?? "-"}</Pill>}
                    >
                      <JsonBox
                        data={{
                          answers: result.answers,
                          result: result.result,
                          normalized,
                          tzOffsetMinutes: result.tzOffsetMinutes,
                        }}
                        maxHeightClass="max-h-[520px]"
                      />
                    </MiniAccordion>
                  );
                })}
              </div>
            )}
          </AccordionCard>

          <AccordionCard
            title="AI 맞춤 상담"
            subtitle="상담 세션 1개씩 펼치고, 메시지는 내부에서 스크롤로 확인합니다."
            right={
              <div className="flex items-center gap-2">
                <Pill>{chatSessions.length}개</Pill>
                <Pill>최근: {formatDate(lastChatAt)}</Pill>
              </div>
            }
          >
            {chatSessions.length === 0 ? (
              <p className="text-sm text-gray-500">
                저장된 상담 내역이 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {chatSessions.map((session) => {
                  const messageCount = session.messages?.length ?? 0;
                  const scope = session.appUserId ? "account" : "device";

                  return (
                    <MiniAccordion
                      key={session.id}
                      title={session.title}
                      subtitle={`${formatDate(
                        session.updatedAt
                      )} · 메시지 ${messageCount}개`}
                      right={
                        <div className="flex items-center gap-2">
                          <Pill>{scope}</Pill>
                          <Pill>{session.status}</Pill>
                        </div>
                      }
                    >
                      {messageCount === 0 ? (
                        <p className="text-sm text-gray-500">
                          메시지가 없습니다.
                        </p>
                      ) : (
                        <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-extrabold text-gray-900">
                              메시지
                            </div>
                            <Pill>{messageCount}개</Pill>
                          </div>

                          <div className="mt-3 max-h-[520px] space-y-3 overflow-auto pr-1">
                            {session.messages.map((message) => (
                              <div
                                key={message.id}
                                className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-xs font-extrabold text-gray-700">
                                    {message.role}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatDate(message.createdAt)}
                                  </div>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">
                                  {message.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </MiniAccordion>
                  );
                })}
              </div>
            )}
          </AccordionCard>
        </div>
      </div>
    </div>
  );
}
