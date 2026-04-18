import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function B2bAdminEmployeeDataPage() {
  redirect("/admin/b2b-reports");
}
