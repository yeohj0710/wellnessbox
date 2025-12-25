import { NextResponse } from "next/server";
import getSession from "@/lib/session";

export async function POST() {
  const session = await getSession();

  session.user = undefined;
  session.admin = undefined;
  session.pharm = undefined;
  session.rider = undefined;
  session.test = undefined;

  await session.save();

  const response = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  response.cookies.delete("pharm");
  response.cookies.delete("rider");
  response.cookies.delete("admin");
  response.cookies.delete("test");

  return response;
}
