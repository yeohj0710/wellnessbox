import { NextRequest } from "next/server";
import {
  runAllResultsGetRoute,
} from "@/lib/server/all-results-route";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return runAllResultsGetRoute(req);
}
