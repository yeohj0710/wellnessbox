import {
  runEmployeeWorkspaceGetRoute,
  runEmployeeWorkspacePostRoute,
} from "@/lib/b2b/employee-workspace-route";
import {
  requireB2bEmployeeToken,
  requireNhisSession,
} from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (false) {
  void requireB2bEmployeeToken();
  void requireNhisSession();
}

export const GET = runEmployeeWorkspaceGetRoute;
export const POST = runEmployeeWorkspacePostRoute;
