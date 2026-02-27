"use client";

import PhoneVerifyModal from "@/app/me/phoneVerifyModal";
import { useCallback } from "react";
import { useChatPageActionListener } from "@/lib/chat/useChatPageActionListener";

import { ManualLookupSection } from "./components/manualLookupSection";
import { LinkedPhoneLookupSection } from "./components/linkedPhoneLookupSection";
import { OrderDetailsView } from "./components/orderDetailsView";
import { useMyOrdersController } from "./hooks/useMyOrdersController";

export default function MyOrdersPage() {
  const { manualLookup, linkedState, viewConfig, actions } = useMyOrdersController();

  const scrollToManual = useCallback(() => {
    document.getElementById("manual-form")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useChatPageActionListener((detail) => {
    if (detail.action === "focus_manual_order_lookup") {
      scrollToManual();
      return;
    }

    if (detail.action === "focus_linked_order_lookup") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  if (viewConfig) {
    return (
      <OrderDetailsView
        lookupConfig={viewConfig}
        isPhoneLinked={linkedState.isPhoneLinked}
        linkedPhoneDisplay={linkedState.linkedPhoneDisplay}
        linkedPhone={linkedState.linkedPhone}
        linkedAt={linkedState.linkedAt}
        isVerifyOpen={linkedState.isVerifyOpen}
        unlinkLoading={linkedState.unlinkLoading}
        unlinkError={linkedState.unlinkError}
        onOpenVerify={actions.openVerifyModal}
        onCloseVerify={actions.closeVerifyModal}
        onUnlink={actions.handleUnlinkFromDetails}
        onLinked={actions.handleLinkedWithDetails}
        onBack={actions.handleBackFromDetails}
        onOtherNumber={actions.handleOtherNumberFromDetails}
      />
    );
  }

  return (
    <div className="w-full px-3 pb-14 pt-8 sm:px-4">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="w-full rounded-[1.75rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 px-4 py-6 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)] sm:px-6 sm:py-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                내 주문 조회
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                전화번호 인증 또는 주문 조회 비밀번호로 주문 내역을 빠르게 확인할 수 있어요.
              </p>
            </div>
          </div>

          <LinkedPhoneLookupSection
            isPhoneLinked={linkedState.isPhoneLinked}
            phoneStatusLoading={linkedState.phoneStatusLoading}
            phoneStatusError={linkedState.phoneStatusError}
            linkedPhoneDisplay={linkedState.linkedPhoneDisplay}
            onOpenVerify={actions.openVerifyModal}
            onLinkedLookup={actions.handleLinkedLookup}
            onDismissLinkedView={() => {
              actions.dismissLinkedView();
              scrollToManual();
            }}
            onScrollToManual={scrollToManual}
          />

          <ManualLookupSection
            phonePart1={manualLookup.phonePart1}
            phonePart2={manualLookup.phonePart2}
            phonePart3={manualLookup.phonePart3}
            manualPhoneDisplay={manualLookup.manualPhoneDisplay}
            password={manualLookup.password}
            showPw={manualLookup.showPw}
            loading={manualLookup.loading}
            error={manualLookup.error}
            onSubmitManual={manualLookup.onSubmitManual}
            onToggleShowPw={() => manualLookup.setShowPw((v) => !v)}
            onChangePhonePart1={manualLookup.updatePhonePart1}
            onChangePhonePart2={manualLookup.updatePhonePart2}
            onChangePhonePart3={manualLookup.updatePhonePart3}
            onChangePassword={manualLookup.updatePassword}
          />
        </div>

        <PhoneVerifyModal
          open={linkedState.isVerifyOpen}
          onClose={actions.closeVerifyModal}
          initialPhone={linkedState.linkedPhone}
          initialLinkedAt={linkedState.linkedAt}
          allowUnlink={linkedState.isPhoneLinked}
          unlinkLoading={linkedState.unlinkLoading}
          unlinkError={linkedState.unlinkError}
          onUnlink={actions.handleUnlinkPhone}
          onLinked={actions.handleLinkedFromModal}
        />
      </div>
    </div>
  );
}
