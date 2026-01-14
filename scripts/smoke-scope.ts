import { setTimeout as delay } from "node:timers/promises";

type CookieJar = {
  cookie?: string;
};

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

async function request(
  path: string,
  options: RequestInit = {},
  jar?: CookieJar,
  textTimeoutMs?: number,
  skipBody?: boolean
) {
  const headers = new Headers(options.headers);
  if (jar?.cookie) headers.set("cookie", jar.cookie);
  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const cookieValue = setCookie.split(";")[0];
    jar && (jar.cookie = cookieValue);
  }
  if (skipBody) {
    res.body?.cancel();
    return { res, text: "", setCookie };
  }
  const text = textTimeoutMs
    ? await Promise.race([
        res.text().catch(() => ""),
        delay(textTimeoutMs).then(() => {
          res.body?.cancel();
          return "";
        }),
      ])
    : await res.text().catch(() => "");
  return { res, text, setCookie };
}

function assertStatus(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

async function scenarioFirstVisit() {
  console.log("Scenario 1: first visit, no cookies");
  const jar: CookieJar = {};
  const r1 = await request("/api/results/latest", {}, jar);
  assertStatus("GET /api/results/latest", r1.res.status, 400);

  const r2 = await request("/api/user/latest-results", {}, jar);
  assertStatus("GET /api/user/latest-results", r2.res.status, 400);

  const r3 = await request("/api/user/all-results", {}, jar);
  assertStatus("GET /api/user/all-results", r3.res.status, 400);

  const r4 = await request("/api/user/profile", {}, jar);
  assertStatus("GET /api/user/profile", r4.res.status, 204);

  const chatBody = JSON.stringify({
    question: "hello",
    messages: [{ role: "user", content: "hello" }],
    clientId: "evil-client-id",
  });
  const r5 = await request(
    "/api/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-smoke-test": "1" },
      body: chatBody,
    },
    jar,
    3000,
    true
  );
  if (!r5.res.ok) {
    throw new Error(`POST /api/chat expected 2xx, got ${r5.res.status}`);
  }
  if (!jar.cookie) {
    throw new Error("POST /api/chat expected Set-Cookie with new clientId");
  }

  const checkAiBody = JSON.stringify({
    result: {},
    answers: null,
    clientId: "evil-client-id",
  });
  const r6 = await request(
    "/api/check-ai/save",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: checkAiBody },
    jar
  );
  if (!r6.res.ok) {
    if (r6.text.includes("Can't reach database server")) {
      console.warn("POST /api/check-ai/save skipped: database unavailable");
    } else {
      throw new Error(`POST /api/check-ai/save expected 2xx, got ${r6.res.status}`);
    }
  }
}

async function scenarioCookieRead() {
  console.log("Scenario 2: cookie present (device scope)");
  const jar: CookieJar = { cookie: "wb_cid=aaaaaaaaaaaa" };
  const r1 = await request("/api/results/latest", {}, jar);
  if (!r1.res.ok) {
    if (r1.text.includes("Can't reach database server")) {
      console.warn("GET /api/results/latest skipped: database unavailable");
      return;
    }
    throw new Error(`GET /api/results/latest expected 2xx, got ${r1.res.status}`);
  }
}

async function scenarioBodySpoof() {
  console.log("Scenario 3: body spoof attempts");
  const jar: CookieJar = {};
  const r1 = await request(
    "/api/check-ai/save",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: {}, clientId: "spoof" }),
    },
    jar
  );
  if (!r1.res.ok) {
    if (r1.text.includes("Can't reach database server")) {
      console.warn("POST /api/check-ai/save spoof check skipped: database unavailable");
      return;
    }
    throw new Error(`POST /api/check-ai/save expected 2xx, got ${r1.res.status}`);
  }
  if (jar.cookie?.includes("spoof")) {
    throw new Error("clientId spoof was accepted via body");
  }
}

async function main() {
  console.log(`Using BASE_URL=${baseUrl}`);
  await scenarioFirstVisit();
  await delay(200);
  await scenarioCookieRead();
  await delay(200);
  await scenarioBodySpoof();
  console.log("Smoke tests complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
