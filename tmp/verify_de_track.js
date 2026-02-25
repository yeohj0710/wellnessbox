const { chromium } = require('playwright');

function trimBody(text, max = 800) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

async function safeReadResponseBody(res) {
  try {
    const ct = (res.headers()['content-type'] || '').toLowerCase();
    if (ct.includes('application/json') || ct.includes('text/')) {
      const text = await res.text();
      return trimBody(text);
    }
    return `[binary:${ct || 'unknown'}]`;
  } catch {
    return '[unreadable]';
  }
}

async function run() {
  const baseUrl = 'http://localhost:3107';
  const adminPassword = process.env.ADMIN_PASSWORD || '0903';

  const result = {
    d: {
      toolbar: {},
      hiddenDetailsVisible: {},
      restartFlow: {},
      forceRefresh: {},
      employeeDownload: {},
    },
    e: {
      employeeWebSections: {},
      adminWebSections: {},
      adminDownloads: {},
    },
    network: {
      interestingResponses: [],
      syncRequests: [],
    },
    consoleErrors: [],
    pageErrors: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') result.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => result.pageErrors.push(String(err)));

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/b2b/employee/sync')) {
      result.network.syncRequests.push({
        url,
        method: req.method(),
        postData: req.postData() || null,
      });
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (
      url.includes('/api/health/nhis/init') ||
      url.includes('/api/health/nhis/sign') ||
      url.includes('/api/b2b/employee/sync') ||
      url.includes('/api/b2b/employee/report/export/pdf') ||
      url.includes('/api/admin/b2b/reports/')
    ) {
      result.network.interestingResponses.push({
        url,
        status: res.status(),
        body: await safeReadResponseBody(res),
      });
    }
  });

  await page.goto(`/admin-login?redirect=${encodeURIComponent('/admin/b2b-reports?demo=1')}`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL('**/admin/b2b-reports**', { timeout: 120000 });

  const seedRes = await context.request.post(`${baseUrl}/api/admin/b2b/demo/seed`, {
    failOnStatusCode: false,
    timeout: 180000,
  });
  const seedJson = await seedRes.json().catch(() => ({}));
  const employeeId = Array.isArray(seedJson.employeeIds) ? seedJson.employeeIds[0] : null;
  if (!employeeId) {
    throw new Error('seed_employee_not_found');
  }

  const detailRes = await context.request.get(`${baseUrl}/api/admin/b2b/employees/${employeeId}`, {
    failOnStatusCode: false,
  });
  const detailJson = await detailRes.json().catch(() => ({}));
  const employee = detailJson?.employee;
  if (!employee?.name || !employee?.birthDate || !employee?.phoneNormalized) {
    throw new Error('employee_identity_not_found');
  }

  const sessionLoginRes = await context.request.post(`${baseUrl}/api/b2b/employee/session`, {
    data: {
      name: employee.name,
      birthDate: employee.birthDate,
      phone: String(employee.phoneNormalized).replace(/\D/g, ''),
    },
    failOnStatusCode: false,
    headers: { 'Content-Type': 'application/json' },
  });
  result.d.restartFlow.sessionLoginStatus = sessionLoginRes.status();

  await page.goto('/employee-report?debug=1', { waitUntil: 'networkidle', timeout: 120000 });

  const webSummaryCount = await page.locator('text=이번 달 건강 요약').count();
  const hasGauge = (await page.locator('svg[aria-label*="종합 점수"]').count()) > 0;
  result.e.employeeWebSections = {
    hasMonthlySummarySection: webSummaryCount > 0,
    hasGauge,
    hasTrendSection: (await page.locator('text=월별 추이').count()) > 0,
  };

  const selectHandle = await page.locator('select').first().elementHandle();
  const pdfBtn = page.locator('button').filter({ hasText: 'PDF' }).first();
  const pdfHandle = await pdfBtn.elementHandle();
  if (selectHandle && pdfHandle) {
    const toolbarMetrics = await page.evaluate(([sel, btn]) => {
      const s = sel.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      return {
        selectHeight: Math.round(s.height),
        buttonHeight: Math.round(b.height),
        topDiff: Math.round(Math.abs(s.top - b.top)),
      };
    }, [selectHandle, pdfHandle]);
    result.d.toolbar = toolbarMetrics;
  }

  const createdVisible = await page.locator('text=생성 시각').first().isVisible().catch(() => false);
  const syncedVisible = await page.locator('text=최근 연동 시각').first().isVisible().catch(() => false);
  result.d.hiddenDetailsVisible = {
    createdVisible,
    syncedVisible,
  };

  const beforeEmpPdfResponseCount = result.network.interestingResponses.length;
  const employeeUrlBeforeDownload = page.url();
  const employeePdfInitiallyDisabled = await pdfBtn.isDisabled();
  if (!employeePdfInitiallyDisabled) {
    await pdfBtn.click();
    await page.waitForTimeout(5000);
  }
  const employeePdfResponses = result.network.interestingResponses
    .slice(beforeEmpPdfResponseCount)
    .filter((item) => item.url.includes('/api/b2b/employee/report/export/pdf'));
  result.d.employeeDownload = {
    urlBefore: employeeUrlBeforeDownload,
    urlAfter: page.url(),
    initiallyDisabled: employeePdfInitiallyDisabled,
    calls: employeePdfResponses,
  };

  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll('details')).find((el) =>
      (el.textContent || '').includes('강제')
    );
    if (target) target.open = true;
  });

  const forceOpenBtn = page.locator('button').filter({ hasText: '강제' }).first();
  const forceButtonVisible = await forceOpenBtn.isVisible().catch(() => false);
  let forceButtonDisabled = await forceOpenBtn.isDisabled().catch(() => true);
  if (forceButtonVisible && forceButtonDisabled) {
    for (let i = 0; i < 20; i += 1) {
      await page.waitForTimeout(1000);
      forceButtonDisabled = await forceOpenBtn.isDisabled().catch(() => true);
      if (!forceButtonDisabled) break;
    }
  }
  result.d.forceRefresh.buttonVisible = forceButtonVisible;
  result.d.forceRefresh.buttonDisabled = forceButtonDisabled;
  if (forceButtonVisible && !forceButtonDisabled) {
    await forceOpenBtn.click();

    const modalSubmit = page.locator('button').filter({ hasText: '실행' }).last();
    const modalCheckbox = page.locator('input[type="checkbox"]').last();
    const modalInput = page.locator('input[placeholder*="강제"]').last();

    const disabledInitially = await modalSubmit.isDisabled();
    await modalCheckbox.check();
    await modalInput.fill('wrong');
    const disabledAfterWrong = await modalSubmit.isDisabled();
    await modalInput.fill('\uAC15\uC81C \uC7AC\uC870\uD68C');
    const enabledAfterConfirm = !(await modalSubmit.isDisabled());

    const beforeForceResponseCount = result.network.interestingResponses.length;
    await modalSubmit.click();
    await page.waitForTimeout(8000);
    const forceResponses = result.network.interestingResponses
      .slice(beforeForceResponseCount)
      .filter((item) => item.url.includes('/api/b2b/employee/sync'));

    result.d.forceRefresh = {
      ...result.d.forceRefresh,
      disabledInitially,
      disabledAfterWrong,
      enabledAfterConfirm,
      calls: forceResponses,
    };
  }

  const beforeRestartResponseCount = result.network.interestingResponses.length;
  const restartBtn = page.locator('button').filter({ hasText: '인증' }).first();
  await restartBtn.click();
  await page.waitForTimeout(10000);
  const restartResponses = result.network.interestingResponses
    .slice(beforeRestartResponseCount)
    .filter(
      (item) =>
        item.url.includes('/api/health/nhis/init') ||
        item.url.includes('/api/health/nhis/sign') ||
        item.url.includes('/api/b2b/employee/sync')
    );
  result.d.restartFlow.calls = restartResponses;

  await page.goto('/admin/b2b-reports?demo=1', { waitUntil: 'networkidle', timeout: 120000 });

  const employeeButton = page.locator('button').filter({ hasText: employee.name }).first();
  await employeeButton.click();
  await page.waitForTimeout(2500);

  result.e.adminWebSections = {
    hasMonthlySummarySection: (await page.locator('text=이번 달 건강 요약').count()) > 0,
    hasTrendSection: (await page.locator('text=월별 추이').count()) > 0,
  };

  const adminPdfBtn = page.locator('button').filter({ hasText: 'PDF' }).first();
  const adminPptBtn = page.locator('button').filter({ hasText: 'PPTX' }).first();

  const adminUrlBefore = page.url();

  const beforeAdminPdfCount = result.network.interestingResponses.length;
  await adminPdfBtn.click();
  await page.waitForTimeout(5000);
  const adminPdfResponses = result.network.interestingResponses
    .slice(beforeAdminPdfCount)
    .filter((item) => item.url.includes('/api/admin/b2b/reports/') && item.url.includes('/export/pdf'));

  const beforeAdminPptCount = result.network.interestingResponses.length;
  await adminPptBtn.click();
  await page.waitForTimeout(5000);
  const adminPptResponses = result.network.interestingResponses
    .slice(beforeAdminPptCount)
    .filter((item) => item.url.includes('/api/admin/b2b/reports/') && item.url.includes('/export/pptx'));

  result.e.adminDownloads = {
    urlBefore: adminUrlBefore,
    urlAfter: page.url(),
    pdfCalls: adminPdfResponses,
    pptxCalls: adminPptResponses,
  };

  await browser.close();
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
