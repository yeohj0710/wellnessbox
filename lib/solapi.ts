import { SolapiMessageService } from "solapi";

const { SOLAPI_KEY, SOLAPI_SECRET, SOLAPI_SENDER } = process.env;

if (!SOLAPI_KEY || !SOLAPI_SECRET || !SOLAPI_SENDER) {
  throw new Error("Solapi environment variables are not configured");
}

const messageService = new SolapiMessageService(SOLAPI_KEY, SOLAPI_SECRET);

export async function sendOtpSms(to: string, code: string) {
  await messageService.send({
    to,
    from: SOLAPI_SENDER,
    text: `인증번호 [${code}]를 입력해주세요.`,
  });
}
