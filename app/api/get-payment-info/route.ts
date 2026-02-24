import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PaymentInfoRequestSchema = z.object({
  paymentId: z.string().trim().min(1),
  paymentMethod: z.string().trim().min(1),
});

const INICIS_PAYMENT_METHOD = "inicis";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function readRequestBody(req: NextRequest) {
  try {
    return (await req.json()) as unknown;
  } catch {
    return null;
  }
}

async function readErrorTextSafely(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

function readRequiredEnv(name: "PORTONE_V1_KEY" | "PORTONE_V1_SECRET" | "PORTONE_V2_SECRET") {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function requestPortOneV1AccessToken() {
  const impKey = readRequiredEnv("PORTONE_V1_KEY");
  const impSecret = readRequiredEnv("PORTONE_V1_SECRET");

  if (!impKey || !impSecret) {
    throw new Error("Missing PortOne v1 credentials");
  }

  const tokenResponse = await fetch("https://api.iamport.kr/users/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imp_key: impKey,
      imp_secret: impSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await readErrorTextSafely(tokenResponse);
    throw new Error(
      `PortOne v1 token request failed (${tokenResponse.status}): ${
        errorText || "unknown"
      }`
    );
  }

  const tokenData = (await tokenResponse.json()) as {
    response?: { access_token?: string };
  };
  const accessToken = tokenData.response?.access_token;
  if (!accessToken) {
    throw new Error("PortOne v1 token response missing access token");
  }
  return accessToken;
}

async function fetchInicisPayment(paymentId: string) {
  const accessToken = await requestPortOneV1AccessToken();
  const paymentResponse = await fetch(`https://api.iamport.kr/payments/${paymentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!paymentResponse.ok) {
    const errorText = await readErrorTextSafely(paymentResponse);
    throw new Error(
      `PortOne v1 payment lookup failed (${paymentResponse.status}): ${
        errorText || "unknown"
      }`
    );
  }

  return paymentResponse.json();
}

async function requestPortOneV2AccessToken() {
  const apiSecret = readRequiredEnv("PORTONE_V2_SECRET");
  if (!apiSecret) {
    throw new Error("Missing PortOne v2 credential");
  }

  const tokenResponse = await fetch("https://api.portone.io/login/api-secret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiSecret }),
  });

  if (!tokenResponse.ok) {
    const errorText = await readErrorTextSafely(tokenResponse);
    throw new Error(
      `PortOne v2 token request failed (${tokenResponse.status}): ${
        errorText || "unknown"
      }`
    );
  }

  const tokenPayload = (await tokenResponse.json()) as { accessToken?: string };
  const accessToken = tokenPayload.accessToken;
  if (!accessToken) {
    throw new Error("PortOne v2 token response missing access token");
  }
  return accessToken;
}

async function fetchPortOneV2Payment(paymentId: string) {
  const accessToken = await requestPortOneV2AccessToken();
  const paymentResponse = await fetch(`https://api.portone.io/v2/payments/${paymentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!paymentResponse.ok) {
    const errorText = await readErrorTextSafely(paymentResponse);
    throw new Error(
      `PortOne v2 payment lookup failed (${paymentResponse.status}): ${
        errorText || "unknown"
      }`
    );
  }

  return paymentResponse.json();
}

export async function POST(req: NextRequest) {
  const rawBody = await readRequestBody(req);
  if (!rawBody) {
    return jsonError("요청 형식이 올바르지 않아요.", 400);
  }

  const parsed = PaymentInfoRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("결제 요청 값이 올바르지 않아요.", 400);
  }

  const { paymentId, paymentMethod } = parsed.data;

  try {
    if (paymentMethod === INICIS_PAYMENT_METHOD) {
      const paymentData = await fetchInicisPayment(paymentId);
      return NextResponse.json(paymentData, { status: 200 });
    }

    const paymentData = await fetchPortOneV2Payment(paymentId);
    return NextResponse.json({ response: paymentData }, { status: 200 });
  } catch (error) {
    console.error("결제 정보 조회 중 오류가 발생했습니다.", error);
    return jsonError("결제 정보 조회 중 오류가 발생했어요.", 500);
  }
}
