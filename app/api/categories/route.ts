import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        importance: true,
      },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch {
    return NextResponse.json({ categories: [] }, { status: 500 });
  }
}
