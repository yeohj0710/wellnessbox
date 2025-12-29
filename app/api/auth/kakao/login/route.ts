import { handleKakaoLogin } from "./handler";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return handleKakaoLogin(req);
}
