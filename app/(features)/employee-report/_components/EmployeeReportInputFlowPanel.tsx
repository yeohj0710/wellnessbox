import type { IdentityInput, SyncGuidance } from "../_lib/client-types";
import EmployeeReportIdentitySection from "./EmployeeReportIdentitySection";
import EmployeeReportSyncGuidanceNotice from "./EmployeeReportSyncGuidanceNotice";

type SyncNextAction = "init" | "sign" | "retry" | null;

type EmployeeReportInputFlowPanelProps = {
  identity: IdentityInput;
  busy: boolean;
  syncGuidance: SyncGuidance | null;
  syncNextAction: SyncNextAction;
  primaryActionLabel: string;
  onNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onRestartAuth: () => void;
  onSignAndSync: () => void;
  onFindExisting: () => void;
};

export default function EmployeeReportInputFlowPanel({
  identity,
  busy,
  syncGuidance,
  syncNextAction,
  primaryActionLabel,
  onNameChange,
  onBirthDateChange,
  onPhoneChange,
  onRestartAuth,
  onSignAndSync,
  onFindExisting,
}: EmployeeReportInputFlowPanelProps) {
  return (
    <>
      <EmployeeReportIdentitySection
        identity={identity}
        busy={busy}
        showSignAction={!syncGuidance && syncNextAction === "sign"}
        primaryActionLabel={primaryActionLabel}
        hideActionRow={!!syncGuidance}
        onNameChange={onNameChange}
        onBirthDateChange={onBirthDateChange}
        onPhoneChange={onPhoneChange}
        onRestartAuth={onRestartAuth}
        onSignAndSync={onSignAndSync}
        onFindExisting={onFindExisting}
      />

      {syncGuidance ? (
        <EmployeeReportSyncGuidanceNotice
          guidance={syncGuidance}
          busy={busy}
          showActions
          onRestartAuth={onRestartAuth}
          onSignAndSync={onSignAndSync}
        />
      ) : null}
    </>
  );
}
