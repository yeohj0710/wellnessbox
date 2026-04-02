import OrderDetails from "@/components/order/orderDetails";
import PhoneVerifyModal from "@/app/me/phoneVerifyModal";

import { LookupConfig } from "../types";

interface OrderDetailsViewProps {
  lookupConfig: LookupConfig;
  isPhoneLinked: boolean;
  linkedPhone: string;
  linkedAt?: string;
  isVerifyOpen: boolean;
  unlinkLoading: boolean;
  unlinkError: string | null;
  onCloseVerify: () => void;
  onUnlink: () => Promise<void>;
  onLinked: (phone: string, linkedAt?: string) => void;
  onBack: () => void;
}

export function OrderDetailsView({
  lookupConfig,
  isPhoneLinked,
  linkedPhone,
  linkedAt,
  isVerifyOpen,
  unlinkLoading,
  unlinkError,
  onCloseVerify,
  onUnlink,
  onLinked,
  onBack,
}: OrderDetailsViewProps) {
  return (
    <div className="w-full px-3 pb-14 pt-8 sm:px-4">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 sm:gap-6">
        {/* 주문조회 상단 전화번호 안내 카드는 중복이라 숨김 */}

        <OrderDetails
          phone={lookupConfig.phone}
          password={lookupConfig.password}
          lookupMode={lookupConfig.mode}
          onBack={onBack}
        />

        <PhoneVerifyModal
          open={isVerifyOpen}
          onClose={onCloseVerify}
          initialPhone={linkedPhone}
          initialLinkedAt={linkedAt}
          fallbackToVerifyOnlyOnUnauthorized
          allowUnlink={isPhoneLinked}
          unlinkLoading={unlinkLoading}
          unlinkError={unlinkError}
          onUnlink={async () => {
            await onUnlink();
          }}
          onLinked={(nextPhone, nextLinkedAt) => {
            onLinked(nextPhone, nextLinkedAt);
          }}
        />
      </div>
    </div>
  );
}
