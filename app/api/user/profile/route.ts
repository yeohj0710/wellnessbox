import {
  runUserProfileGetRoute,
  runUserProfilePostRoute,
} from "@/lib/server/user-profile-route";

export const runtime = "nodejs";

export const GET = runUserProfileGetRoute;
export const POST = runUserProfilePostRoute;
