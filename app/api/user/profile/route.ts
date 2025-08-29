import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Placeholder endpoint for future server-stored profile integration.
// For now, always returns 204 with no content.
export async function GET() {
  return new NextResponse(null, { status: 204 });
}

