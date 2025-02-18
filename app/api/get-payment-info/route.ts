import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { paymentId, paymentMethod } = await req.json();
  if (!paymentId) {
    return NextResponse.json(
      { error: "Payment ID가 필요합니다." },
      { status: 400 }
    );
  }
  if (paymentMethod === "inicis") {
    try {
      const tokenResponse = await fetch(
        "https://api.iamport.kr/users/getToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imp_key: process.env.PORTONE_V1_KEY,
            imp_secret: process.env.PORTONE_V1_SECRET,
          }),
        }
      );
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("토큰 발급 실패 응답:", errorText);
        throw new Error("토큰 발급 실패: " + errorText);
      }
      const tokenData = await tokenResponse.json();
      const access_token = tokenData.response?.access_token;
      const paymentResponse = await fetch(
        `https://api.iamport.kr/payments/${paymentId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error("결제 정보 조회 실패 응답:", errorText);
        throw new Error("결제 정보 조회 실패: " + errorText);
      }
      const paymentData = await paymentResponse.json();
      return NextResponse.json(paymentData, { status: 200 });
    } catch (error) {
      console.error("결제 정보 조회 중 오류 발생", error);
      return NextResponse.json(
        { error: "결제 정보 조회 중 오류 발생" },
        { status: 500 }
      );
    }
  } else {
    try {
      const tokenResponse = await fetch(
        "https://api.portone.io/login/api-secret",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiSecret: process.env.PORTONE_V2_SECRET,
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
      return NextResponse.json({ response: paymentData }, { status: 200 });
    } catch (error) {
      console.error("결제 정보 조회 중 오류 발생:", error);
      return NextResponse.json(
        { error: "결제 정보 조회 중 오류 발생" },
        { status: 500 }
      );
    }
  }
}
