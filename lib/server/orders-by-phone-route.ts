import "server-only";

import { NextResponse } from "next/server";
import { checkOrderExists } from "@/lib/order";
import { normalizePhone } from "@/lib/otp";

const MIN_PHONE_LENGTH = 9;
const MAX_PHONE_LENGTH = 11;
const MIN_PASSWORD_LENGTH = 4;

function parseOrderLookupBody(rawBody: unknown) {
  const body =
    rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
      ? (rawBody as { phone?: unknown; password?: unknown })
      : {};
  const phoneInput = typeof body.phone === "string" ? body.phone : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = normalizePhone(phoneInput);
  return { phone, password };
}

function isOrderLookupInputValid(input: { phone: string; password: string }) {
  return (
    input.phone.length >= MIN_PHONE_LENGTH &&
    input.phone.length <= MAX_PHONE_LENGTH &&
    input.password.trim().length >= MIN_PASSWORD_LENGTH
  );
}

export async function runOrdersByPhonePostRoute(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseOrderLookupBody(body);

    if (!isOrderLookupInputValid(parsed)) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    const isOrderExists = await checkOrderExists(parsed.phone, parsed.password);
    return NextResponse.json({ isOrderExists }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
