import getSession from "@/lib/session";
import EmployeeReportClient from "./EmployeeReportClient";

export const dynamic = "force-dynamic";

export default async function EmployeeReportPage() {
  const session = await getSession();

  return (
    <EmployeeReportClient initialIsAdminLoggedIn={session.admin?.loggedIn === true} />
  );
}
