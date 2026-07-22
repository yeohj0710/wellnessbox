import { NextResponse } from "next/server";

import { getWbRndHealthAlias } from "@/lib/server/wb-rnd-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getWbRndHealthAlias();
  return NextResponse.json(result.body, { status: result.status });
}
