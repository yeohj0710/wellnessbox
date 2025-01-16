import { checkOrderExists } from "@/lib/order";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();
    const isOrderExists = await checkOrderExists(phone, password);
    return NextResponse.json({ isOrderExists }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
