function buildAdminPasswordCandidates(env = process.env) {
  return Array.from(
    new Set([env.ADMIN_PASSWORD, env.QA_ADMIN_PASSWORD, "0903"].filter(Boolean))
  );
}

async function loginAdmin(baseUrl, context, passwordCandidates) {
  let status = null;
  let selectedPassword = null;

  for (const candidate of passwordCandidates) {
    const response = await context.request.post(`${baseUrl}/api/verify-password`, {
      failOnStatusCode: false,
      data: { password: candidate, loginType: "admin" },
    });
    status = response.status();
    if (status === 200) {
      selectedPassword = candidate;
      break;
    }
  }

  return { status, selectedPassword };
}

async function createPublishedColumnPost(baseUrl, context, title) {
  const response = await context.request.post(`${baseUrl}/api/admin/column/posts`, {
    failOnStatusCode: false,
    data: {
      title,
      contentMarkdown: `# ${title}\n\nqa route scroll and card click regression body`,
      tags: ["qa", "scroll", "column"],
      status: "published",
    },
  });

  const payload = await response.json().catch(() => ({}));
  return {
    status: response.status(),
    postId: payload?.post?.id || null,
    slug: payload?.post?.slug || null,
    payload,
  };
}

async function deleteColumnPost(baseUrl, context, postId) {
  if (!postId) return null;
  const response = await context.request.delete(
    `${baseUrl}/api/admin/column/posts/${postId}`,
    {
      failOnStatusCode: false,
    }
  );
  return response.status();
}

module.exports = {
  buildAdminPasswordCandidates,
  loginAdmin,
  createPublishedColumnPost,
  deleteColumnPost,
};
