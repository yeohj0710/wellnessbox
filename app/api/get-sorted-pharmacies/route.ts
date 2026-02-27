import { noStoreJson } from "@/lib/server/no-store";
import { resolveSortedPharmacies } from "@/lib/server/sorted-pharmacies-route";

export async function POST(req: Request) {
  const rawBody = await req.json().catch(() => null);
  const result = await resolveSortedPharmacies(rawBody);
  if (!result.ok) {
    return noStoreJson({ error: result.error }, result.status);
  }
  return noStoreJson({ pharmacies: result.pharmacies });
}
