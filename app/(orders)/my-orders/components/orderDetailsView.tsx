import PhoneVerifyModal from "@/app/me/phoneVerifyModal";
import OrderDetails from "@/components/order/orderDetails";
import type { LookupConfig } from "../types";

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
    <section className="mx-auto w-full max-w-[640px] px-4 pb-14 pt-8 sm:px-5">
      <div className="flex flex-col gap-5">
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
    </section>
  );
}
