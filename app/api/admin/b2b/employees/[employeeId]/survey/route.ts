import {
  SURVEY_GET_ERROR,
  SURVEY_SAVE_ERROR,
} from "@/lib/b2b/admin-employee-route-errors";
import {
  runAdminEmployeeSurveyGetRoute,
  runAdminEmployeeSurveyPutRoute,
} from "@/lib/b2b/admin-employee-survey-route";
import { withDbRouteError } from "@/lib/b2b/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withDbRouteError(SURVEY_GET_ERROR, runAdminEmployeeSurveyGetRoute);

export const PUT = withDbRouteError(SURVEY_SAVE_ERROR, runAdminEmployeeSurveyPutRoute);
