import EmployeeReportAdminOnlyGate from "./EmployeeReportAdminOnlyGate";
import {
  EMPLOYEE_REPORT_ADMIN_ONLY_GATE_BADGE_LABEL,
  EMPLOYEE_REPORT_ADMIN_ONLY_GATE_DESCRIPTION,
  EMPLOYEE_REPORT_ADMIN_ONLY_GATE_TITLE,
  EMPLOYEE_REPORT_CONTACT_EMAIL,
} from "../_lib/employee-report-copy";

export default function EmployeeReportAdminOnlySection() {
  return (
    <EmployeeReportAdminOnlyGate
      badgeLabel={EMPLOYEE_REPORT_ADMIN_ONLY_GATE_BADGE_LABEL}
      title={EMPLOYEE_REPORT_ADMIN_ONLY_GATE_TITLE}
      description={EMPLOYEE_REPORT_ADMIN_ONLY_GATE_DESCRIPTION}
      contactEmail={EMPLOYEE_REPORT_CONTACT_EMAIL}
    />
  );
}
