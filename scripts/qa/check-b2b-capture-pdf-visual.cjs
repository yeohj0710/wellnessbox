/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const Jimp = require("jimp");
const {
  waitForServerReady,
  resolveNextDevCommand,
  spawnNextDev,
  stopProcessTree,
} = require("./lib/dev-server.cjs");
const { acquireQaLock } = require("./lib/qa-lock.cjs");
const { buildAdminPasswordCandidates, loginAdmin } = require("./lib/column-admin-api.cjs");
require("dotenv").config({ path: path.join(process.cwd(), ".env"), quiet: true });

const ROOT = process.cwd();
const QA_PORT = Number(process.env.QA_PDF_CAPTURE_PORT || "3114");
const BASE_URL = process.env.BASE_URL || `http://localhost:${QA_PORT}`;
const START_TIMEOUT_MS = Number(process.env.QA_START_TIMEOUT_MS || "150000");
const ARTIFACT_ROOT = path.join(
  ROOT,
  "tmp",
  "pdfs",
  "qa-report-capture",
  new Date().toISOString().replace(/[:.]/g, "-")
);

const THRESHOLDS = {
  meanAbsDiffMax: Number(process.env.QA_PDF_DIFF_MAX || "0.13"),
  ssimMin: Number(process.env.QA_PDF_SSIM_MIN || "-1"),
  sharpnessRatioMin: Number(process.env.QA_PDF_SHARPNESS_RATIO_MIN || "0.9"),
  verticalShiftPxMax: Number(process.env.QA_PDF_VERTICAL_SHIFT_MAX || "16"),
};
const CASE_FILTER = (process.env.QA_PDF_CASE_FILTER || "").trim().toLowerCase();

const TEST_CASES = [
  {
    id: "employee_1600_dpr1",
    route: "employee",
    viewport: { width: 1600, height: 1100 },
    deviceScaleFactor: 1,
  },
  {
    id: "employee_1600_dpr2",
    route: "employee",
    viewport: { width: 1600, height: 1100 },
    deviceScaleFactor: 2,
  },
  {
    id: "employee_1366_dpr1",
    route: "employee",
    viewport: { width: 1366, height: 960 },
    deviceScaleFactor: 1,
  },
  {
    id: "employee_1920_dpr1",
    route: "employee",
    viewport: { width: 1920, height: 1200 },
    deviceScaleFactor: 1,
  },
  {
    id: "admin_1600_dpr1",
    route: "admin",
    viewport: { width: 1600, height: 1100 },
    deviceScaleFactor: 1,
  },
  {
    id: "admin_1600_dpr2",
    route: "admin",
    viewport: { width: 1600, height: 1100 },
    deviceScaleFactor: 2,
  },
  {
    id: "admin_1366_dpr1",
    route: "admin",
    viewport: { width: 1366, height: 960 },
    deviceScaleFactor: 1,
  },
  {
    id: "admin_1920_dpr1",
    route: "admin",
    viewport: { width: 1920, height: 1200 },
    deviceScaleFactor: 1,
  },
];

function resolveActiveCases() {
  if (!CASE_FILTER) return TEST_CASES;
  return TEST_CASES.filter((testCase) => {
    return (
      testCase.id.toLowerCase().includes(CASE_FILTER) ||
      testCase.route.toLowerCase().includes(CASE_FILTER)
    );
  });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function pushFailure(output, key, detail) {
  output.failures.push({ key, detail });
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedDemoEmployee(context, baseUrl) {
  const seedRes = await context.request.post(`${baseUrl}/api/admin/b2b/demo/seed`, {
    failOnStatusCode: false,
    timeout: 240000,
  });
  const seedJson = await seedRes.json().catch(() => ({}));
  const employeeId = Array.isArray(seedJson.employeeIds) ? seedJson.employeeIds[0] : null;
  return {
    status: seedRes.status(),
    employeeId,
    payload: seedJson,
  };
}

async function fetchEmployeeIdentity(context, baseUrl, employeeId) {
  let responseStatus = null;
  let employee = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const detailRes = await context.request.get(`${baseUrl}/api/admin/b2b/employees/${employeeId}`, {
      failOnStatusCode: false,
      timeout: 240000,
    });
    responseStatus = detailRes.status();
    const detailJson = await detailRes.json().catch(() => ({}));
    employee = detailJson?.employee || null;
    if (employee?.name && employee?.birthDate && employee?.phoneNormalized) {
      break;
    }
    // eslint-disable-next-line no-await-in-loop
    await wait(1200);
  }

  return {
    status: responseStatus,
    employee,
  };
}

async function createEmployeeSession(context, baseUrl, employee) {
  if (!employee?.name || !employee?.birthDate || !employee?.phoneNormalized) {
    return { status: null };
  }
  const sessionRes = await context.request.post(`${baseUrl}/api/b2b/employee/session`, {
    data: {
      name: employee.name,
      birthDate: employee.birthDate,
      phone: String(employee.phoneNormalized).replace(/\D/g, ""),
    },
    failOnStatusCode: false,
    headers: { "Content-Type": "application/json" },
    timeout: 120000,
  });
  return { status: sessionRes.status() };
}

async function fetchEmployeeReport(context, baseUrl, periodKey) {
  const suffix = periodKey ? `?period=${encodeURIComponent(periodKey)}` : "";
  const reportRes = await context.request.get(`${baseUrl}/api/b2b/employee/report${suffix}`, {
    failOnStatusCode: false,
    timeout: 120000,
  });
  const reportJson = await reportRes.json().catch(() => ({}));
  return {
    status: reportRes.status(),
    reportJson,
  };
}

async function regenerateAdminReport(context, baseUrl, employeeId, periodKey) {
  const payload = {
    regenerate: true,
    pageSize: "A4",
  };
  if (periodKey) payload.periodKey = periodKey;
  const response = await context.request.post(`${baseUrl}/api/admin/b2b/employees/${employeeId}/report`, {
    data: payload,
    failOnStatusCode: false,
    timeout: 240000,
  });
  const body = await response.json().catch(() => ({}));
  return {
    status: response.status(),
    body,
  };
}

async function waitForReportPages(page) {
  await page.waitForSelector('[data-testid="report-capture-surface"] [data-report-page="1"]', {
    timeout: 120000,
  });
  await page.waitForSelector('[data-testid="report-capture-surface"] [data-report-page="2"]', {
    timeout: 120000,
  });
  await page.waitForTimeout(350);
}

async function saveWebReportPageImages(page, caseDir) {
  const locator = page.locator('[data-testid="report-capture-surface"] [data-report-page]');
  const count = await locator.count();
  if (count < 2) {
    throw new Error(`report page count is ${count}; expected >= 2`);
  }

  const paths = [];
  for (let index = 0; index < 2; index += 1) {
    const pagePath = path.join(caseDir, `web-page-${index + 1}.png`);
    await locator.nth(index).screenshot({ path: pagePath });
    paths.push(pagePath);
  }
  return paths;
}

function renderPdfPages(pdfPath, outputPrefix) {
  const result = spawnSync(
    "pdftoppm",
    ["-png", "-r", "240", "-f", "1", "-l", "2", pdfPath, outputPrefix],
    {
      encoding: "utf8",
    }
  );
  if (result.status !== 0) {
    throw new Error(
      `pdftoppm failed (${result.status}): ${result.stderr || result.stdout || "unknown"}`
    );
  }
}

async function trimWhiteMargins(inputPath, outputPath) {
  const image = await Jimp.read(inputPath);
  const { width, height, data } = image.bitmap;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const whiteThreshold = 248;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const isContent = a > 0 && (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold);
      if (!isContent) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    await image.writeAsync(outputPath);
    return { width, height };
  }

  const pad = 4;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2);
  image.crop(cropX, cropY, cropW, cropH);
  await image.writeAsync(outputPath);
  return { width: cropW, height: cropH };
}

function lumaFromBitmap(bitmap, x, y) {
  const idx = (y * bitmap.width + x) * 4;
  const r = bitmap.data[idx];
  const g = bitmap.data[idx + 1];
  const b = bitmap.data[idx + 2];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function buildRowDarknessProfile(bitmap) {
  const profile = new Array(bitmap.height).fill(0);
  for (let y = 0; y < bitmap.height; y += 1) {
    let sumDarkness = 0;
    for (let x = 0; x < bitmap.width; x += 2) {
      const luma = lumaFromBitmap(bitmap, x, y);
      sumDarkness += 255 - luma;
    }
    profile[y] = sumDarkness / Math.ceil(bitmap.width / 2);
  }
  return profile;
}

function estimateVerticalShiftPx(profileA, profileB, maxShiftPx = 12) {
  let bestShift = 0;
  let bestError = Number.POSITIVE_INFINITY;

  for (let shift = -maxShiftPx; shift <= maxShiftPx; shift += 1) {
    let sumError = 0;
    let count = 0;
    for (let y = 0; y < profileA.length; y += 1) {
      const shiftedY = y + shift;
      if (shiftedY < 0 || shiftedY >= profileB.length) continue;
      sumError += Math.abs(profileA[y] - profileB[shiftedY]);
      count += 1;
    }
    if (count === 0) continue;
    const avgError = sumError / count;
    if (avgError < bestError) {
      bestError = avgError;
      bestShift = shift;
    }
  }

  return bestShift;
}

function computeSharpness(bitmap) {
  let gradientSum = 0;
  let sampleCount = 0;
  const width = bitmap.width;
  const height = bitmap.height;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const gx = lumaFromBitmap(bitmap, x + 1, y) - lumaFromBitmap(bitmap, x - 1, y);
      const gy = lumaFromBitmap(bitmap, x, y + 1) - lumaFromBitmap(bitmap, x, y - 1);
      gradientSum += Math.sqrt(gx * gx + gy * gy);
      sampleCount += 1;
    }
  }

  return sampleCount > 0 ? gradientSum / sampleCount / 255 : 0;
}

function computeMetrics(bitmapA, bitmapB) {
  const width = Math.min(bitmapA.width, bitmapB.width);
  const height = Math.min(bitmapA.height, bitmapB.height);

  let sampleCount = 0;
  let sumA = 0;
  let sumB = 0;
  let sumAbsDiff = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const a = lumaFromBitmap(bitmapA, x, y);
      const b = lumaFromBitmap(bitmapB, x, y);
      sumA += a;
      sumB += b;
      sumAbsDiff += Math.abs(a - b);
      sampleCount += 1;
    }
  }

  const meanA = sumA / Math.max(1, sampleCount);
  const meanB = sumB / Math.max(1, sampleCount);

  let varA = 0;
  let varB = 0;
  let cov = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const a = lumaFromBitmap(bitmapA, x, y) - meanA;
      const b = lumaFromBitmap(bitmapB, x, y) - meanB;
      varA += a * a;
      varB += b * b;
      cov += a * b;
    }
  }

  varA /= Math.max(1, sampleCount - 1);
  varB /= Math.max(1, sampleCount - 1);
  cov /= Math.max(1, sampleCount - 1);

  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  const ssim =
    ((2 * meanA * meanB + c1) * (2 * cov + c2)) /
    ((meanA * meanA + meanB * meanB + c1) * (varA + varB + c2));

  return {
    meanAbsDiff: sumAbsDiff / Math.max(1, sampleCount) / 255,
    ssim,
  };
}

async function compareWebVsPdfPage(input) {
  const webImageRaw = await Jimp.read(input.webImagePath);
  const pdfImageRaw = await Jimp.read(input.pdfImagePath);

  const cropInsetX = Math.max(8, Math.round(webImageRaw.bitmap.width * 0.02));
  const cropInsetY = Math.max(8, Math.round(webImageRaw.bitmap.height * 0.018));
  const cropWidth = Math.max(
    32,
    Math.min(webImageRaw.bitmap.width, pdfImageRaw.bitmap.width) - cropInsetX * 2
  );
  const cropHeight = Math.max(
    32,
    Math.min(webImageRaw.bitmap.height, pdfImageRaw.bitmap.height) - cropInsetY * 2
  );
  const focusHeight = Math.max(32, Math.round(cropHeight * 0.9));

  const webImage = webImageRaw.clone().crop(cropInsetX, cropInsetY, cropWidth, focusHeight);
  const pdfImage = pdfImageRaw.clone().crop(cropInsetX, cropInsetY, cropWidth, focusHeight);
  pdfImage.resize(webImage.bitmap.width, webImage.bitmap.height, Jimp.RESIZE_BICUBIC);

  const metrics = computeMetrics(webImage.bitmap, pdfImage.bitmap);
  const webSharpness = computeSharpness(webImage.bitmap);
  const pdfSharpness = computeSharpness(pdfImage.bitmap);

  const webProfile = buildRowDarknessProfile(webImage.bitmap);
  const pdfProfile = buildRowDarknessProfile(pdfImage.bitmap);
  const verticalShiftPx = estimateVerticalShiftPx(webProfile, pdfProfile, 16);

  return {
    ...metrics,
    webSharpness,
    pdfSharpness,
    sharpnessRatio: webSharpness > 0 ? pdfSharpness / webSharpness : 1,
    verticalShiftPx,
  };
}

function evaluateMetrics(metrics) {
  const reasons = [];
  if (metrics.meanAbsDiff > THRESHOLDS.meanAbsDiffMax) {
    reasons.push(`meanAbsDiff ${metrics.meanAbsDiff.toFixed(4)} > ${THRESHOLDS.meanAbsDiffMax}`);
  }
  if (metrics.sharpnessRatio < THRESHOLDS.sharpnessRatioMin) {
    reasons.push(
      `sharpnessRatio ${metrics.sharpnessRatio.toFixed(4)} < ${THRESHOLDS.sharpnessRatioMin}`
    );
  }
  if (Math.abs(metrics.verticalShiftPx) > THRESHOLDS.verticalShiftPxMax) {
    reasons.push(
      `verticalShiftPx ${metrics.verticalShiftPx} exceeds ${THRESHOLDS.verticalShiftPxMax}`
    );
  }
  return { pass: reasons.length === 0, reasons };
}

async function captureRoutePdf(caseConfig, caseDir, context, baseUrl, output) {
  const page = await context.newPage();

  const seedResult = await seedDemoEmployee(context, baseUrl);
  output.seedStatus = seedResult.status;
  output.employeeId = seedResult.employeeId;
  if (!seedResult.employeeId) {
    throw new Error(`seed employee missing (status=${seedResult.status})`);
  }

  if (caseConfig.route === "employee") {
    const detailResult = await fetchEmployeeIdentity(context, baseUrl, seedResult.employeeId);
    output.employeeDetailStatus = detailResult.status;
    if (!detailResult.employee) {
      throw new Error(`employee detail missing (status=${detailResult.status})`);
    }
    const employeeSession = await createEmployeeSession(context, baseUrl, detailResult.employee);
    output.employeeSessionStatus = employeeSession.status;
    if (employeeSession.status !== 200) {
      throw new Error(`employee session failed (status=${employeeSession.status})`);
    }

    let reportLookup = await fetchEmployeeReport(context, baseUrl);
    output.employeeReportStatus = reportLookup.status;
    output.employeeReportHasData = Boolean(reportLookup.reportJson?.report?.id);

    if (!reportLookup.reportJson?.report?.id) {
      const regenerateResult = await regenerateAdminReport(
        context,
        baseUrl,
        seedResult.employeeId,
        detailResult.employee.latestPeriodKey
      );
      output.employeeReportRegenerateStatus = regenerateResult.status;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        // eslint-disable-next-line no-await-in-loop
        await wait(1800);
        // eslint-disable-next-line no-await-in-loop
        reportLookup = await fetchEmployeeReport(context, baseUrl);
        output.employeeReportStatus = reportLookup.status;
        output.employeeReportHasData = Boolean(reportLookup.reportJson?.report?.id);
        if (reportLookup.reportJson?.report?.id) {
          break;
        }
      }
    }

    if (!reportLookup.reportJson?.report?.id) {
      throw new Error(
        `employee report missing after regenerate (status=${reportLookup.status})`
      );
    }

    await page.goto("/employee-report?debug=1", {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await waitForReportPages(page);
    const webImages = await saveWebReportPageImages(page, caseDir);

    const button = page.getByTestId("employee-report-download-pdf").first();
    if ((await button.count()) === 0) {
      throw new Error("employee pdf button missing");
    }

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 120000 }),
      button.click(),
    ]);
    const pdfPath = path.join(caseDir, "capture.pdf");
    await download.saveAs(pdfPath);
    return { pdfPath, webImages };
  }

  await page.goto("/admin/b2b-reports?demo=1", {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await waitForReportPages(page);
  const webImages = await saveWebReportPageImages(page, caseDir);

  const button = page.getByTestId("admin-report-download-pdf").first();
  if ((await button.count()) === 0) {
    throw new Error("admin pdf button missing");
  }

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120000 }),
    button.click(),
  ]);
  const pdfPath = path.join(caseDir, "capture.pdf");
  await download.saveAs(pdfPath);
  return { pdfPath, webImages };
}

async function runCase(browser, baseUrl, caseConfig, adminPasswordCandidates, output) {
  const caseDir = path.join(ARTIFACT_ROOT, caseConfig.id);
  ensureDir(caseDir);

  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: caseConfig.viewport,
    deviceScaleFactor: caseConfig.deviceScaleFactor,
    acceptDownloads: true,
  });

  try {
    const login = await loginAdmin(baseUrl, context, adminPasswordCandidates);
    output.loginStatus = login.status;
    if (login.status !== 200) {
      throw new Error(`admin login failed (status=${login.status})`);
    }

    const capture = await captureRoutePdf(caseConfig, caseDir, context, baseUrl, output);
    output.pdfPath = capture.pdfPath;
    output.webImages = capture.webImages;

    const pdfPrefix = path.join(caseDir, "pdf-page");
    renderPdfPages(capture.pdfPath, pdfPrefix);

    output.pages = [];
    for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
      const pdfPageRaw = `${pdfPrefix}-${pageNumber}.png`;
      const pdfPageTrimmed = path.join(caseDir, `pdf-page-${pageNumber}-trim.png`);
      await trimWhiteMargins(pdfPageRaw, pdfPageTrimmed);

      const metrics = await compareWebVsPdfPage({
        webImagePath: capture.webImages[pageNumber - 1],
        pdfImagePath: pdfPageTrimmed,
      });
      const evaluation = evaluateMetrics(metrics);

      output.pages.push({
        pageNumber,
        webImagePath: capture.webImages[pageNumber - 1],
        pdfImageRawPath: pdfPageRaw,
        pdfImageTrimmedPath: pdfPageTrimmed,
        metrics,
        pass: evaluation.pass,
        reasons: evaluation.reasons,
      });
    }
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function run() {
  if (!fs.existsSync(path.join(ROOT, "node_modules", ".bin"))) {
    throw new Error("node_modules missing");
  }

  const adminPasswordCandidates = buildAdminPasswordCandidates(process.env);
  if (adminPasswordCandidates.length === 0) {
    throw new Error("ADMIN_PASSWORD is required for qa:b2b:capture-pdf-visual");
  }

  ensureDir(ARTIFACT_ROOT);
  const activeCases = resolveActiveCases();
  if (activeCases.length === 0) {
    throw new Error(`no qa capture test cases match filter: ${CASE_FILTER}`);
  }

  const releaseQaLock = await acquireQaLock({
    lockName: "qa-dev-server",
    owner: "qa:b2b:capture-pdf-visual",
  });

  const nextDevBin = resolveNextDevCommand(ROOT);
  const devProc = spawnNextDev({
    rootDir: ROOT,
    nextDevBin,
    port: QA_PORT,
    env: {
      ...process.env,
      PORT: String(QA_PORT),
    },
  });
  devProc.stdout.on("data", (chunk) => process.stdout.write(`[dev] ${chunk.toString()}`));
  devProc.stderr.on("data", (chunk) => process.stderr.write(`[dev] ${chunk.toString()}`));

  const output = {
    baseUrl: BASE_URL,
    artifactRoot: ARTIFACT_ROOT,
    thresholds: THRESHOLDS,
    activeCaseCount: activeCases.length,
    cases: [],
    failures: [],
  };

  let browser = null;

  try {
    const ready = await waitForServerReady(BASE_URL, {
      path: "/admin/b2b-reports",
      timeoutMs: START_TIMEOUT_MS,
    });
    if (!ready) {
      throw new Error("dev server ready timeout");
    }

    browser = await chromium.launch({ headless: true });

    for (const caseConfig of activeCases) {
      const caseOutput = {
        id: caseConfig.id,
        route: caseConfig.route,
        viewport: caseConfig.viewport,
        deviceScaleFactor: caseConfig.deviceScaleFactor,
        pass: true,
      };
      output.cases.push(caseOutput);
      try {
        // eslint-disable-next-line no-await-in-loop
        await runCase(browser, BASE_URL, caseConfig, adminPasswordCandidates, caseOutput);
        caseOutput.pass = Array.isArray(caseOutput.pages)
          ? caseOutput.pages.every((pageResult) => pageResult.pass)
          : false;
        if (!caseOutput.pass) {
          pushFailure(output, "visual_threshold_failed", {
            caseId: caseConfig.id,
            pageResults: caseOutput.pages,
          });
        }
      } catch (error) {
        caseOutput.pass = false;
        caseOutput.error = String(error);
        pushFailure(output, "case_execution_failed", {
          caseId: caseConfig.id,
          error: String(error),
        });
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    await stopProcessTree(devProc);
    releaseQaLock();
  }

  output.ok = output.failures.length === 0 && output.cases.every((caseOutput) => caseOutput.pass);
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exit(1);
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
