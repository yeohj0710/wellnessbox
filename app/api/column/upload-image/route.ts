import { runColumnUploadImagePostRoute } from "@/lib/server/column-upload-image-route";

export async function POST() {
  return runColumnUploadImagePostRoute();
}
