import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json(
      { error: "Payment ID가 필요합니다." },
      { status: 400 }
    );
  }
  try {
    const tokenResponse = await fetch(
      "https://api.portone.io/login/api-secret",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiSecret: process.env.PORTONE_SECRET,
        }),
      }
    );
    if (!tokenResponse.ok) {
      throw new Error("액세스 토큰 발급 실패");
    }
    const { accessToken } = await tokenResponse.json();
    const paymentResponse = await fetch(
      `https://api.portone.io/v2/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!paymentResponse.ok) {
      throw new Error("결제 정보 조회 실패");
    }
    const paymentData = await paymentResponse.json();
    return NextResponse.json(paymentData, { status: 200 });
  } catch (error) {
    console.error("결제 정보 조회 중 오류 발생:", error);
    return NextResponse.json(
      { error: "결제 정보 조회 중 오류 발생" },
      { status: 500 }
    );
  }
}
