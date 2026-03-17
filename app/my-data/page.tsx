import MyDataPageActionBridge from "./MyDataPageActionBridge";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import MyDataChangeMilestonesSection from "./MyDataChangeMilestonesSection";
import MyDataDataQualitySection from "./MyDataDataQualitySection";
import MyDataEducationInsightSection from "./MyDataEducationInsightSection";
import MyDataGuestConversionCard from "./MyDataGuestConversionCard";
import MyDataJourneyInsightSection from "./MyDataJourneyInsightSection";
import MyDataMessageOrchestrationSection from "./MyDataMessageOrchestrationSection";
import MyDataNextBestActionCard from "./MyDataNextBestActionCard";
import MyDataAdherenceLoopCard from "./MyDataAdherenceLoopCard";
import MyDataSharedCareSection from "./MyDataSharedCareSection";
import MyDataSmartRefillCard from "./MyDataSmartRefillCard";
import MyDataWordOfMouthSection from "./MyDataWordOfMouthSection";
import { buildMyDataDataQualityModel } from "./myDataDataQuality";
import { getAllColumnSummaries } from "@/app/column/_lib/columns";
import { buildUserContextSummary } from "@/lib/chat/context";
import { resolveMyDataMessageOrchestration } from "@/lib/message-orchestration/engine";
import type { UserProfile } from "@/types/chat";
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

  const [
    { profile, assessResults, checkAiResults, orders, healthLink, chatSessions },
    columns,
  ] = await Promise.all([
    loadMyDataCollections({
      isKakaoLoggedIn,
      appUserId,
      deviceClientId,
      phoneLinked,
    }),
    getAllColumnSummaries(),
  ]);

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
  const dataQualityModel = buildMyDataDataQualityModel({
    profileData: profile?.data,
    assessResults,
    checkAiResults,
    orders,
    healthLink,
    chatSessions,
  });
  const summary = buildUserContextSummary({
    profile: (profile?.data ?? null) as UserProfile | null,
    orders,
    assessResult: assessResults[0] ?? null,
    checkAiResult: checkAiResults[0] ?? null,
    healthLink,
    chatSessions,
    actorContext: {
      loggedIn: isKakaoLoggedIn,
      phoneLinked,
    },
  });
  const messageOrchestrationModel = resolveMyDataMessageOrchestration({
    summary,
    orders,
    dataQualityIssueIds: dataQualityModel?.issues.map((issue) => issue.id) ?? [],
  });

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

        <BetaFeatureGate
          title="Beta 인사이트 모음"
          helper="새로 추가된 개인화·인사이트 기능은 필요할 때만 펼쳐볼 수 있어요."
          className="mt-6"
        >
          <MyDataGuestConversionCard
            summary={summary}
            isKakaoLoggedIn={isKakaoLoggedIn}
          />

          {dataQualityModel ? (
            <MyDataDataQualitySection model={dataQualityModel} />
          ) : null}

          <MyDataMessageOrchestrationSection model={messageOrchestrationModel} />

          <MyDataJourneyInsightSection
            profileData={profile?.data}
            assessResults={assessResults}
            checkAiResults={checkAiResults}
            orders={orders}
            healthLink={healthLink}
            chatSessions={chatSessions}
          />

          <MyDataChangeMilestonesSection
            assessResults={assessResults}
            checkAiResults={checkAiResults}
            orders={orders}
            healthLink={healthLink}
            chatSessions={chatSessions}
          />

          <MyDataWordOfMouthSection
            profileData={profile?.data}
            assessResults={assessResults}
            checkAiResults={checkAiResults}
            orders={orders}
            healthLink={healthLink}
            chatSessions={chatSessions}
          />

          <MyDataSharedCareSection
            profileData={profile?.data}
            assessResults={assessResults}
            checkAiResults={checkAiResults}
            orders={orders}
            healthLink={healthLink}
            chatSessions={chatSessions}
          />

          <MyDataEducationInsightSection
            columns={columns}
            profileData={profile?.data}
            assessResults={assessResults}
            checkAiResults={checkAiResults}
            orders={orders}
            healthLink={healthLink}
            chatSessions={chatSessions}
          />

          {messageOrchestrationModel.visibleCards.nextBest ? (
            <MyDataNextBestActionCard />
          ) : null}
          {messageOrchestrationModel.visibleCards.adherence ? (
            <MyDataAdherenceLoopCard orders={orders} />
          ) : null}
          {messageOrchestrationModel.visibleCards.refill ? (
            <MyDataSmartRefillCard orders={orders} />
          ) : null}
        </BetaFeatureGate>

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
