"use client";

import PhoneVerifyModal from "@/app/me/phoneVerifyModal";
import { useCallback } from "react";

import { ManualLookupSection } from "./components/manualLookupSection";
import { LinkedPhoneLookupSection } from "./components/linkedPhoneLookupSection";
import { OrderDetailsView } from "./components/orderDetailsView";
import { useMyOrdersController } from "./hooks/useMyOrdersController";

export default function MyOrdersPage() {
  const {
    manualLookup,
    linkedState,
    viewConfig,
    actions,
  } = useMyOrdersController();

  const scrollToManual = useCallback(() => {
    document.getElementById("manual-form")?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
    <div className="w-full mt-8 mb-12 flex justify-center px-3 sm:px-4">
      <div className="w-full sm:w-[640px]">
        <div className="w-full px-6 py-8 bg-white sm:shadow-md sm:rounded-2xl border border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">내 주문 조회</h1>
              <p className="mt-2 text-sm text-gray-600">
                전화번호 인증과 주문 비밀번호로 더 쉽고 빠르게 주문을 확인해요.
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
