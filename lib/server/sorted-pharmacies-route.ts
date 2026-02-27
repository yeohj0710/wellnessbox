import "server-only";

import axios from "axios";
import { z } from "zod";
import {
  getPharmaciesByProduct,
  type PharmacyProductLookupInput,
  type PharmacySummary,
} from "@/lib/pharmacy";

type Coordinates = {
  lat: number;
  lng: number;
};

type NaverMapCredentials = {
  keyId: string;
  key: string;
};

type GeocodeApiResponse = {
  addresses?: Array<{ x?: string; y?: string }>;
};

type CachedCoordinates = Coordinates & {
  ts: number;
};

const sortedPharmaciesRequestSchema = z.object({
  cartItem: z.object({
    productId: z.coerce.number().int().positive(),
    optionType: z.string().trim().min(1).max(120),
    quantity: z.coerce.number().int().positive().max(100),
  }),
  roadAddress: z.string().trim().min(1).max(200),
});

const geocodeCache = new Map<string, CachedCoordinates>();
const GEOCODE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const NAVER_GEOCODE_URL =
  "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode";

export type SortedPharmacy = PharmacySummary & {
  distance: number;
};

export type ResolveSortedPharmaciesResult =
  | { ok: true; pharmacies: SortedPharmacy[] }
  | { ok: false; status: number; error: string };

type ParsedSortedPharmaciesInput = {
  cartItem: PharmacyProductLookupInput;
  roadAddress: string;
};

function getNaverMapCredentials(): NaverMapCredentials | null {
  const keyId = process.env.NAVER_MAP_ID?.trim() ?? "";
  const key = process.env.NAVER_MAP_KEY?.trim() ?? "";
  if (!keyId || !key) {
    return null;
  }
  return { keyId, key };
}

function parseCoordinates(responseData: GeocodeApiResponse): Coordinates {
  const first = responseData.addresses?.[0];
  if (!first) {
    throw new Error("GEOCODE_NOT_FOUND");
  }

  const lat = Number.parseFloat(first.y ?? "");
  const lng = Number.parseFloat(first.x ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("GEOCODE_INVALID_COORDINATES");
  }

  return { lat, lng };
}

async function getGeocode(
  address: string,
  credentials: NaverMapCredentials
): Promise<Coordinates> {
  const key = address.trim();
  if (!key) {
    throw new Error("GEOCODE_EMPTY_ADDRESS");
  }

  const now = Date.now();
  const cached = geocodeCache.get(key);
  if (cached && now - cached.ts < GEOCODE_TTL_MS) {
    return { lat: cached.lat, lng: cached.lng };
  }

  const response = await axios.get<GeocodeApiResponse>(NAVER_GEOCODE_URL, {
    params: { query: key },
    headers: {
      "X-NCP-APIGW-API-KEY-ID": credentials.keyId,
      "X-NCP-APIGW-API-KEY": credentials.key,
    },
    timeout: 5000,
  });

  const coordinates = parseCoordinates(response.data);
  geocodeCache.set(key, { ...coordinates, ts: now });
  return coordinates;
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

async function attachDistance(
  pharmacy: PharmacySummary,
  userLocation: Coordinates,
  credentials: NaverMapCredentials
): Promise<SortedPharmacy | null> {
  const address = (pharmacy.address ?? "").trim();
  if (!address) {
    return null;
  }

  try {
    const pharmacyLocation = await getGeocode(address, credentials);
    const distance = calculateDistanceKm(
      userLocation.lat,
      userLocation.lng,
      pharmacyLocation.lat,
      pharmacyLocation.lng
    );
    return { ...pharmacy, distance };
  } catch {
    return null;
  }
}

function isSortedPharmacy(
  pharmacy: SortedPharmacy | null
): pharmacy is SortedPharmacy {
  return pharmacy !== null;
}

function parseInput(rawBody: unknown): ParsedSortedPharmaciesInput | null {
  const parsed = sortedPharmaciesRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return null;
  }

  const optionType = parsed.data.cartItem.optionType.trim();
  if (!optionType) {
    return null;
  }

  return {
    cartItem: {
      productId: parsed.data.cartItem.productId,
      optionType,
      quantity: parsed.data.cartItem.quantity,
    },
    roadAddress: parsed.data.roadAddress.trim(),
  };
}

export async function resolveSortedPharmacies(
  rawBody: unknown
): Promise<ResolveSortedPharmaciesResult> {
  const input = parseInput(rawBody);
  if (!input) {
    return { ok: false, status: 400, error: "Invalid input" };
  }

  const credentials = getNaverMapCredentials();
  if (!credentials) {
    return {
      ok: false,
      status: 500,
      error: "Map service credentials are not configured",
    };
  }

  try {
    const pharmacies = await getPharmaciesByProduct(input.cartItem);
    const userLocation = await getGeocode(input.roadAddress, credentials);
    const enriched = await Promise.all(
      pharmacies.map((pharmacy) =>
        attachDistance(pharmacy, userLocation, credentials)
      )
    );

    const sorted = enriched
      .filter(isSortedPharmacy)
      .sort((a, b) => a.distance - b.distance);

    return { ok: true, pharmacies: sorted };
  } catch (error) {
    console.error("Failed to fetch sorted pharmacies:", error);
    return { ok: false, status: 500, error: "Failed to process request" };
  }
}
