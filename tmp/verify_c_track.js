const { chromium } = require('playwright');

async function run() {
  const baseUrl = 'http://localhost:3107';
  const adminPassword = process.env.ADMIN_PASSWORD || '0903';

  const result = {
    c1: {},
    c2: {},
    consoleErrors: [],
    pageErrors: [],
    apiStatuses: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') result.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => result.pageErrors.push(String(err)));

  page.on('response', async (res) => {
    const url = res.url();
    if (
      url.includes('/_next/static/chunks/app/layout.js') ||
      url.includes('/api/admin/column/posts') ||
      url.includes('/column')
    ) {
      result.apiStatuses.push({ url, status: res.status() });
    }
  });

  const columnRes = await page.goto('/column', { waitUntil: 'networkidle', timeout: 120000 });
  const layoutChunkResponses = result.apiStatuses.filter((r) => r.url.includes('/_next/static/chunks/app/layout.js'));
  result.c1.column = {
    status: columnRes?.status() ?? null,
    layoutChunkResponses,
    h1: await page.locator('h1').first().textContent().catch(() => null),
  };

  const tagUrl = '/column/tag/%ED%95%9C%EA%B8%80-%ED%83%9C%EA%B7%B8-%EC%97%86%EC%9D%8C-%EA%B2%80%EC%A6%9D';
  const tagRes = await page.goto(tagUrl, { waitUntil: 'networkidle', timeout: 120000 });
  const tagBody = (await page.textContent('body')) || '';
  result.c1.tag = {
    status: tagRes?.status() ?? null,
    has404: /404|not found/i.test(tagBody),
  };

  await page.goto(`/admin-login?redirect=${encodeURIComponent('/column')}`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL('**/column', { timeout: 120000 });

  result.c2.globalMenu = {
    hasColumn: (await page.locator('a[href="/column"]').count()) > 0,
    hasWrite: (await page.locator('a[href="/admin/column/editor"]').count()) > 0,
  };

  await page.goto('/admin/column/editor', { waitUntil: 'networkidle', timeout: 120000 });

  const title = `auto-${Date.now()}`;
  await page.getByTestId('column-editor-title').fill(title);
  await page.getByTestId('column-editor-tags').fill('자동테스트,관리');
  await page.getByTestId('column-editor-content').fill('## 자동 테스트 본문\n\n검증용 콘텐츠');

  await page.getByTestId('column-editor-save-draft').click();
  await page.waitForTimeout(1200);
  const draftNotice = await page.getByTestId('column-editor-notice').textContent().catch(() => null);

  const listRes = await context.request.get(`${baseUrl}/api/admin/column/posts?status=all&q=${encodeURIComponent(title)}`, {
    failOnStatusCode: false,
  });
  const listJson = await listRes.json().catch(() => ({}));
  const post = Array.isArray(listJson.posts) ? listJson.posts.find((p) => p.title === title) : null;
  const postId = post?.id || null;

  if (!postId) {
    throw new Error('created_post_not_found');
  }

  await page.getByTestId('column-editor-publish').click();
  await page.waitForTimeout(1200);
  const publishNotice = await page.getByTestId('column-editor-notice').textContent().catch(() => null);

  const detailRes = await context.request.get(`${baseUrl}/api/admin/column/posts/${postId}`, { failOnStatusCode: false });
  const detailJson = await detailRes.json().catch(() => ({}));
  const slug = detailJson?.post?.slug || post?.slug || null;
  if (!slug) {
    throw new Error('created_post_slug_not_found');
  }

  await page.goto('/column', { waitUntil: 'networkidle', timeout: 120000 });
  const card = page.locator('[data-testid="column-card"]').filter({ hasText: title }).first();
  const cardFound = (await card.count()) > 0;

  const listActions = {
    edit: cardFound ? (await card.getByTestId('column-admin-edit').count()) > 0 : false,
    delete: cardFound ? (await card.getByTestId('column-admin-delete-open').count()) > 0 : false,
  };

  await page.goto(`/column/${encodeURIComponent(slug)}`, { waitUntil: 'networkidle', timeout: 120000 });
  const detailActions = {
    list: (await page.getByTestId('column-admin-list').count()) > 0,
    edit: (await page.getByTestId('column-admin-edit').count()) > 0,
    delete: (await page.getByTestId('column-admin-delete-open').count()) > 0,
  };

  await page.getByTestId('column-admin-delete-open').click();
  await page.getByTestId('column-admin-delete-confirm-input').fill('\uC0AD\uC81C');
  await page.getByTestId('column-admin-delete-confirm-submit').click();
  await page.waitForURL('**/column', { timeout: 120000 });

  const afterDeleteRes = await context.request.get(`${baseUrl}/api/admin/column/posts/${postId}`, {
    failOnStatusCode: false,
  });

  await page.goto('/column', { waitUntil: 'networkidle', timeout: 120000 });
  const deletedFromList =
    (await page.locator('[data-testid="column-card"]').filter({ hasText: title }).count()) === 0;

  result.c2.flow = {
    title,
    postId,
    slug,
    draftNotice,
    publishNotice,
    cardFound,
    listActions,
    detailActions,
    detailStatusAfterDelete: afterDeleteRes.status(),
    deletedFromList,
  };

  await browser.close();
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});