import MyDataPageActionBridge from "./MyDataPageActionBridge";
import {
  MyDataAccountSection,
  MyDataAssessmentSection,
  MyDataChatSection,
  MyDataCheckAiSection,
  MyDataHeader,
  MyDataLockedNotice,
  MyDataMetrics,
  MyDataOrdersSection,
  MyDataSessionProfileSection,
} from "./myDataPageSections";
import {
  loadMyDataActorContext,
  loadMyDataCollections,
  readProfilePhone,
} from "./myDataPageData";
import { uniqueList } from "./myDataPagePrimitives";

export const dynamic = "force-dynamic";

export default async function MyDataPage() {
  const {
    user,
    isKakaoLoggedIn,
    deviceClientId,
    appUserId,
    phoneLinked,
    appUser,
  } = await loadMyDataActorContext();

  if (!deviceClientId && !isKakaoLoggedIn) {
    return <MyDataLockedNotice />;
  }

  const { profile, assessResults, checkAiResults, orders, chatSessions } =
    await loadMyDataCollections({
      isKakaoLoggedIn,
      appUserId,
      deviceClientId,
      phoneLinked,
    });

  const phoneCandidates = uniqueList([
    appUser?.phone,
    user?.phone,
    readProfilePhone(profile),
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
        <MyDataHeader
          isKakaoLoggedIn={isKakaoLoggedIn}
          appUserId={appUserId}
          appUser={appUser}
          phoneLinked={phoneLinked}
          deviceClientId={deviceClientId}
        />

        <MyDataMetrics
          ordersCount={orders.length}
          assessCount={assessResults.length}
          checkCount={checkAiResults.length}
          chatCount={chatSessions.length}
          lastOrderAt={lastOrderAt}
          lastAssessAt={lastAssessAt}
          lastCheckAt={lastCheckAt}
          lastChatAt={lastChatAt}
        />

        <div className="mt-8 space-y-4">
          <MyDataAccountSection
            isKakaoLoggedIn={isKakaoLoggedIn}
            user={user}
            appUser={appUser}
            phoneCandidates={phoneCandidates}
          />
          <MyDataSessionProfileSection profileData={profile?.data} />
          <MyDataOrdersSection
            orders={orders}
            isKakaoLoggedIn={isKakaoLoggedIn}
            phoneLinked={phoneLinked}
            lastOrderAt={lastOrderAt}
          />
          <MyDataAssessmentSection
            assessResults={assessResults}
            lastAssessAt={lastAssessAt}
          />
          <MyDataCheckAiSection
            checkAiResults={checkAiResults}
            lastCheckAt={lastCheckAt}
          />
          <MyDataChatSection chatSessions={chatSessions} lastChatAt={lastChatAt} />
        </div>
      </div>
    </div>
  );
}
