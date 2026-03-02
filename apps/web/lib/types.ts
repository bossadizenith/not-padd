import type { Articles, File as Media, Tag, Key } from "@notpadd/db/types";
import {
  createArticleSchema,
  createKeySchema,
  createInviteSchema,
  createTagSchema,
  updateArticleSchema,
  updateCoverImageSchema,
  createGithubAppIntegrationSchema,
  updateGithubAppIntegrationSchema,
  joinWaitlistEmailSchema,
} from "./schemas";
import { z } from "zod";

export type ModalTypes =
  | "upload-image"
  | "upload-youtube"
  | "create-article"
  | "create-tag"
  | "create-key"
  | "invite-member"
  | "github-config"
  | "gitlab-config"
  | "upload-media";

export type ConfirmationModalTypes = "delete-article" | "delete-member";

export type Pagination = {
  total: number;
  page: number;
  limit: number;
};

export type APIResponse<T> = {
  message: string;
} & ({ success: true; data: T } | { success: false; error: string });

export type MediaResponse = {
  data: Media[];
  pagination: Pagination;
};

export type ArticlesResponse = {
  data: (Articles & {
    tags?: string[];
    authors?: { id: string; name: string; email: string; image: string }[];
  })[];
  pagination: Pagination;
};

export type ArticleWithRelations = Articles & {
  tags?: string[];
  authors?: { id: string; name: string; email: string; image: string }[];
};

export type CreateArticleSchema = z.infer<typeof createArticleSchema>;
export type UpdateArticleSchema = z.infer<typeof updateArticleSchema>;
export type UpdateCoverImageSchema = z.infer<typeof updateCoverImageSchema>;

export type TagsResponse = {
  data: Tag[];
  pagination: Pagination;
};

export type CreateTagSchema = z.infer<typeof createTagSchema>;

export type AuthorsListItem = {
  id: string;
  name: string;
  userId: string;
  image: string | null;
};

export type AuthorsResponse = {
  data: AuthorsListItem[];
  pagination: Pagination;
};

export type KeysResponse = {
  data: Key[];
  pagination: Pagination;
};

export type CreateKeySchema = z.infer<typeof createKeySchema>;
export type CreateInviteSchema = z.infer<typeof createInviteSchema>;

export type MembersResponse = {
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
  id: string;
  user: {
    id: string;
    name: string;
    email: string | null | undefined;
    image: string;
  };
};

export type GithubAppIntegration = {
  id: string;
  organizationId: string;
  installationId: string;
  githubAccountName: string;
  githubAccountId: string;
  githubAccountType: string;
  accessTokensUrl: string | null;
  repositoriesUrl: string | null;
  installedByUserId: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
};

export type GithubAppIntegrationsResponse = {
  data: GithubAppIntegration[];
  pagination: Pagination;
};

export type GitlabAppIntegration = {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  gitlabUserId: number;
  gitlabUsername: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateGithubAppIntegrationSchema = z.infer<
  typeof createGithubAppIntegrationSchema
>;
export type UpdateGithubAppIntegrationSchema = z.infer<
  typeof updateGithubAppIntegrationSchema
>;

export type JoinWaitlistEmailSchema = z.infer<typeof joinWaitlistEmailSchema>;
