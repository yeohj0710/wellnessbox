import type { MutableRefObject } from "react";
import type {
  EmployeeReportResponse,
  SyncGuidance,
} from "../_lib/client-types";
import { EMPLOYEE_REPORT_PRIMARY_SYNC_ACTION_LABEL } from "../_lib/employee-report-copy";
import EmployeeReportCapturePreview from "./EmployeeReportCapturePreview";
import EmployeeReportSummaryHeaderCard from "./EmployeeReportSummaryHeaderCard";
import EmployeeReportSyncGuidanceNotice from "./EmployeeReportSyncGuidanceNotice";

type SyncNextAction = "init" | "sign" | "retry" | null;

type EmployeeReportReadyPanelProps = {
  reportData: EmployeeReportResponse;
  selectedPeriodKey: string;
  periodOptions: string[];
  busy: boolean;
  syncNextAction: SyncNextAction;
  canUseForceSync: boolean;
  forceSyncRemainingSec: number;
  syncGuidance: SyncGuidance | null;
  captureRef: MutableRefObject<HTMLDivElement | null>;
  onPeriodChange: (nextPeriod: string) => void;
  onDownloadPdf: () => void;
  onDownloadLegacyPdf: () => void;
  onRestartAuth: () => void;
  onSignAndSync: () => void;
  onLogout: () => void;
  onOpenForceSync: () => void;
};

export default function EmployeeReportReadyPanel({
  reportData,
  selectedPeriodKey,
  periodOptions,
  busy,
  syncNextAction,
  canUseForceSync,
  forceSyncRemainingSec,
  syncGuidance,
  captureRef,
  onPeriodChange,
  onDownloadPdf,
  onDownloadLegacyPdf,
  onRestartAuth,
  onSignAndSync,
  onLogout,
  onOpenForceSync,
}: EmployeeReportReadyPanelProps) {
  return (
    <>
      <EmployeeReportSummaryHeaderCard
        reportData={reportData}
        selectedPeriodKey={selectedPeriodKey}
        periodOptions={periodOptions}
        busy={busy}
        syncNextAction={syncNextAction}
        primarySyncActionLabel={EMPLOYEE_REPORT_PRIMARY_SYNC_ACTION_LABEL}
        canUseForceSync={canUseForceSync}
        forceSyncRemainingSec={forceSyncRemainingSec}
        onPeriodChange={onPeriodChange}
        onDownloadPdf={onDownloadPdf}
        onDownloadLegacyPdf={onDownloadLegacyPdf}
        onRestartAuth={onRestartAuth}
        onSignAndSync={onSignAndSync}
        onLogout={onLogout}
        onOpenForceSync={onOpenForceSync}
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

      {/* Default report surface: web-first preview + browser capture PDF */}
      <EmployeeReportCapturePreview reportData={reportData} captureRef={captureRef} />
    </>
  );
}
