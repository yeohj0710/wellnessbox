import { runPhoneSendOtpPostRoute } from "@/lib/server/phone-otp-route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return runPhoneSendOtpPostRoute(req);
}
