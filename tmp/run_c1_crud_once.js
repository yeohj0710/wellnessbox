const { chromium } = require("playwright");

async function run() {
  const baseUrl = "http://localhost:3107";
  const adminPassword = process.env.ADMIN_PASSWORD || "0903";

  const result = {
    c1: {},
    crud: {},
    consoleErrors: [],
    pageErrors: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 1024 },
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() === "error") {
      result.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    result.pageErrors.push(String(error));
  });

  const chunkResponses = [];
  page.on("response", (response) => {
    const url = response.url();
    if (
      url.includes("/_next/static/chunks/app/layout.js") ||
      url.includes("/column")
    ) {
      chunkResponses.push({ url, status: response.status() });
    }
  });

  const columnResponse = await page.goto("/column", {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  result.c1.column = {
    status: columnResponse?.status() ?? null,
    h1: await page.locator("h1").first().textContent().catch(() => null),
    chunkResponses,
  };

  const tagResponse = await page.goto(
    "/column/tag/%ED%95%9C%EA%B8%80-%ED%83%9C%EA%B7%B8-%EC%97%86%EC%9D%8C-%EA%B2%80%EC%A6%9D",
    {
      waitUntil: "networkidle",
      timeout: 90000,
    }
  );
  const tagBody = (await page.textContent("body")) || "";
  result.c1.tagPage = {
    status: tagResponse?.status() ?? null,
    emptyState: tagBody.includes("아직 이 태그의 칼럼이 없습니다"),
  };

  await page.goto(`/admin-login?redirect=${encodeURIComponent("/column")}`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL("**/column", { timeout: 90000 });

  result.crud.globalMenu = {
    hasColumn: (await page.getByRole("link", { name: "칼럼" }).count()) > 0,
    hasWrite: (await page.getByRole("link", { name: "글쓰기" }).count()) > 0,
  };

  await page.goto("/admin/column/editor", {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  const title = `자동 테스트 글 ${Date.now()}`;
  await page.getByTestId("column-editor-title").fill(title);
  await page.getByTestId("column-editor-tags").fill("자동테스트,한글태그");
  await page
    .getByTestId("column-editor-content")
    .fill("## 자동 테스트 본문\n\n자동화 검증용 콘텐츠입니다.");
  await page.getByTestId("column-editor-save-draft").click();
  await page.waitForTimeout(1200);
  const postId = new URL(page.url()).searchParams.get("postId");
  const draftNotice = await page
    .getByTestId("column-editor-notice")
    .textContent()
    .catch(() => null);

  await page.getByTestId("column-editor-publish").click();
  await page.waitForTimeout(1200);
  const publishNotice = await page
    .getByTestId("column-editor-notice")
    .textContent()
    .catch(() => null);

  await page.goto("/column", { waitUntil: "networkidle", timeout: 90000 });
  const createdCard = page
    .locator('[data-testid="column-card"]')
    .filter({ hasText: title })
    .first();
  const found = (await createdCard.count()) > 0;
  let detailSlug = null;

  const listActions = { edit: false, delete: false };
  const detailActions = { list: false, edit: false, delete: false };
  const detailSnapshot = { url: null, h1: null, hasNotFoundText: false };

  if (found) {
    listActions.edit =
      (await createdCard.getByTestId("column-admin-edit").count()) > 0;
    listActions.delete =
      (await createdCard.getByTestId("column-admin-delete-open").count()) > 0;

    if (postId) {
      const detailResponse = await context.request.get(
        `${baseUrl}/api/admin/column/posts/${postId}`,
        {
          failOnStatusCode: false,
        }
      );
      if (detailResponse.ok()) {
        const payload = await detailResponse.json().catch(() => null);
        detailSlug = payload?.post?.slug || null;
      }
    }

    if (detailSlug) {
      await page.goto(`/column/${encodeURIComponent(detailSlug)}`, {
        waitUntil: "networkidle",
        timeout: 90000,
      });
      detailSnapshot.url = page.url();
      detailSnapshot.h1 = await page.locator("h1").first().textContent().catch(() => null);
      detailSnapshot.hasNotFoundText = (((await page.textContent("body")) || "").includes("404"));
      detailActions.list =
        (await page.getByTestId("column-admin-list").count()) > 0;
      detailActions.edit =
        (await page.getByTestId("column-admin-edit").count()) > 0;
      detailActions.delete =
        (await page.getByTestId("column-admin-delete-open").count()) > 0;
    }

    await page.goto("/column", { waitUntil: "networkidle", timeout: 90000 });
    const cardToDelete = page
      .locator('[data-testid="column-card"]')
      .filter({ hasText: title })
      .first();
    await cardToDelete.getByTestId("column-admin-delete-open").click();
    await page.getByTestId("column-admin-delete-confirm-input").fill("삭제");
    await page.getByTestId("column-admin-delete-confirm-submit").click();
    await page.waitForTimeout(1500);
  }

  const deleted =
    (await page
      .locator('[data-testid="column-card"]')
      .filter({ hasText: title })
      .count()) === 0;

  result.crud.flow = {
    title,
    postId,
    draftNotice,
    publishNotice,
      found,
      detailSlug,
      detailSnapshot,
      listActions,
      detailActions,
      deleted,
  };

  await browser.close();
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
