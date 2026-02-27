function attachCdeNetworkCapture(page, result) {
  page.on("request", (request) => {
    const url = request.url();
    if (
      url.includes("/api/health/nhis/init") ||
      url.includes("/api/health/nhis/sign") ||
      url.includes("/api/b2b/employee/sync") ||
      url.includes("/api/b2b/employee/report") ||
      url.includes("/api/b2b/employee/report/export/pdf") ||
      url.includes("/api/admin/b2b/reports/")
    ) {
      result.network.requests.push({
        url,
        method: request.method(),
        postData: request.postData() || null,
      });
    }
  });

  page.on("response", async (response) => {
    const url = response.url();
    if (
      url.includes("/_next/static/chunks/app/layout.js") ||
      url.includes("/api/health/nhis/init") ||
      url.includes("/api/health/nhis/sign") ||
      url.includes("/api/b2b/employee/sync") ||
      url.includes("/api/b2b/employee/report") ||
      url.includes("/api/b2b/employee/report/export/pdf") ||
      url.includes("/api/admin/b2b/reports/")
    ) {
      let body = "";
      try {
        const contentType = (response.headers()["content-type"] || "").toLowerCase();
        if (contentType.includes("application/json") || contentType.includes("text/")) {
          body = await response.text();
          if (body.length > 400) body = `${body.slice(0, 400)}...`;
        } else {
          body = `[binary:${contentType || "unknown"}]`;
        }
      } catch {
        body = "[unreadable]";
      }
      result.network.responses.push({
        url,
        status: response.status(),
        body,
      });
    }
  });
}

module.exports = {
  attachCdeNetworkCapture,
};
