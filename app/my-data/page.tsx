import getSession from "@/lib/session";
import db from "@/lib/db";
import { resolveActorForServerComponent } from "@/lib/server/actor";
import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";

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

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatJson(data: unknown) {
  if (data == null) return "-";
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function uniqueList(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => !!value)));
}

export default async function MyDataPage() {
  const session = await getSession();
  const user = session.user as Partial<SessionUser> | undefined;

  const isKakaoLoggedIn =
    user?.loggedIn === true && typeof user.kakaoId === "number";

  const actor = await resolveActorForServerComponent();
  const requestClientId = actor.deviceClientId;

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

  const resolvedClientId = isKakaoLoggedIn
    ? actor.appUserId ?? null
    : requestClientId ?? null;

  if (!resolvedClientId && !isKakaoLoggedIn) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">내 정보 전체 조회</h1>
          <p className="mt-2 text-sm text-gray-600">
            현재 세션을 확인할 수 없어요. 카카오 로그인을 하거나 다시 접속해
            주세요.
          </p>
        </div>
      </div>
    );
  }

  const [profile, assessResults, checkAiResults, orders, chatSessions] =
    resolvedClientId
      ? await Promise.all([
          requestClientId
            ? db.userProfile.findUnique({
                where: { clientId: requestClientId },
              })
            : Promise.resolve(null),
          db.assessmentResult.findMany({
            where: isKakaoLoggedIn
              ? { appUserId: resolvedClientId }
              : { clientId: resolvedClientId },
            orderBy: { createdAt: "desc" },
          }),
          db.checkAiResult.findMany({
            where: isKakaoLoggedIn
              ? { appUserId: resolvedClientId }
              : { clientId: resolvedClientId },
            orderBy: { createdAt: "desc" },
          }),
          db.order.findMany({
            where: requestClientId ? { endpoint: requestClientId } : { id: -1 },
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
          requestClientId
            ? db.chatSession.findMany({
                where: { clientId: requestClientId },
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 정보 전체 조회</h1>
            <p className="mt-1 text-sm text-gray-600">
              {isKakaoLoggedIn
                ? "카카오 계정 정보를 우선으로 표시합니다."
                : "세션 기준으로 정보를 표시합니다."}
            </p>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            clientId: {resolvedClientId ?? "-"}
          </div>
        </div>
        {isKakaoLoggedIn && !resolvedClientId && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            카카오 계정에 연결된 데이터가 아직 없습니다. 이전 세션 데이터는
            카카오 계정과 자동으로 합쳐지지 않습니다.
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <h2 className="text-lg font-bold text-gray-900">계정 정보</h2>
            <dl className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="font-semibold">로그인 상태</dt>
                <dd>{isKakaoLoggedIn ? "카카오 로그인" : "세션"}</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="font-semibold">닉네임</dt>
                <dd>{appUser?.nickname ?? user?.nickname ?? "-"}</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="font-semibold">이메일</dt>
                <dd>{appUser?.email ?? user?.email ?? "-"}</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="font-semibold">카카오 이메일</dt>
                <dd>{appUser?.kakaoEmail ?? user?.kakaoEmail ?? "-"}</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="font-semibold">전화번호</dt>
                <dd>
                  {phoneCandidates.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {phoneCandidates.map((phone) => (
                        <li key={phone}>{phone}</li>
                      ))}
                    </ul>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="font-semibold">전화번호 인증일</dt>
                <dd>{formatDate(appUser?.phoneLinkedAt ?? user?.phoneLinkedAt)}</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="font-semibold">프로필 이미지</dt>
                <dd className="break-all">
                  {appUser?.profileImageUrl ?? user?.profileImageUrl ?? "-"}
                </dd>
              </div>
              {appUser && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <dt className="font-semibold">가입일</dt>
                    <dd>{formatDate(appUser.createdAt)}</dd>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <dt className="font-semibold">최근 업데이트</dt>
                    <dd>{formatDate(appUser.updatedAt)}</dd>
                  </div>
                </>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <h2 className="text-lg font-bold text-gray-900">세션 프로필</h2>
            <p className="mt-2 text-xs text-gray-500">
              세션/프로필에 저장된 추가 정보가 있으면 표시합니다.
            </p>
            <div className="mt-4 rounded-lg bg-white p-4 text-xs text-gray-700 shadow-inner">
              <pre className="whitespace-pre-wrap break-words">
                {formatJson(profile?.data)}
              </pre>
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900">주문 내역</h2>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">주문 내역이 없습니다.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        주문 #{order.id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                      {order.status ?? "상태 미기록"}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold">약국</dt>
                      <dd>{order.pharmacy?.name ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">전화번호</dt>
                      <dd>{order.phone ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">주소</dt>
                      <dd>
                        {order.roadAddress
                          ? `${order.roadAddress} ${order.detailAddress ?? ""}`
                          : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">요청사항</dt>
                      <dd>{order.requestNotes ?? "-"}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 text-sm text-gray-700">
                    <div className="font-semibold">주문 상품</div>
                    {order.orderItems.length === 0 ? (
                      <p className="mt-1 text-xs text-gray-500">
                        주문 상품 정보가 없습니다.
                      </p>
                    ) : (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                        {order.orderItems.map((item) => (
                          <li key={item.id}>
                            {item.pharmacyProduct?.product?.name ?? "상품"}
                            {item.quantity ? ` × ${item.quantity}` : ""}
                            {item.pharmacyProduct?.optionType
                              ? ` (${item.pharmacyProduct.optionType})`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900">정밀 검사 내역</h2>
          {assessResults.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">정밀 검사 결과가 없습니다.</p>
          ) : (
            <div className="mt-4 space-y-4">
          {assessResults.map((result) => {
            const normalized = normalizeAssessmentResult(result);
            return (
              <div
                key={result.id}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
              >
                  <div className="text-sm font-semibold text-gray-800">
                    결과 #{result.id}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(result.createdAt)}
                  </div>
                  <div className="mt-3 rounded-lg bg-white p-3 text-xs text-gray-700 shadow-inner">
                    <pre className="whitespace-pre-wrap break-words">
                      {formatJson({
                        answers: result.answers,
                        result: result.cResult,
                        normalized,
                        tzOffsetMinutes: result.tzOffsetMinutes,
                      })}
                    </pre>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900">빠른 검사 내역</h2>
          {checkAiResults.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">빠른 검사 결과가 없습니다.</p>
          ) : (
            <div className="mt-4 space-y-4">
          {checkAiResults.map((result) => {
            const normalized = normalizeCheckAiResult(result);
            return (
              <div
                key={result.id}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
              >
                  <div className="text-sm font-semibold text-gray-800">
                    결과 #{result.id}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(result.createdAt)}
                  </div>
                  <div className="mt-3 rounded-lg bg-white p-3 text-xs text-gray-700 shadow-inner">
                    <pre className="whitespace-pre-wrap break-words">
                      {formatJson({
                        answers: result.answers,
                        result: result.result,
                        normalized,
                        tzOffsetMinutes: result.tzOffsetMinutes,
                      })}
                    </pre>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900">AI 맞춤 상담</h2>
          {chatSessions.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              저장된 상담 내역이 없습니다.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {session.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(session.updatedAt)}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                      {session.status}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    {session.messages.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        메시지가 없습니다.
                      </p>
                    ) : (
                      session.messages.map((message) => (
                        <div
                          key={message.id}
                          className="rounded-lg bg-white p-3 shadow-inner"
                        >
                          <div className="text-xs font-semibold text-gray-500">
                            {message.role} · {formatDate(message.createdAt)}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                            {message.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
