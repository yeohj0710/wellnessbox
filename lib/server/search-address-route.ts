import "server-only";

import axios from "axios";
import { NextResponse } from "next/server";

const NAVER_MAP_GEOCODE_ENDPOINT =
  "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode";
const SEARCH_QUERY_INVALID_ERROR = "Invalid query parameter";
const SEARCH_ADDRESS_FAILED_ERROR = "Failed to fetch address";
const SEARCH_ADDRESS_MISSING_CREDENTIALS_ERROR = "Missing map credentials";

function resolveQuery(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  if (!query || typeof query !== "string") {
    return null;
  }
  return query;
}

function resolveMapCredentials() {
  const keyId = process.env.NAVER_MAP_ID;
  const key = process.env.NAVER_MAP_KEY;
  if (!keyId || !key) {
    return null;
  }
  return { keyId, key };
}

export async function runSearchAddressGetRoute(req: Request) {
  const query = resolveQuery(req);
  if (!query) {
    return NextResponse.json({ error: SEARCH_QUERY_INVALID_ERROR }, { status: 400 });
  }

  const credentials = resolveMapCredentials();
  if (!credentials) {
    return NextResponse.json(
      { error: SEARCH_ADDRESS_MISSING_CREDENTIALS_ERROR },
      { status: 503 }
    );
  }

  try {
    const response = await axios.get(NAVER_MAP_GEOCODE_ENDPOINT, {
      params: { query },
      headers: {
        "X-NCP-APIGW-API-KEY-ID": credentials.keyId,
        "X-NCP-APIGW-API-KEY": credentials.key,
      },
    });
    return NextResponse.json(response.data, { status: 200 });
  } catch (error: unknown) {
    const detail = axios.isAxiosError(error)
      ? error.response?.data || error.message
      : error instanceof Error
        ? error.message
        : "Unknown error";
    console.error("API Error Response:", detail);
    return NextResponse.json({ error: SEARCH_ADDRESS_FAILED_ERROR }, { status: 500 });
  }
}
