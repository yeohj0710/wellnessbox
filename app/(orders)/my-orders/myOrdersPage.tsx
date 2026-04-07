"use client";

import { useCallback } from "react";
import PhoneVerifyModal from "@/app/me/phoneVerifyModal";
import { useChatPageActionListener } from "@/lib/chat/useChatPageActionListener";
import { LinkedPhoneLookupSection } from "./components/linkedPhoneLookupSection";
import { ManualLookupSection } from "./components/manualLookupSection";
import { OrderDetailsView } from "./components/orderDetailsView";
import { useMyOrdersController } from "./hooks/useMyOrdersController";

export default function MyOrdersPage() {
  const { manualLookup, linkedState, viewConfig, actions } =
    useMyOrdersController();

  const scrollToManual = useCallback(() => {
    document
      .getElementById("manual-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        linkedPhone={linkedState.linkedPhoneNormalized}
        linkedAt={linkedState.linkedAt}
        isVerifyOpen={linkedState.isVerifyOpen}
        unlinkLoading={linkedState.unlinkLoading}
        unlinkError={linkedState.unlinkError}
        onCloseVerify={actions.closeVerifyModal}
        onUnlink={actions.handleUnlinkFromDetails}
        onLinked={actions.handleLinkedWithDetails}
        onBack={actions.handleBackFromDetails}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-[640px] px-4 pb-14 pt-8 sm:px-5">
      <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.38)] sm:p-6">
        <div className="border-b border-slate-200/80 pb-5">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-sky-600">
            MY ORDERS
          </p>
          <h1 className="mt-2 text-[1.9rem] font-black tracking-tight text-slate-950 sm:text-[2.1rem]">
            내 주문 조회
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            주문번호 또는 전화번호로 조회할 수 있어요.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <LinkedPhoneLookupSection
            hasVerifiedPhone={linkedState.hasVerifiedPhone}
            phoneStatusLoading={linkedState.phoneStatusLoading}
            phoneStatusError={linkedState.phoneStatusError}
            linkedPhoneDisplay={linkedState.linkedPhoneDisplay}
            onOpenVerify={actions.openVerifyModal}
            onLinkedLookup={actions.handleLinkedLookup}
            onDismissLinkedView={() => {
              actions.dismissLinkedView();
              scrollToManual();
            }}
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
            onToggleShowPw={() => manualLookup.setShowPw((value) => !value)}
            onChangePhonePart1={manualLookup.updatePhonePart1}
            onChangePhonePart2={manualLookup.updatePhonePart2}
            onChangePhonePart3={manualLookup.updatePhonePart3}
            onChangePassword={manualLookup.updatePassword}
          />
        </div>
      </div>

      <PhoneVerifyModal
        open={linkedState.isVerifyOpen}
        onClose={actions.closeVerifyModal}
        initialPhone={linkedState.linkedPhoneNormalized}
        initialLinkedAt={linkedState.linkedAt}
        fallbackToVerifyOnlyOnUnauthorized
        allowUnlink={linkedState.isPhoneLinked}
        unlinkLoading={linkedState.unlinkLoading}
        unlinkError={linkedState.unlinkError}
        onUnlink={actions.handleUnlinkPhone}
        onLinked={actions.handleLinkedWithDetails}
      />
    </section>
  );
}
