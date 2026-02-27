import {
  runLogoutUserGetRoute,
  runLogoutUserPostRoute,
} from "@/lib/server/logout-user-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = runLogoutUserPostRoute;
export const GET = runLogoutUserGetRoute;
