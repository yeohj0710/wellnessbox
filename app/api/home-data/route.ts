import { NextResponse } from "next/server";
import { getHomePageData } from "@/lib/product/home-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { categories, products } = await getHomePageData();
    return NextResponse.json({ categories, products }, { status: 200 });
  } catch {
    return NextResponse.json({ categories: [], products: [] }, { status: 500 });
  }
}
