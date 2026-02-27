const { wait } = require("../dev-server.cjs");
const {
  loginAdmin,
  createPublishedColumnPost,
} = require("../column-admin-api.cjs");

const SCROLL_TOP_TOLERANCE = 8;

async function waitFor(predicate, timeoutMs, intervalMs = 300) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return true;
    await wait(intervalMs);
  }
  return false;
}

async function readWindowScrollY(page) {
  return page.evaluate(() => Math.round(window.scrollY || window.pageYOffset || 0));
}

async function scrollWindowToBottom(page) {
  return page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    return Math.round(window.scrollY || window.pageYOffset || 0);
  });
}

async function ensureScrollPrecondition(page, fallbackY = 360) {
  let scrollY = await scrollWindowToBottom(page);
  if (scrollY > SCROLL_TOP_TOLERANCE) return scrollY;

  await page.evaluate((y) => {
    window.scrollTo(0, y);
    return Math.round(window.scrollY || window.pageYOffset || 0);
  }, fallbackY);
  await wait(120);
  scrollY = await readWindowScrollY(page);
  return scrollY;
}

async function runRouteScrollAndColumnCardScenario(input) {
  const {
    page,
    context,
    baseUrl,
    adminPasswordCandidates,
    output,
    pushFailure,
  } = input;
  const createdPosts = [];
  let detailPath = null;

  const login = await loginAdmin(baseUrl, context, adminPasswordCandidates);
  output.checks.loginStatus = login.status;
  output.checks.loginMatched = login.selectedPassword ? "yes" : "no";
  if (login.status !== 200) {
    pushFailure(output, "admin_login_failed", login.status);
    throw new Error("admin login failed");
  }

  const createdPostCount = 5;
  for (let index = 0; index < createdPostCount; index += 1) {
    const title = `qa-scroll-card-${Date.now()}-${index + 1}`;
    const created = await createPublishedColumnPost(baseUrl, context, title);
    if (created.status !== 200 || !created.postId || !created.slug) {
      pushFailure(output, "column_post_create_failed", {
        index,
        status: created.status,
        payload: created.payload,
      });
      throw new Error(`column post create failed at index ${index}`);
    }
    createdPosts.push({
      id: created.postId,
      slug: created.slug,
      title,
    });
  }
  const targetPost = createdPosts[0];
  detailPath = `/column/${encodeURIComponent(targetPost.slug)}`;
  output.checks.createdPostCount = createdPosts.length;
  output.checks.targetPostId = targetPost.id;
  output.checks.targetPostSlug = targetPost.slug;

  await page.goto("/column", { waitUntil: "networkidle", timeout: 120000 });
  const targetCardInColumn = page
    .locator("[data-testid='column-card']")
    .filter({ hasText: targetPost.title })
    .first();
  const targetCardFoundInColumn = await waitFor(
    async () => (await targetCardInColumn.count()) > 0,
    10000,
    250
  );
  output.checks.targetCardFoundInColumn = targetCardFoundInColumn;
  if (!targetCardFoundInColumn) {
    pushFailure(output, "target_card_missing_before_route_change", targetPost.title);
    throw new Error("target card missing before route change");
  }

  const scrollBeforeRouteChange = await ensureScrollPrecondition(page);
  output.checks.scrollBeforeRouteChange = scrollBeforeRouteChange;
  output.checks.routeScrollPreconditionMet = scrollBeforeRouteChange > SCROLL_TOP_TOLERANCE;

  const exploreMenuLink = page.locator("header a[href='/explore']").first();
  const hasExploreMenuLink = (await exploreMenuLink.count()) > 0;
  output.checks.hasExploreMenuLink = hasExploreMenuLink;
  if (!hasExploreMenuLink) {
    pushFailure(output, "explore_menu_link_missing", null);
    throw new Error("explore menu link missing");
  }

  await exploreMenuLink.click();
  await page.waitForURL("**/explore", { timeout: 120000 });
  await page.waitForLoadState("networkidle");
  await wait(900);
  const scrollAfterRouteChange = await readWindowScrollY(page);
  output.checks.scrollAfterRouteChange = scrollAfterRouteChange;
  if (scrollAfterRouteChange > SCROLL_TOP_TOLERANCE) {
    pushFailure(output, "route_scroll_not_reset", {
      before: scrollBeforeRouteChange,
      after: scrollAfterRouteChange,
    });
  }

  const columnMenuLink = page.locator("header a[href='/column']").first();
  const hasColumnMenuLink = (await columnMenuLink.count()) > 0;
  output.checks.hasColumnMenuLink = hasColumnMenuLink;
  if (!hasColumnMenuLink) {
    pushFailure(output, "column_menu_link_missing", null);
    throw new Error("column menu link missing");
  }

  await columnMenuLink.click();
  await page.waitForURL("**/column", { timeout: 120000 });
  await page.waitForLoadState("networkidle");

  const card = page
    .locator("[data-testid='column-card']")
    .filter({ hasText: targetPost.title })
    .first();
  const cardVisible = await waitFor(async () => (await card.count()) > 0, 10000, 250);
  output.checks.createdCardVisible = cardVisible;
  if (!cardVisible) {
    pushFailure(output, "created_card_missing", targetPost.title);
    throw new Error("created card missing");
  }

  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 360));
  const scrollBeforeCardClick = await readWindowScrollY(page);
  output.checks.scrollBeforeCardClick = scrollBeforeCardClick;
  output.checks.cardClickScrollPreconditionMet = scrollBeforeCardClick > SCROLL_TOP_TOLERANCE;

  const detailHref = await card.locator("h2 a").first().getAttribute("href");
  output.checks.cardTitleHref = detailHref;

  const summaryText = card.locator("p").first();
  const hasSummaryText = (await summaryText.count()) > 0;
  output.checks.cardSummaryPresent = hasSummaryText;

  if (hasSummaryText) {
    await summaryText.click();
  } else {
    await card.click({ position: { x: 48, y: 156 } });
  }

  if (detailPath) {
    await page.waitForURL(`**${detailPath}`, { timeout: 120000 });
  } else {
    await page.waitForURL("**/column/**", { timeout: 120000 });
  }
  await page.waitForLoadState("networkidle");
  await wait(900);

  const afterCardClickPath = new URL(page.url()).pathname;
  output.checks.afterCardClickPath = afterCardClickPath;
  if (detailPath && afterCardClickPath !== detailPath) {
    pushFailure(output, "card_click_target_mismatch", {
      expected: detailPath,
      actual: afterCardClickPath,
    });
  }

  const scrollAfterCardOpen = await readWindowScrollY(page);
  output.checks.scrollAfterCardOpen = scrollAfterCardOpen;
  if (scrollAfterCardOpen > SCROLL_TOP_TOLERANCE) {
    pushFailure(output, "card_open_scroll_not_reset", {
      before: scrollBeforeCardClick,
      after: scrollAfterCardOpen,
    });
  }

  return { createdPosts };
}

module.exports = {
  runRouteScrollAndColumnCardScenario,
};
