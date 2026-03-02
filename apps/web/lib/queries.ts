import { authClient } from "@notpadd/auth/auth-client";
import type { Articles, Tag } from "@notpadd/db/types";
import { apiClient } from "./api-client";
import type {
  APIResponse,
  ArticlesResponse,
  ArticleWithRelations,
  AuthorsListItem,
  AuthorsResponse,
  CreateArticleSchema,
  CreateKeySchema,
  GithubAppIntegration,
  GitlabAppIntegration,
  JoinWaitlistEmailSchema,
  KeysResponse,
  MediaResponse,
  TagsResponse,
  UpdateArticleSchema,
} from "./types";

export const ARTICLES_QUERIES = {
  updateArticle: async (
    organizationId: string,
    articleId: string,
    data: UpdateArticleSchema,
  ) => {
    const response = await apiClient.put<APIResponse<{ data: Articles }>>(
      `/articles/${organizationId}/${articleId}`,
      data,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data;
  },
  getArticles: async (
    organizationId: string,
    queries: { page: number; limit: number; search: string },
  ) => {
    const response = await apiClient.get<APIResponse<ArticlesResponse>>(
      `/articles/${organizationId}?page=${queries.page}&limit=${queries.limit}&search=${queries.search}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }
    return response.data.data;
  },
  getArticleById: async (organizationId: string, articleId: string) => {
    const response = await apiClient.get<APIResponse<ArticleWithRelations>>(
      `/articles/${organizationId}/${articleId}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  createArticle: async (organizationId: string, data: CreateArticleSchema) => {
    const response = await apiClient.post<APIResponse<Articles>>(
      `/articles/${organizationId}`,
      data,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  deleteArticle: async (organizationId: string, articleId: string) => {
    const response = await apiClient.delete<APIResponse<Articles>>(
      `/articles/${organizationId}/${articleId}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  checkSlug: async (organizationId: string, slug: string) => {
    const response = await apiClient.post<APIResponse<{ slug: boolean }>>(
      `/articles/${organizationId}/check-slug`,
      { slug },
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
};

export const MEDIA_QUERIES = {
  getMedia: async (
    organizationId: string,
    queries: { page: number; limit: number; search: string },
  ) => {
    const response = await apiClient.get<APIResponse<MediaResponse>>(
      `/media/${organizationId}?page=${queries.page}&limit=${queries.limit}&search=${queries.search}`,
    );
    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
};

export const TAGS_QUERIES = {
  getTags: async (
    organizationId: string,
    queries: { page: number; limit: number; search: string },
  ) => {
    const response = await apiClient.get<APIResponse<TagsResponse>>(
      `/tags/${organizationId}?page=${queries.page}&limit=${queries.limit}&search=${queries.search}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  getTagById: async (organizationId: string, id: string) => {
    const response = await apiClient.get<APIResponse<Tag>>(
      `/tags/${organizationId}/${id}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  createTag: async (organizationId: string, data: { name: string }) => {
    const response = await apiClient.post<APIResponse<{ data: Tag }>>(
      `/tags/${organizationId}`,
      data,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data; // unwrap to Tag
  },
  updateTagBySlug: async (
    organizationId: string,
    slug: string,
    data: { name: string },
  ) => {
    const response = await apiClient.put<APIResponse<{ data: Tag }>>(
      `/tags/${organizationId}/${slug}`,
      data,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data; // unwrap to Tag
  },
  deleteTag: async (organizationId: string, tagId: string) => {
    const response = await apiClient.delete<APIResponse<{ data: Tag }>>(
      `/tags/${organizationId}/${tagId}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data; // unwrap to Tag
  },
};

export const AUTHORS_QUERIES = {
  getAuthors: async (
    organizationId: string,
    articleId: string,
    queries: { page: number; limit: number },
  ) => {
    const searchParams = new URLSearchParams({
      page: String(queries.page),
      limit: String(queries.limit),
    });

    const response = await apiClient.get<APIResponse<AuthorsResponse>>(
      `/authors/${organizationId}/${articleId}?${searchParams.toString()}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  getAuthor: async (
    organizationId: string,
    articleId: string,
    memberId: string,
  ) => {
    const response = await apiClient.get<APIResponse<AuthorsListItem>>(
      `/authors/${organizationId}/${articleId}/${memberId}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  addAuthor: async (
    organizationId: string,
    data: { articleId: string; memberId: string },
  ) => {
    const response = await apiClient.post<
      APIResponse<{ data: AuthorsListItem }>
    >(`/authors/${organizationId}`, data);

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data;
  },
  updateAuthor: async (
    organizationId: string,
    articleId: string,
    memberId: string,
    data: { memberId: string },
  ) => {
    const response = await apiClient.put<
      APIResponse<{ data: AuthorsListItem }>
    >(`/authors/${organizationId}/${articleId}/${memberId}`, data);

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data;
  },
  deleteAuthor: async (
    organizationId: string,
    articleId: string,
    memberId: string,
  ) => {
    const response = await apiClient.delete<
      APIResponse<{ data: AuthorsListItem }>
    >(`/authors/${organizationId}/${articleId}/${memberId}`);

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data;
  },
  updateCoverImage: async (articleId: string, data: { url: string }) => {
    const response = await apiClient.post<APIResponse<{ data: Articles }>>(
      `/articles/${articleId}/cover-image`,
      data,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data;
  },
};

export const KEYS_QUERIES = {
  createKey: async (organizationId: string, data: CreateKeySchema) => {
    const response = await apiClient.post<APIResponse<{ data: any }>>(
      `/keys/${organizationId}`,
      data,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data;
  },
  getKeys: async (
    organizationId: string,
    queries: { page: number; limit: number; search: string },
  ) => {
    const response = await apiClient.get<APIResponse<KeysResponse>>(
      `/keys/${organizationId}?page=${queries.page}&limit=${queries.limit}&search=${queries.search}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  getKeyById: async (organizationId: string, keyId: string) => {
    const response = await apiClient.get<APIResponse<any>>(
      `/keys/${organizationId}/${keyId}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  deleteKey: async (organizationId: string, keyId: string) => {
    const response = await apiClient.delete<APIResponse<{ data: any }>>(
      `/keys/${organizationId}/${keyId}`,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.data;
  },
};

export const ORGANIZATION_QUERIES = {
  getMembers: async (
    organizationId: string,
    queries?: {
      limit: number;
      offset: number;
      sortBy: string;
      sortDirection: "asc" | "desc";
    },
  ) => {
    const { data, error } = await authClient.organization.listMembers({
      query: {
        organizationId,
        limit: queries?.limit,
        offset: queries?.offset,
        sortBy: queries?.sortBy,
        sortDirection: queries?.sortDirection,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
    return data;
  },
};

export const GITHUB_APP_QUERIES = {
  getUserIntegration: async (organizationId: string) => {
    const response =
      await apiClient.get<APIResponse<GithubAppIntegration>>(`/gh-app`);

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data || null;
  },
  connectRepository: async (organizationId: string, repositoryId: string) => {
    const response = await apiClient.post<
      APIResponse<{ data: GithubAppIntegration }>
    >(`/gh-app/connect/${organizationId}`, {
      repositoryId,
    });

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
};

export const GITLAB_APP_QUERIES = {
  getUserIntegration: async (organizationId: string) => {
    const response =
      await apiClient.get<APIResponse<GitlabAppIntegration>>(`/gl-app`);

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data || null;
  },
  connectRepository: async (organizationId: string, repositoryId: string) => {
    const response = await apiClient.post<
      APIResponse<{ id: string; slug: string }>
    >(`/gl-app/connect/${organizationId}`, {
      repositoryId,
    });

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
};

export const WAITLIST_QUERIES = {
  joinWaitlist: async (data: JoinWaitlistEmailSchema) => {
    const response = await apiClient.post<APIResponse<{ data: any }>>(
      `/waitlist/join`,
      data,
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
  getWaitlistCount: async () => {
    const response =
      await apiClient.get<APIResponse<{ data: any }>>(`/waitlist/count`);

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  },
};
