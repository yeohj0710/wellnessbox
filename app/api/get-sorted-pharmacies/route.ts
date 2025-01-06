import { NextResponse } from "next/server";
import { getPharmaciesByProduct } from "@/lib/product";
import axios from "axios";

export async function POST(req: Request) {
  const { productIdx, userAddress } = await req.json();
  if (!productIdx || !userAddress) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const pharmacies = await getPharmaciesByProduct(productIdx);
    const userLocation = await getGeocode(userAddress);
    const sortedPharmacies = await Promise.all(
      pharmacies.map(async (pharmacy) => {
        const pharmacyLocation = await getGeocode(pharmacy.address!);
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          pharmacyLocation.lat,
          pharmacyLocation.lng
        );
        return { ...pharmacy, distance };
      })
    );

    const sorted = sortedPharmacies.sort((a, b) => a.distance - b.distance);
    return NextResponse.json({ pharmacies: sorted }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch sorted pharmacies:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

async function getGeocode(address: string) {
  const response = await axios.get(
    "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode",
    {
      params: { query: address },
      headers: {
        "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_MAP_ID!,
        "X-NCP-APIGW-API-KEY": process.env.NAVER_MAP_KEY!,
      },
    }
  );
  const location = response.data.addresses[0];
  return { lat: parseFloat(location.y), lng: parseFloat(location.x) };
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
