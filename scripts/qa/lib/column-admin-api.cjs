function buildAdminPasswordCandidates(env = process.env) {
  return Array.from(
    new Set([env.ADMIN_PASSWORD, env.QA_ADMIN_PASSWORD].filter(Boolean))
  );
}

function assertQaColumnMutationTarget(baseUrl, env = process.env) {
  const target = new URL(baseUrl);
  const hostname = target.hostname.toLowerCase();
  const isLoopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    hostname
  );
  if (isLoopback) return;

  if (env.QA_ALLOW_REMOTE_COLUMN_MUTATIONS !== "1") {
    throw new Error(
      `Remote column QA mutations are blocked for ${target.origin}. ` +
        "Set QA_ALLOW_REMOTE_COLUMN_MUTATIONS=1 only for an isolated QA environment."
    );
  }

  const isProduction =
    hostname === "wellnessbox.kr" || hostname.endsWith(".wellnessbox.kr");
  if (isProduction && env.QA_ALLOW_PRODUCTION_COLUMN_MUTATIONS !== "1") {
    throw new Error(
      `Production column QA mutations are blocked for ${target.origin}. ` +
        "QA_ALLOW_PRODUCTION_COLUMN_MUTATIONS=1 is required in addition to the remote opt-in."
    );
  }
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
  assertQaColumnMutationTarget(baseUrl, process.env);
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

async function findColumnPostIdsByExactTitle(baseUrl, context, title) {
  const response = await context.request.get(
    `${baseUrl}/api/admin/column/posts?status=all&take=200&q=${encodeURIComponent(title)}`,
    { failOnStatusCode: false }
  );
  if (response.status() !== 200) {
    return { ids: [], status: response.status() };
  }

  const payload = await response.json().catch(() => ({}));
  const ids = Array.isArray(payload.posts)
    ? payload.posts
        .filter((post) => post?.title === title && post?.id)
        .map((post) => post.id)
    : [];
  return { ids, status: 200 };
}

async function cleanupCreatedColumnPosts(baseUrl, context, createdPosts) {
  if (!context || !Array.isArray(createdPosts) || createdPosts.length === 0) {
    return [];
  }

  const results = [];
  for (const post of createdPosts) {
    let postIds = post?.id ? [post.id] : [];
    let lookupStatus = null;

    if (postIds.length === 0 && post?.title) {
      const lookup = await findColumnPostIdsByExactTitle(
        baseUrl,
        context,
        post.title
      ).catch(() => ({ ids: [], status: null }));
      postIds = lookup.ids;
      lookupStatus = lookup.status;
    }

    if (postIds.length === 0) {
      results.push({
        postId: null,
        title: post?.title || null,
        status: lookupStatus === 200 ? 404 : lookupStatus,
      });
      continue;
    }

    for (const postId of postIds) {
      const status = await deleteColumnPost(baseUrl, context, postId).catch(
        () => null
      );
      results.push({
        postId,
        title: post?.title || null,
        status,
      });
    }
  }
  return results;
}

module.exports = {
  assertQaColumnMutationTarget,
  buildAdminPasswordCandidates,
  cleanupCreatedColumnPosts,
  loginAdmin,
  createPublishedColumnPost,
  deleteColumnPost,
};
