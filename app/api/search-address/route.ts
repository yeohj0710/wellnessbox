import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "Invalid query parameter" },
      { status: 400 }
    );
  }
  try {
    const response = await axios.get(
      "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode",
      {
        params: { query },
        headers: {
          "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_MAP_ID!,
          "X-NCP-APIGW-API-KEY": process.env.NAVER_MAP_KEY!,
        },
      }
    );
    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error("API Error Response:", error.response?.data || error.message);
    return NextResponse.json(
      { error: "Failed to fetch address" },
      { status: 500 }
    );
  }
}
