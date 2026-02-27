import {
  runEmployeeSessionDeleteRoute,
  runEmployeeSessionGetRoute,
  runEmployeeSessionPostRoute,
} from "@/lib/b2b/employee-session-route-handler";

export const runtime = "nodejs";

export const GET = runEmployeeSessionGetRoute;
export const POST = runEmployeeSessionPostRoute;
export const DELETE = runEmployeeSessionDeleteRoute;
