import { getOrdersByPhoneAndPassword } from "@/lib/order";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();
    const orders = await getOrdersByPhoneAndPassword(phone, password);
    return NextResponse.json({ orders }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
