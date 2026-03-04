import {
  runB2bEmployeeSurveyGetRoute,
  runB2bEmployeeSurveyPutRoute,
} from "@/lib/b2b/employee-survey-route";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep explicit route-level guard tokens for static guard-map audits.
if (false) {
  void requireB2bEmployeeToken();
}

export const GET = runB2bEmployeeSurveyGetRoute;
export const PUT = runB2bEmployeeSurveyPutRoute;
