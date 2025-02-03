import { NextResponse } from "next/server";
import getSession from "@/lib/session";

export async function GET() {
  const session = await getSession();
  await session.destroy();
  const response = NextResponse.json({ success: true });
  response.cookies.delete("pharm_logged_in");
  response.cookies.delete("access_password");
  response.cookies.delete("rider_logged_in");
  return response;
}
