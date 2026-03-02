import { db } from "@notpadd/db";
import { gitlabAppIntegration } from "@notpadd/db/schema";
import { env } from "@notpadd/env/server";
import { eq } from "drizzle-orm";

const NOTPADD_GITLAB_REBUILD_PATH = ".notpadd/rebuild.json";

export async function getValidGitlabToken(userId: string): Promise<string> {
  const [integration] = await db
    .select()
    .from(gitlabAppIntegration)
    .where(eq(gitlabAppIntegration.userId, userId))
    .limit(1);

  if (!integration) throw new Error("GitLab integration not found");

  if (integration.expiresAt.getTime() < Date.now() + 60000) {
    // Refresh token
    const tokenResponse = await fetch("https://gitlab.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.GITLAB_CLIENT_ID,
        client_secret: env.GITLAB_CLIENT_SECRET,
        refresh_token: integration.refreshToken,
        grant_type: "refresh_token",
        redirect_uri: env.GITLAB_REDIRECT_URI,
      }),
    });
    if (!tokenResponse.ok) throw new Error("Failed to refresh GitLab token");
    const tokenData = await tokenResponse.json();
    const expires_at = new Date(Date.now() + tokenData.expires_in * 1000);

    await db
      .update(gitlabAppIntegration)
      .set({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: expires_at,
        updatedAt: new Date(),
      })
      .where(eq(gitlabAppIntegration.id, integration.id));

    return tokenData.access_token;
  }

  return integration.accessToken;
}

export async function handleGitlabOAuthCallback(code: string, userId: string) {
  // Exchange code for token
  const tokenResponse = await fetch("https://gitlab.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITLAB_CLIENT_ID,
      client_secret: env.GITLAB_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.GITLAB_REDIRECT_URI,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    console.error("GitLab token error:", text);
    throw new Error("Failed to exchange GitLab token");
  }

  const tokenData = await tokenResponse.json();

  // Get user info
  const userResponse = await fetch("https://gitlab.com/api/v4/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userResponse.ok) throw new Error("Failed to fetch GitLab user info");
  const userData = await userResponse.json();

  // Upsert integration
  const existingIntegration = await db
    .select({ id: gitlabAppIntegration.id })
    .from(gitlabAppIntegration)
    .where(eq(gitlabAppIntegration.userId, userId))
    .limit(1);

  const expires_at = new Date(Date.now() + tokenData.expires_in * 1000);

  if (existingIntegration && existingIntegration[0]) {
    await db
      .update(gitlabAppIntegration)
      .set({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: expires_at,
        gitlabUserId: userData.id,
        gitlabUsername: userData.username,
        updatedAt: new Date(),
      })
      .where(eq(gitlabAppIntegration.id, existingIntegration[0].id));
    return true;
  }

  await db.insert(gitlabAppIntegration).values({
    id: crypto.randomUUID(),
    userId: userId,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: expires_at,
    gitlabUserId: userData.id,
    gitlabUsername: userData.username,
  });
  return true;
}

export async function getInstallationRepositories(
  userId: string,
  options?: { perPage?: number; search?: string },
): Promise<{ repositories: any[]; total: number }> {
  const token = await getValidGitlabToken(userId);
  const perPage = options?.perPage || 10;

  let url = `https://gitlab.com/api/v4/projects?membership=true&simple=true&min_access_level=30&per_page=${perPage}`;
  if (options?.search) {
    url += `&search=${encodeURIComponent(options.search)}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to fetch GitLab repositories");
  const total = Number(response.headers.get("x-total") || 0);
  const data = await response.json();

  const repositories = data.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.path_with_namespace,
    private: repo.visibility === "private" || repo.visibility === "internal",
    description: repo.description,
    updated_at: repo.last_activity_at,
  }));

  console.log({ repositories });

  return { repositories, total: total || repositories.length };
}

export async function getRepositoryContents(
  userId: string,
  projectId: string,
  path: string = "",
): Promise<Array<{ name: string; type: "dir" | "file"; path: string }>> {
  const token = await getValidGitlabToken(userId);
  const encodedProjectId = encodeURIComponent(projectId);
  const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "").trim();

  let url = `https://gitlab.com/api/v4/projects/${encodedProjectId}/repository/tree`;
  if (normalizedPath) {
    url += `?path=${encodeURIComponent(normalizedPath)}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error(`Path not found.`);
    throw new Error(
      "Failed to fetch repository contents: " + response.statusText,
    );
  }

  const data = await response.json();

  return data
    .filter((item: any) => item.type === "tree") // "tree" is a dir in GitLab
    .map((item: any) => ({
      name: item.name,
      type: "dir",
      path: item.path,
    }));
}

export async function publishArticle(
  userId: string,
  projectId: string,
  path: string,
  slug: string,
  by: string,
): Promise<boolean> {
  const token = await getValidGitlabToken(userId);
  const encodedProjectId = encodeURIComponent(projectId);
  const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "").trim();
  const filePath = normalizedPath
    ? `${normalizedPath}/${NOTPADD_GITLAB_REBUILD_PATH}`
    : NOTPADD_GITLAB_REBUILD_PATH;

  let data: { slug: string; updatedAt: string }[] = [];
  let action: "create" | "update" = "create";

  const projectResponse = await fetch(
    `https://gitlab.com/api/v4/projects/${encodedProjectId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const projectInfo = projectResponse.ok
    ? await projectResponse.json()
    : { default_branch: "main" };
  const defaultBranch = projectInfo.default_branch || "main";

  // Get file content
  const fileResponse = await fetch(
    `https://gitlab.com/api/v4/projects/${encodedProjectId}/repository/files/${encodeURIComponent(filePath)}?ref=${defaultBranch}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (fileResponse.ok) {
    const file = await fileResponse.json();
    const decoded = Buffer.from(file.content, "base64").toString("utf-8");
    try {
      data = JSON.parse(decoded);
    } catch {}
    action = "update";
  }

  const existingEntry = data.find((entry) => entry.slug === slug);
  const now = new Date().toISOString();

  if (existingEntry) {
    existingEntry.updatedAt = now;
  } else {
    data.push({ slug, updatedAt: now });
  }

  const content = JSON.stringify(data, null, 2);
  const message = `Update rebuild list for ${slug} on ${now} by ${by} [Notpadd]`;

  const commitResponse = await fetch(
    `https://gitlab.com/api/v4/projects/${encodedProjectId}/repository/commits`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        branch: defaultBranch,
        commit_message: message,
        actions: [
          {
            action: action,
            file_path: filePath,
            content: content,
          },
        ],
      }),
    },
  );

  if (!commitResponse.ok) {
    const errorDetails = await commitResponse.text();
    console.error("GitLab commit error:", errorDetails);
    throw new Error(
      `Failed to commit file to GitLab: ${commitResponse.status}`,
    );
  }

  return true;
}
