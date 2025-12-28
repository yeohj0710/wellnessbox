import nodemailer from "nodemailer";

const { GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD, GMAIL_SMTP_FROM } =
  process.env;

if (!GMAIL_SMTP_USER || !GMAIL_SMTP_APP_PASSWORD) {
  throw new Error("Gmail SMTP environment variables are not configured");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: GMAIL_SMTP_USER,
    pass: GMAIL_SMTP_APP_PASSWORD,
  },
});

const defaultFrom = GMAIL_SMTP_FROM || GMAIL_SMTP_USER;

export async function sendEmailVerificationCode(
  to: string,
  code: string,
  expiresInMinutes = 10
) {
  const subject = `[웰니스박스] 이메일 인증 코드: ${code}`;
  const text = `이메일 인증 코드: ${code}\n\n안녕하세요, 웰니스박스에서 인증 코드를 보내드립니다.\n인증 코드는 ${expiresInMinutes}분 뒤에 만료됩니다!`;

  await transporter.sendMail({
    from: defaultFrom,
    to,
    subject,
    text,
  });
}
