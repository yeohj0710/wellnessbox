import { NextRequest } from "next/server";
import {
  runKakaoCompleteGetRoute,
  type KakaoCompleteRouteContext,
} from "./route-service";

export const runtime = "nodejs";

type RouteContext = KakaoCompleteRouteContext;

export async function GET(req: NextRequest, ctx: RouteContext) {
  return runKakaoCompleteGetRoute(req, ctx);
}
