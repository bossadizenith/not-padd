import { NextRequest, NextResponse } from "next/server";
import { publishArticle as publishGitHubArticle } from "@/lib/github";
import { publishArticle as publishGitLabArticle } from "@/lib/gitlab";
import { auth } from "@notpadd/auth/auth";
import { db } from "@notpadd/db";
import {
  articles,
  githubAppIntegration,
  gitlabAppIntegration,
  organization,
} from "@notpadd/db/schema";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

export const POST = async (request: NextRequest) => {
  try {
    const { slug, organizationId } = await request.json();

    if (!slug || !organizationId) {
      return NextResponse.json(
        {
          error: "Slug and organization ID are required",
          success: false,
        },
        { status: 400 },
      );
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 },
      );
    }

    const [orgData] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!orgData) {
      return NextResponse.json(
        { error: "Organization not found", success: false },
        { status: 404 },
      );
    }

    if (!orgData.repoUrl || orgData.repoUrl.trim() === "") {
      return NextResponse.json(
        { error: "Repository not connected", success: false },
        { status: 400 },
      );
    }

    if (!orgData.repoPath || orgData.repoPath.trim() === "") {
      return NextResponse.json(
        { error: "Repository path not set", success: false },
        { status: 400 },
      );
    }

    let owner = "";
    let repo = "";
    if (orgData.repoProvider !== "gitlab") {
      const parts = orgData.repoUrl.split("/");
      owner = parts[0] || "";
      repo = parts[1] || "";
      if (!owner || !repo) {
        return NextResponse.json(
          { error: "Invalid repository URL format", success: false },
          { status: 400 },
        );
      }
    }

    const normalizedPath = orgData.repoPath
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .trim();

    const authorName = session.user.name || session.user.email || "Unknown";
    let success = false;

    if (orgData.repoProvider === "gitlab") {
      const [integration] = await db
        .select()
        .from(gitlabAppIntegration)
        .where(eq(gitlabAppIntegration.userId, session.user.id))
        .limit(1);

      if (!integration) {
        return NextResponse.json(
          { error: "GitLab integration not found", success: false },
          { status: 404 },
        );
      }

      success = await publishGitLabArticle(
        session.user.id,
        orgData.repoUrl,
        normalizedPath,
        slug,
        authorName,
      );
    } else {
      const [integration] = await db
        .select()
        .from(githubAppIntegration)
        .where(eq(githubAppIntegration.userId, session.user.id))
        .limit(1);

      if (!integration || !integration.installationId) {
        return NextResponse.json(
          { error: "GitHub integration not found", success: false },
          { status: 404 },
        );
      }

      success = await publishGitHubArticle(
        Number(integration.installationId),
        owner,
        repo,
        normalizedPath,
        slug,
        authorName,
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: "Failed to publish article", success: false },
        { status: 500 },
      );
    }

    const [updatedArticle] = await db
      .update(articles)
      .set({
        published: true,
        publishedAt: new Date(),
      })
      .where(
        and(
          eq(articles.slug, slug),
          eq(articles.organizationId, organizationId),
        ),
      )
      .returning();

    return NextResponse.json({
      success: true,
      message: "Article published successfully",
      data: {
        article: updatedArticle,
      },
    });
  } catch (error: any) {
    console.error("Failed to publish article:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish article", success: false },
      { status: 500 },
    );
  }
};
