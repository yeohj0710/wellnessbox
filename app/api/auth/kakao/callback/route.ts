import { NextRequest } from "next/server";
import { runKakaoCallbackGetRoute } from "./route-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return runKakaoCallbackGetRoute(request);
}
