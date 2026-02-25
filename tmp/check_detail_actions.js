const { chromium } = require("playwright");

async function run() {
  const baseUrl = "http://localhost:3107";
  const adminPassword = process.env.ADMIN_PASSWORD || "0903";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 1024 },
  });
  const page = await context.newPage();

  await page.goto(`/admin-login?redirect=${encodeURIComponent("/column")}`, {
    waitUntil: "networkidle",
  });
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL("**/column");

  await page.goto("/column", { waitUntil: "networkidle" });
  const firstCardLink = page.locator('[data-testid="column-card"] h2 a').first();
  const href = await firstCardLink.getAttribute("href");
  await firstCardLink.click();
  await page.waitForLoadState("networkidle");

  const data = {
    href,
    currentUrl: page.url(),
    listCount: await page.getByTestId("column-admin-list").count(),
    editCount: await page.getByTestId("column-admin-edit").count(),
    deleteCount: await page.getByTestId("column-admin-delete-open").count(),
  };
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
