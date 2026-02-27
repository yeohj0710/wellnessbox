import OrderDetails from "@/components/order/orderDetails";
import PhoneVerifyModal from "@/app/me/phoneVerifyModal";

import { LookupConfig } from "../types";
import { OrderPhoneContext } from "./orderPhoneContext";

interface OrderDetailsViewProps {
  lookupConfig: LookupConfig;
  isPhoneLinked: boolean;
  linkedPhoneDisplay: string;
  linkedPhone: string;
  linkedAt?: string;
  isVerifyOpen: boolean;
  unlinkLoading: boolean;
  unlinkError: string | null;
  onOpenVerify: () => void;
  onCloseVerify: () => void;
  onUnlink: () => Promise<void>;
  onLinked: (phone: string, linkedAt?: string) => void;
  onBack: () => void;
  onOtherNumber: () => void;
}

export function OrderDetailsView({
  lookupConfig,
  isPhoneLinked,
  linkedPhoneDisplay,
  linkedPhone,
  linkedAt,
  isVerifyOpen,
  unlinkLoading,
  unlinkError,
  onOpenVerify,
  onCloseVerify,
  onUnlink,
  onLinked,
  onBack,
  onOtherNumber,
}: OrderDetailsViewProps) {
  return (
    <div className="w-full px-3 pb-14 pt-8 sm:px-4">
      <div className="mx-auto w-full max-w-[720px]">
        <OrderPhoneContext
          isPhoneLinked={isPhoneLinked}
          linkedPhoneDisplay={linkedPhoneDisplay}
          onOpenVerify={onOpenVerify}
          onOtherNumber={onOtherNumber}
        />

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
