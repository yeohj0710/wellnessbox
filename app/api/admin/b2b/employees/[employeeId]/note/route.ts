import {
  NOTE_GET_ERROR,
  NOTE_SAVE_ERROR,
} from "@/lib/b2b/admin-employee-route-errors";
import {
  runAdminEmployeeNoteGetRoute,
  runAdminEmployeeNotePutRoute,
} from "@/lib/b2b/admin-employee-note-route";
import { withDbRouteError } from "@/lib/b2b/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withDbRouteError(NOTE_GET_ERROR, runAdminEmployeeNoteGetRoute);

export const PUT = withDbRouteError(NOTE_SAVE_ERROR, runAdminEmployeeNotePutRoute);
