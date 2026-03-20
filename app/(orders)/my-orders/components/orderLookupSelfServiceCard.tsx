"use client";

import { OrderSelfServiceCard } from "@/components/order/OrderSelfServiceCard";
import { buildOrderLookupSelfService } from "@/lib/order/self-service";

type OrderLookupSelfServiceCardProps = {
  isViewingDetails: boolean;
  isPhoneLinked: boolean;
  phoneStatusLoading: boolean;
  phoneStatusError: string | null;
  linkedPhoneDisplay: string;
  manualError: string;
  manualPhoneDisplay: string;
  password: string;
  onOpenVerify: () => void;
  onPrimaryManualAction: () => void;
  onPrimaryLinkedAction: () => void;
  onSecondaryManualAction: () => void;
};

export function OrderLookupSelfServiceCard({
  isViewingDetails,
  isPhoneLinked,
  phoneStatusLoading,
  phoneStatusError,
  linkedPhoneDisplay,
  manualError,
  manualPhoneDisplay,
  password,
  onOpenVerify,
  onPrimaryManualAction,
  onPrimaryLinkedAction,
  onSecondaryManualAction,
}: OrderLookupSelfServiceCardProps) {
  const model = buildOrderLookupSelfService({
    isViewingDetails,
    isPhoneLinked,
    phoneStatusLoading,
    phoneStatusError,
    linkedPhoneDisplay,
    manualError,
    manualPhoneDisplay,
    password,
  });

  const handlePrimaryAction = () => {
    if (model.primaryActionLabel?.includes("인증")) {
      onOpenVerify();
      return;
    }
    if (model.primaryActionLabel?.includes("연결 번호")) {
      onPrimaryLinkedAction();
      return;
    }
    onPrimaryManualAction();
  };

  const handleSecondaryAction = () => {
    if (model.secondaryActionLabel?.includes("인증")) {
      onOpenVerify();
      return;
    }
    onSecondaryManualAction();
  };

  return (
    <OrderSelfServiceCard
      model={model}
      onPrimaryAction={model.primaryActionLabel ? handlePrimaryAction : null}
      onSecondaryAction={model.secondaryActionLabel ? handleSecondaryAction : null}
    />
  );
}
