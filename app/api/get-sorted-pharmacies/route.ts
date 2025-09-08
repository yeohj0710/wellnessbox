import { NextResponse } from "next/server";
import axios from "axios";
import { getPharmaciesByProduct } from "@/lib/pharmacy";

export async function POST(req: Request) {
  const { cartItem, roadAddress } = await req.json();
  if (!cartItem || !roadAddress) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const pharmacies = await getPharmaciesByProduct(cartItem);
    const userLocation = await getGeocode(roadAddress);
    const enriched = await Promise.all(
      pharmacies.map(async (pharmacy) => {
        try {
          const pharmacyLocation = await getGeocode(pharmacy.address || "");
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            pharmacyLocation.lat,
            pharmacyLocation.lng
          );
          return { ...pharmacy, distance };
        } catch {
          return null;
        }
      })
    );
    const sortedPharmacies = enriched
      .filter(Boolean)
      .sort((a: any, b: any) => a.distance - b.distance);
    const sorted = sortedPharmacies.sort(
      (a: any, b: any) => a.distance - b.distance
    );
    return NextResponse.json({ pharmacies: sorted }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch sorted pharmacies:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

const geocodeCache = new Map<
  string,
  { lat: number; lng: number; ts: number }
>();
const GEOCODE_TTL = 1000 * 60 * 60 * 24 * 7;

async function getGeocode(address: string) {
  const key = (address || "").trim();
  if (!key) throw new Error("Empty address");
  const now = Date.now();
  const cached = geocodeCache.get(key);
  if (cached && now - cached.ts < GEOCODE_TTL) {
    return { lat: cached.lat, lng: cached.lng };
  }
  const response = await axios.get(
    "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode",
    {
      params: { query: key },
      headers: {
        "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_MAP_ID!,
        "X-NCP-APIGW-API-KEY": process.env.NAVER_MAP_KEY!,
      },
      timeout: 5000,
    }
  );
  const first = response.data?.addresses?.[0];
  if (!first) throw new Error("Geocode not found");
  const lat = parseFloat(first.y);
  const lng = parseFloat(first.x);
  geocodeCache.set(key, { lat, lng, ts: now });
  return { lat, lng };
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
