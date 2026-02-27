import { postApiJson } from "./api-json";

export type MeProfileSaveResponse = {
  ok?: boolean;
  error?: string;
  nickname?: string;
  email?: string;
  profileImageUrl?: string;
  kakaoEmail?: string;
};

export type EmailOtpSendResponse = {
  ok?: boolean;
  error?: string;
  retryAfterSec?: number;
};

export type EmailOtpVerifyResponse = {
  ok?: boolean;
  error?: string;
  email?: string;
};

export type NicknameCheckResponse = {
  ok?: boolean;
  error?: string;
  nickname?: string;
  available?: boolean;
};

export async function saveMeProfileRequest(input: {
  nickname: string;
  email: string;
  profileImageUrl: string;
}) {
  return postApiJson<MeProfileSaveResponse>("/api/me/profile", input);
}

export async function sendEmailOtpRequest(email: string) {
  return postApiJson<EmailOtpSendResponse>("/api/auth/email/send-otp", {
    email,
  });
}

export async function verifyEmailOtpRequest(email: string, code: string) {
  return postApiJson<EmailOtpVerifyResponse>("/api/auth/email/verify-otp", {
    email,
    code,
  });
}

export async function checkNicknameAvailabilityRequest(nickname: string) {
  return postApiJson<NicknameCheckResponse>("/api/me/nickname/check", {
    nickname,
  });
}
