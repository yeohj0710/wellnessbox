const { spawn, spawnSync } = require("child_process");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (response.status >= 200 && response.status < 500) return true;
    } catch {
      // ignore
    }
    await sleep(1000);
  }
  return false;
}

async function main() {
  console.log("verify:start");
  const watchdog = setTimeout(() => {
    console.error("VERIFY_WATCHDOG_TIMEOUT");
    process.exit(2);
  }, 8 * 60 * 1000);

  const port = 3106;
  const baseUrl = `http://localhost:${port}`;
  const adminPassword = process.env.ADMIN_PASSWORD || "0903";
  const dev = spawn("cmd.exe", ["/c", `npx next dev --port ${port}`], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  dev.stdout.on("data", (chunk) => process.stdout.write(chunk.toString()));
  dev.stderr.on("data", (chunk) => process.stderr.write(chunk.toString()));

  const result = {
    c1: {},
    crud: {},
    consoleErrors: [],
    pageErrors: [],
  };

  try {
    console.log("verify:wait-server");
    const ready = await waitForServer(`${baseUrl}/column`, 240000);
    console.log("verify:server-ready", ready);
    if (!ready) throw new Error("server_not_ready");

    const { chromium } = require("playwright");
    console.log("verify:playwright-loaded");
    const browser = await chromium.launch({ headless: true });
    console.log("verify:browser-launched");
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
        chunkResponses.push({
          url,
          status: response.status(),
        });
      }
    });

    const columnResponse = await page.goto("/column", {
      waitUntil: "networkidle",
      timeout: 120000,
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
        timeout: 120000,
      }
    );
    const tagBodyText = (await page.textContent("body")) || "";
    result.c1.tag = {
      status: tagResponse?.status() ?? null,
      empty: tagBodyText.includes("아직 이 태그의 칼럼이 없습니다"),
    };

    console.log("verify:c1-done");
    await page.goto(
      `/admin-login?redirect=${encodeURIComponent("/column")}`,
      {
        waitUntil: "networkidle",
        timeout: 120000,
      }
    );
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForURL("**/column", { timeout: 120000 });

    result.crud.globalMenu = {
      hasColumn: (await page.getByRole("link", { name: "칼럼" }).count()) > 0,
      hasWrite: (await page.getByRole("link", { name: "글쓰기" }).count()) > 0,
    };

    console.log("verify:admin-login-done");
    await page.goto("/admin/column/editor", {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    const title = `자동 테스트 글 ${Date.now()}`;
    await page.getByTestId("column-editor-title").fill(title);
    await page.getByTestId("column-editor-tags").fill("자동테스트,한글태그");
    await page.getByTestId("column-editor-content").fill("## 자동 테스트\n\n본문");

    await page.getByTestId("column-editor-save-draft").click();
    await page.waitForTimeout(1500);
    const postId = new URL(page.url()).searchParams.get("postId");
    const noticeDraft = await page
      .getByTestId("column-editor-notice")
      .textContent()
      .catch(() => null);

    await page.getByTestId("column-editor-publish").click();
    await page.waitForTimeout(1500);
    const noticePublish = await page
      .getByTestId("column-editor-notice")
      .textContent()
      .catch(() => null);

    await page.goto("/column", {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    const card = page
      .locator('[data-testid="column-card"]')
      .filter({ hasText: title })
      .first();
    const found = (await card.count()) > 0;

    const listActions = { edit: false, delete: false };
    const detailActions = { list: false, edit: false, delete: false };

    if (found) {
      listActions.edit =
        (await card.getByTestId("column-admin-edit").count()) > 0;
      listActions.delete =
        (await card.getByTestId("column-admin-delete-open").count()) > 0;

      await card.locator("a", { hasText: title }).first().click();
      await page.waitForLoadState("networkidle");
      detailActions.list =
        (await page.getByTestId("column-admin-list").count()) > 0;
      detailActions.edit =
        (await page.getByTestId("column-admin-edit").count()) > 0;
      detailActions.delete =
        (await page.getByTestId("column-admin-delete-open").count()) > 0;

      await page.goto("/column", {
        waitUntil: "networkidle",
        timeout: 120000,
      });
      const card2 = page
        .locator('[data-testid="column-card"]')
        .filter({ hasText: title })
        .first();
      await card2.getByTestId("column-admin-delete-open").click();
      await page.getByTestId("column-admin-delete-confirm-input").fill("삭제");
      await page.getByTestId("column-admin-delete-confirm-submit").click();
      await page.waitForTimeout(1800);
    }

    const deleted =
      (await page
        .locator('[data-testid="column-card"]')
        .filter({ hasText: title })
        .count()) === 0;

    result.crud.flow = {
      title,
      postId,
      noticeDraft,
      noticePublish,
      found,
      listActions,
      detailActions,
      deleted,
    };

    console.log("verify:crud-done");
    await browser.close();
    console.log("---C1_CRUD_RESULT_START---");
    console.log(JSON.stringify(result, null, 2));
    console.log("---C1_CRUD_RESULT_END---");
  } catch (error) {
    result.error = String(error);
    console.log("---C1_CRUD_RESULT_START---");
    console.log(JSON.stringify(result, null, 2));
    console.log("---C1_CRUD_RESULT_END---");
    process.exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    try {
      spawnSync("taskkill", ["/pid", String(dev.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } catch {
      // ignore
    }
  }
}

main();
