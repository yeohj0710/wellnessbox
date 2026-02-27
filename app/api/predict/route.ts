import {
  runPredictPostRoute,
} from "@/lib/assess/predict-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runPredictPostRoute(request);
}
