/* eslint-disable no-console */
const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL;
if (!baseUrl) throw new Error("BASE_URL is required");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const result = { schema_version: "rnd_role_browser_paths_v1", cases: [] };
  try {
    const user = await browser.newPage();
    const userResponse = await user.goto(`${baseUrl}/survey`, { waitUntil: "domcontentloaded", timeout: 120000 });
    result.cases.push({ case_id: "user_survey", status: userResponse.status(), path: new URL(user.url()).pathname, form_control_count: await user.locator("input, button").count() });

    const pharm = await browser.newPage();
    await pharm.goto(`${baseUrl}/pharm`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await pharm.waitForURL("**/pharm-login", { timeout: 120000 });
    result.cases.push({ case_id: "pharmacist_auth_boundary", path: new URL(pharm.url()).pathname, input_count: await pharm.locator("input").count(), password_input_visible: await pharm.locator('input[type="password"]').isVisible() });

    const admin = await browser.newContext();
    const login = await admin.request.post(`${baseUrl}/api/verify-password`, { data: { password: process.env.ADMIN_PASSWORD, loginType: "admin" } });
    const adminPage = await admin.newPage();
    const adminResponse = await adminPage.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded", timeout: 120000 });
    result.cases.push({ case_id: "admin_authenticated", login_status: login.status(), status: adminResponse.status(), path: new URL(adminPage.url()).pathname, admin_link_count: await adminPage.locator('a[href^="/admin/"]').count() });
    await admin.close();

    const expected = [
      result.cases[0].status === 200 && result.cases[0].path === "/survey" && result.cases[0].form_control_count > 0,
      result.cases[1].path === "/pharm-login" && result.cases[1].input_count === 2 && result.cases[1].password_input_visible,
      result.cases[2].login_status === 200 && result.cases[2].status === 200 && result.cases[2].path === "/admin" && result.cases[2].admin_link_count > 0,
    ];
    if (!expected.every(Boolean)) throw new Error(JSON.stringify(result));
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
