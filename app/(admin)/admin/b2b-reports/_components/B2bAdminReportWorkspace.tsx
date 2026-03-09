import styles from "@/components/b2b/B2bUx.module.css";
import B2bAdminReportDetailSkeleton from "./B2bAdminReportDetailSkeleton";
import B2bAdminReportWorkspaceLoaded from "./B2bAdminReportWorkspace.loaded";
import {
  B2bAdminReportDetailMissingState,
  B2bAdminReportSelectionPlaceholder,
} from "./B2bAdminReportWorkspace.states";
import type { B2bAdminReportWorkspaceProps } from "./B2bAdminReportWorkspace.types";

export default function B2bAdminReportWorkspace({
  selection,
  content,
  actions,
}: B2bAdminReportWorkspaceProps) {
  return (
    <div className={styles.stack}>
      {!selection.selectedEmployeeId ? <B2bAdminReportSelectionPlaceholder /> : null}

      {selection.selectedEmployeeId && selection.isDetailLoading ? (
        <B2bAdminReportDetailSkeleton />
      ) : null}

      {selection.selectedEmployeeId &&
      !selection.isDetailLoading &&
      selection.selectedEmployee ? (
        <B2bAdminReportWorkspaceLoaded
          selectedEmployee={selection.selectedEmployee}
          content={content}
          actions={actions}
        />
      ) : null}

      {selection.selectedEmployeeId &&
      !selection.isDetailLoading &&
      !selection.selectedEmployee ? (
        <B2bAdminReportDetailMissingState />
      ) : null}
    </div>
  );
}
