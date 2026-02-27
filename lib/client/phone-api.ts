import { postApiJson, readApiHttpResult } from "./api-json";

export type PhoneOtpResponse = {
  ok?: boolean;
  error?: string;
  retryAfterSec?: number;
};

export type LinkPhoneResponse = {
  ok?: boolean;
  error?: string;
  retryAfterSec?: number;
  phone?: string;
  linkedAt?: string;
};

export type PhoneStatusResponse = {
  ok?: boolean;
  error?: string;
  phone?: string;
  linkedAt?: string;
};

export type UnlinkPhoneResponse = {
  ok?: boolean;
  error?: string;
};

export async function sendPhoneOtpRequest(phone: string) {
  return postApiJson<PhoneOtpResponse>("/api/auth/phone/send-otp", { phone });
}

export async function verifyPhoneOtpRequest(phone: string, code: string) {
  return postApiJson<PhoneOtpResponse>("/api/auth/phone/verify-otp", {
    phone,
    code,
  });
}

export async function linkPhoneRequest(phone: string, code: string) {
  return postApiJson<LinkPhoneResponse>("/api/me/link-phone", {
    phone,
    code,
  });
}

export async function fetchMyPhoneStatusRequest() {
  const response = await fetch("/api/me/phone-status", {
    headers: { "Cache-Control": "no-store" },
  });
  return readApiHttpResult<PhoneStatusResponse>(response);
}

export async function unlinkMyPhoneRequest() {
  const response = await fetch("/api/me/unlink-phone", {
    method: "POST",
    headers: { "Cache-Control": "no-store" },
  });
  return readApiHttpResult<UnlinkPhoneResponse>(response);
}
