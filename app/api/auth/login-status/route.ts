import { NextResponse } from "next/server";
import getSession from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();

  const isUserLoggedIn =
    session.user?.loggedIn === true &&
    typeof session.user?.kakaoId === "number";

  const isPharmLoggedIn = session.pharm?.loggedIn === true;
  const isRiderLoggedIn = session.rider?.loggedIn === true;
  const isAdminLoggedIn = session.admin?.loggedIn === true;
  const isTestLoggedIn = session.test?.loggedIn === true;

  return NextResponse.json(
    {
      isUserLoggedIn,
      isPharmLoggedIn,
      isRiderLoggedIn,
      isAdminLoggedIn,
      isTestLoggedIn,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
