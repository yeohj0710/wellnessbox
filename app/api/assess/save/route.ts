import { NextRequest } from "next/server";
import { runAssessSaveRoute } from "@/lib/server/assess-save-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return runAssessSaveRoute(req);
}
