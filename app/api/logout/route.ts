import { NextResponse } from "next/server";
import getSession from "@/lib/session";

export async function GET() {
  const session = await getSession();
  await session.destroy();
  const response = NextResponse.json({ success: true });
  response.cookies.delete("pharm");
  response.cookies.delete("rider");
  response.cookies.delete("admin");
  response.cookies.delete("test");
  return response;
}
