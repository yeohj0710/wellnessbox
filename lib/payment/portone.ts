import "server-only";

export const INICIS_PAYMENT_METHOD = "inicis";

function readRequiredEnv(
  name: "PORTONE_V1_KEY" | "PORTONE_V1_SECRET" | "PORTONE_V2_SECRET"
) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function readErrorTextSafely(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

async function requestPortOneV1AccessToken() {
  const impKey = readRequiredEnv("PORTONE_V1_KEY");
  const impSecret = readRequiredEnv("PORTONE_V1_SECRET");
  if (!impKey || !impSecret) {
    throw new Error("Missing PortOne v1 credentials");
  }

  const tokenResponse = await fetch("https://api.iamport.kr/users/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imp_key: impKey,
      imp_secret: impSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await readErrorTextSafely(tokenResponse);
    throw new Error(
      `PortOne v1 token request failed (${tokenResponse.status}): ${
        errorText || "unknown"
      }`
    );
  }

  const tokenData = (await tokenResponse.json()) as {
    response?: { access_token?: string };
  };
  const accessToken = tokenData.response?.access_token;
  if (!accessToken) {
    throw new Error("PortOne v1 token response missing access token");
  }
  return accessToken;
}

async function requestPortOneV2AccessToken() {
  const apiSecret = readRequiredEnv("PORTONE_V2_SECRET");
  if (!apiSecret) {
    throw new Error("Missing PortOne v2 credential");
  }

  const tokenResponse = await fetch("https://api.portone.io/login/api-secret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiSecret }),
  });

  if (!tokenResponse.ok) {
    const errorText = await readErrorTextSafely(tokenResponse);
    throw new Error(
      `PortOne v2 token request failed (${tokenResponse.status}): ${
        errorText || "unknown"
      }`
    );
  }

  const tokenPayload = (await tokenResponse.json()) as { accessToken?: string };
  const accessToken = tokenPayload.accessToken;
  if (!accessToken) {
    throw new Error("PortOne v2 token response missing access token");
  }
  return accessToken;
}

async function fetchInicisPayment(paymentId: string) {
  const accessToken = await requestPortOneV1AccessToken();
  const paymentResponse = await fetch(`https://api.iamport.kr/payments/${paymentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!paymentResponse.ok) {
    const errorText = await readErrorTextSafely(paymentResponse);
    throw new Error(
      `PortOne v1 payment lookup failed (${paymentResponse.status}): ${
        errorText || "unknown"
      }`
    );
  }

  return paymentResponse.json();
}

async function fetchPortOneV2Payment(paymentId: string) {
  const accessToken = await requestPortOneV2AccessToken();
  const paymentResponse = await fetch(`https://api.portone.io/v2/payments/${paymentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!paymentResponse.ok) {
    const errorText = await readErrorTextSafely(paymentResponse);
    throw new Error(
      `PortOne v2 payment lookup failed (${paymentResponse.status}): ${
        errorText || "unknown"
      }`
    );
  }

  return paymentResponse.json();
}

export async function fetchPaymentInfoByMethod(input: {
  paymentId: string;
  paymentMethod: string;
}) {
  if (input.paymentMethod === INICIS_PAYMENT_METHOD) {
    return fetchInicisPayment(input.paymentId);
  }
  const payment = await fetchPortOneV2Payment(input.paymentId);
  return { response: payment };
}
