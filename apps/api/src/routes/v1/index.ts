import { db } from "@notpadd/db";
import {
  articles,
  articleTag,
  tag,
  articleAuthor,
  member,
  user as userTable,
} from "@notpadd/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { ReqVariables } from "../../hono/index.js";
import { getCache, setCache, cacheKeys } from "@notpadd/cache";

const v1Routes = new Hono<{ Variables: ReqVariables }>();

type NotpaddArticleType = "all" | "published" | "draft";

const generateFieldsErrors = (
  fields: Record<string, { error: string }>,
  provided: Record<string, unknown>,
) => {
  return Object.entries(fields)
    .filter(([key]) => {
      const value = provided[key];
      if (value === undefined || value === null) return true;
      if (typeof value === "string" && value.trim() === "") return true;
      return false;
    })
    .map(([key, value]) => {
      return { [key]: value.error };
    });
};

v1Routes.get("/articles", async (c) => {
  const { query, organizationId } = c.req.query();

  const fields = {
    query: { error: "Article type is required" },
    organizationId: { error: "Organization ID is required" },
  };
  const errors = generateFieldsErrors(fields, {
    query,
    organizationId,
  });
  if (errors.length > 0) {
    return c.json({ error: errors, success: false }, 400);
  }

  const articleType = query as NotpaddArticleType;
  const organization_Id = organizationId as string;

  // Try to get from cache
  const cacheKey = cacheKeys.v1Articles(organization_Id, query);
  const cached = await getCache(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const whereClauses = [eq(articles.organizationId, organization_Id)];
  if (articleType === "published") {
    whereClauses.push(eq(articles.published, true));
  } else if (articleType === "draft") {
    whereClauses.push(eq(articles.published, false));
  }

  const dbArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      description: articles.description,
      published: articles.published,
      content: articles.content,
      markdown: articles.markdown,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      image: articles.image,
      imageBlurhash: articles.imageBlurhash,
    })
    .from(articles)
    .where(and(...whereClauses));

  const articleIds = dbArticles.map((article) => article.id);

  const [tagRows, authorRows] = await Promise.all([
    articleIds.length > 0
      ? db
          .select({
            articleId: articleTag.articleId,
            name: tag.name,
          })
          .from(articleTag)
          .leftJoin(
            tag,
            and(
              eq(tag.id, articleTag.tagId),
              eq(tag.organizationId, articleTag.organizationId),
            ),
          )
          .where(
            and(
              eq(articleTag.organizationId, organization_Id),
              inArray(articleTag.articleId, articleIds),
            ),
          )
      : [],
    articleIds.length > 0
      ? db
          .select({
            articleId: articleAuthor.articleId,
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            image: userTable.image,
          })
          .from(articleAuthor)
          .leftJoin(
            member,
            and(
              eq(member.id, articleAuthor.memberId),
              eq(member.organizationId, articleAuthor.organizationId),
            ),
          )
          .leftJoin(userTable, eq(userTable.id, member.userId))
          .where(
            and(
              eq(articleAuthor.organizationId, organization_Id),
              inArray(articleAuthor.articleId, articleIds),
            ),
          )
      : [],
  ]);

  const tagsByArticle = tagRows.reduce(
    (acc, row) => {
      if (!row.articleId || !row.name) return acc;
      if (!acc[row.articleId]) {
        acc[row.articleId] = [];
      }
      acc[row.articleId].push(row.name);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const authorsByArticle = authorRows.reduce(
    (acc, row) => {
      if (!row.articleId || !row.id) return acc;
      if (!acc[row.articleId]) {
        acc[row.articleId] = [];
      }
      acc[row.articleId].push({
        id: row.id,
        name: (row.name as string) ?? "",
        email: (row.email as string) ?? "",
        image: (row.image as string) ?? "",
      });
      return acc;
    },
    {} as Record<
      string,
      Array<{ id: string; name: string; email: string; image: string }>
    >,
  );

  const articlesWithRelations = dbArticles.map((article) => {
    const articleAuthors = authorsByArticle[article.id] ?? [];
    const articleTags = tagsByArticle[article.id] ?? [];

    return {
      ...article,
      tags: articleTags.length > 0 ? articleTags : null,
      authors: articleAuthors.map((author) => ({
        name: author.name,
        email: author.email,
        image: author.image,
      })),
    };
  });

  const response = {
    message: "Articles fetched successfully",
    articles: articlesWithRelations,
  };

  // Cache for 5 minutes (300 seconds)
  await setCache(cacheKey, response, 300);

  return c.json(response);
});

export { v1Routes };
