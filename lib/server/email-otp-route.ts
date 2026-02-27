import "server-only";

export {
  EMAIL_OTP_COOLDOWN_MS,
  EMAIL_OTP_DAILY_SEND_LIMIT,
  EMAIL_OTP_EXPIRES_MS,
  EMAIL_OTP_REASON_MESSAGES,
  EMAIL_MAX_LENGTH,
  EMAIL_SEND_COOLDOWN_ERROR,
  EMAIL_SEND_DAILY_LIMIT_ERROR,
  EMAIL_SEND_IN_USE_ERROR,
  MAX_EMAIL_OTP_ATTEMPTS,
  type EmailOtpFailureReason,
} from "./email-otp/constants";
export {
  parseEmailBody,
  parseEmailCodeBody,
  type ParseEmailBodyResult,
  type ParseEmailCodeBodyResult,
} from "./email-otp/parsing";
export {
  consumeVerifiedEmailOtp,
  issueEmailOtpForUser,
  resolveEmailOtpFailure,
  resolveSendEmailOtpResult,
  syncEmailToUserSession,
  verifyAndLinkEmailForUser,
  verifyEmailOtpCode,
  type ResolvedSendEmailOtpResult,
  type SendEmailOtpResult,
  type VerifyAndLinkEmailResult,
  type VerifyEmailOtpCodeResult,
} from "./email-otp/service";
export { runEmailSendOtpPostRoute, runEmailVerifyOtpPostRoute } from "./email-otp/route";
