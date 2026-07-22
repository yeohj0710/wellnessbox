/* eslint-disable no-console */
const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL;
if (!baseUrl) throw new Error("BASE_URL is required");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const result = { schema_version: "rnd_role_browser_paths_v1", cases: [] };
  try {
    const user = await browser.newPage();
    await user.goto(`${baseUrl}/survey`, { waitUntil: "domcontentloaded", timeout: 120000 });
    result.cases.push({ case_id: "user_survey", path: new URL(user.url()).pathname, body_visible: await user.locator("body").isVisible() });

    const pharm = await browser.newPage();
    await pharm.goto(`${baseUrl}/pharm`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await pharm.waitForURL("**/pharm-login", { timeout: 120000 });
    result.cases.push({ case_id: "pharmacist_auth_boundary", path: new URL(pharm.url()).pathname, password_input_visible: await pharm.locator('input[type="password"]').isVisible() });

    const admin = await browser.newContext();
    const login = await admin.request.post(`${baseUrl}/api/verify-password`, { data: { password: process.env.ADMIN_PASSWORD, loginType: "admin" } });
    const adminPage = await admin.newPage();
    await adminPage.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded", timeout: 120000 });
    result.cases.push({ case_id: "admin_authenticated", login_status: login.status(), path: new URL(adminPage.url()).pathname, body_visible: await adminPage.locator("body").isVisible() });
    await admin.close();

    const expected = [
      result.cases[0].path === "/survey" && result.cases[0].body_visible,
      result.cases[1].path === "/pharm-login" && result.cases[1].password_input_visible,
      result.cases[2].login_status === 200 && result.cases[2].path === "/admin" && result.cases[2].body_visible,
    ];
    if (!expected.every(Boolean)) throw new Error(JSON.stringify(result));
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
