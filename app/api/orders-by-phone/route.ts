import { checkOrderExists } from "@/lib/order";
import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phoneInput =
      typeof body?.phone === "string" ? body.phone : "";
    const password =
      typeof body?.password === "string" ? body.password : "";
    const phone = normalizePhone(phoneInput);

    if (
      phone.length < 9 ||
      phone.length > 11 ||
      password.trim().length < 4
    ) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    const isOrderExists = await checkOrderExists(phone, password);
    return NextResponse.json({ isOrderExists }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
