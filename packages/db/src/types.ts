import type { InferSelectModel } from "drizzle-orm";
import schema from "./schema";

// Auth types
export type User = InferSelectModel<typeof schema.user>;
export type Session = InferSelectModel<typeof schema.session>;
export type Account = InferSelectModel<typeof schema.account>;
export type Verification = InferSelectModel<typeof schema.verification>;
export type RateLimitAttempts = InferSelectModel<
  typeof schema.rateLimitAttempts
>;

// Organization types
export type Organization = InferSelectModel<typeof schema.organization>;
export type Member = InferSelectModel<typeof schema.member>;
export type Invitation = InferSelectModel<typeof schema.invitation>;
export type Team = InferSelectModel<typeof schema.team>;
export type TeamMember = InferSelectModel<typeof schema.teamMember>;
export type OrganizationRole = InferSelectModel<typeof schema.organizationRole>;

// NotPadd types
export type File = InferSelectModel<typeof schema.file>;
export type Articles = InferSelectModel<typeof schema.articles>;
export type Event = InferSelectModel<typeof schema.event>;
export type Webhook = InferSelectModel<typeof schema.webhook>;
export type Tag = InferSelectModel<typeof schema.tag>;
export type ArticleTag = InferSelectModel<typeof schema.articleTag>;
export type ArticleAuthor = InferSelectModel<typeof schema.articleAuthor>;
export type Key = InferSelectModel<typeof schema.key>;
export type GithubAppIntegration = InferSelectModel<
  typeof schema.githubAppIntegration
>;
export type GitlabAppIntegration = InferSelectModel<
  typeof schema.gitlabAppIntegration
>;
export type Waitlist = InferSelectModel<typeof schema.waitlist>;
