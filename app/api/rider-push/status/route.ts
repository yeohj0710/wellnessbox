import { NextRequest, NextResponse } from "next/server";
import { isRiderSubscribed } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { riderId, endpoint, role } = body;
    if (!endpoint || role !== "rider" || !riderId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    const subscribed = await isRiderSubscribed(riderId, endpoint);
    return NextResponse.json({ subscribed });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 }
    );
  }
}
