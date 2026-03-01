import {
  bigint,
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  primaryKey,
  foreignKey,
  integer,
} from "drizzle-orm/pg-core";

import {
  account,
  rateLimitAttempts,
  session,
  user,
  verification,
} from "./auth-schema";
import { relations } from "drizzle-orm";

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: jsonb("metadata"),
  lastUsed: boolean("last_used").default(false),
  repoProvider: text("repo_provider", { enum: ["github", "gitlab"] })
    .notNull()
    .default("github"),
  repoUrl: text("repo_url").notNull().default(""),
  repoPath: text("repo_path").notNull().default(""),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  storageLimit: bigint("storage_limit", { mode: "number" })
    .notNull()
    .default(100 * 1024 * 1024),
  storageUsed: bigint("storage_used", { mode: "number" }).notNull().default(0),
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [unique().on(table.id, table.organizationId)],
);

export const team = pgTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => member.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(member, {
    fields: [invitation.inviterId],
    references: [member.id],
  }),
}));

export const teamMember = pgTable("team_member", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const organizationRole = pgTable("organization_role", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  permissions: jsonb("permissions").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const file = pgTable("file", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const tag = pgTable(
  "tag",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    unique().on(table.organizationId, table.slug),
    unique().on(table.id, table.organizationId),
  ],
);
export const articles = pgTable(
  "articles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull().default(""),
    markdown: text("markdown").notNull().default(""),
    creatorId: text("creator_id")
      .notNull()
      .references(() => member.id, { onDelete: "set null" }),
    json: jsonb("json").notNull().default({}),
    excerpt: text("excerpt"),
    image: text("image"),
    imageBlurhash: text("image_blurhash"),
    published: boolean("published").default(false).notNull(),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    unique().on(table.organizationId, table.slug),
    unique().on(table.id, table.organizationId),
  ],
);

export const articleTag = pgTable(
  "article_tag",
  {
    articleId: text("article_id").notNull(),
    tagId: text("tag_id").notNull(),
    organizationId: text("organization_id").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.articleId, t.tagId] }),
    foreignKey({
      columns: [t.articleId],
      foreignColumns: [articles.id],
      name: "fk_article_tag_article",
    }),
    foreignKey({
      columns: [t.tagId],
      foreignColumns: [tag.id],
      name: "fk_article_tag_tag",
    }),
    foreignKey({
      columns: [t.organizationId],
      foreignColumns: [organization.id],
      name: "fk_article_tag_org",
    }),
  ],
);

export const articleAuthor = pgTable(
  "article_author",
  {
    articleId: text("article_id").notNull(),
    memberId: text("member_id").notNull(),
    organizationId: text("organization_id").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.articleId, t.memberId] }),
    foreignKey({
      columns: [t.articleId],
      foreignColumns: [articles.id],
      name: "fk_article_author_article",
    }),
    foreignKey({
      columns: [t.memberId],
      foreignColumns: [member.id],
      name: "fk_article_author_member",
    }),
    foreignKey({
      columns: [t.organizationId],
      foreignColumns: [organization.id],
      name: "fk_article_author_org",
    }),
  ],
);

export const event = pgTable("event", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const webhook = pgTable("webhook", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const key = pgTable("key", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pk: text("pk").notNull(),
  sk: text("sk").notNull(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => member.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const githubAppIntegration = pgTable("github_app_integration", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  installationId: text("installation_id").notNull().unique(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const gitlabAppIntegration = pgTable("gitlab_app_integration", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  gitlabUserId: integer("gitlab_user_id").notNull(),
  gitlabUsername: text("gitlab_username").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const waitlist = pgTable("waitlist", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const schema = {
  user,
  account,
  session,
  verification,
  rateLimitAttempts,
  organization,
  member,
  invitation,
  team,
  teamMember,
  organizationRole,
  event,
  file,
  articles,
  webhook,
  tag,
  articleTag,
  articleAuthor,
  key,
  githubAppIntegration,
  gitlabAppIntegration,
  waitlist,
  invitationRelations,
};

export default schema;

export { user, rateLimitAttempts } from "./auth-schema";
