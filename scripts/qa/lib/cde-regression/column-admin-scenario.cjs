async function runColumnAndAdminCrudScenario(input) {
  const {
    page,
    context,
    baseUrl,
    adminPasswordCandidates,
    result,
    pushFailure,
    waitFor,
  } = input;

  const columnRes = await page.goto("/column", {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  result.checks.columnStatus = columnRes?.status() ?? null;
  if (columnRes?.status() !== 200) {
    pushFailure(result.failures, "column_status", columnRes?.status() ?? null);
  }

  const chunkOk = await waitFor(async () => {
    return result.network.responses.some(
      (entry) =>
        entry.url.includes("/_next/static/chunks/app/layout.js") && entry.status === 200
    );
  }, 15000);
  result.checks.layoutChunk200 = chunkOk;
  if (!chunkOk) {
    pushFailure(result.failures, "layout_chunk_200_missing", null);
  }

  const tagRes = await page.goto(
    "/column/tag/%ED%95%9C%EA%B8%80-%ED%83%9C%EA%B7%B8-%EC%97%86%EC%9D%8C-%EA%B2%80%EC%A6%9D",
    { waitUntil: "networkidle", timeout: 120000 }
  );
  result.checks.tagStatus = tagRes?.status() ?? null;
  if (tagRes?.status() !== 200) {
    pushFailure(result.failures, "column_tag_status", tagRes?.status() ?? null);
  }

  let apiLoginRes = null;
  let selectedPassword = null;
  const loginAttempts = [];
  for (const candidate of adminPasswordCandidates) {
    const response = await context.request.post(`${baseUrl}/api/verify-password`, {
      failOnStatusCode: false,
      data: {
        password: candidate,
        loginType: "admin",
      },
    });
    loginAttempts.push(response.status());
    if (response.status() === 200) {
      apiLoginRes = response;
      selectedPassword = candidate;
      break;
    }
    if (!apiLoginRes) {
      apiLoginRes = response;
    }
  }

  result.checks.adminLoginApiStatus = apiLoginRes?.status() ?? null;
  result.checks.adminLoginApiAttempts = loginAttempts;
  result.checks.adminLoginPasswordSelected = selectedPassword ? "matched" : "none";

  if (apiLoginRes?.status() === 200) {
    await page.goto("/column", { waitUntil: "networkidle", timeout: 120000 });
    result.checks.adminLoginFlow = "api_verify_password";
  } else {
    const loginBody = await apiLoginRes?.text().catch(() => "");
    result.checks.adminLoginApiBody = loginBody.slice(0, 240);

    await page.goto(`/admin-login?redirect=${encodeURIComponent("/column")}`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    const passwordInput = page.locator("input[type='password']");
    const loginFormReady = await passwordInput
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (loginFormReady) {
      await passwordInput.fill(adminPasswordCandidates[0]);
      await page.locator("form button[type='submit']").click();
      await page.waitForURL("**/column", { timeout: 120000 });
      result.checks.adminLoginFlow = "form_submit_fallback";
    } else {
      const currentUrl = page.url();
      const alreadyOnColumn = currentUrl.includes("/column");
      result.checks.adminLoginFlow = alreadyOnColumn
        ? "already_authenticated"
        : "missing_login_form";
      if (!alreadyOnColumn) {
        pushFailure(result.failures, "admin_login_missing", {
          currentUrl,
          apiStatus: apiLoginRes?.status() ?? null,
        });
        throw new Error("admin_login_missing");
      }
    }
  }

  const hasColumnMenu = (await page.locator("a[href='/column']").count()) > 0;
  const hasWriteMenu = (await page.locator("a[href='/admin/column/editor']").count()) > 0;
  result.checks.menuColumn = hasColumnMenu;
  result.checks.menuWrite = hasWriteMenu;
  if (!hasColumnMenu) pushFailure(result.failures, "menu_column_missing", null);
  if (!hasWriteMenu) pushFailure(result.failures, "menu_write_missing", null);

  await page.goto("/admin/column/editor", { waitUntil: "networkidle", timeout: 120000 });
  const title = `qa-auto-${Date.now()}`;
  const titleField = page.getByTestId("column-editor-title");
  const titleFieldReady = await titleField
    .waitFor({ state: "visible", timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!titleFieldReady) {
    pushFailure(result.failures, "column_editor_title_missing", {
      url: page.url(),
      loginFlow: result.checks.adminLoginFlow,
      loginApiStatus: result.checks.adminLoginApiStatus,
    });
    throw new Error("column_editor_title_missing");
  }
  await titleField.fill(title);

  const tagsField = page.getByTestId("column-editor-tags");
  const tagsFieldReady = await tagsField
    .waitFor({ state: "visible", timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!tagsFieldReady) {
    pushFailure(result.failures, "column_editor_tags_missing", {
      url: page.url(),
    });
    throw new Error("column_editor_tags_missing");
  }
  await tagsField.fill("QA,auto");

  const contentField = page.getByTestId("column-editor-content");
  const contentFieldReady = await contentField
    .waitFor({ state: "visible", timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!contentFieldReady) {
    pushFailure(result.failures, "column_editor_content_missing", {
      url: page.url(),
    });
    throw new Error("column_editor_content_missing");
  }
  await contentField.fill("## QA auto body");

  await page.getByTestId("column-editor-save-draft").click();
  await page.waitForTimeout(1000);

  let post = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const listRes = await context.request.get(
      `${baseUrl}/api/admin/column/posts?status=all&q=${encodeURIComponent(title)}`,
      { failOnStatusCode: false }
    );
    const listJson = await listRes.json().catch(() => ({}));
    post = Array.isArray(listJson.posts)
      ? listJson.posts.find((item) => item.title === title)
      : null;
    if (post) break;
    await page.waitForTimeout(800);
  }
  const postId = post?.id || null;
  if (!postId) {
    pushFailure(result.failures, "column_created_post_not_found", null);
    throw new Error("column_created_post_not_found");
  }

  await page.getByTestId("column-editor-publish").click();
  await page.waitForTimeout(1000);

  const detailRes = await context.request.get(`${baseUrl}/api/admin/column/posts/${postId}`, {
    failOnStatusCode: false,
  });
  const detailJson = await detailRes.json().catch(() => ({}));
  const slug = detailJson?.post?.slug || post?.slug || null;
  if (!slug) {
    pushFailure(result.failures, "column_created_slug_not_found", postId);
    throw new Error("column_created_slug_not_found");
  }

  await page.goto("/column", { waitUntil: "networkidle", timeout: 120000 });
  const card = page.locator("[data-testid='column-card']").filter({ hasText: title }).first();
  const cardFound = await waitFor(async () => (await card.count()) > 0, 6000, 300);
  result.checks.columnCardFound = cardFound;

  const canDeleteFromList = cardFound
    ? (await card.getByTestId("column-admin-delete-open").count()) > 0
    : false;
  result.checks.columnListDeleteAction = canDeleteFromList;

  await page.goto(`/column/${encodeURIComponent(slug)}`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  const detailDeleteButton = page.getByTestId("column-admin-delete-open");
  if ((await detailDeleteButton.count()) === 0) {
    pushFailure(result.failures, "column_detail_delete_missing", slug);
  } else {
    await detailDeleteButton.click();
    await page.getByTestId("column-admin-delete-confirm-input").fill("\uC0AD\uC81C");
    await page.getByTestId("column-admin-delete-confirm-submit").click();
    await page.waitForURL("**/column", { timeout: 120000 });
  }

  const deletedRes = await context.request.get(`${baseUrl}/api/admin/column/posts/${postId}`, {
    failOnStatusCode: false,
  });
  result.checks.deletedDetailStatus = deletedRes.status();
  if (deletedRes.status() !== 404) {
    pushFailure(result.failures, "column_delete_not_applied", deletedRes.status());
  }
}

module.exports = {
  runColumnAndAdminCrudScenario,
};
